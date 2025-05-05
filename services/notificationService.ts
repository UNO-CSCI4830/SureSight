import { supabase } from '../utils/supabaseClient';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string; // Changed from receiver_id to recipient_id
  content: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Service for handling notification and message-related operations
 */
export class NotificationService {
  /**
   * Get all messages for a user
   */
  static async getMessages(userId: string) {
    try {
      const response = await fetch(`/api/notis?user_id=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      const data = await response.json();

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch messages'
      };
    }
  }

  /**
   * Gets notifications for a user directly from the database
   * Note: This is used by the API route and should not be called from the client
   */
  static async getNotificationsForUser(userId: string) {
    try {
      console.log("RLS DEBUG - getNotificationsForUser: Starting with userId =", userId);
      
      // First try the standard query approach
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false });
          
        console.log("RLS DEBUG - Notification query response:", { data, error });

        if (!error) {
          return data || [];
        }
        
        // If we get an error, we'll try the fallback approach
        console.log("RLS DEBUG - Error in notifications query:", error);
      } catch (queryError) {
        console.log("RLS DEBUG - Exception in notifications query:", queryError);
      }
      
      // Fallback approach - get all messages and filter client-side
      console.log("RLS DEBUG - Using fallback approach for notifications");
      const { data: allMessages, error: allMessagesError } = await supabase
        .from('messages')
        .select('*');
        
      if (allMessagesError) {
        console.error("RLS DEBUG - Fallback approach for notifications failed:", allMessagesError);
        throw allMessagesError;
      }
      
      // Filter messages for this recipient and sort by created_at
      const filteredMessages = allMessages
        .filter(msg => msg.receiver_id === userId)
        .sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        
      console.log("RLS DEBUG - Filtered notifications count:", filteredMessages.length);
      
      return filteredMessages;
    } catch (error) {
      console.error("RLS DEBUG - Fatal error in getNotificationsForUser:", error);
      // Return empty array instead of throwing to avoid 500 errors
      return [];
    }
  }

  /**
   * Mark a message as read
   */
  static async markAsRead(messageId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) throw error;

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error marking message as read:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark message as read'
      };
    }
  }

  /**
   * Send a new message
   */
  static async sendMessage(messageData: {
    sender_id: string;
    recipient_id: string; // Changed from receiver_id to recipient_id
    content: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: messageData.sender_id,
          receiver_id: messageData.recipient_id, // Map recipient_id to receiver_id
          content: messageData.content,
          is_read: false
        })
        .select();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadCount(userId: string) {
    try {
      const { data, error, count } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('recipient_id', userId) // Changed from receiver_id to recipient_id
        .eq('is_read', false);

      if (error) throw error;

      return {
        success: true,
        count: count || 0
      };
    } catch (error: any) {
      console.error('Error counting unread messages:', error);
      return {
        success: false,
        count: 0,
        error: error.message || 'Failed to count unread messages'
      };
    }
  }

  /**
   * Subscribe to real-time message updates
   * @returns A cleanup function to unsubscribe
   */
  static subscribeToMessages(callback: () => void) {
    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        callback();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        callback();
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.error('Failed to subscribe to real-time changes:', status);
        }
      });

    // Return a cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  }
}