import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { collaborationNotificationService } from '../../../../services/collaborationNotificationService';

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

  // Get the user's database ID
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

  // Check if the user has access to the report (creator or collaborator)
  const { data: reportAccess, error: reportError } = await supabase
    .from('reports')
    .select('id, title')
    .eq('id', reportId)
    .eq('creator_id', userData.id);

  if (reportError) {
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to check report access',
    });
  }

  // If user is not the creator, check if they're a collaborator
  if (!reportAccess || reportAccess.length === 0) {
    const { data: collaboratorAccess, error: collaboratorError } = await supabase
      .from('report_collaborators')
      .select('*')
      .eq('report_id', reportId)
      .eq('user_id', userData.id)
      .eq('invitation_status', 'accepted');

    if (collaboratorError || !collaboratorAccess || collaboratorAccess.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this report',
      });
    }
  }

  // Handle GET - Fetch messages
  if (req.method === 'GET') {
    try {
      const { receiverId } = req.query;

      if (!receiverId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Receiver ID is required',
        });
      }

      // Create conversation ID by sorting the two user IDs
      const conversationId = [userData.id, receiverId].sort().join('_');

      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(
            id,
            profiles(first_name, last_name, avatar_url)
          ),
          receiver:receiver_id(
            id,
            profiles(first_name, last_name, avatar_url)
          )
        `)
        .eq('conversation_id', conversationId)
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Mark messages as read if they were sent to the current user
      const unreadMessages = messages
        ?.filter(msg => msg.receiver_id === userData.id && !msg.is_read)
        .map(msg => msg.id) || [];

      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages);
      }

      return res.status(200).json({
        success: true,
        messages: messages || [],
      });
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({
        error: 'Server Error',
        message: error.message,
      });
    }
  }

  // Handle POST - Send a message
  if (req.method === 'POST') {
    try {
      const { receiverId, content, messageType = 'text' } = req.body;

      if (!receiverId || !content) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Receiver ID and message content are required',
        });
      }

      // Create conversation ID by sorting the two user IDs
      const conversationId = [userData.id, receiverId].sort().join('_');

      // Insert the message
      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: userData.id,
          receiver_id: receiverId,
          content,
          message_type: messageType,
          report_id: reportId,
          is_read: false,
          conversation_id: conversationId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send notification to receiver
      const firstName = userData.profiles[0]?.first_name || 'A user';
      const lastName = userData.profiles[0]?.last_name || '';
      const senderName = `${firstName} ${lastName}`;
      await collaborationNotificationService.notifyNewMessage(
        receiverId,
        reportId as string,
        senderName,
        content
      );

      return res.status(201).json({
        success: true,
        message,
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
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