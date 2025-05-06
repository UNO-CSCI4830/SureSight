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
    
    // APPROACH 1: Get images through reports linked to property
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('id')
      .eq('property_id', propertyId);

    if (reportError) {
      console.error('Error fetching reports for property:', reportError);
    } else if (reportData && reportData.length > 0) {
      const reportIds = reportData.map(report => report.id);
      console.log(`Found ${reportIds.length} reports for property ${propertyId}:`, reportIds);
      
      // Get images linked to these reports via report_id
      const { data: reportImages, error: imagesError } = await supabase
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
        .in('report_id', reportIds)
        .order('created_at', { ascending: false });

      if (imagesError) {
        console.error('Error fetching images from reports:', imagesError);
      } else if (reportImages && reportImages.length > 0) {
        console.log(`Found ${reportImages.length} images through report links`);
        allImages = [...reportImages];
      }
    }
    
    // APPROACH 2: Find images with property ID in storage path
    const { data: pathImages, error: pathError } = await supabase
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
      .ilike('storage_path', `%properties/${propertyId}%`)
      .order('created_at', { ascending: false });
      
    if (pathError) {
      console.error('Error searching images by path:', pathError);
    } else if (pathImages && pathImages.length > 0) {
      console.log(`Found ${pathImages.length} images through storage path`);
      
      // Merge with results from first approach, avoiding duplicates
      const existingIds = new Set(allImages.map(img => img.id));
      const newImages = pathImages.filter(img => !existingIds.has(img.id));
      
      allImages = [...allImages, ...newImages];
      console.log(`Added ${newImages.length} unique images from path search`);
    }
    
    // APPROACH 3: Direct database query to the bucket contents
    // We need to get the actual files from storage
    try {
      const { data: bucketFiles, error: bucketError } = await supabase.storage
        .from('property-images')
        .list(`4bbab242-9f71-4df8-a88a-7ae68ff9026c/properties/${propertyId}`, { 
          limit: 100, 
          offset: 0 
        });
        
      if (bucketError) {
        console.error('Error listing bucket files:', bucketError);
      } else if (bucketFiles && bucketFiles.length > 0) {
        console.log(`Found ${bucketFiles.length} files directly in storage bucket`);
        
        // For any files found in storage but not in database, create minimal representations
        const existingPaths = new Set(allImages.map(img => img.storage_path));
        
        for (const file of bucketFiles) {
          // Construct the full path as it would appear in the database
          const fullPath = `property-images/4bbab242-9f71-4df8-a88a-7ae68ff9026c/properties/${propertyId}/${file.name}`;
          
          if (!existingPaths.has(fullPath) && !file.name.includes('.emptyFolderPlaceholder')) {
            console.log(`Adding missing file from bucket: ${file.name}`);
            allImages.push({
              id: `storage-${file.name}`, // Generate a pseudo-ID
              storage_path: fullPath,
              created_at: file.created_at,
              ai_processed: false,
              filename: file.name,
              ai_damage_type: null,
              ai_damage_severity: null,
              ai_confidence: null
            });
          }
        }
      }
    } catch (storageErr) {
      console.error('Error accessing storage:', storageErr);
    }
    
    console.log(`Total images found for property ${propertyId}: ${allImages.length}`);
    if (allImages.length > 0) {
      console.log("First image data:", JSON.stringify(allImages[0], null, 2));
    }
    
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