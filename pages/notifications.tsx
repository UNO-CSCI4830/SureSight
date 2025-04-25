import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useUser } from '@supabase/auth-helpers-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const NotificationsPage = () => {
  const user = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        .subscribe();

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
        setError('User is not logged in.');
        setLoading(false);
        return;
      }

      // call the new API route
      const response = await fetch(`/api/notis?user_id=${user.id}`);
      if (!response.ok) {
        throw new Error('Error fetching messages');
      }
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError('Error fetching messages');
      console.error(err);
    }

    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', id);

      if (!error) fetchMessages();
      else setError('Error marking message as read');
    } catch (err) {
      setError('Error marking message as read');
      console.error(err);
    }
  };

  if (!user) {
    return <p>Please log in to view your notifications.</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Messages</h1>
      {loading ? (
        <p>Loading messages...</p>
      ) : messages.length > 0 ? (
        <ul className="space-y-4">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={`p-4 border rounded-lg shadow-sm ${
                msg.is_read ? 'bg-gray-100' : 'bg-white'
              }`}
            >
              <p className="font-semibold">From: {msg.sender_id}</p>
              <p>{msg.content}</p>
              <small className="text-gray-500">
                {new Date(msg.created_at).toLocaleString()}
              </small>
              {!msg.is_read && (
                <button
                  onClick={() => markAsRead(msg.id)}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Mark as read
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No messages yet!</p>
      )}
    </div>
  );
};

export default NotificationsPage;
