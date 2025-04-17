import React, { useState } from 'react';
import { useRouter } from 'next/router'; // Import useRouter for navigation
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const UpdatePassword: React.FC = () => {
  const router = useRouter(); // Initialize useRouter
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  
  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password updated! Redirecting to login...');
      setTimeout(() => router.push('/'), 2000);                  // redirect to login
    }
  };

  return (
    <div className="UpdatePassword-page">
      <h1>Set New Password</h1>
      <form onSubmit={handleUpdatePassword}>
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Update Password</button>
      </form>
      {message && <p>{message}</p>}
        
    </div>
  );
};

export default UpdatePassword;
