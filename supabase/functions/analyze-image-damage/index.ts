// Add Deno types reference
/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// We need to use a specific version of the Google Cloud Vision API that's compatible with Deno/ESM
import vision from 'https://esm.sh/@google-cloud/vision@4.0.1?deno-std=0.177.0';

// CORS headers configuration
const allowedOriginPatterns = [
  'https://.+\.vercel\.app$', // Matches any Vercel app domain including preview deployments
  'https://suresight\.vercel\.app$',
  'http://localhost:[0-9]+$', // Matches localhost with any port
  'https://sure-sight-git-.+-scottfausts-projects\.vercel\.app$' // Matches Git branch deployments
];

// Function to add CORS headers to response based on request origin
const getCorsHeaders = (req) => {
  const origin = req.headers.get('origin');
  
  // Allow the origin if it matches any of our patterns
  if (origin) {
    const isAllowed = allowedOriginPatterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(origin);
    });
    
    if (isAllowed) {
      return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      };
    }
  }
  
  // Default headers for non-matching origins - use the first specific production URL as default
  return {
    'Access-Control-Allow-Origin': 'https://suresight.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

// Handle OPTIONS request for CORS preflight - separate function to avoid initializing Google APIs unnecessarily
function handleOPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

// Get Google Cloud Vision credentials securely from environment variables
const getVisionCredentials = () => {
  try {
    // Try to get base64 encoded credentials first (preferred for Supabase Edge Functions)
    const base64Credentials = Deno.env.get('GOOGLE_VISION_CREDENTIALS_BASE64');
    if (base64Credentials) {
      try {
        // Decode base64 credentials
        const decoded = atob(base64Credentials);
        return JSON.parse(decoded);
      } catch (error) {
        console.error('Error decoding base64 credentials:', error);
      }
    }
    
    // Fall back to individual credential fields if provided
    const projectId = Deno.env.get('GOOGLE_VISION_PROJECT_ID');
    const clientEmail = Deno.env.get('GOOGLE_VISION_CLIENT_EMAIL');
    const privateKey = Deno.env.get('GOOGLE_VISION_PRIVATE_KEY');
    
    if (projectId && clientEmail && privateKey) {
      return {
        type: "service_account",
        project_id: projectId,
        private_key: privateKey.replace(/\\n/g, '\n'),
        client_email: clientEmail,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs"
      };
    }
    
    throw new Error('No valid Google Vision credentials found');
  } catch (error) {
    console.error('Failed to get Vision credentials:', error);
    throw new Error('Failed to initialize Google Vision API credentials');
  }
};

// Important: Don't initialize the client at the global level to avoid the error
// We'll create it only when needed inside the request handler
// This prevents issues with the initialization when handling OPTIONS requests

// Enhanced damage detection configuration
const DAMAGE_TYPES = {
  ROOF: {
    keywords: [
      'roof damage',
      'shingle damage',
      'missing shingles',
      'roof leak',
      'damaged roof',
      'roof hole',
      'broken shingles',
      'roof deterioration',
      'roof wear',
      'hail damage',
      'storm damage'
    ],
    type: 'roof'
  },
  SIDING: {
    keywords: [
      'siding damage',
      'vinyl damage',
      'damaged siding',
      'siding dent',
      'siding hole',
      'broken siding',
      'warped siding',
      'siding deterioration',
      'exterior damage',
      'wall damage'
    ],
    type: 'siding'
  },
  WINDOW: {
    keywords: [
      'window damage',
      'broken window',
      'window crack',
      'damaged window',
      'window leak',
      'shattered window',
      'window frame damage'
    ],
    type: 'window'
  },
  STRUCTURAL: {
    keywords: [
      'structural damage',
      'foundation damage',
      'wall damage',
      'building damage',
      'structural issue',
      'frame damage'
    ],
    type: 'structural'
  },
  WATER: {
    keywords: [
      'water damage',
      'moisture damage',
      'flood damage',
      'water stain',
      'water intrusion',
      'leak',
      'water spot'
    ],
    type: 'water'
  },
  HAIL: {
    keywords: [
      'hail damage',
      'hail dent',
      'hail',
      'hail impact',
      'hail mark',
      'hail strike'
    ],
    type: 'hail'
  }
};

// Severity detection based on confidence score ranges
const determineSeverity = (confidence) => {
  if (confidence > 0.85) return 'critical';
  if (confidence > 0.7) return 'severe';
  if (confidence > 0.5) return 'moderate';
  return 'minor';
};

// Helper function to catch and log errors during API calls
const safeApiCall = async (apiCall, defaultValue = []) => {
  try {
    return await apiCall;
  } catch (error) {
    console.error(`API call failed: ${error.message}`);
    return defaultValue;
  }
};

// Main request handler
serve(async (req) => {
  // Handle CORS preflight request immediately without initializing any clients
  if (req.method === 'OPTIONS') {
    return handleOPTIONS(req);
  }

  try {
    // Extract request data
    const { imageUrl, imageId } = await req.json();
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    // Create Google Vision client on demand only for POST requests
    // This is the key fix - we avoid initializing it at the global level
    const credentials = getVisionCredentials();
    const { ImageAnnotatorClient } = vision;
    const client = new ImageAnnotatorClient({ credentials });

    // Create a Supabase client (for updating the database with results)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call multiple Google Vision API features for comprehensive analysis
    // Use safe API calls to prevent one failure from breaking the entire analysis
    const [labelResult] = await safeApiCall(client.labelDetection(imageUrl), [{}]);
    const [objectResult] = await safeApiCall(client.objectLocalization(imageUrl), [{}]);
    const [textResult] = await safeApiCall(client.textDetection(imageUrl), [{}]);
    const [imageProperties] = await safeApiCall(client.imageProperties(imageUrl), [{}]);

    // Combine results for analysis
    const labels = labelResult.labelAnnotations || [];
    const objects = objectResult.localizedObjectAnnotations || [];
    const texts = textResult.textAnnotations || [];
    const colors = imageProperties.imagePropertiesAnnotation?.dominantColors?.colors || [];

    // Detect damage type
    const detectedDamageTypes = [];
    let highestConfidence = 0;
    let primaryDamageType = 'other';

    // Process all detection categories
    for (const [category, config] of Object.entries(DAMAGE_TYPES)) {
      const categoryDetected = {
        detected: false,
        confidence: 0,
        type: config.type
      };

      // Check labels for damage indicators
      for (const label of labels) {
        const description = label.description?.toLowerCase() || '';
        const score = label.score || 0;
        for (const keyword of config.keywords) {
          if (description.includes(keyword.toLowerCase()) && score > categoryDetected.confidence) {
            categoryDetected.detected = true;
            categoryDetected.confidence = score;
          }
        }
      }

      // Check object annotations for damage indicators
      for (const object of objects) {
        const name = object.name?.toLowerCase() || '';
        const score = object.score || 0;
        for (const keyword of config.keywords) {
          // Look for partial matches in object names since they tend to be more general
          if (keyword.toLowerCase().includes(name) || name.includes(keyword.toLowerCase())) {
            if (score > categoryDetected.confidence) {
              categoryDetected.detected = true;
              categoryDetected.confidence = score;
            }
          }
        }
      }

      // Also check text annotations for damage keywords
      // This can be helpful for images with report text or markings
      if (texts && texts.length > 0) {
        for (const text of texts.slice(1)) {
          const description = text.description?.toLowerCase() || '';
          for (const keyword of config.keywords) {
            if (description.includes(keyword.toLowerCase())) {
              categoryDetected.detected = true;
              categoryDetected.confidence = Math.max(categoryDetected.confidence, 0.7); // Default confidence for text matches
            }
          }
        }
      }

      if (categoryDetected.detected) {
        detectedDamageTypes.push({
          type: categoryDetected.type,
          confidence: categoryDetected.confidence
        });
        if (categoryDetected.confidence > highestConfidence) {
          highestConfidence = categoryDetected.confidence;
          primaryDamageType = categoryDetected.type;
        }
      }
    }

    // Determine if any damage was detected
    const damageDetected = detectedDamageTypes.length > 0;
    const severity = determineSeverity(highestConfidence);

    // Prepare raw results for storage
    const rawResults = {
      labels: labels.map((l) => ({
        description: l.description,
        score: l.score
      })),
      objects: objects.map((o) => ({
        name: o.name,
        score: o.score
      })),
      detectedDamageTypes,
      primaryDamageType,
      severity,
      confidence: highestConfidence
    };

    // Store analysis results in database
    let dbError = null;
    try {
      const { error } = await supabaseClient.from('image_analysis').insert({
        image_id: imageId,
        damage_detected: damageDetected,
        damage_type: primaryDamageType,
        severity: severity,
        confidence: highestConfidence,
        raw_results: rawResults,
        analyzed_at: new Date().toISOString()
      });
      dbError = error;
    } catch (error) {
      console.error('Error saving to image_analysis table:', error);
      dbError = error;
    }

    // Also update the images table with the analysis results
    try {
      await supabaseClient.from('images').update({
        ai_processed: true,
        ai_damage_type: primaryDamageType,
        ai_damage_severity: severity,
        ai_confidence: highestConfidence
      }).eq('id', imageId);
    } catch (updateError) {
      console.error('Error updating images table:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      damage_detected: damageDetected,
      damage_type: primaryDamageType,
      confidence: highestConfidence,
      severity: severity,
      analysis: rawResults,
      database_error: dbError ? dbError.message : null
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(req) // Include dynamic CORS headers in success response
      }
    });
  } catch (error) {
    console.error('Error in image analysis:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An error occurred during image analysis'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(req) // Include dynamic CORS headers in error response
      },
      status: 500  // Changed from 400 to 500 since this is a server error
    });
  }
});
