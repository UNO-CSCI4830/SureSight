import { serve } from 'https://deno.land/std@0.204.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import vision from 'https://esm.sh/@google-cloud/vision'

// Create a Google Cloud Vision client using credentials from environment variable
const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(Deno.env.get('GOOGLE_VISION_CREDENTIALS') || '{}'),
})

serve(async (req: Request) => {
  try {
    // Extract request data
    const { imageUrl, imageId } = await req.json()
    
    // Create a Supabase client (for updating the database with results)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Call the Google Vision API
    const [result] = await client.labelDetection(imageUrl)
    const labels = result.labelAnnotations || []
    
    // Check for damage-related labels
    // This list can be expanded based on your specific damage detection needs
    const damageLabels = [
      'damage', 'broken', 'crack', 'dent', 'destruction', 
      'worn', 'rot', 'mold', 'leak', 'water damage', 
      'fire damage', 'structural damage', 'deterioration'
    ]
    
    const damageDetected = labels.some(label => 
      damageLabels.some(damageType => 
        label.description?.toLowerCase().includes(damageType)
      )
    )
    
    // Calculate confidence score for damage detection
    const confidenceScore = damageDetected ? 
      Math.max(...labels
        .filter(label => damageLabels.some(d => 
          label.description?.toLowerCase().includes(d))
        )
        .map(label => label.score || 0)
      ) : 0
    
    // Store analysis results in database
    const { error } = await supabaseClient
      .from('image_analysis')
      .insert({
        image_id: imageId,
        damage_detected: damageDetected,
        confidence: confidenceScore,
        raw_results: labels,
        analyzed_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        damage_detected: damageDetected,
        confidence: confidenceScore,
        analysis: labels
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in image analysis:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred during image analysis' 
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})