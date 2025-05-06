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

    // Extract activity data from request body
    const {
      user_id,
      report_id,
      activity_type,
      details
    } = req.body;

    // Validate required fields
    if (!user_id || !activity_type || !details) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert activity record into the database
    const { data, error } = await supabase
      .from('activities')
      .insert({
        user_id,
        report_id,
        activity_type,
        details // Pass object directly, server-side code handles JSON conversion properly
      })
      .select('id')
      .single();

    if (error) {
      console.error('Server-side error inserting activity:', error);
      return res.status(500).json({ 
        error: 'Failed to record activity',
        details: error
      });
    }

    // If successful, return the activity ID
    return res.status(200).json({ 
      success: true, 
      id: data.id 
    });
  } catch (err) {
    console.error('Unexpected error in store-image-activity API:', err);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: err instanceof Error ? err.message : String(err)
    });
  }
}