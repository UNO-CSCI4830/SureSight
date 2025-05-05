import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, handleSupabaseError } from '../../../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reportId } = req.query;
  
  // Ensure reportId is a string 
  const reportIdString = Array.isArray(reportId) ? reportId[0] : reportId;
  
  if (!reportIdString) {
    return res.status(400).json({ message: 'Report ID is required' });
  }
  
  try {
    // Get current user from session to verify authorization
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = session.user.id;

    // Check if user has permission to manage collaborators
    const { data: canManage, error: permissionError } = await supabase.rpc(
      'user_has_manage_access',
      { 
        p_user_id: userId,
        p_report_id: reportIdString
      }
    );

    if (permissionError || !canManage) {
      return res.status(403).json({ message: 'You do not have permission to manage collaborators for this report' });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await getCollaborators(req, res, reportIdString);
      case 'POST':
        return await addCollaborator(req, res, reportIdString, userId);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}

async function getCollaborators(req: NextApiRequest, res: NextApiResponse, reportId: string) {
  const { data: collaborators, error } = await supabase
    .from('report_collaborators')
    .select(`
      *,
      user:user_id(
        id,
        email,
        profiles(
          first_name,
          last_name,
          avatar_url,
          role
        )
      )
    `)
    .eq('report_id', reportId);

  if (error) {
    throw error;
  }

  return res.status(200).json({ collaborators });
}

async function addCollaborator(
  req: NextApiRequest, 
  res: NextApiResponse, 
  reportId: string, 
  inviterId: string
) {
  const { userId, email, roleType, permissionLevel } = req.body;

  if (!roleType || !permissionLevel) {
    return res.status(400).json({ message: 'Role type and permission level are required' });
  }

  if (!userId && !email) {
    return res.status(400).json({ message: 'Either user ID or email must be provided' });
  }

  let targetUserId = userId;
  let invitationStatus = 'accepted';

  // If no userId provided but email is, create a pending invitation
  if (!targetUserId && email) {
    // Check if user exists with this email
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    targetUserId = existingUser?.id;
    invitationStatus = existingUser ? 'pending' : 'pending';
  }

  // Check if collaborator already exists for this report
  if (targetUserId) {
    const { data: existingCollaborator, error: checkError } = await supabase
      .from('report_collaborators')
      .select('id')
      .eq('report_id', reportId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingCollaborator) {
      return res.status(409).json({
        message: 'This user is already a collaborator on this report'
      });
    }
  }

  // Create the collaborator record
  const collaboratorData = {
    report_id: reportId,
    user_id: targetUserId,
    role_type: roleType,
    permission_level: permissionLevel,
    invited_by: inviterId,
    invitation_status: invitationStatus,
    invitation_email: !targetUserId ? email : undefined
  };

  const { data: collaborator, error } = await supabase
    .from('report_collaborators')
    .insert(collaboratorData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Send notification to user if they exist
  if (targetUserId) {
    await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        notification_type: 'collaboration_invite',
        title: 'Collaboration Invitation',
        message: 'You have been invited to collaborate on a report',
        related_id: reportId,
        is_read: false
      });
  }
  // Otherwise, send email invitation (would need to be implemented separately)

  return res.status(201).json({
    message: 'Collaborator added successfully',
    collaborator
  });
}