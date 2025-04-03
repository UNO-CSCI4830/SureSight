import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const SignUp: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setErrorMessage('User already exists. Please use a different email.');
        } else {
          setErrorMessage('An error occurred. Please try again later.');
        }
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error during sign-up:', err);
      setErrorMessage('An unexpected error occurred. Please try again later.');
    }
  };

  return (
    <div className="signup-page">
      <header>
        <h1>Create an Account on SureSight</h1>
      </header>
      <main>
        {!isSubmitted ? (
          <form onSubmit={handleSignUp}>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
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

            <label htmlFor="confirm-password">Confirm Password:</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button type="submit">Sign Up</button>
          </form>
        ) : (
          <div className="verification-message">
            <p>Please check your email to verify your account.</p>
            <button onClick={() => (window.location.href = '/login')}>
              Go to Login
            </button>
          </div>
        )}
        {!isSubmitted && (
          <p>
            Already have an account? <a href="/login">Log In</a>
          </p>
        )}
      </main>
    </div>
  );
};

export default SignUp;
