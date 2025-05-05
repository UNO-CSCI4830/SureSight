import { supabase } from '../utils/supabaseClient';
import { TablesInsert, Database } from '../types/supabase';

interface NotificationData {
  user_id: string;
  type: string;  // We'll map this to notification_type in our insert
  title: string;
  message: string;
  link_url?: string;
  metadata?: any;
}

/**
 * Service to manage collaboration-related notifications
 */
export const collaborationNotificationService = {
  /**
   * Create a new notification
   */
  async createNotification(data: NotificationData) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          notification_type: data.type, // Changed from type to notification_type to match DB schema
          title: data.title,
          message: data.message,
          related_id: data.link_url ? data.link_url.split('/').pop() : null,
          is_read: false
        });
        
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error creating notification:', err);
      return false;
    }
  },

  /**
   * Send notification when a contractor request is created
   */
  async notifyContractorRequest(contractorId: string, reportId: string, reportTitle: string, clientName: string) {
    return this.createNotification({
      user_id: contractorId,
      type: 'contractor_request',
      title: 'New Job Request',
      message: `${clientName} has requested your services for "${reportTitle}"`,
      link_url: `/contractor/requests/${reportId}`,
      metadata: { reportId }
    });
  },

  /**
   * Send notification when a contractor accepts a job
   */
  async notifyContractorAccepted(clientId: string, reportId: string, reportTitle: string, contractorName: string) {
    return this.createNotification({
      user_id: clientId,
      type: 'contractor_assigned',
      title: 'Contractor Assigned',
      message: `${contractorName} has accepted your request for "${reportTitle}"`,
      link_url: `/reports/${reportId}`,
      metadata: { reportId }
    });
  },

  /**
   * Send notification when a contractor declines a job
   */
  async notifyContractorDeclined(clientId: string, reportId: string, reportTitle: string, contractorName: string) {
    return this.createNotification({
      user_id: clientId,
      type: 'contractor_declined',
      title: 'Contractor Declined',
      message: `${contractorName} has declined your request for "${reportTitle}"`,
      link_url: `/reports/${reportId}`,
      metadata: { reportId }
    });
  },

  /**
   * Send notification when a new message is received
   */
  async notifyNewMessage(userId: string, reportId: string, senderName: string, messagePreview: string) {
    return this.createNotification({
      user_id: userId,
      type: 'message',
      title: 'New Message',
      message: `${senderName}: ${messagePreview.substring(0, 60)}${messagePreview.length > 60 ? '...' : ''}`,
      link_url: `/reports/${reportId}#messages`,
      metadata: { reportId }
    });
  },

  /**
   * Send notification for a collaboration invite
   */
  async notifyCollaborationInvite(userId: string, reportId: string, reportTitle: string, inviterName: string, role: string) {
    return this.createNotification({
      user_id: userId,
      type: 'collaboration_invite',
      title: 'Collaboration Invite',
      message: `${inviterName} has invited you to collaborate on "${reportTitle}" as a ${role}`,
      link_url: `/reports/${reportId}`,
      metadata: { reportId, role }
    });
  },

  /**
   * Send notification when a collaboration invite is accepted
   */
  async notifyCollaborationAccepted(ownerId: string, reportId: string, reportTitle: string, collaboratorName: string) {
    return this.createNotification({
      user_id: ownerId,
      type: 'collaboration_accepted',
      title: 'Invitation Accepted',
      message: `${collaboratorName} has joined your report "${reportTitle}" as a collaborator`,
      link_url: `/reports/${reportId}`,
      metadata: { reportId }
    });
  },

  /**
   * Send notification for report status updates
   */
  async notifyReportStatusUpdate(userId: string, reportId: string, reportTitle: string, newStatus: string) {
    const statusMap: Record<string, string> = {
      submitted: 'submitted',
      in_review: 'under review',
      approved: 'approved',
      rejected: 'rejected',
      completed: 'completed'
    };

    const statusMessage = statusMap[newStatus] || newStatus;

    return this.createNotification({
      user_id: userId,
      type: 'report_status',
      title: 'Report Status Update',
      message: `"${reportTitle}" is now ${statusMessage}`,
      link_url: `/reports/${reportId}`,
      metadata: { reportId, status: newStatus }
    });
  }
};

export default collaborationNotificationService;