import { serve } from 'https://deno.land/std@0.204.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import vision from 'https://esm.sh/@google-cloud/vision'

// Create a Google Cloud Vision client using credentials from environment variable
const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(Deno.env.get('GOOGLE_VISION_CREDENTIALS') || '{}'),
})

// Types for damage analysis
interface DamageAssessment {
  damageDetected: boolean;
  damageType: string[];
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  affectedAreas: string[];
  confidenceScore: number;
}

// Request interface
interface AnalyzeImageRequest {
  imageUrl: string;
  imageId: string;
  propertyId?: string;
  reportId?: string;
  assessmentAreaId?: string;
}

serve(async (req: Request) => {
  try {
    // Extract request data
    const { imageUrl, imageId, propertyId, reportId, assessmentAreaId } = await req.json() as AnalyzeImageRequest
    
    // Create a Supabase client (for updating the database with results)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // First, validate that the image exists and get any missing relationship IDs
    const { data: imageData, error: imageError } = await supabaseClient
      .from('images')
      .select('id, report_id, assessment_area_id')
      .eq('id', imageId)
      .single();
    
    if (imageError || !imageData) {
      throw new Error(`Image not found: ${imageError?.message || 'Unknown error'}`)
    }
    
    // Get property ID from report if not provided
    let finalPropertyId = propertyId;
    let finalReportId = reportId || imageData.report_id;
    
    if (!finalPropertyId && finalReportId) {
      const { data: reportData, error: reportError } = await supabaseClient
        .from('reports')
        .select('property_id')
        .eq('id', finalReportId)
        .single();
      
      if (!reportError && reportData) {
        finalPropertyId = reportData.property_id;
      }
    }
    
    // Perform comprehensive image analysis
    const damageAssessment = await analyzeDamage(imageUrl)
    
    // Store analysis results in database
    const { data: analysisData, error } = await supabaseClient
      .from('image_analysis')
      .insert({
        image_id: imageId,
        property_id: finalPropertyId,
        report_id: finalReportId,
        assessment_area_id: assessmentAreaId || imageData.assessment_area_id,
        damage_detected: damageAssessment.damageDetected,
        damage_types: damageAssessment.damageType,
        damage_severity: damageAssessment.severity,
        affected_areas: damageAssessment.affectedAreas,
        confidence: damageAssessment.confidenceScore,
        raw_results: damageAssessment.rawData,
        analyzed_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisData,
        ...damageAssessment
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

/**
 * Comprehensive damage analysis using multiple Google Vision API features
 */
async function analyzeDamage(imageUrl: string): Promise<DamageAssessment & { rawData: any }> {
  // Run multiple types of analysis in parallel for efficiency
  const [
    labelResults,
    objectResults,
    safeSearchResults,
    textResults
  ] = await Promise.all([
    client.labelDetection(imageUrl),
    client.objectLocalization(imageUrl),
    client.safeSearchDetection(imageUrl),
    client.textDetection(imageUrl)
  ]);

  // Extract results
  const labels = labelResults[0]?.labelAnnotations || [];
  const objects = objectResults[0]?.localizedObjectAnnotations || [];
  const safeSearch = safeSearchResults[0]?.safeSearchAnnotation || {};
  const textAnnotations = textResults[0]?.textAnnotations || [];

  // Lists for different types of damage and structural elements
  const damageLabels = [
    'damage', 'broken', 'crack', 'dent', 'destruction', 
    'worn', 'rot', 'mold', 'leak', 'water damage', 
    'fire damage', 'structural damage', 'deterioration',
    'debris', 'collapse', 'hole', 'rust', 'corrosion',
    'stain', 'discoloration', 'warping', 'peeling'
  ];
  
  const structuralElements = [
    'roof', 'wall', 'ceiling', 'floor', 'window', 'door', 
    'foundation', 'siding', 'gutter', 'fence', 'deck',
    'porch', 'balcony', 'stairs', 'garage', 'basement'
  ];

  // STEP 1: Detect damage from labels
  const damageMatches = labels.filter(label => 
    damageLabels.some(damageType => 
      label.description?.toLowerCase().includes(damageType)
    )
  );
  
  let damageDetected = damageMatches.length > 0;
  
  // STEP 2: Identify damage types
  const damageTypes = damageMatches.map(match => {
    const matchingLabel = damageLabels.find(label => 
      match.description?.toLowerCase().includes(label)
    );
    return matchingLabel || match.description?.toLowerCase() || '';
  }).filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
  
  // STEP 3: Identify affected structural elements
  const affectedAreas = [];
  
  // From object detection
  for (const object of objects) {
    const objectName = object.name?.toLowerCase() || '';
    if (structuralElements.some(element => objectName.includes(element))) {
      affectedAreas.push(objectName);
    }
  }
  
  // From labels
  for (const label of labels) {
    const labelDesc = label.description?.toLowerCase() || '';
    if (structuralElements.some(element => labelDesc.includes(element))) {
      affectedAreas.push(labelDesc);
    }
  }
  
  // STEP 4: Analyze text in image for damage reports or measurements
  const textContent = textAnnotations[0]?.description?.toLowerCase() || '';
  if (textContent) {
    // Check for damage-related text
    if (damageLabels.some(label => textContent.includes(label))) {
      damageDetected = true;
      
      // Extract the damage type from text
      for (const label of damageLabels) {
        if (textContent.includes(label) && !damageTypes.includes(label)) {
          damageTypes.push(label);
        }
      }
    }
    
    // Check for mentioned structural elements
    for (const element of structuralElements) {
      if (textContent.includes(element) && !affectedAreas.includes(element)) {
        affectedAreas.push(element);
      }
    }
  }
  
  // STEP 5: Calculate confidence score and severity
  let confidenceScore = 0;
  if (damageDetected) {
    // Use the highest confidence score from damage-related labels
    confidenceScore = Math.max(
      ...damageMatches.map(label => label.score || 0),
      0.1 // Minimum confidence if damage detected but no scores available
    );
  }
  
  // Determine severity based on confidence and number of damage types
  let severity: 'none' | 'minor' | 'moderate' | 'severe' = 'none';
  if (damageDetected) {
    if (confidenceScore > 0.8 || damageTypes.length > 3) {
      severity = 'severe';
    } else if (confidenceScore > 0.5 || damageTypes.length > 1) {
      severity = 'moderate';
    } else {
      severity = 'minor';
    }
  }
  
  // Return comprehensive assessment
  return {
    damageDetected,
    damageType: [...new Set(damageTypes)], // Ensure unique values
    severity,
    affectedAreas: [...new Set(affectedAreas)], // Ensure unique values
    confidenceScore,
    rawData: {
      labels,
      objects,
      safeSearch,
      textAnnotations
    }
  };
}