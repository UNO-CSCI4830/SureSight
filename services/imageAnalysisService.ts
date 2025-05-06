import { supabase } from '../utils/supabaseClient';

/**
 * Get property image analyses for a specific property
 * @param propertyId The ID of the property to fetch images for
 * @returns Array of property images with their analysis results
 */
export const getPropertyImageAnalyses = async (propertyId: string) => {
  try {
    // First, get all reports that belong to this property
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('id')
      .eq('property_id', propertyId);

    if (reportError) {
      console.error('Error fetching reports for property:', reportError);
      throw reportError;
    }
    
    if (!reportData || reportData.length === 0) {
      // No reports found for this property
      return [];
    }
    
    // Extract report IDs
    const reportIds = reportData.map(report => report.id);
    
    // Then fetch all images that belong to these reports
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .select(`
        id,
        storage_path,
        created_at,
        ai_processed,
        ai_damage_type,
        ai_damage_severity,
        ai_confidence
      `)
      .in('report_id', reportIds)
      .order('created_at', { ascending: false });

    if (imageError) {
      console.error('Error fetching images for reports:', imageError);
      throw imageError;
    }
    
    return imageData || [];
  } catch (error) {
    console.error('Error fetching property image analyses:', error);
    return [];
  }
};

/**
 * Analyze a newly uploaded image using the Supabase Edge Function
 * @param imageUrl The URL of the image to analyze
 * @param imageId The database ID of the image to update with analysis results
 * @returns Analysis results from the Google Vision API
 */
export const analyzeImage = async (imageUrl: string, imageId: string) => {
  try {
    // Call the Supabase Edge Function to analyze the image
    const { data: analysisData, error: analyzeError } = await supabase.functions.invoke('analyze-image-damage', {
      body: { imageUrl, imageId },
    });

    if (analyzeError) throw analyzeError;
    
    return {
      success: true,
      data: analysisData,
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during image analysis'
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