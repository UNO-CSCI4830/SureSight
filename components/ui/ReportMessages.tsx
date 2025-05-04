import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Button from './Button';
import TextArea from './TextArea';
import Card from '../common/Card';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  is_read: boolean;
  message_type: string;
  report_id: string | null;
  property_id: string | null;
  sender?: {
    id: string;
    profiles: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
  };
  receiver?: {
    id: string;
    profiles: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
  };
}

interface User {
  id: string;
  email: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface ReportMessagesProps {
  reportId: string;
  currentUserId: string;
}

const ReportMessages: React.FC<ReportMessagesProps> = ({ reportId, currentUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageSubscription, setMessageSubscription] = useState<any>(null);
  
  // Initial data load
  useEffect(() => {
    if (reportId && currentUserId) {
      fetchCollaborators();
    }
    
    return () => {
      // Clean up subscription when component unmounts
      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }
    };
  }, [reportId, currentUserId]);
  
  // Load messages when a collaborator is selected
  useEffect(() => {
    if (selectedUserId) {
      fetchMessages();
      subscribeToNewMessages();
    }
  }, [selectedUserId]);
  
  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Set up real-time subscription to new messages
  const subscribeToNewMessages = () => {
    if (!selectedUserId) return;
    
    // Clean up previous subscription if exists
    if (messageSubscription) {
      messageSubscription.unsubscribe();
    }
    
    const subscription = supabase
      .channel('report-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `report_id=eq.${reportId}`
      }, (payload) => {
        // Only add message if it's between the current user and selected user
        const newMessage = payload.new as Message;
        if ((newMessage.sender_id === currentUserId && newMessage.receiver_id === selectedUserId) || 
            (newMessage.sender_id === selectedUserId && newMessage.receiver_id === currentUserId)) {
          // Fetch complete message details
          fetchMessageDetails(newMessage.id).then(message => {
            if (message) {
              setMessages(prev => [...prev, message]);
            }
          });
        }
      })
      .subscribe();
      
    setMessageSubscription(subscription);
  };
  
  // Fetch a specific message with related user details
  const fetchMessageDetails = async (messageId: string): Promise<Message | null> => {
    try {
      const { data, error } = await supabase
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
        .eq('id', messageId)
        .single();
        
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching message details:', err);
      return null;
    }
  };
  
  // Fetch report collaborators
  const fetchCollaborators = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('report_collaborators')
        .select(`
          user:user_id(
            id,
            email,
            profiles(
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('report_id', reportId)
        .neq('user_id', currentUserId); // Exclude current user
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Extract the user objects from the nested structure
        const users = data.map(item => item.user).filter(Boolean);
        setCollaborators(users as User[]);
        
        // Select the first collaborator by default if no one is selected yet
        if (users.length > 0 && !selectedUserId) {
          setSelectedUserId(users[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching collaborators:', err);
      setError('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch messages between current user and selected user for this report
  const fetchMessages = async () => {
    if (!selectedUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Create conversation ID by sorting the two user IDs and joining them
      const conversationId = [currentUserId, selectedUserId].sort().join('_');
      
      const { data, error } = await supabase
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
        
      if (error) throw error;
      
      setMessages(data || []);
      
      // Mark all received messages as read
      const unreadMessages = data
        ?.filter(msg => msg.receiver_id === currentUserId && !msg.is_read)
        .map(msg => msg.id) || [];
        
      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };
  
  // Send a new message
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Create conversation ID by sorting the two user IDs and joining them
      const conversationId = [currentUserId, selectedUserId].sort().join('_');
      
      // Send the message
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: selectedUserId,
          content: messageText.trim(),
          message_type: 'text',
          report_id: reportId,
          is_read: false,
          conversation_id: conversationId
        });
        
      if (error) throw error;
      
      // Clear the input
      setMessageText('');
      
      // No need to refetch messages as the subscription will handle it
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date for message groups
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Get display name for a user
  const getUserDisplayName = (user?: { profiles?: { first_name: string; last_name: string } }) => {
    if (!user || !user.profiles) return 'Unknown User';
    return `${user.profiles.first_name} ${user.profiles.last_name}`;
  };
  
  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Group messages by date for better display
  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    
    messages.forEach((message) => {
      const messageDate = formatMessageDate(message.created_at);
      const existingGroup = groups.find(group => group.date === messageDate);
      
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({
          date: messageDate,
          messages: [message]
        });
      }
    });
    
    return groups;
  };
  
  return (
    <Card className="mb-6 h-[600px] flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Report Messages</h2>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Collaborator list sidebar */}
        <div className="w-1/3 border-r overflow-y-auto">
          {loading && collaborators.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Loading collaborators...</div>
          ) : collaborators.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No collaborators found for this report
            </div>
          ) : (
            <ul className="divide-y">
              {collaborators.map(user => (
                <li key={user.id}>
                  <button
                    className={`w-full text-left p-3 flex items-center hover:bg-gray-50 ${
                      selectedUserId === user.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    {user.profiles?.avatar_url ? (
                      <img
                        src={user.profiles.avatar_url}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full mr-3"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <span className="text-gray-600 font-medium">
                          {user.profiles?.first_name?.[0] || ''}
                          {user.profiles?.last_name?.[0] || ''}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {getUserDisplayName(user)}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Messages area */}
        <div className="w-2/3 flex flex-col">
          {selectedUserId ? (
            <>
              {/* Messages container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && messages.length === 0 ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  groupMessagesByDate().map((group, groupIndex) => (
                    <div key={groupIndex} className="space-y-3">
                      <div className="flex justify-center">
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                          {group.date}
                        </span>
                      </div>
                      
                      {group.messages.map((message) => {
                        const isOwnMessage = message.sender_id === currentUserId;
                        
                        return (
                          <div 
                            key={message.id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`max-w-[80%] rounded-lg p-3 ${
                                isOwnMessage 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <p 
                                className={`text-xs mt-1 ${
                                  isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                                }`}
                              >
                                {formatMessageTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message input */}
              <div className="p-3 border-t">
                {error && (
                  <div className="bg-red-50 text-red-700 p-2 rounded-md mb-2 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="flex items-center">
                  <TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    text="Send"
                    onClick={sendMessage}
                    disabled={loading || !messageText.trim()}
                    className="ml-2"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a collaborator to start messaging
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ReportMessages;