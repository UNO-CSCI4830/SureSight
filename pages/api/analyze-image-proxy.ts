import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';

/**
 * Proxy API endpoint for analyzing images
 * This avoids CORS issues by making the request to Supabase Edge Function from the server side
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // We'll skip authentication verification for now since the session cookie
  // might not be correctly passed in the API request
  // Instead, we'll rely on the RLS policies in Supabase for security

  try {
    const { imageId } = req.body;

    if (!imageId) {
      return res.status(400).json({ error: 'Image ID is required' });
    }

    console.log(`[API] Proxying analysis request for image ${imageId}`);
    
    // Get the image data from the database
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .select('storage_path')
      .eq('id', imageId)
      .single();
    
    if (imageError || !imageData) {
      return res.status(404).json({ 
        error: imageError?.message || 'Image not found' 
      });
    }
    
    // Get the public URL for the image
    const storagePath = imageData.storage_path;
    const pathParts = storagePath.split('/');
    
    if (pathParts.length < 2) {
      return res.status(400).json({ 
        error: 'Invalid storage path format' 
      });
    }
    
    const bucket = pathParts[0]; // First part should be the bucket name
    const filePath = storagePath.substring(bucket.length + 1);
    
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const imageUrl = urlData?.publicUrl;
    
    if (!imageUrl) {
      return res.status(500).json({ 
        error: 'Failed to generate public URL for image' 
      });
    }

    // First try to use our local Google Vision endpoint
    try {
      // Get the host from the request to build an absolute URL for the API
      const host = req.headers.host || '';
      const protocol = host.includes('localhost') ? 'http://' : 'https://';
      const apiUrl = `${protocol}${host}/api/google-vision-analyze`;
      
      console.log(`Calling Google Vision API at: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          imageId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Analysis failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      // After successful analysis, update the image record in the database
      await updateImageWithAnalysisResults(imageId, result);
      
      return res.status(200).json(result);
    } catch (apiError) {
      console.error('Error calling Google Vision API:', apiError);
      
      // Fall back to the Edge Function as a backup
      console.log('Falling back to Edge Function for image analysis');
      
      // Call the Supabase Edge Function from the server
      const { data, error } = await supabase.functions.invoke("analyze-image-damage", {
        body: { 
          imageId,
          imageUrl
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        return res.status(500).json({ 
          error: `Error invoking Edge Function: ${error.message || 'Unknown error'}`
        });
      }
      
      // After successful edge function analysis, update the image record in the database
      await updateImageWithAnalysisResults(imageId, data);

      // Return the analysis results from the Edge Function
      return res.status(200).json(data);
    }
  } catch (error) {
    console.error('Error in analyze-image-proxy:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze image'
    });
  }
}

/**
 * Updates the image record in the database with analysis results
 */
async function updateImageWithAnalysisResults(imageId: string, results: any) {
  try {
    const { error: updateError } = await supabase
      .from('images')
      .update({
        ai_processed: true,
        ai_damage_type: results.damage_type || null,
        ai_damage_severity: results.severity || null,
        ai_confidence: results.confidence || 0,
      })
      .eq('id', imageId);
      
    if (updateError) {
      console.error('Error updating image with analysis results:', updateError);
    }
  } catch (error) {
    console.error('Failed to update image with analysis results:', error);
  }
}