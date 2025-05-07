import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ImageAnnotatorClient } from 'https://esm.sh/@google-cloud/vision@3.1.3'

// Load the Google Vision API credentials from the environment variables or from the credentials file
// We'll need to set this in the Supabase dashboard under functions settings
const GOOGLE_VISION_CREDENTIALS = Deno.env.get('GOOGLE_VISION_CREDENTIALS') || '{}';

// Create a Google Cloud Vision client
const client = new ImageAnnotatorClient({
  credentials: JSON.parse(GOOGLE_VISION_CREDENTIALS),
});

// Damage-related keywords to look for in the Vision API results
const DAMAGE_KEYWORDS = [
  'damage', 'broken', 'crack', 'dent', 'destruction', 'hail damage',
  'worn', 'rot', 'mold', 'leak', 'water damage', 'fire damage', 
  'structural damage', 'deterioration', 'roof damage', 'siding damage',
  'storm damage', 'wind damage', 'debris'
];

serve(async (req: Request) => {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('', { headers });
    }

    // Parse the request body
    const { imageUrl, imageId } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers }
      );
    }
    
    // Create a Supabase client for writing back to the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    console.log(`Analyzing image: ${imageId} at ${imageUrl}`);

    // Call Google Vision API for label detection
    const [labelResponse] = await client.labelDetection(imageUrl);
    const labels = labelResponse.labelAnnotations || [];

    // Call Google Vision API for safe search detection
    const [safeSearchResponse] = await client.safeSearchDetection(imageUrl);
    const safeSearch = safeSearchResponse.safeSearchAnnotation;

    // Call Google Vision API for text detection (for any text in the image)
    const [textResponse] = await client.textDetection(imageUrl);
    const textAnnotations = textResponse.textAnnotations || [];

    // Call Google Vision API for damage detection (actually uses object localization)
    const [objectResponse] = await client.objectLocalization(imageUrl);
    const objects = objectResponse.localizedObjectAnnotations || [];

    // Combine all results for analysis
    const allFeatures = {
      labels,
      safeSearch,
      textAnnotations,
      objects
    };

    // Look for damage-related labels and calculate confidence
    const damageLabels = labels.filter(label => 
      DAMAGE_KEYWORDS.some(keyword => 
        label.description && label.description.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    // Determine if damage is detected (either by labels or objects)
    let damageDetected = damageLabels.length > 0;
    let highestConfidence = 0;

    // Calculate the highest confidence score from damage labels
    if (damageLabels.length > 0) {
      highestConfidence = Math.max(...damageLabels.map(label => label.score || 0));
    }

    // Also look for damage-related objects
    const damageObjects = objects.filter(obj => 
      obj.name && ['Building', 'House', 'Roof', 'Window', 'Wall'].includes(obj.name)
    );

    // If we have building parts with high confidence, add to detection
    if (damageObjects.length > 0) {
      const buildingConfidence = Math.max(...damageObjects.map(obj => obj.score || 0));
      
      // If we have building parts and damage labels, increase confidence
      if (damageLabels.length > 0) {
        highestConfidence = Math.max(highestConfidence, buildingConfidence * 0.9);
      }
    }

    // Compile the analysis results
    const analysisResults = {
      damage_detected: damageDetected,
      confidence: highestConfidence,
      analysis: labels, // Send back all labels for further processing
      damage_labels: damageLabels.map(label => label.description),
      objects: objects.map(obj => obj.name),
      text_detected: textAnnotations.length > 0 ? textAnnotations[0].description : null
    };

    console.log(`Analysis complete for image: ${imageId}`, {
      damage_detected: damageDetected,
      confidence: highestConfidence,
      damage_labels: damageLabels.map(label => label.description),
      objects_count: objects.length
    });

    return new Response(
      JSON.stringify(analysisResults),
      { headers }
    );
  } catch (error) {
    console.error('Error analyzing image:', error);
    
    return new Response(
      JSON.stringify({ error: `Error analyzing image: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
})