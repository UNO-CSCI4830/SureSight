import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import vision from 'https://esm.sh/@google-cloud/vision'

// Create a Google Cloud Vision client using credentials from environment variable
const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(Deno.env.get('GOOGLE_VISION_CREDENTIALS') || '{}'),
})

// Damage detection configuration
const DAMAGE_TYPES = {
  ROOF: {
    keywords: ['roof damage', 'shingle damage', 'missing shingles', 'roof leak', 'damaged roof', 'roof hole', 'broken shingles', 'roof deterioration', 'roof wear'],
    type: 'roof'
  },
  SIDING: {
    keywords: ['siding damage', 'vinyl damage', 'damaged siding', 'siding dent', 'siding hole', 'broken siding', 'warped siding', 'siding deterioration'],
    type: 'siding'
  },
  WINDOW: {
    keywords: ['window damage', 'broken window', 'window crack', 'damaged window', 'window leak'],
    type: 'window'
  },
  STRUCTURAL: {
    keywords: ['structural damage', 'foundation damage', 'wall damage', 'building damage', 'structural issue'],
    type: 'structural'
  },
  WATER: {
    keywords: ['water damage', 'moisture damage', 'flood damage', 'water stain', 'water intrusion', 'leak'],
    type: 'water'
  }
}

// Severity detection based on confidence score ranges
const determineSeverity = (confidence: number): string => {
  if (confidence > 0.85) return 'critical'
  if (confidence > 0.7) return 'severe'
  if (confidence > 0.5) return 'moderate'
  return 'minor'
}

serve(async (req: Request) => {
  try {
    // Extract request data
    const { imageUrl, imageId } = await req.json()
    
    if (!imageUrl) {
      throw new Error('Image URL is required')
    }
    
    // Create a Supabase client (for updating the database with results)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Call multiple Google Vision API features for comprehensive analysis
    const [labelResult] = await client.labelDetection(imageUrl)
    const [objectResult] = await client.objectLocalization(imageUrl)
    const [textResult] = await client.textDetection(imageUrl)
    const [imageProperties] = await client.imageProperties(imageUrl)
    
    // Combine results for analysis
    const labels = labelResult.labelAnnotations || []
    const objects = objectResult.localizedObjectAnnotations || []
    const texts = textResult.textAnnotations || []
    const colors = imageProperties.imagePropertiesAnnotation?.dominantColors?.colors || []
    
    // Detect damage type
    const detectedDamageTypes = []
    let highestConfidence = 0
    let primaryDamageType = 'other'
    
    // Process all detection categories
    for (const [category, config] of Object.entries(DAMAGE_TYPES)) {
      const categoryDetected = {
        detected: false,
        confidence: 0,
        type: config.type
      }
      
      // Check labels for damage indicators
      for (const label of labels) {
        const description = label.description?.toLowerCase() || ''
        const score = label.score || 0
        
        for (const keyword of config.keywords) {
          if (description.includes(keyword.toLowerCase()) && score > categoryDetected.confidence) {
            categoryDetected.detected = true
            categoryDetected.confidence = score
          }
        }
      }
      
      // Check object annotations for damage indicators
      for (const object of objects) {
        const name = object.name?.toLowerCase() || ''
        const score = object.score || 0
        
        for (const keyword of config.keywords) {
          // Look for partial matches in object names since they tend to be more general
          if (keyword.toLowerCase().includes(name) || name.includes(keyword.toLowerCase())) {
            if (score > categoryDetected.confidence) {
              categoryDetected.detected = true
              categoryDetected.confidence = score
            }
          }
        }
      }
      
      if (categoryDetected.detected) {
        detectedDamageTypes.push({
          type: categoryDetected.type,
          confidence: categoryDetected.confidence
        })
        
        if (categoryDetected.confidence > highestConfidence) {
          highestConfidence = categoryDetected.confidence
          primaryDamageType = categoryDetected.type
        }
      }
    }
    
    // Determine if any damage was detected
    const damageDetected = detectedDamageTypes.length > 0
    const severity = determineSeverity(highestConfidence)
    
    // Prepare raw results for storage
    const rawResults = {
      labels: labels.map(l => ({ description: l.description, score: l.score })),
      objects: objects.map(o => ({ name: o.name, score: o.score })),
      detectedDamageTypes,
      primaryDamageType,
      severity,
      confidence: highestConfidence
    }
    
    // Store analysis results in database
    const { error } = await supabaseClient
      .from('image_analysis')
      .insert({
        image_id: imageId,
        damage_detected: damageDetected,
        damage_type: primaryDamageType,
        severity: severity,
        confidence: highestConfidence,
        raw_results: rawResults,
        analyzed_at: new Date().toISOString()
      })
    
    if (error) throw error
    
    // Also update the images table with the analysis results
    await supabaseClient
      .from('images')
      .update({
        ai_processed: true,
        ai_damage_type: primaryDamageType,
        ai_damage_severity: severity,
        ai_confidence: highestConfidence
      })
      .eq('id', imageId)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        damage_detected: damageDetected,
        damage_type: primaryDamageType,
        confidence: highestConfidence,
        severity: severity,
        analysis: rawResults
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