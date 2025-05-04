import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Button from './Button';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

interface NotificationManagerProps {
  userId: string;
  showAll?: boolean;
  maxDisplayed?: number; // Max notifications to show if not showing all
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({
  userId,
  showAll = false,
  maxDisplayed = 5,
  onNotificationClick
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newNotificationCount, setNewNotificationCount] = useState(0);
  const [notificationSubscription, setNotificationSubscription] = useState<any>(null);
  
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      subscribeToNotifications();
    }
    
    return () => {
      if (notificationSubscription) {
        notificationSubscription.unsubscribe();
      }
    };
  }, [userId]);
  
  // Subscribe to new notifications
  const subscribeToNotifications = () => {
    const subscription = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        // New notification received
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        setNewNotificationCount(count => count + 1);
        
        // Show browser notification if supported
        showBrowserNotification(newNotification);
      })
      .subscribe();
      
    setNotificationSubscription(subscription);
  };
  
  // Display browser notification if permitted
  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };
  
  // Fetch all notifications for the user
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (!showAll) {
        query = query.limit(maxDisplayed);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setNotifications(data || []);
      setNewNotificationCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };
  
  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
        
      if (updateError) throw updateError;
      
      // Update local state to reflect the change
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setNewNotificationCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
        
      if (updateError) throw updateError;
      
      // Update local state to reflect the change
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setNewNotificationCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };
  
  // Delete a notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
        
      if (deleteError) throw deleteError;
      
      // Remove from local state
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      // Update unread count if needed
      const deleted = notifications.find(n => n.id === notificationId);
      if (deleted && !deleted.is_read) {
        setNewNotificationCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };
  
  // Format relative time for display
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Get appropriate icon and color for notification type
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'contractor_request':
        return { 
          icon: '🔨', 
          bgClass: 'bg-blue-50', 
          borderClass: 'border-blue-200',
          textClass: 'text-blue-800'
        };
      case 'contractor_assigned':
        return { 
          icon: '✅', 
          bgClass: 'bg-green-50', 
          borderClass: 'border-green-200',
          textClass: 'text-green-800'
        };
      case 'contractor_declined':
        return { 
          icon: '❌', 
          bgClass: 'bg-red-50', 
          borderClass: 'border-red-200',
          textClass: 'text-red-800'
        };
      case 'message':
        return { 
          icon: '💬', 
          bgClass: 'bg-purple-50', 
          borderClass: 'border-purple-200',
          textClass: 'text-purple-800'
        };
      case 'collaboration_invite':
        return { 
          icon: '👥', 
          bgClass: 'bg-yellow-50', 
          borderClass: 'border-yellow-200',
          textClass: 'text-yellow-800'
        };
      default:
        return { 
          icon: '🔔', 
          bgClass: 'bg-gray-50', 
          borderClass: 'border-gray-200',
          textClass: 'text-gray-800'
        };
    }
  };
  
  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Call custom click handler if provided
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.link_url) {
      // Default behavior - navigate to the link if it exists
      window.location.href = notification.link_url;
    }
  };
  
  // Render a single notification item
  const renderNotificationItem = (notification: Notification) => {
    const { icon, bgClass, borderClass, textClass } = getNotificationStyle(notification.type);
    
    return (
      <div 
        key={notification.id}
        className={`p-3 mb-2 border rounded-md ${notification.is_read ? 'bg-white border-gray-200' : `${bgClass} ${borderClass}`} relative`}
      >
        <div className="flex">
          <div className="mr-3 text-xl">{icon}</div>
          <div className="flex-1">
            <div 
              className={`font-medium ${notification.is_read ? 'text-gray-800' : textClass}`}
              onClick={() => handleNotificationClick(notification)}
            >
              {notification.title}
            </div>
            <p className="text-sm text-gray-600">{notification.message}</p>
            <div className="text-xs text-gray-500 mt-1">
              {formatRelativeTime(notification.created_at)}
            </div>
          </div>
          <button 
            onClick={() => deleteNotification(notification.id)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Delete notification"
          >
            ✕
          </button>
        </div>
        {!notification.is_read && (
          <div className="absolute top-3 right-9 w-2 h-2 bg-blue-600 rounded-full"></div>
        )}
      </div>
    );
  };
  
  return (
    <div className="notifications-manager">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md mb-3">
          {error}
        </div>
      )}
      
      <div className="flex justify-between items-center mb-4">
        <div>
          {newNotificationCount > 0 && (
            <span className="text-sm text-blue-600 font-medium">
              {newNotificationCount} unread notification{newNotificationCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {newNotificationCount > 0 && (
          <Button
            text="Mark all as read"
            onClick={markAllAsRead}
            className="text-sm py-1"
          />
        )}
      </div>
      
      {loading && notifications.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          No notifications to display
        </div>
      ) : (
        <div>
          {notifications.map(renderNotificationItem)}
          
          {!showAll && notifications.length >= maxDisplayed && (
            <div className="text-center mt-4">
              <a 
                href="/notifications" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationManager;