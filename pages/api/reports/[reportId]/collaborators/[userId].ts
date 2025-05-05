import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, handleSupabaseError } from '../../../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reportId, userId } = req.query;
  
  // Ensure reportId and userId are strings 
  const reportIdString = Array.isArray(reportId) ? reportId[0] : reportId;
  const userIdString = Array.isArray(userId) ? userId[0] : userId;
  
  if (!reportIdString || !userIdString) {
    return res.status(400).json({ message: 'Report ID and User ID are required' });
  }
  
  try {
    // Get current user from session to verify authorization
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const currentUserId = session.user.id;

    // Check if user has permission to manage collaborators
    const { data: canManage, error: permissionError } = await supabase.rpc(
      'user_has_manage_access',
      { 
        p_user_id: currentUserId,
        p_report_id: reportIdString
      }
    );

    if (permissionError || !canManage) {
      return res.status(403).json({ message: 'You do not have permission to manage collaborators for this report' });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'PUT':
        return await updateCollaborator(req, res, reportIdString, userIdString);
      case 'DELETE':
        return await removeCollaborator(req, res, reportIdString, userIdString);
      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}

async function updateCollaborator(
  req: NextApiRequest, 
  res: NextApiResponse, 
  reportId: string, 
  userId: string
) {
  const { permissionLevel, roleType } = req.body;
  
  if (!permissionLevel && !roleType) {
    return res.status(400).json({ message: 'No updates provided' });
  }

  // Update the collaborator with new values
  const updateData: any = {};
  if (permissionLevel) updateData.permission_level = permissionLevel;
  if (roleType) updateData.role_type = roleType;

  const { data: updatedCollaborator, error } = await supabase
    .from('report_collaborators')
    .update(updateData)
    .eq('report_id', reportId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Create a notification for the user whose permissions were updated
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      notification_type: 'collaboration_updated',
      title: 'Collaboration Updated',
      message: 'Your permissions on a report have been updated',
      related_id: reportId,
      is_read: false
    });

  return res.status(200).json({
    message: 'Collaborator updated successfully',
    collaborator: updatedCollaborator
  });
}

async function removeCollaborator(
  req: NextApiRequest, 
  res: NextApiResponse, 
  reportId: string, 
  userId: string
) {
  // Delete the collaborator record
  const { error } = await supabase
    .from('report_collaborators')
    .delete()
    .eq('report_id', reportId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  // Create a notification for the user who was removed
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      notification_type: 'collaboration_removed',
      title: 'Collaboration Removed',
      message: 'You have been removed from a report',
      related_id: reportId,
      is_read: false
    });

  return res.status(200).json({
    message: 'Collaborator removed successfully'
  });
}