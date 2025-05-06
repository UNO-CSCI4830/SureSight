import { supabase } from '../utils/supabaseClient';

/**
 * Get property image analyses for a specific property
 * @param propertyId The ID of the property to fetch images for
 * @returns Array of property images with their analysis results
 */
export const getPropertyImageAnalyses = async (propertyId: string) => {
  try {
    console.log(`Fetching images for property: ${propertyId}`);
    
    // Setup for aggregating results
    let allImages: any[] = [];

    // Get current user session for getting the user UUID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('No authenticated user to fetch property images');
      return [];
    }

    const authUserId = session.user.id;
    console.log(`Fetching property images for user UUID: ${authUserId}`);
    
    // Get the database user ID from the auth user ID
    let dbUserId = null;
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single();
      
    if (!userError && userData) {
      dbUserId = userData.id;
    }
    
    // FIRST check for images using auth user ID path (newer images)
    try {
      const authBasePath = `${authUserId}/properties/${propertyId}`;
      console.log(`Looking for images in path: ${authBasePath}`);
      
      const { data: authBucketFiles, error: authBucketError } = await supabase.storage
        .from('property-images')
        .list(authBasePath, { 
          limit: 100, 
          offset: 0 
        });
        
      if (authBucketError) {
        console.error('Error listing bucket files with auth ID:', authBucketError);
      } else if (authBucketFiles && authBucketFiles.length > 0) {
        console.log(`Found ${authBucketFiles.length} files in property-images bucket using auth ID path`);
        
        // Filter out placeholders or folders
        const imageFiles = authBucketFiles.filter(file => 
          !file.name.includes('.emptyFolderPlaceholder') && 
          !file.metadata?.isFolder &&
          file.name !== '.emptyFolderPlaceholder' &&
          file.name !== '.folder'
        );
        
        console.log(`Found ${imageFiles.length} valid image files after filtering (auth ID path)`);
        
        // Look up these files in the database to get any analysis results
        if (imageFiles.length > 0) {
          const storagePaths = imageFiles.map(file => 
            `property-images/${authBasePath}/${file.name}`
          );
          
          const { data: dbImages, error: dbError } = await supabase
            .from('images')
            .select(`
              id,
              storage_path,
              created_at,
              ai_processed,
              ai_damage_type,
              ai_damage_severity,
              ai_confidence,
              filename
            `)
            .in('storage_path', storagePaths);
            
          if (dbError) {
            console.error('Error fetching image records from database (auth ID path):', dbError);
          }
          
          // Create a map of storage path to image record
          const imageMap = new Map();
          if (dbImages && dbImages.length > 0) {
            console.log(`Found ${dbImages.length} matching database records (auth ID path)`);
            dbImages.forEach(img => {
              imageMap.set(img.storage_path, img);
            });
          }
          
          // Now create the complete image list, using DB records where available
          // or creating placeholder entries for images only in storage
          for (const file of imageFiles) {
            const storagePath = `property-images/${authBasePath}/${file.name}`;
            
            if (imageMap.has(storagePath)) {
              // Use the database record with analysis results
              allImages.push(imageMap.get(storagePath));
            } else {
              // Create a placeholder record for images only in storage
              console.log(`Creating placeholder for file with no DB record: ${file.name} (auth ID path)`);
              allImages.push({
                id: `storage-${file.name}`, // Generate a pseudo-ID
                storage_path: storagePath,
                created_at: file.created_at || new Date().toISOString(),
                ai_processed: false,
                filename: file.name,
                ai_damage_type: null,
                ai_damage_severity: null,
                ai_confidence: null
              });
            }
          }
        }
      } else {
        console.log(`No images found in property-images/${authBasePath} (auth ID path)`);
      }
    } catch (storageErr) {
      console.error('Error accessing storage with auth user ID:', storageErr);
    }
    
    // If we have a DB user ID, ALSO check for images using that path (older images)
    if (dbUserId) {
      try {
        const dbBasePath = `${dbUserId}/properties/${propertyId}`;
        console.log(`Looking for images in DB user path: ${dbBasePath}`);
        
        const { data: dbBucketFiles, error: dbBucketError } = await supabase.storage
          .from('property-images')
          .list(dbBasePath, { 
            limit: 100, 
            offset: 0 
          });
          
        if (dbBucketError) {
          console.error('Error listing bucket files with DB ID:', dbBucketError);
        } else if (dbBucketFiles && dbBucketFiles.length > 0) {
          console.log(`Found ${dbBucketFiles.length} files in property-images bucket using DB ID path`);
          
          // Filter out placeholders or folders
          const imageFiles = dbBucketFiles.filter(file => 
            !file.name.includes('.emptyFolderPlaceholder') && 
            !file.metadata?.isFolder &&
            file.name !== '.emptyFolderPlaceholder' &&
            file.name !== '.folder'
          );
          
          console.log(`Found ${imageFiles.length} valid image files after filtering (DB ID path)`);
          
          // Look up these files in the database to get any analysis results
          if (imageFiles.length > 0) {
            const storagePaths = imageFiles.map(file => 
              `property-images/${dbBasePath}/${file.name}`
            );
            
            const { data: dbImages, error: dbError } = await supabase
              .from('images')
              .select(`
                id,
                storage_path,
                created_at,
                ai_processed,
                ai_damage_type,
                ai_damage_severity,
                ai_confidence,
                filename
              `)
              .in('storage_path', storagePaths);
              
            if (dbError) {
              console.error('Error fetching image records from database (DB ID path):', dbError);
            }
            
            // Create a map of storage path to image record
            const imageMap = new Map();
            if (dbImages && dbImages.length > 0) {
              console.log(`Found ${dbImages.length} matching database records (DB ID path)`);
              dbImages.forEach(img => {
                imageMap.set(img.storage_path, img);
              });
            }
            
            // Now create the complete image list, using DB records where available
            // or creating placeholder entries for images only in storage
            for (const file of imageFiles) {
              const storagePath = `property-images/${dbBasePath}/${file.name}`;
              
              if (imageMap.has(storagePath)) {
                // Use the database record with analysis results
                allImages.push(imageMap.get(storagePath));
              } else {
                // Create a placeholder record for images only in storage
                console.log(`Creating placeholder for file with no DB record: ${file.name} (DB ID path)`);
                allImages.push({
                  id: `storage-${file.name}`, // Generate a pseudo-ID
                  storage_path: storagePath,
                  created_at: file.created_at || new Date().toISOString(),
                  ai_processed: false,
                  filename: file.name,
                  ai_damage_type: null,
                  ai_damage_severity: null,
                  ai_confidence: null
                });
              }
            }
          }
        } else {
          console.log(`No images found in property-images/${dbBasePath} (DB ID path)`);
        }
      } catch (storageErr) {
        console.error('Error accessing storage with DB user ID:', storageErr);
      }
    }
    
    // Also check for images directly associated with the property ID in the database
    // This helps find any images that might be in unusual paths or were uploaded differently
    try {
      console.log(`Checking database for images directly linked to property ID: ${propertyId}`);
      
      const { data: directDbImages, error: directDbError } = await supabase
        .from('images')
        .select(`
          id,
          storage_path,
          created_at,
          ai_processed,
          ai_damage_type,
          ai_damage_severity,
          ai_confidence,
          filename
        `)
        .eq('property_id', propertyId);
        
      if (directDbError) {
        console.error('Error fetching directly linked property images:', directDbError);
      } else if (directDbImages && directDbImages.length > 0) {
        console.log(`Found ${directDbImages.length} images directly linked to property in database`);
        
        // Create a set of all storage paths we already have to avoid duplicates
        const existingPaths = new Set(allImages.map(img => img.storage_path));
        
        // Add any new images that weren't already found
        for (const img of directDbImages) {
          if (!existingPaths.has(img.storage_path)) {
            allImages.push(img);
          }
        }
      }
    } catch (dbError) {
      console.error('Error checking for images linked to property in database:', dbError);
    }
    
    console.log(`Total property images found: ${allImages.length}`);
    return allImages;
  } catch (error) {
    console.error('Error fetching property image analyses:', error);
    return [];
  }
};

