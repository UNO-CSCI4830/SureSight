import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';
import fetch from 'node-fetch';

/**
 * Proxy API endpoint for analyzing images
 * This avoids CORS issues by making the request to Google Vision API directly
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Get our current base URL, which will be different in development vs production
    let baseUrl = '';
    const host = req.headers.host || '';
    const protocol = host.includes('localhost') ? 'http://' : 'https://';
    baseUrl = `${protocol}${host}`;
    
    console.log(`Calling Google Vision API at: ${baseUrl}/api/google-vision-analyze`);
    
    // Call our Google Vision API endpoint with the image information
    try {
      const response = await fetch(`${baseUrl}/api/google-vision-analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Forward the auth cookie from the request if available
          'Cookie': req.headers.cookie || ''
        },
        body: JSON.stringify({
          imageUrl,
          imageId
        })
      });

      // Get the response body
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response:', e);
        console.error('Response text:', responseText);
        return res.status(500).json({ 
          error: 'Failed to parse analysis response',
          details: responseText.substring(0, 500) // Include part of the response for debugging
        });
      }

      if (!response.ok) {
        console.error('Error from Google Vision API:', responseData);
        return res.status(response.status).json({ 
          error: responseData.error || `API error: ${response.status} ${response.statusText}`,
          details: responseData.details || 'No additional details available'
        });
      }

      // If successful, return the analysis results
      console.log('Analysis completed successfully');
      return res.status(200).json(responseData.analysis);
    } catch (error) {
      console.error('Error calling Google Vision API:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to analyze image',
        details: error instanceof Error ? error.stack : 'No stack trace available'
      });
    }
  } catch (error) {
    console.error('Error in analyze-image-proxy:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze image',
      details: error instanceof Error ? error.stack : 'No stack trace available'
    });
  }
}