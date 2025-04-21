import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Layout from '../components/layout/Layout';

// Initialize Supabase client using environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const UpdatePassword: React.FC = () => {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    
    checkAuth();
  }, []);

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    
    // Password validation
    if (password.length < 8) {
      setMessage({
        text: 'Password must be at least 8 characters long',
        type: 'error'
      });
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage({
        text: 'Passwords do not match',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage({
          text: error.message,
          type: 'error'
        });
      } else {
        setMessage({
          text: 'Password updated successfully!',
          type: 'success'
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          if (isLoggedIn) {
            router.push('/Dashboard');
          } else {
            router.push('/login');
          }
        }, 2000);
      }
    } catch (err) {
      setMessage({
        text: 'An unexpected error occurred',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMessageClass = () => {
    if (!message) return '';
    
    switch (message.type) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <Layout title="Update Password | SureSight" description="Set a new password for your SureSight account">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Update Password</h1>
          <p className="text-gray-600 mt-2">Create a new password for your account</p>
        </div>
        
        <div className="card">
          {message && (
            <div className={`mb-6 p-3 rounded-md border ${getMessageClass()}`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`btn-primary w-full ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default UpdatePassword;
