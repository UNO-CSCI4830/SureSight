import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';

export default async function analyzeImageHandler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify user is authenticated
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { imageId, imageUrl } = req.body;
  
  // Validate required parameters
  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  if (!imageId) {
    return res.status(400).json({ error: 'Image ID is required' });
  }

  try {
    // Call Supabase Edge Function to analyze the image
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-image-damage', {
      body: {
        imageUrl,
        imageId
      }
    });

    if (analysisError) {
      return res.status(500).json({ error: analysisError.message });
    }

    // Save analysis results to database
    const { error: dbError } = await supabase.from('image_analysis').insert({
      image_id: imageId,
      damage_detected: analysisData.damage_detected,
      damage_type: analysisData.damage_type,
      confidence: analysisData.confidence,
      severity: analysisData.severity,
      raw_results: analysisData.analysis,
      analyzed_at: new Date().toISOString(),
      user_id: authData.user.id
    });

    if (dbError) {
      return res.status(500).json({ error: `Failed to save analysis results: ${dbError.message}` });
    }

    // Also update the images table with AI analysis results
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
    }

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
    console.error('Error analyzing image:', error);
    return res.status(500).json({ error: `Unexpected error: ${error.message}` });
  }
}