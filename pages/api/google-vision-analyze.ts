import { NextApiRequest, NextApiResponse } from 'next';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { supabase } from '../../utils/supabaseClient';

/**
 * Direct Google Vision API analysis endpoint
 * Uses the GOOGLE_VISION_CREDENTIALS environment variable
 */
export default async function handleGoogleVisionAnalysis(req: NextApiRequest, res: NextApiResponse) {
  console.log('Google Vision API endpoint called');
  
  // Only allow POST method
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if this is an internal API call (from our analyze-image-proxy endpoint)
  // The proxy adds a special header we can check
  const isInternalRequest = req.headers['x-internal-api-call'] === 'true';
  let userId: string | null = null;

  console.log('Is internal API request:', isInternalRequest);

  if (!isInternalRequest) {
    // Only verify authentication for external requests
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        console.log('Authentication required - error:', authError);
        return res.status(401).json({ error: 'Authentication required' });
      }
      userId = authData.user.id;
      console.log('Authenticated user ID:', userId);
    } catch (authEx) {
      console.error('Authentication exception:', authEx);
      return res.status(401).json({ error: 'Authentication failed', details: authEx instanceof Error ? authEx.message : 'Unknown auth error' });
    }
  } else {
    console.log('Processing internal API request, skipping authentication check');
    // Use a service account user ID for internal requests
    userId = process.env.SERVICE_ACCOUNT_ID || 'system';
    console.log('Using service account ID:', userId);
  }

  // Extract request parameters
  const { imageId, imageUrl } = req.body;
  console.log('Request parameters - imageId:', imageId, 'imageUrl:', imageUrl?.substring(0, 50) + '...');

  if (!imageUrl) {
    console.log('Missing required parameter: imageUrl');
    return res.status(400).json({ error: 'Image URL is required' });
  }

  if (!imageId) {
    console.log('Missing required parameter: imageId');
    return res.status(400).json({ error: 'Image ID is required' });
  }

  try {
    // Get credentials from environment variable
    const credentialsEnv = process.env.GOOGLE_VISION_CREDENTIALS;
    
    if (!credentialsEnv) {
      console.error('Google Vision credentials not configured');
      return res.status(500).json({ 
        error: 'Google Vision credentials not configured',
        details: 'The GOOGLE_VISION_CREDENTIALS environment variable is not set'
      });
    }
    
    // Check if the credentials value looks valid (should be a JSON object in string form)
    if (!credentialsEnv.includes('{') || !credentialsEnv.includes('}')) {
      console.error('Invalid Google Vision credentials format - does not appear to be JSON');
      return res.status(500).json({ 
        error: 'Invalid Google Vision credentials format',
        details: 'The credentials do not appear to be in valid JSON format'
      });
    }
    
    console.log('Google Vision credentials present, attempting to parse');
    
    let credentials;
    try {
      // Parse the credentials JSON string
      credentials = JSON.parse(credentialsEnv);
      
      // Basic validation of the credentials object
      if (!credentials.type || !credentials.project_id || !credentials.private_key) {
        console.error('Parsed credentials missing required properties');
        return res.status(500).json({ 
          error: 'Invalid Google Vision credentials',
          details: 'The credentials are missing required properties'
        });
      }
      
      console.log('Successfully parsed Google Vision credentials for project:', credentials.project_id);
    } catch (parseError) {
      console.error('Error parsing Google Vision credentials:', parseError);
      return res.status(500).json({ 
        error: 'Invalid Google Vision credentials format',
        details: 'The credentials could not be parsed as valid JSON'
      });
    }

    // Initialize the Google Vision client with explicit type assertion
    console.log('Initializing Google Vision client');
    const visionClient = new ImageAnnotatorClient({ credentials });
    console.log('Google Vision client initialized successfully');

    // Default empty results 
    let labels: any[] = [];
    let objects: any[] = [];
    let texts: any[] = [];
    let colors: any[] = [];

    // Use a simpler approach that avoids TypeScript issues
    try {
      console.log('Calling Google Vision API for label detection');
      const [labelResponse] = await (visionClient as any).labelDetection(imageUrl);
      labels = labelResponse?.labelAnnotations || [];
      console.log(`Label detection complete - found ${labels.length} labels`);
    } catch (error) {
      console.error('Error during label detection:', error);
    }

    try {
      console.log('Calling Google Vision API for object localization');
      const [objectResponse] = await (visionClient as any).objectLocalization(imageUrl);
      objects = objectResponse?.localizedObjectAnnotations || [];
      console.log(`Object localization complete - found ${objects.length} objects`);
    } catch (error) {
      console.error('Error during object localization:', error);
    }

    try {
      console.log('Calling Google Vision API for text detection');
      const [textResponse] = await (visionClient as any).textDetection(imageUrl);
      texts = textResponse?.textAnnotations || [];
      console.log(`Text detection complete - found ${texts.length} text annotations`);
    } catch (error) {
      console.error('Error during text detection:', error);
    }

    try {
      console.log('Calling Google Vision API for image properties');
      const [propertiesResponse] = await (visionClient as any).imageProperties(imageUrl);
      colors = propertiesResponse?.imagePropertiesAnnotation?.dominantColors?.colors || [];
      console.log(`Image properties analysis complete - found ${colors.length} colors`);
    } catch (error) {
      console.error('Error during image properties analysis:', error);
    }

    // Define damage type keywords matching our existing analysis
    const DAMAGE_TYPES = {
      ROOF: {
        keywords: [
          'roof damage', 'shingle damage', 'missing shingles', 'roof leak', 
          'damaged roof', 'hole in roof', 'broken shingles', 'roof deterioration',
          'roof wear', 'roof aging', 'roofing', 'shingle', 'asphalt shingle'
        ],
        threshold: 0.65
      },
      SIDING: {
        keywords: [
          'siding damage', 'damaged siding', 'vinyl siding damage', 'wood siding damage',
          'siding hole', 'broken siding', 'cracked siding', 'warped siding',
          'siding deterioration', 'siding', 'vinyl siding', 'aluminum siding', 'wood siding'
        ],
        threshold: 0.65
      },
      GUTTER: {
        keywords: [
          'gutter damage', 'damaged gutter', 'gutter deterioration', 'broken gutter',
          'leaking gutter', 'gutter', 'rain gutter'
        ],
        threshold: 0.7
      },
      WINDOW: {
        keywords: [
          'window damage', 'broken window', 'cracked window', 'window leak',
          'window', 'windowpane', 'window frame'
        ],
        threshold: 0.7
      }
    };

    console.log('Analyzing results for damage detection');
    
    // Detect damage type
    const detectedDamageTypes: any[] = [];
    let highestConfidence = 0;
    let primaryDamageType = 'other';

    // Process all detection categories
    for (const [category, config] of Object.entries(DAMAGE_TYPES)) {
      const { keywords, threshold } = config as { keywords: string[], threshold: number };
      
      // Check for matches in labels
      for (const label of labels) {
        const description = label.description?.toLowerCase() || '';
        if (keywords.some(keyword => description.includes(keyword.toLowerCase())) 
            && (label.score || 0) > threshold) {
          detectedDamageTypes.push({
            type: category.toLowerCase(),
            confidence: label.score,
            source: 'label',
            description
          });
          
          if ((label.score || 0) > highestConfidence) {
            highestConfidence = label.score || 0;
            primaryDamageType = category.toLowerCase();
          }
        }
      }
      
      // Check for matches in objects
      for (const object of objects) {
        const name = object.name?.toLowerCase() || '';
        if (keywords.some(keyword => name.includes(keyword.toLowerCase())) 
            && (object.score || 0) > threshold) {
          detectedDamageTypes.push({
            type: category.toLowerCase(),
            confidence: object.score,
            source: 'object',
            description: name
          });
          
          if ((object.score || 0) > highestConfidence) {
            highestConfidence = object.score || 0;
            primaryDamageType = category.toLowerCase();
          }
        }
      }
    }

    // Look for damage keywords in text
    const damageKeywords = ['damage', 'broken', 'crack', 'leak', 'deterioration', 'wear', 'tear', 'hole', 'missing'];
    let textDamageConfidence = 0;
    
    if (texts.length > 0 && texts[0]?.description) {
      const fullText = texts[0].description.toLowerCase();
      const damageMatches = damageKeywords.filter(keyword => fullText.includes(keyword.toLowerCase()));
      
      if (damageMatches.length > 0) {
        textDamageConfidence = 0.7 + (damageMatches.length * 0.05);
        textDamageConfidence = Math.min(textDamageConfidence, 0.95); // Cap at 0.95
        console.log(`Found ${damageMatches.length} damage keywords in text, confidence: ${textDamageConfidence}`);
      }
    }

    // Determine damage detected status and confidence
    const damageDetected = detectedDamageTypes.length > 0 || textDamageConfidence > 0;
    const overallConfidence = Math.max(highestConfidence, textDamageConfidence);
    
    console.log('Damage detected:', damageDetected);
    console.log('Primary damage type:', primaryDamageType);
    console.log('Overall confidence:', overallConfidence);
    
    // Determine severity based on confidence
    let severity = 'unknown';
    if (overallConfidence > 0) {
      if (overallConfidence > 0.9) {
        severity = 'severe';
      } else if (overallConfidence > 0.8) {
        severity = 'moderate';
      } else if (overallConfidence > 0.7) {
        severity = 'minor';
      } else {
        severity = 'potential';
      }
    }
    console.log('Determined severity:', severity);

    // Build the analysis results
    const analysisData = {
      damage_detected: damageDetected,
      damage_type: damageDetected ? primaryDamageType : null,
      confidence: overallConfidence > 0 ? parseFloat(overallConfidence.toFixed(2)) : null,
      severity: damageDetected ? severity : null,
      analysis: {
        labels: labels.map(l => ({ description: l.description, score: l.score })),
        objects: objects.map(o => ({ name: o.name, score: o.score })),
        texts: texts.length > 0 ? texts[0]?.description : '',
        colors: colors.map((c: any) => ({ 
          color: c.color, 
          score: c.score, 
          pixelFraction: c.pixelFraction
        })),
        detectedDamageTypes
      }
    };

    console.log('Analysis complete, saving results to database');
    
    // Save to image_analysis table
    const { error: dbError } = await supabase
      .from('image_analysis')
      .insert({
        image_id: imageId,
        damage_detected: analysisData.damage_detected,
        damage_type: analysisData.damage_type,
        confidence: analysisData.confidence,
        severity: analysisData.severity,
        raw_results: analysisData.analysis,
        analyzed_at: new Date().toISOString(),
        user_id: userId
      });

    if (dbError) {
      console.error('Failed to save analysis results:', dbError);
      return res.status(500).json({ error: `Failed to save analysis results: ${dbError.message}` });
    }

    // Update the images table with AI analysis results
    const { error: imageUpdateError } = await supabase
      .from('images')
      .update({
        ai_processed: true,
        ai_damage_type: analysisData.damage_type,
        ai_damage_severity: analysisData.severity,
        ai_confidence: analysisData.confidence
      })
      .eq('id', imageId);

    if (imageUpdateError) {
      console.error('Failed to update image with analysis results:', imageUpdateError);
      // We continue anyway since the analysis table has the data
    }

    console.log('Successfully completed analysis and database updates');
    
    // Return successful response with analysis data
    return res.status(200).json({
      success: true,
      analysis: {
        damage_detected: analysisData.damage_detected,
        damage_type: analysisData.damage_type,
        confidence: analysisData.confidence,
        severity: analysisData.severity,
        details: analysisData.analysis
      }
    });
    
  } catch (error: any) {
    console.error('Error analyzing image with Google Vision:', error);
    return res.status(500).json({ 
      error: `Unexpected error during Google Vision analysis: ${error.message}`,
      details: error.stack
    });
  }
}