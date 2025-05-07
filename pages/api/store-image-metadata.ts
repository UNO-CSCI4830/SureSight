import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create server-side client with admin powers
    const supabaseServerClient = createServerSupabaseClient({ req, res });
    
    // Verify authentication
    const { data: { session } } = await supabaseServerClient.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract image metadata from request body
    const {
      storage_path,
      filename,
      content_type,
      file_size,
      report_id,
      assessment_area_id,
      uploaded_by
    } = req.body;

    // Validate required fields
    if (!storage_path || !filename || !uploaded_by) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert metadata into the database with explicitly null JSON fields
    const { data, error } = await supabase
      .from('images')
      .insert({
        storage_path,
        filename,
        content_type,
        file_size,
        report_id,
        assessment_area_id, 
        uploaded_by,
        metadata: null, // Explicitly set to null
        ai_processed: false,
        ai_damage_type: null,
        ai_damage_severity: null,
        ai_confidence: null
      })
      .select('id')
      .single();

    if (error) {
      console.error('Server-side error inserting image:', error);
      return res.status(500).json({ 
        error: 'Failed to store image metadata',
        details: error
      });
    }

    // If successful, return the image ID
    return res.status(200).json({ 
      success: true, 
      id: data.id 
    });
  } catch (err) {
    console.error('Unexpected error in store-image-metadata API:', err);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: err instanceof Error ? err.message : String(err)
    });
  }
}