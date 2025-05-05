// visionService.ts
// This service handles interactions with Google Cloud Vision API for image analysis

import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { Database } from '../types/database.types';

/**
 * Interface for damage analysis results
 */
interface DamageAnalysisResult {
  damage_detected: boolean;
  confidence?: number;
  damage_type?: string;
  damage_severity?: string;
}

/**
 * Interface for image upload and analysis result
 */
interface ImageAnalysisResult {
  success: boolean;
  data?: {
    path: string;
    damageAnalysis: DamageAnalysisResult;
  };
  error?: string;
}

/**
 * Uploads an image to storage and analyzes it for damage
 * 
 * @param file - The image file to upload and analyze
 * @param reportId - Optional report ID to associate with the image
 * @param assessmentAreaId - Optional assessment area ID to associate with the image
 */
export const uploadAndAnalyzeImage = async (
  file: File, 
  reportId?: string, 
  assessmentAreaId?: string
): Promise<ImageAnalysisResult> => {
  try {
    // Step 1: Generate a unique file path
    const filePath = reportId 
      ? `reports/${reportId}/${Date.now()}-${file.name}` 
      : `uploads/${Date.now()}-${file.name}`;
    
    // Step 2: Upload the file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('reports')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from('reports')
      .getPublicUrl(uploadData.path);

    // Step 3: Call the Edge Function to analyze the image
    // This keeps the API keys secure on the server
    const { data: analysisData, error: analysisError } = await supabase
      .functions
      .invoke('analyze-image-damage', {
        body: {
          imageUrl: publicUrl,
          imageId: uploadData.id || uploadData.path
        }
      });

    if (analysisError) throw new Error(analysisError.message);

    // Step 4: Return combined results
    return {
      success: true,
      data: {
        path: uploadData.path,
        damageAnalysis: {
          damage_detected: analysisData.damage_detected,
          confidence: analysisData.confidence,
          damage_type: analysisData.damage_type,
          damage_severity: analysisData.severity
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
 * 
 * @param imageId - The ID of the image to get analysis for
 */
export const getImageDamageAnalysis = async (imageId: string): Promise<{
  success: boolean;
  data?: DamageAnalysisResult;
  error?: string;
}> => {
  try {
    // Query the image_analysis table for this image
    const { data, error } = await supabase
      .from('image_analysis')
      .select('*')
      .eq('image_id', imageId)
      .single();

    if (error) throw new Error(error.message);

    // Type assertion for raw_results to handle proper property access
    const rawResults = data.raw_results as { damage_type?: string; severity?: string } | null;

    return {
      success: true,
      data: {
        damage_detected: data.damage_detected ?? false,
        confidence: data.confidence ?? undefined,
        damage_type: rawResults?.damage_type,
        damage_severity: rawResults?.severity
      }
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

/**
 * Saves image metadata and analysis results to the database
 * 
 * @param imageData - Image metadata including storage path, report ID, etc.
 * @param analysisResults - Results from damage analysis
 */
export const saveImageWithAnalysis = async (
  imageData: {
    storage_path: string;
    report_id?: string;
    assessment_area_id?: string;
    uploaded_by: string;
    filename: string;
    file_size?: number;
    content_type?: string;
  },
  analysisResults: DamageAnalysisResult
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    // Step 1: Insert the image record
    const { data: imageRecord, error: imageError } = await supabase
      .from('images')
      .insert({
        storage_path: imageData.storage_path,
        report_id: imageData.report_id,
        assessment_area_id: imageData.assessment_area_id,
        uploaded_by: imageData.uploaded_by,
        filename: imageData.filename,
        file_size: imageData.file_size,
        content_type: imageData.content_type,
        ai_processed: true,
        ai_damage_type: analysisResults.damage_type as any,
        ai_damage_severity: analysisResults.damage_severity as any,
        ai_confidence: analysisResults.confidence
      })
      .select('*')
      .single();

    if (imageError) throw new Error(imageError.message);

    // Step 2: Insert the analysis record
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('image_analysis')
      .insert({
        image_id: imageRecord.id,
        damage_detected: analysisResults.damage_detected,
        confidence: analysisResults.confidence,
        raw_results: {
          damage_type: analysisResults.damage_type,
          severity: analysisResults.damage_severity
        }
      })
      .select('*')
      .single();

    if (analysisError) throw new Error(analysisError.message);

    return {
      success: true,
      data: {
        image: imageRecord,
        analysis: analysisRecord
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to save image and analysis results';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Initiates damage analysis for an existing image
 * 
 * @param imageId - ID of the image to analyze
 * @param imagePath - Storage path of the image
 */
export const analyzeExistingImage = async (
  imageId: string,
  imagePath: string
): Promise<{
  success: boolean;
  data?: DamageAnalysisResult;
  error?: string;
}> => {
  try {
    // Get the public URL for the image
    const { data: { publicUrl } } = supabase
      .storage
      .from('reports')
      .getPublicUrl(imagePath);

    // Call the Edge Function to analyze the image
    const { data: analysisData, error: analysisError } = await supabase
      .functions
      .invoke('analyze-image-damage', {
        body: {
          imageUrl: publicUrl,
          imageId: imageId
        }
      });

    if (analysisError) throw new Error(analysisError.message);

    // Update the image record to mark it as processed
    await supabase
      .from('images')
      .update({
        ai_processed: true,
        ai_damage_type: analysisData.damage_type as any,
        ai_damage_severity: analysisData.severity as any,
        ai_confidence: analysisData.confidence
      })
      .eq('id', imageId);

    return {
      success: true,
      data: {
        damage_detected: analysisData.damage_detected,
        confidence: analysisData.confidence,
        damage_type: analysisData.damage_type,
        damage_severity: analysisData.severity
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to analyze image';
    
    return {
      success: false,
      error: errorMessage
    };
  }
};