import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query;

  if (!user_id || Array.isArray(user_id)) {
    return res.status(400).json({ error: 'User ID must be a single string' });
  }

  try {   
    // Using foreign key relationship properly with auth_user_id
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        is_read,
        created_at,
        sender:sender_id(email),
        receiver:receiver_id(email)
      `)
      .eq('receiver_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('API error in /api/notis:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}
