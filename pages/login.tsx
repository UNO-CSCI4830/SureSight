import React, { useState } from 'react';
import { useRouter } from 'next/router'; // Import useRouter for navigation
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // Initialize useRouter

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); // Reset error state

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      console.log('Login successful');
      router.push('/Dashboard'); // Redirect to the dashboard
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async () => {                                                                    // Can we verify that this is working. SAM
    if (!email) {
      setError('Please enter email address and select Forgot Password to reset password.');
      return;
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/update-password`, });         // Link to update password page

    if (error) {
      setError(error.message);
    } else {
      alert('Email sent. Check your inbox');
    }
  };

  return (
    <div className="login-page">
      <header>
        <h1>Log In to SureSight</h1>
      </header>
      <main>
        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="error-message">{error}</p>}

          <button type="submit">Log In</button>
        </form>

        <p>                                                                                 
          <a href= "#" onClick={handleForgotPassword}>                               
            Forgot your password?
          </a> 
        </p>

        <p>
          Don't have an account? <a href="/signup">Sign Up</a>
        </p>
      </main>
    </div>
  );
};

export default Login;
