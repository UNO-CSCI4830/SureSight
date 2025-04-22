import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient'; 

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*') 
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching notifications:', error);
        } else {
          setNotifications(data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }

      setLoading(false);
    };

    fetchNotifications();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Notifications</h1>
      {loading ? (
        <p>Loading notifications...</p>
      ) : (
        <ul className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <li key={notification.id} className="p-4 border rounded-lg shadow-sm bg-white">
                <h2 className="text-xl font-semibold">{notification.title}</h2>
                <p className="text-gray-600">{notification.message}</p>
                <small className="text-gray-400">{new Date(notification.created_at).toLocaleString()}</small>
              </li>
            ))
          ) : (
            <p>No notifications yet!</p>
          )}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
