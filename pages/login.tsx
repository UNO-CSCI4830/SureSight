import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Layout from '../components/layout/Layout';
import { supabase } from '../utils/supabaseClient';
import { Card, LoadingSpinner, StatusMessage } from '../components/common';
import { FormInput, Button } from '../components/ui';
import formValidation from '../utils/formValidation';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{text: string, type: 'error' | 'success' | 'info'} | null>(null);
  const router = useRouter();
  
  // Check for any query parameters that might indicate a specific state
  useEffect(() => {
    const { verified, error: queryError } = router.query;
    
    if (verified === 'true') {
      setMessage({
        text: 'Email verified successfully! Please log in to complete your profile.',
        type: 'success'
      });
    } else if (queryError) {
      setMessage({
        text: typeof queryError === 'string' ? queryError : 'An error occurred',
        type: 'error'
      });
    }
  }, [router.query]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else {
      // Test for valid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Invalid email format';
      }
    }
    
    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    
    // Clear email error when typing
    if (errors.email) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.email;
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    
    // Clear password error when typing
    if (errors.password) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.password;
        return newErrors;
      });
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      // Login with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      
      // Check if this user has completed their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error checking profile:', profileError);
      }
      
      // If no profile exists, redirect to complete-profile page
      if (!profileData) {
        router.push({
          pathname: '/complete-profile',
          query: { userId: data.user.id }
        });
      } else {
        // Otherwise redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err.message);
      setMessage({
        text: err.message || 'Invalid login credentials',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Login | SureSight</title>
        <meta name="description" content="Login to SureSight to access your dashboard" />
      </Head>

      <div className="max-w-md mx-auto mt-8 mb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Login</h1>
          <p className="text-gray-600">Log in to access your SureSight account</p>
        </div>

        <Card>
          {message && (
            <StatusMessage
              type={message.type}
              text={message.text}
              className="mb-4"
              data-testid="status-message"
            />
          )}

          <form onSubmit={handleLogin} className="space-y-6" noValidate>
            <div>
              <FormInput
                id="email"
                label="Email Address"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="your-email@example.com"
                required
                autoComplete="email"
                inputClassName="bg-white text-gray-900"
                error={errors.email}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link 
                  href="/forgotpassword"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Forgot password?
                </Link>
              </div>
              <FormInput
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                inputClassName="bg-white text-gray-900"
                error={errors.password}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`
                  px-4 py-2
                  bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500
                  rounded-md font-medium transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center
                  w-full
                `}
                data-testid="login-button"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary-600 hover:text-primary-500 font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;
