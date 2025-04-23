import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Layout from '../components/layout/Layout';
import { supabase } from '../utils/supabaseClient';
import { Card, LoadingSpinner, StatusMessage } from '../components/common';
import { FormInput, Button } from '../components/ui';

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      console.log('Login successful');
      
      // Add a slight delay before redirect to ensure auth state is updated
      setTimeout(() => {
        router.push('/Dashboard');
      }, 100);
    } catch (err: any) {
      console.error('Login error:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/updatepassword`,
      });

      if (error) throw error;
      
      // Show success message
      setError('Password reset link sent to your email.');
    } catch (err: any) {
      console.error('Password reset error:', err.message);
      setError(err.message);
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
          <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600">Log in to access your SureSight account</p>
        </div>

        <Card>
          {error && (
            <StatusMessage
              type={error.includes('sent') ? 'info' : 'error'}
              text={error}
              className="mb-4"
            />
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <FormInput
                id="email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Forgot password?
                </button>
              </div>
              <FormInput
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                isLoading={isLoading}
              >
                Log In
              </Button>
            </div>
          </form>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary-600 hover:text-primary-500 font-medium">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
