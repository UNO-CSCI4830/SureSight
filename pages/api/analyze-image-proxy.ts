import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';
import fetch from 'node-fetch';

// Define interfaces for error responses
interface ErrorResponse {
  error?: string;
  details?: string;
  [key: string]: any; // To allow for other properties
}

/**
 * Proxy API endpoint for analyzing images
 * This avoids CORS issues by making the request to Google Vision API directly
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests first
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST method after handling OPTIONS
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
    
    console.log(`Calling Google Vision API endpoint at: ${baseUrl}/api/google-vision-analyze`);
    
    // Try direct analysis using our Google Vision API wrapper endpoint
    try {
      const response = await fetch(`${baseUrl}/api/google-vision-analyze`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-api-call': 'true'
        },
        body: JSON.stringify({
          imageUrl,
          imageId
        })
      });

      // Handle non-OK responses
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // If JSON response, parse it with proper typing
          const errorData = await response.json() as ErrorResponse;
          console.error('Error from Google Vision API (JSON):', errorData);
          return res.status(response.status).json({ 
            error: errorData.error || `API error: ${response.status} ${response.statusText}`,
            details: errorData.details || 'No additional details available'
          });
        } else {
          // If not JSON, treat as text
          const errorText = await response.text();
          console.error('Error from Google Vision API (non-JSON):', errorText.substring(0, 500));
          return res.status(response.status).json({ 
            error: `API returned status ${response.status}`,
            details: 'API returned HTML or non-JSON response (possible server error)'
          });
        }
      }

      // Get the response body and ensure it's JSON
      let responseData: unknown;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        console.error('Unexpected non-JSON response:', text.substring(0, 500));
        return res.status(500).json({ 
          error: 'Google Vision API returned non-JSON response',
          details: 'Expected JSON but received different content type'
        });
      }

      // If successful, return the analysis results
      console.log('Analysis completed successfully');
      if (responseData && typeof responseData === 'object' && responseData !== null && 'analysis' in responseData) {
        return res.status(200).json(responseData.analysis);
      } else {
        return res.status(500).json({ 
          error: 'Malformed response from Google Vision API',
          details: 'Response does not contain expected "analysis" property'
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

    catch (error) {
    console.error('Error in analyze-image-proxy:', error);
    return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to analyze image',
        details: error instanceof Error ? error.stack : 'No stack trace available'
        });
    }
}
// Note: Ensure to handle any potential errors in the Google Vision API call and return appropriate error messages.