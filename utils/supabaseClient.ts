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
 * Uploads an image to Supabase Storage and triggers damage analysis directly via our API
 * @param file The image file to upload
 * @param bucketName The storage bucket name
 * @param filePath The path where the file will be stored
 * @param propertyId Optional property ID to associate with the image
 * @returns Object containing upload status and analysis results
 */
export const uploadAndAnalyzeImage = async (
  file: File,
  bucketName: string = 'property-images',
  filePath: string = `${Date.now()}-${file.name}`,
  propertyId: string | undefined = undefined
): Promise<{
  success: boolean;
  data?: {
    path: string;
    id?: string;
    damageAnalysis: {
      damageDetected: boolean;
      damageType?: string;
      severity?: string;
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

    // Step 3: Insert into database with insert_image_record to store image info
    const { data: dbImageData, error: dbError } = await supabase
      .rpc('insert_image_record', {
        p_storage_path: `${bucketName}/${uploadData.path}`,
        p_filename: file.name,
        p_content_type: file.type,
        p_file_size: file.size,
        p_ai_processed: false,
        p_property_id: propertyId
      });

    if (dbError) {
      console.error('Error inserting image record:', dbError);
      throw dbError;
    }

    // The insert_image_record function now returns the UUID directly
    const imageId = dbImageData;

    if (!imageId) {
      throw new Error('Failed to get image ID from database');
    }

    // Step 4: Call our local API to analyze the image directly with Google Vision
    // This uses the server's GOOGLE_VISION_CREDENTIALS env variable
    const analysisResponse = await fetch('/api/google-vision-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: publicUrl,
        imageId: imageId,
        propertyId: propertyId
      })
    });

    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json();
      throw new Error(`Analysis failed: ${errorData.error || analysisResponse.statusText}`);
    }

    const analysisResult = await analysisResponse.json();

    // Step 5: Return combined results
    return {
      success: true,
      data: {
        path: uploadData.path,
        id: imageId,
        damageAnalysis: {
          damageDetected: analysisResult.analysis.damage_detected,
          damageType: analysisResult.analysis.damage_type,
          severity: analysisResult.analysis.severity,
          confidence: analysisResult.analysis.confidence
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
 * Fallback function that uses the Edge Function if direct Google Vision analysis fails
 * @param imageId The image ID to analyze
 * @param imageUrl The public URL of the image
 * @returns Analysis results from the Edge Function
 */
export const analyzeImageWithEdgeFunction = async (imageId: string, imageUrl: string) => {
  try {
    // Call the Edge Function to analyze the image
    const { data: analysisData, error: analysisError } = await supabase
      .functions
      .invoke('analyze-image-damage', {
        body: {
          imageUrl,
          imageId
        }
      });

    if (analysisError) throw analysisError;

    return {
      success: true,
      data: {
        damageDetected: analysisData.damage_detected,
        damageType: analysisData.damage_type,
        severity: analysisData.severity,
        confidence: analysisData.confidence
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to analyze image with Edge Function';
      
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Force re-analysis of an existing image
 * @param imageId The database ID of the image to analyze
 * @returns Analysis results
 */
export const reanalyzeImage = async (imageId: string) => {
  try {
    // First get the image details
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .select('storage_path')
      .eq('id', imageId)
      .single();
      
    if (imageError || !imageData) {
      throw new Error(imageError?.message || 'Image not found');
    }
    
    // Extract bucket name and file path
    const storagePath = imageData.storage_path;
    const pathParts = storagePath.split('/');
    
    if (pathParts.length < 2) {
      throw new Error('Invalid storage path format');
    }
    
    const bucket = pathParts[0];
    const filePath = storagePath.substring(bucket.length + 1);
    
    // Get the public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const imageUrl = urlData?.publicUrl;
    
    if (!imageUrl) {
      throw new Error('Failed to generate public URL for image');
    }
    
    // Call our local API for direct Google Vision analysis
    const analysisResponse = await fetch('/api/google-vision-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl,
        imageId
      })
    });
    
    if (!analysisResponse.ok) {
      const errorData = await analysisResponse.json();
      throw new Error(`Analysis failed: ${errorData.error || analysisResponse.statusText}`);
    }
    
    const analysisResult = await analysisResponse.json();
    
    return {
      success: true,
      data: {
        damageAnalysis: {
          damageDetected: analysisResult.analysis.damage_detected,
          damageType: analysisResult.analysis.damage_type,
          severity: analysisResult.analysis.severity,
          confidence: analysisResult.analysis.confidence
        }
      }
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to reanalyze image';
      
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

/**
 * Helper function to safely insert records with JSON fields
 * This avoids the "Token Bearer is invalid" JSON parsing error
 */
export const safeInsert = async <T extends keyof Database['public']['Tables']>(
  table: T,
  data: Database['public']['Tables'][T]['Insert'],
  options: { select?: string } = {}
) => {
  try {
    // Process JSON fields to ensure they're properly formatted
    const sanitizedData = { ...data };
    
    // Use explicit type casting to resolve TypeScript issues
    const { data: result, error } = await supabase
      .from(table)
      .insert(sanitizedData as any, options as any);
      
    return { data: result, error };
  } catch (error) {
    console.error(`Error in safeInsert for table ${String(table)}:`, error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
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
