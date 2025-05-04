import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { collaborationNotificationService } from '../../../../services/collaborationNotificationService';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the authenticated user from Supabase
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    });
  }

  // Get report ID from path parameter
  const { id: reportId } = req.query;

  // Get the database user ID from the auth user ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, profiles:profiles(first_name, last_name)')
    .eq('auth_user_id', session.user.id)
    .single();

  if (userError) {
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve user data',
    });
  }

  // Check if user has access to the report
  const { data: reportAccess, error: reportError } = await supabase
    .from('reports')
    .select('id, title, creator_id')
    .eq('id', reportId)
    .single();

  if (reportError || !reportAccess) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Report not found',
    });
  }

  // Check if the user is the creator or a collaborator with appropriate permissions
  const isCreator = reportAccess.creator_id === userData.id;

  if (!isCreator) {
    const { data: collaboratorAccess, error: collaboratorError } = await supabase
      .from('report_collaborators')
      .select('permission_level')
      .eq('report_id', reportId)
      .eq('user_id', userData.id)
      .single();

    if (collaboratorError || !collaboratorAccess || !['manager', 'editor'].includes(collaboratorAccess.permission_level)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to modify collaborators for this report',
      });
    }
  }

  // Handle GET - List collaborators
  if (req.method === 'GET') {
    try {
      const { data: collaborators, error: fetchError } = await supabase
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

      if (fetchError) throw fetchError;

      return res.status(200).json({
        success: true,
        collaborators: collaborators || [],
      });
    } catch (error: any) {
      console.error('Error fetching collaborators:', error);
      return res.status(500).json({
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // Handle POST - Add a new collaborator
  if (req.method === 'POST') {
    try {
      const { email, roleType, permissionLevel } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email is required',
        });
      }

      // Find the user by email
      const { data: invitedUser, error: userLookupError } = await supabase
        .from('users')
        .select('id, email, profiles(first_name, last_name)')
        .eq('email', email.toLowerCase())
        .single();

      // Create the invitation
      const collaborationId = uuidv4();
      let invitationData: any = {
        id: collaborationId,
        report_id: reportId,
        invited_by: userData.id,
        role_type: roleType || 'viewer',
        permission_level: permissionLevel || 'viewer',
        invitation_status: 'pending',
        invitation_email: email.toLowerCase(),
      };

      if (invitedUser) {
        // User already exists in the system
        invitationData.user_id = invitedUser.id;
      }

      const { error: insertError } = await supabase
        .from('report_collaborators')
        .insert(invitationData);

      if (insertError) throw insertError;

      // Send notification if the user exists
      if (invitedUser) {
        const inviterName = `${userData.profiles.first_name} ${userData.profiles.last_name}`;
        await collaborationNotificationService.notifyCollaborationInvite(
          invitedUser.id,
          reportId as string,
          reportAccess.title,
          inviterName,
          roleType || 'viewer'
        );
      }

      return res.status(200).json({
        success: true,
        collaborationId,
        message: 'Collaboration invitation sent',
      });
    } catch (error: any) {
      console.error('Error adding collaborator:', error);
      return res.status(500).json({
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // Return 405 for other methods
  return res.status(405).json({
    error: 'Method Not Allowed',
    message: `The ${req.method} method is not allowed on this endpoint`,
  });
}