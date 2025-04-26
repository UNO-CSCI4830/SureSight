import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import Layout from '../components/layout/Layout';
import { FormInput } from '../components/ui';

// Initialize Supabase client using environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail({email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/updatepassword`,}   // Email link sends to update password
    });

    if (error) {
    setMessage({text: error.message, type: 'error'});
    } else {
        setMessage({text: 'Password reset email sent! Check your inbox.', type: 'success'});
    }
        
    setIsLoading(false);
  };

return (
  <Layout title="Forgot Password | SureSight" description="Forgot password for your SureSight account">
    <div className="max-w-md mx-auto w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Forgot Password</h1>
      </div>
        
      <div className="card">
        {message && (
          <div className={`mb-6 p-3 rounded-md border ${message.type === 'success' ()}`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleforgotPassword} className="space-y-6">
          <FormInput
            type="email"
            id="Email Address"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your-email@example.com"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          > 
            {isLoading ? 'Sending...' : 'Send Reset Email'}
          </button>
        </form>
      </div>
    </div>
  </Layout>
  );
};

export default ForgotPassword;