/**
 * Check if image analysis is complete - useful for polling
 * @param imageId The database ID of the image to check
 * @returns Object indicating if the analysis is complete and details
 */
export const checkImageAnalysisStatus = async (imageId: string) => {
  try {
    // Check the image's AI processing status
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .select('ai_processed, ai_damage_type, ai_damage_severity, ai_confidence')
      .eq('id', imageId)
      .single();

    if (imageError) throw imageError;
    
    // Check if analysis is complete
    const isComplete = imageData?.ai_processed && 
                      (imageData?.ai_damage_type !== null || 
                       imageData?.ai_damage_severity !== null);
    
    return {
      success: true,
      isComplete,
      data: isComplete ? imageData : null
    };
  } catch (error) {
    console.error('Error checking image analysis status:', error);
    return {
      success: false,
      isComplete: false,
      error: error instanceof Error ? error.message : 'Unknown error checking analysis status'
    };
  }
};

/**
 * Get detailed analysis for a specific image
 * @param imageId The ID of the image to get analysis for
 * @returns The detailed analysis results
 */
export const getImageAnalysis = async (imageId: string) => {
  try {
    const { data, error } = await supabase
      .from('image_analysis')
      .select('*')
      .eq('image_id', imageId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error fetching image analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching analysis'
    };
  }
};

/**
 * Get or create a generic report for a property to use for direct property image uploads
 * This allows images to be uploaded directly on the property page without having to create a report first
 * @param propertyId The ID of the property
 * @returns The report ID to use for image uploads
 */
