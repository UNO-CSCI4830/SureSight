import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, handleSupabaseError } from '../../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enforce method
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get current user from session to verify authorization
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const currentUserId = session.user.id;
    const { userId } = req.query;
    
    // Only allow users to view their own conversations
    if (userId !== 'me' && userId !== currentUserId) {
      return res.status(403).json({ message: 'You can only view your own conversations' });
    }

    // Get distinct conversations for the user
    const { data, error } = await supabase.rpc(
      'get_user_conversations',
      { p_user_id: currentUserId }
    );

    if (error) {
      throw error;
    }

    return res.status(200).json({
      conversations: data
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}