import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, handleSupabaseError } from '../../../utils/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle different HTTP methods
  switch (req.method) {
    case 'POST':
      return await sendMessage(req, res);
    case 'GET':
      return await getMessages(req, res);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function sendMessage(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get current user from session to verify authorization
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const senderId = session.user.id;
    const { 
      receiverId, 
      content, 
      messageType = 'text',
      reportId = null,
      propertyId = null
    } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    // Check if sender can access the report if reportId is provided
    if (reportId) {
      const { data: hasAccess, error: accessError } = await supabase.rpc(
        'user_has_report_access',
        { 
          p_user_id: senderId,
          p_report_id: reportId
        }
      );

      if (accessError || !hasAccess) {
        return res.status(403).json({ message: 'You do not have access to this report' });
      }
    }

    // Check if sender can access the property if propertyId is provided
    if (propertyId) {
      const { data: properties, error: propertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .limit(1);

      if (propertyError || properties.length === 0) {
        return res.status(404).json({ message: 'Property not found' });
      }
      
      // Here you would check if the user has access to this property
      // This depends on your specific access control logic
    }

    // Generate a conversation ID for the two users
    const conversationId = [senderId, receiverId].sort().join('_');

    // Send the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        message_type: messageType,
        report_id: reportId,
        property_id: propertyId,
        is_read: false,
        conversation_id: conversationId
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create a notification for the receiver
    let notificationType = 'new_message';
    let notificationContent = 'You have a new message';
    
    if (reportId) {
      notificationType = 'report_message';
      notificationContent = 'You have a new message about a report';
    } else if (propertyId) {
      notificationType = 'property_message';
      notificationContent = 'You have a new message about a property';
    }
    
    await supabase
      .from('notifications')
      .insert({
        user_id: receiverId,
        notification_type: notificationType,
        message: notificationContent,
        title: notificationType === 'new_message' ? 'New Message' : 'Report Message',
        related_id: message.id,
        is_read: false
      });

    return res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    const { message, status } = handleSupabaseError(error);
    return res.status(status).json({ message });
  }
}

async function getMessages(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get current user from session to verify authorization
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { 
      limit = 20, 
      offset = 0,
      conversationId,
      otherUserId,
      unread = false
    } = req.query;

    let query = supabase
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
      `)
      .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    // Filter by conversation ID if provided
    if (conversationId) {
      const convId = Array.isArray(conversationId) ? conversationId[0] : conversationId;
      query = query.eq('conversation_id', convId);
    }
    
    // Filter by the other user if provided
    if (otherUserId) {
      // Generate conversation ID for these two users
      const otherUser = Array.isArray(otherUserId) ? otherUserId[0] : otherUserId;
      const convId = [userId, otherUser].sort().join('_');
      query = query.eq('conversation_id', convId);
    }

    // Filter by unread if requested
    if (unread === 'true') {
      query = query.eq('receiver_id', userId).eq('is_read', false);
    }

    // Execute query with pagination
    const { data: messages, error, count } = await query
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
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