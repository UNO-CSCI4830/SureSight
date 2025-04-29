import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import AuthGuard from '../components/auth/AuthGuard';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const NotificationsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
        }
      } catch (err) {
        console.error("Error checking user authentication:", err);
        setError("Authentication error. Please try logging in again.");
      }
    };
    
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchMessages();
      
      // Real-time message subscription using Supabase channel
      const channel = supabase
        .channel('realtime:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          console.log('New message:', payload);
          fetchMessages();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
          console.log('Message updated:', payload);
          fetchMessages();
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            console.error('Failed to subscribe to real-time changes:', status);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);
      
   const fetchMessages = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        setLoading(false);
        return;
      }

      // call the API route with proper error handling
      const response = await fetch(`/api/notis?user_id=${user.id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      // Update local state without re-fetching
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === id ? { ...msg, is_read: true } : msg
        )
      );
    } catch (err) {
      setError('Error marking message as read');
      console.error('Error marking message as read:', err);
    }
  };

  return (
    <Layout title="Messages | SureSight">
      <AuthGuard>
        <div className="container mx-auto p-4">
          <h1 className="text-3xl font-bold mb-4">Messages</h1>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
              <p>{error}</p>
              <button 
                onClick={fetchMessages}
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-900"
              >
                Try again
              </button>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-pulse text-gray-500">Loading messages...</div>
            </div>
          ) : messages.length > 0 ? (
            <ul className="space-y-4">
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={`p-4 border rounded-lg shadow-sm ${
                    msg.is_read ? 'bg-gray-50' : 'bg-white border-l-4 border-blue-500'
                  }`}
                >
                  <p className="font-semibold">From: {msg.sender_id}</p>
                  <p className="my-2">{msg.content}</p>
                  <div className="flex justify-between items-center mt-2">
                    <small className="text-gray-500">
                      {new Date(msg.created_at).toLocaleString()}
                    </small>
                    {!msg.is_read && (
                      <button
                        onClick={() => markAsRead(msg.id)}
                        className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">No messages yet!</p>
            </div>
          )}
        </div>
      </AuthGuard>
    </Layout>
  );
};

export default NotificationsPage;
