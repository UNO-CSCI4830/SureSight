import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  // Convert user_id to string since NextJS query params can be string or string[]
  const userId = Array.isArray(user_id) ? user_id[0] : user_id;

  // Fetch messages for the user
  try {   
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
}
