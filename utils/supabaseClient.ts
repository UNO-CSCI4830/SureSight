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
 * Uploads an image to Supabase Storage and triggers damage analysis
 * @param file The image file to upload
 * @param bucketName The storage bucket name
 * @param filePath The path where the file will be stored
 * @returns Object containing upload status and analysis results
 */
export const uploadAndAnalyzeImage = async (
  file: File,
  bucketName: string = 'property-images',
  filePath: string = `${Date.now()}-${file.name}`
): Promise<{
  success: boolean;
  data?: {
    path: string;
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

    if (analysisError) throw analysisError;

    // Step 4: Return combined results
    return {
      success: true,
      data: {
        path: uploadData.path,
        damageAnalysis: {
          damageDetected: analysisData.damage_detected,
          damageType: analysisData.damage_type,
          severity: analysisData.severity,
          confidence: analysisData.confidence
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
