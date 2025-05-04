import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { collaborationNotificationService } from '../../../../../services/collaborationNotificationService';

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

  // Get report ID and user ID from path parameters
  const { id: reportId, userId: targetUserId } = req.query;

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

  // Get report information for notifications
  const { data: reportData, error: reportError } = await supabase
    .from('reports')
    .select('id, title, creator_id')
    .eq('id', reportId)
    .single();

  if (reportError) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Report not found',
    });
  }

  // Check permissions - the user must be either the report creator or the target user
  const isReportOwner = reportData.creator_id === userData.id;
  const isTargetUser = targetUserId === userData.id;

  // Handle PUT - Update collaboration status
  if (req.method === 'PUT') {
    try {
      const { status, permissionLevel } = req.body;

      // Updating permission level (only report owner can do this)
      if (permissionLevel && !isReportOwner) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only the report owner can change permission levels',
        });
      }

      // Updating status (can be done by user accepting/declining an invitation)
      if (status && !isReportOwner && !isTargetUser) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to change this collaboration status',
        });
      }

      // Build the update object
      const updateData: any = {};
      if (status) updateData.invitation_status = status;
      if (permissionLevel) updateData.permission_level = permissionLevel;

      // Update the collaboration
      const { data: updatedCollab, error: updateError } = await supabase
        .from('report_collaborators')
        .update(updateData)
        .eq('report_id', reportId)
        .eq('user_id', targetUserId)
        .select(`
          *,
          user:user_id(
            profiles(first_name, last_name)
          )
        `)
        .single();

      if (updateError) throw updateError;

      // Send notification if the user accepted the invitation
      if (status === 'accepted' && isTargetUser) {
        const collaboratorName = `${userData.profiles.first_name} ${userData.profiles.last_name}`;
        await collaborationNotificationService.notifyCollaborationAccepted(
          reportData.creator_id,
          reportId as string,
          reportData.title,
          collaboratorName
        );
      }

      return res.status(200).json({
        success: true,
        collaboration: updatedCollab,
        message: 'Collaboration updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating collaboration:', error);
      return res.status(500).json({
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // Handle DELETE - Remove a collaborator
  if (req.method === 'DELETE') {
    try {
      // Only report owner or the collaborator themselves can delete a collaboration
      if (!isReportOwner && !isTargetUser) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to remove this collaborator',
        });
      }

      const { error: deleteError } = await supabase
        .from('report_collaborators')
        .delete()
        .eq('report_id', reportId)
        .eq('user_id', targetUserId);

      if (deleteError) throw deleteError;

      return res.status(200).json({
        success: true,
        message: 'Collaborator removed successfully',
      });
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
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