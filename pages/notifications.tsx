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
  report_id: string | null;
  property_id: string | null;
  message_type: string;
  conversation_id: string | null;
}

type MessageTab = 'received' | 'sent';

const NotificationsPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<MessageTab>('received');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; auth_user_id: string | null }[]>([]);
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
            .from('users') 
            .select('id, email, auth_user_id'); // Include auth_user_id

          if (userError) throw userError;

          // Include yourself in the list - self-messaging should be allowed
          setAllUsers(users || []);
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
      fetchSentMessages();

      const channel = supabase
        .channel('realtime:messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, (payload) => {
          console.log('New message payload:', payload); 
          fetchMessages();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          console.log('Message updated payload:', payload); 
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

      // Using direct query approach instead of API route
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(email),
          receiver:receiver_id(email)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }

      console.log("Fetched received messages:", data); 
      setMessages((data as unknown as Message[]) || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('Error fetching received messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSentMessages = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        setLoading(false);
        return;
      }

      // Using a more direct approach without relying on FK relationship naming
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(email),
          receiver:receiver_id(email)
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log("Fetched sent messages:", data);
      setSentMessages((data as unknown as Message[]) || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sent messages';
      setError(errorMessage);
      console.error('Error fetching sent messages:', err);
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
  
    // Get the receiver's auth_user_id from the selected user id
    const { data: selectedUser, error: checkError } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('id', selectedReceiver)
      .single();
  
    if (checkError || !selectedUser) {
      setError('Selected recipient does not exist.');
      setSending(false);
      return;
    }

    // Check if auth_user_id is null
    if (!selectedUser.auth_user_id) {
      setError('Selected recipient does not have a valid authentication ID.');
      setSending(false);
      return;
    }
  
    try {
      console.log("Sender ID (auth_user_id):", user.id); 
      console.log("Receiver ID (auth_user_id):", selectedUser.auth_user_id); 
      console.log("Message Content:", messageText);  
      
      const { error } = await supabase.from('messages').insert(
        {
          sender_id: user.id,  // Auth user ID from Supabase Auth
          receiver_id: selectedUser.auth_user_id,  // Using auth_user_id from the users table
          content: messageText,
          is_read: false, 
          report_id: null,  
          property_id: null,  
          message_type: 'text',  
        }
      );
      if (error) {
        throw error;
      }
  
      // Reset the form after sending the message
      setMessageText('');
      setSelectedReceiver('');
      fetchMessages();  // Fetch updated messages
      fetchSentMessages(); // Fetch updated sent messages
  
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
              <div className="w-full sm:w-1/3">
                <label htmlFor="recipient-select" className="sr-only">Select recipient</label>
                <select
                  id="recipient-select"
                  aria-label="Select recipient"
                  value={selectedReceiver}
                  onChange={(e) => setSelectedReceiver(e.target.value)}
                  className="p-2 border rounded w-full"
                >
                  <option value="">Select recipient</option>
                  {allUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="message-input" className="sr-only">Message</label>
                <input
                  id="message-input"
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write your message"
                  className="p-2 border rounded w-full"
                />
              </div>
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

          {/* Tab System */}
          <div className="mb-4">
            <button
              onClick={() => setActiveTab('received')}
              className={`px-4 py-2 rounded-tl-lg rounded-tr-lg ${activeTab === 'received' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
            >
              Received Messages
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 rounded-tl-lg rounded-tr-lg ${activeTab === 'sent' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
            >
              Sent Messages
            </button>
          </div>

          {/* Messages List */}
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-pulse text-gray-500">Loading messages...</div>
            </div>
          ) : activeTab === 'received' ? (
            messages.length > 0 ? (
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
                <p className="text-gray-500">No received messages yet!</p>
              </div>
            )
          ) : sentMessages.length > 0 ? (
            <ul className="space-y-4">
              {sentMessages.map((msg) => (
                <li
                  key={msg.id}
                  className="p-4 border rounded-lg shadow-sm bg-gray-50"
                >
                  <p className="font-semibold">From: {msg.sender.email}</p>
                  <p className="font-semibold">To: {msg.receiver.email}</p>
                  <p className="my-2">{msg.content}</p>
                  <div className="flex justify-between items-center mt-2">
                    <small className="text-gray-500">
                      {new Date(msg.created_at).toLocaleString()}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">No sent messages yet!</p>
            </div>
          )}
        </div>
      </AuthGuard>
    </Layout>
  );
};

export default NotificationsPage;
