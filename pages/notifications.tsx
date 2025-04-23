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

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching messages:', error);
    else setMessages(data || []);

    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) fetchMessages();
  };

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
