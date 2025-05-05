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
    const { reportId } = req.query;
    const { 
      limit = 20, 
      offset = 0
    } = req.query;

    // Handle reportId which can be string | string[] | undefined
    const reportIdString = Array.isArray(reportId) ? reportId[0] : reportId;
    
    if (!reportIdString) {
      return res.status(400).json({ message: 'Report ID is required' });
    }

    // First, verify that the user has access to this report
    const { data: hasAccess, error: accessError } = await supabase.rpc(
      'user_has_report_access',
      { 
        p_user_id: userId,
        p_report_id: reportIdString
      }
    );

    if (accessError || !hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this report' });
    }

    // Get all messages related to this report
    const { data: messages, error: messagesError, count } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(
          id,
          profiles(
            first_name,
            last_name,
            avatar_url
          )
        ),
        receiver:receiver_id(
          id,
          profiles(
            first_name,
            last_name,
            avatar_url
          )
        )
      `, { count: 'exact' })
      .eq('report_id', reportIdString)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (messagesError) {
      throw messagesError;
    }

    // Mark messages as read if the current user is the receiver
    const messagesToMark = messages
      .filter(msg => msg.receiver_id === userId && !msg.is_read)
      .map(msg => msg.id);
    
    if (messagesToMark.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messagesToMark);
    }

    return res.status(200).json({
      messages,
      total: count,
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit)
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}