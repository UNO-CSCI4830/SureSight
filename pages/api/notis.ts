import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query;

  if (!user_id || Array.isArray(user_id)) {
    return res.status(400).json({ error: 'User ID must be a single string' });
  }

  try {   
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', user_id)
      .order('created_at', { ascending: false });

    console.log("Fetching messages for:", user_id);
    console.log("Returned messages:", data);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('API error in /api/notis:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}
