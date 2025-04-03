import React from 'react';
import { supabase } from '../utils/supabaseClient'; // Adjust the import path as needed

const Dashboard: React.FC = () => {
    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error logging out:', error.message);
            } else {
                console.log('User logged out');
                window.location.href = '/login'; // Redirect to login page
            }
        } catch (err) {
            console.error('Unexpected error during logout:', err);
        }
    };

    return (
        <div>
            <button onClick={handleLogout} style={{ position: 'absolute', top: 10, right: 10 }}>
                Log Out
            </button>
            <h1>Welcome to your Dashboard</h1>
            {/* Add additional dashboard content here */}
        </div>
    );
};

export default Dashboard;
