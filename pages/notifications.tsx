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
  sender: { email: string };  
  receiver: { email: string }; 
}

const NotificationsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; email: string }[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

   useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user: fetchedUser } } = await supabase.auth.getUser();
        if (fetchedUser) {
          setUser(fetchedUser);
          console.log("Authenticated user ID:", fetchedUser.id);

          const { data: users, error: userError } = await supabase
            .from('users') // This assumes you have a 'users' table with public user info
            .select('id, email');

          if (userError) throw userError;

          const filtered = users.filter((u: any) => u.id !== fetchedUser.id);
          setAllUsers(filtered);
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
  
      const channel = supabase
        .channel('realtime:messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, (payload) => {
          console.log('New message:', payload);
          fetchMessages();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
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
        setLoading(false);
        return;
      }

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
  const sendMessage = async () => {
    if (!selectedReceiver || !messageText) return;
    setSending(true);
  
    const { data: userExists, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', selectedReceiver)
      .single();
  
    if (checkError || !userExists) {
      setError('Selected recipient does not exist.');
      setSending(false);
      return;
    }
  
    try {
      console.log("Receiver ID:", selectedReceiver); 
      
      const { error } = await supabase.from('messages').insert([
        {
          sender_id: user.id,
          receiver_id: selectedReceiver,
          content: messageText,
          is_read: false,
        },
      ]);
      if (error) throw error;
  
      setMessageText('');
      setSelectedReceiver('');
      fetchMessages();
    } catch (err) {
      setError("Failed to send message");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout title="Messages | SureSight">
      <AuthGuard>
        <div className="container mx-auto p-4">
          <h1 className="text-3xl font-bold mb-4">Messages</h1>

          {/* Send Message Form */}
          <div className="mb-6 p-4 border rounded-lg shadow bg-white">
            <h2 className="text-xl font-semibold mb-2">Send a Message</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedReceiver}
                onChange={(e) => setSelectedReceiver(e.target.value)}
                className="p-2 border rounded w-full sm:w-1/3"
              >
                <option value="">Select recipient</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write your message"
                className="p-2 border rounded w-full sm:flex-1"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>

          {/* Error UI */}
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

          {/* Messages List */}
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-pulse text-gray-500">Loading messages...</div>
            </div>
          ) : messages.length > 0 ? (
            <ul className="space-y-4">
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={`p-4 border rounded-lg shadow-sm ${msg.is_read ? 'bg-gray-50' : 'bg-white border-l-4 border-blue-500'}`}
                >
                  <p className="font-semibold">From: {msg.sender.email}</p>
                  <p className="font-semibold">To: {msg.receiver.email}</p>
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