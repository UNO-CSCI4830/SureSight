import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { useEffect, useState } from 'react';

// Use environment variables for Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-supabase-url.com';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-supabase-anon-key';

// In test environment, we'll use mock values instead of throwing an error
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Supabase environment variables are not set. Using mock values.');
  }
}

// Create a singleton Supabase client instance
// Using a global variable outside of any module system to ensure single instance
declare global {
  var supabaseInstance: ReturnType<typeof createClient<Database>> | undefined;
}

export const supabase = global.supabaseInstance || createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: false,        // do not parse session from URL
    persistSession: true,             // keep storing session in local storage
    autoRefreshToken: false           // disable automatic token refresh
  }
});

// Only assign to global in non-production to avoid memory leaks in development from HMR
if (process.env.NODE_ENV !== 'production') {
  global.supabaseInstance = supabase;
}

// Helper function for handling common Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  return {
    message: error.message || 'An unexpected error occurred',
    status: error.status || 500,
  };
};

/**
 * Analyzes an image using Google Cloud Vision API and stores the results in the database
 * @param imageId The UUID of the image in the database
 * @param imageUrl The URL of the image to analyze (can be a public Supabase URL or any accessible URL)
 * @returns Object containing analysis status and results
 */
export const analyzeImageDamage = async (
  imageId: string,
  imageUrl: string
): Promise<{
  success: boolean;
  data?: {
    damage_detected: boolean;
    confidence: number;
    damage_types?: string[];
    raw_results: any;
  };
  error?: string;
}> => {
  try {
    // Step 1: Get the image record to find associated report and assessment area
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (imageError) throw new Error(`Could not find image: ${imageError.message}`);

    // Step 2: Call the Edge Function or API endpoint to analyze the image
    // This keeps the Google Vision API credentials secure
    const { data: analysisData, error: analysisError } = await supabase.functions
      .invoke('analyze-image-damage', {
        body: {
          imageUrl,
          imageId
        }
      });

    if (analysisError) throw new Error(`Analysis failed: ${analysisError.message}`);

    // Step 3: Extract the damage types from the Vision API labels
    const damageLabels = [
      'damage', 'broken', 'crack', 'dent', 'destruction', 
      'worn', 'rot', 'mold', 'leak', 'water damage', 'fire damage', 
      'structural damage', 'deterioration', 'hail', 'storm damage',
      'wind damage', 'roof damage', 'siding damage'
    ];
    
    // Find which damage labels matched
    const matchedLabels = analysisData.analysis
      .filter((label: any) => 
        damageLabels.some(damageType => 
          label.description?.toLowerCase().includes(damageType)
        )
      )
      .map((label: any) => label.description);

    // Step 4: Store the results in image_analysis table
    const { error: insertError } = await supabase
      .from('image_analysis')
      .insert({
        image_id: imageId,
        report_id: imageData.report_id,
        assessment_area_id: imageData.assessment_area_id,
        damage_detected: analysisData.damage_detected,
        damage_types: matchedLabels.length > 0 ? matchedLabels : undefined,
        confidence: analysisData.confidence,
        raw_results: analysisData.analysis,
        analyzed_at: new Date().toISOString()
      });

    if (insertError) throw new Error(`Failed to save analysis: ${insertError.message}`);

    // Step 5: Update the image record to indicate it's been processed by AI
    // Map damage type from first matched label to enum
    let damageType = null;
    if (matchedLabels.length > 0) {
      if (matchedLabels.some((l: string) => l.toLowerCase().includes('roof'))) damageType = 'roof';
      else if (matchedLabels.some((l: string) => l.toLowerCase().includes('siding'))) damageType = 'siding';
      else if (matchedLabels.some((l: string) => l.toLowerCase().includes('window'))) damageType = 'window';
      else if (matchedLabels.some((l: string) => l.toLowerCase().includes('water'))) damageType = 'water';
      else if (matchedLabels.some((l: string) => l.toLowerCase().includes('structural'))) damageType = 'structural';
      else damageType = 'other';
    }
    
    // Map confidence to severity
    let damageSeverity = null;
    if (analysisData.damage_detected) {
      const confidence = analysisData.confidence;
      if (confidence > 0.9) damageSeverity = 'severe';
      else if (confidence > 0.75) damageSeverity = 'moderate'; 
      else damageSeverity = 'minor';
    }

    const { error: updateError } = await supabase
      .from('images')
      .update({
        ai_processed: true,
        ai_confidence: analysisData.confidence,
        ai_damage_type: damageType,
        ai_damage_severity: damageSeverity
      })
      .eq('id', imageId);

    if (updateError) throw new Error(`Failed to update image: ${updateError.message}`);

    // Step 6: Return successful response
    return {
      success: true,
      data: {
        damage_detected: analysisData.damage_detected,
        confidence: analysisData.confidence,
        damage_types: matchedLabels,
        raw_results: analysisData.analysis
      }
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to analyze image';
      
    console.error('Image analysis error:', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Processes multiple images for damage analysis
 * @param imageIds Array of image IDs to process
 * @returns Results of each analysis operation
 */
export const batchAnalyzeImages = async (imageIds: string[]): Promise<{
  overall_success: boolean;
  results: Array<{
    imageId: string;
    success: boolean;
    damage_detected?: boolean;
    confidence?: number;
    error?: string;
  }>;
}> => {
  const results = [];
  let overallSuccess = true;

  for (const imageId of imageIds) {
    try {
      // Get the image URL from the database
      const { data: imageData, error: imageError } = await supabase
        .from('images')
        .select('storage_path')
        .eq('id', imageId)
        .single();

      if (imageError) {
        results.push({
          imageId,
          success: false,
          error: `Could not find image: ${imageError.message}`
        });
        overallSuccess = false;
        continue;
      }

      // Run analysis on the image
      const analysis = await analyzeImageDamage(imageId, imageData.storage_path);

      if (!analysis.success) {
        results.push({
          imageId,
          success: false,
          error: analysis.error
        });
        overallSuccess = false;
        continue;
      }

      results.push({
        imageId,
        success: true,
        damage_detected: analysis.data?.damage_detected,
        confidence: analysis.data?.confidence
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        imageId,
        success: false,
        error: errorMessage
      });
      overallSuccess = false;
    }
  }

  return {
    overall_success: overallSuccess,
    results
  };
};

/**
 * Process all unprocessed images in a report with the Vision API
 * @param reportId The UUID of the report to process images for
 * @returns Results of the batch processing operation
 */
export const analyzeAllReportImages = async (reportId: string) => {
  try {
    // Get all unprocessed images for this report
    const { data: unprocessedImages, error: queryError } = await supabase
      .from('images')
      .select('id, storage_path')
      .eq('report_id', reportId)
      .eq('ai_processed', false);

    if (queryError) throw new Error(`Failed to query images: ${queryError.message}`);

    if (!unprocessedImages || unprocessedImages.length === 0) {
      return { success: true, message: 'No unprocessed images found', processed: 0 };
    }

    // Process all images in batch
    const imageIds = unprocessedImages.map(img => img.id);
    const batchResult = await batchAnalyzeImages(imageIds);

    return {
      success: batchResult.overall_success,
      message: `Processed ${batchResult.results.filter(r => r.success).length} of ${unprocessedImages.length} images`,
      processed: batchResult.results.filter(r => r.success).length,
      failed: batchResult.results.filter(r => !r.success).length,
      damage_detected: batchResult.results.filter(r => r.damage_detected).length,
      results: batchResult.results
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Uploads an image to Supabase Storage and triggers damage analysis
 * @param file The image file to upload
 * @param bucketName The storage bucket name
 * @param filePath The path where the file will be stored
 * @param reportId Optional report ID to associate image with
 * @param assessmentAreaId Optional assessment area ID to associate image with
 * @returns Object containing upload status and analysis results
 */
export const uploadAndAnalyzeImage = async (
  file: File,
  bucketName: string = 'property-images',
  filePath: string = `${Date.now()}-${file.name}`,
  reportId?: string,
  assessmentAreaId?: string,
  userId?: string
): Promise<{
  success: boolean;
  data?: {
    image_id: string;
    path: string;
    damageAnalysis: {
      damageDetected: boolean;
      confidence?: number;
    };
  };
  error?: string;
}> => {
  try {
    // Step 1: Upload the file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Step 2: Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);

    // Step 3: Create record in the images table
    const { data: imageRecord, error: insertError } = await supabase
      .from('images')
      .insert({
        storage_path: publicUrl,
        filename: file.name,
        file_size: file.size,
        content_type: file.type,
        report_id: reportId,
        assessment_area_id: assessmentAreaId,
        uploaded_by: userId,
        ai_processed: false
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // Step 4: Analyze the image
    const imageId = imageRecord.id;
    const analysis = await analyzeImageDamage(imageId, publicUrl);

    if (!analysis.success) {
      // If analysis fails, still return success for the upload
      // but indicate that analysis failed
      return {
        success: true,
        data: {
          image_id: imageId,
          path: uploadData.path,
          damageAnalysis: {
            damageDetected: false,
            confidence: 0
          }
        },
        error: 'Image uploaded but analysis failed: ' + analysis.error
      };
    }

    // Step 5: Return combined results
    return {
      success: true,
      data: {
        image_id: imageId,
        path: uploadData.path,
        damageAnalysis: {
          damageDetected: analysis.data?.damage_detected || false,
          confidence: analysis.data?.confidence
        }
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to upload and analyze image';
      
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Get damage analysis results for an existing image
 * @param imageId The ID of the image to get analysis for
 * @returns The damage analysis results
 */
export const getImageDamageAnalysis = async (imageId: string) => {
  try {
    const { data, error } = await supabase
      .from('image_analysis')
      .select('*')
      .eq('image_id', imageId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to retrieve image analysis';
      
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Custom hook for Supabase authentication state
export function useSupabaseAuth() {
  const [user, setUser] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || undefined);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || undefined);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading };
}
