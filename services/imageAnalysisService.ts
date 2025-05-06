import { supabase } from '../utils/supabaseClient';

/**
 * Get property image analyses for a specific property
 * @param propertyId The ID of the property to fetch images for
 * @returns Array of property images with their analysis results
 */
export const getPropertyImageAnalyses = async (propertyId: string) => {
  try {
    // Join images with reports to get images for a specific property
    const { data: imageData, error } = await supabase
      .from('reports')
      .select(`
        images(
          id,
          storage_path,
          created_at,
          ai_processed,
          ai_damage_type,
          ai_damage_severity,
          ai_confidence
        )
      `)
      .eq('property_id', propertyId);

    if (error) {
      console.error('Error fetching property image analyses:', error);
      throw error;
    }
    
    // Flatten the results to get an array of images
    const images = imageData?.flatMap(report => report.images || []) || [];
    
    // Sort by created_at in descending order
    return images.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
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