export const getOrCreateGenericPropertyReport = async (propertyId: string): Promise<string | null> => {
  try {
    // First check if a generic report already exists for this property
    const { data: existingReports, error: fetchError } = await supabase
      .from('reports')
      .select('id')
      .eq('property_id', propertyId)
      .eq('title', 'Property Images')
      .limit(1);

    if (fetchError) {
      console.error('Error checking for generic property report:', fetchError);
      throw fetchError;
    }

    // If a generic report exists, return its ID
    if (existingReports && existingReports.length > 0) {
      return existingReports[0].id;
    }

    // Get the current user for creator_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('No authenticated user to create report');
      return null;
    }

    // Get the database user ID from the auth user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return null;
    }

    // Create a new generic report for this property
    const { data: newReport, error: createError } = await supabase
      .from('reports')
      .insert({
        property_id: propertyId,
        creator_id: userData.id,
        title: 'Property Images',
        description: 'Generic report for property images uploaded directly from the property page',
        status: 'draft'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating generic property report:', createError);
      throw createError;
    }

    return newReport.id;
  } catch (error) {
    console.error('Failed to get or create generic property report:', error);
    return null;
  }
};

/**
 * Delete a property image from both database and storage
 * @param imageId The database ID of the image to delete
 * @param storagePath The storage path of the image to delete
 * @returns Object indicating success or failure
 */
export const deletePropertyImage = async (imageId: string, storagePath: string): Promise<{success: boolean, error?: string}> => {
  try {
    // First delete the image from the database
    const { error: deleteError } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId);
      
    if (deleteError) {
      throw deleteError;
    }
    
    // Then delete any analysis results
    await supabase
      .from('image_analysis')
      .delete()
      .eq('image_id', imageId);
    
    // Extract bucket name from the storage path
    const pathParts = storagePath.split('/');
    if (pathParts.length < 2) {
      throw new Error('Invalid storage path format');
    }
    
    const bucket = pathParts[0]; // First part should be the bucket name
    
    // Remove the bucket name from the path to get the actual file path for deletion
    const filePath = storagePath;
    
    // Delete the file from storage
    const { error: storageError } = await supabase
      .storage
      .from(bucket)
      .remove([filePath]);
      
    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // We've already deleted from the database, so we'll continue despite storage error
      return {
        success: true,
        error: `Image deleted from database but there was an issue removing the file from storage: ${storageError.message}`
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting property image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error deleting image'
    };
  }
};

/**
 * Directly invoke the AI analysis function without relying on the database trigger
 * @param imageId The database ID of the image to analyze
 * @param imageUrl The public URL of the image to analyze
 * @returns Object containing analysis results or error information
 */
export const invokeImageAnalysis = async (imageId: string, imageUrl: string): Promise<{
  success: boolean;
  damage_detected?: boolean;
  damage_type?: string;
  severity?: string;
  confidence?: number;
  analysis?: any;
  error?: string;
}> => {
  try {
    console.log(`Invoking AI analysis for image ${imageId} at ${imageUrl}`);
    
    // Call the Supabase Edge Function directly
    const { data, error } = await supabase.functions.invoke("analyze-image-damage", {
      body: { imageId, imageUrl }
    });
    
    if (error) {
      console.error('Error invoking analyze-image-damage function:', error);
      return {
        success: false,
        error: error.message || 'Failed to invoke analysis function'
      };
    }
    
    console.log('AI Analysis results:', data);
    
    // Return the analysis results to the caller
    return {
      success: true,
      damage_detected: data.damage_detected,
      damage_type: data.damage_type,
      severity: data.severity,
      confidence: data.confidence,
      analysis: data.analysis
    };
  } catch (error) {
    console.error('Exception during image analysis invocation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error analyzing image'
    };
  }
};

/**
 * Manually trigger AI analysis for an image by ID
 * Useful for analyzing images that weren't processed automatically or re-analyzing images
 * @param imageId The database ID of the image to analyze
 * @returns Object containing analysis results or error information
 */
export const triggerImageAnalysis = async (imageId: string): Promise<{
  success: boolean;
  damage_detected?: boolean;
  damage_type?: string;
  severity?: string;
  confidence?: number;
  error?: string;
}> => {
  try {
    // First, get the image data from the database
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .select('storage_path')
      .eq('id', imageId)
      .single();
    
    if (imageError || !imageData) {
      console.error('Error fetching image data:', imageError);
      return {
        success: false,
        error: imageError?.message || 'Image not found'
      };
    }
    
    // Get the public URL for the image
    const storagePath = imageData.storage_path;
    
    // Determine the bucket name from the storage path
    const pathParts = storagePath.split('/');
    if (pathParts.length < 2) {
      return {
        success: false,
        error: 'Invalid storage path format'
      };
    }
    
    const bucket = pathParts[0]; // First part should be the bucket name
    const filePath = storagePath.substring(bucket.length + 1); // +1 for the slash
    
    // Get public URL using Supabase
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const imageUrl = urlData?.publicUrl;
    
    if (!imageUrl) {
      return {
        success: false,
        error: 'Failed to generate public URL for image'
      };
    }
    
    console.log(`Manually triggering analysis for image ${imageId} at ${imageUrl}`);
    
    // Call our direct invocation function
    return await invokeImageAnalysis(imageId, imageUrl);
  } catch (error) {
    console.error('Error triggering manual image analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during analysis'
    };
  }
};