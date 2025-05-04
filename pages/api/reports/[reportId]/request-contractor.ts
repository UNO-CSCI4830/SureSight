import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, handleSupabaseError } from '../../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enforce method
  if (req.method !== 'POST') {
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
    const { contractorId, responseDeadline, notes } = req.body;

    // Verify user has access to this report and has permission to request contractors
    const { data: reportAccess, error: accessError } = await supabase.rpc(
      'user_has_edit_access',
      { 
        p_user_id: userId,
        p_report_id: reportId
      }
    );

    if (accessError || !reportAccess) {
      return res.status(403).json({ message: 'You do not have permission to request contractors for this report' });
    }

    // Create contractor request in the database
    const { data: request, error: requestError } = await supabase
      .from('contractor_requests')
      .insert({
        report_id: reportId as string,
        contractor_id: contractorId,
        requested_by: userId,
        status: 'open',
        response_deadline: responseDeadline,
        notes
      })
      .select()
      .single();

    if (requestError) {
      throw requestError;
    }

    // Create a notification for the contractor
    if (contractorId) {
      // First get the contractor's user_id
      const { data: contractorProfile, error: profileError } = await supabase
        .from('contractor_profiles')
        .select('profiles!inner(user_id)')
        .eq('id', contractorId)
        .single();

      if (!profileError && contractorProfile) {
        const contractorUserId = contractorProfile.profiles.user_id;
        
        // Insert notification
        await supabase
          .from('notifications')
          .insert({
            user_id: contractorUserId,
            type: 'contractor_request',
            content: 'You have a new project request',
            metadata: {
              request_id: request.id,
              report_id: reportId
            },
            read: false
          });
          
        // Also send a message
        await supabase
          .from('messages')
          .insert({
            sender_id: userId,
            receiver_id: contractorUserId,
            content: `I'd like to request your services for a project. Please review the details.`,
            message_type: 'notification',
            report_id: reportId as string
          });
      }
    }

    return res.status(201).json({
      message: 'Contractor request created successfully',
      request
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}