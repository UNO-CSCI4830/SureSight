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

    const userId = session.user.id;
    
    // Extract query parameters
    const { 
      limit = 10, 
      offset = 0, 
      status = 'accepted' 
    } = req.query;

    // Get all reports the user is collaborating on
    const { data: collaborations, error: collabError, count } = await supabase
      .from('report_collaborators')
      .select(`
        *,
        report:report_id(*),
        inviter:invited_by(
          id,
          profiles(
            first_name,
            last_name
          )
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('invitation_status', status)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (collabError) {
      throw collabError;
    }

    return res.status(200).json({
      collaborations,
      total: count,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit)
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}