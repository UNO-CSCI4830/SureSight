import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, handleSupabaseError } from '../../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enforce method
  if (req.method !== 'PUT') {
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
    const { contractorId, requestId } = req.body;

    // Ensure reportId is a string 
    const reportIdString = Array.isArray(reportId) ? reportId[0] : reportId;
    
    if (!reportIdString) {
      return res.status(400).json({ message: 'Report ID is required' });
    }

    // Verify user has access to this report and has permission to assign contractors
    const { data: reportAccess, error: accessError } = await supabase.rpc(
      'user_has_edit_access',
      { 
        p_user_id: userId,
        p_report_id: reportIdString
      }
    );

    if (accessError || !reportAccess) {
      return res.status(403).json({ message: 'You do not have permission to assign contractors for this report' });
    }

    // Transaction to update both the contractor request and the report
    const { data, error } = await supabase.rpc('assign_contractor_to_report', {
      p_request_id: requestId,
      p_contractor_id: contractorId,
      p_report_id: reportIdString
    });

    if (error) {
      throw error;
    }

    // Add contractor as a collaborator
    if (contractorId) {
      // First get the contractor's user_id
      const { data: contractorProfile, error: profileError } = await supabase
        .from('contractor_profiles')
        .select('profiles!inner(user_id)')
        .eq('id', contractorId)
        .single();

      if (!profileError && contractorProfile) {
        const contractorUserId = contractorProfile.profiles.user_id;

        // Check if contractor is already a collaborator
        const { data: existingCollaborator, error: collaboratorCheckError } = await supabase
          .from('report_collaborators')
          .select('id')
          .eq('report_id', reportIdString)
          .eq('user_id', contractorUserId)
          .maybeSingle();

        if (!existingCollaborator) {
          // Add as collaborator with editor permissions
          await supabase
            .from('report_collaborators')
            .insert({
              report_id: reportIdString,
              user_id: contractorUserId,
              role_type: 'contractor',
              permission_level: 'editor',
              invited_by: userId,
              invitation_status: 'accepted'
            });
        }
        
        // Insert notification
        await supabase
          .from('notifications')
          .insert({
            user_id: contractorUserId,
            notification_type: 'contractor_assigned',
            title: 'New Project Assignment',
            message: 'You have been assigned to a new project',
            related_id: reportIdString,
            is_read: false
          });
      }
    }

    return res.status(200).json({
      message: 'Contractor assigned successfully',
      success: true
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}