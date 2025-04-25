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
      analyzed_at: new Date().toISOString(),
      user_id: authData.user.id
    });

    if (dbError) {
      return res.status(500).json({ error: `Failed to save analysis results: ${dbError.message}` });
    }

    // Return successful response with analysis data
    return res.status(200).json({
      success: true,
      analysis: analysisData
    });
    
  } catch (error: any) {
    return res.status(500).json({ error: `Unexpected error: ${error.message}` });
  }
}