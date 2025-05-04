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
    // Check for verification status in URL parameters
    const { verified, error: queryError } = router.query;
    
    if (verified === 'true') {
      setMessage({
        text: 'Email verified successfully! Please log in to complete your profile.',
        type: 'success'
      });
    } else if (verified === 'false') {
      setMessage({
        text: queryError ? decodeURIComponent(queryError as string) : 'Email verification failed. Please try again or contact support.',
        type: 'error'
      });
    } else if (queryError) {
      setMessage({
        text: typeof queryError === 'string' ? decodeURIComponent(queryError) : 'An error occurred',
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
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
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

  const handlePasswordKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        // Create a standard form event instead of SubmitEvent
        form.requestSubmit();
      }
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

      // Get auth user details
      const authUser = data.user;
      const authUserId = authUser.id;
      const authUserEmail = authUser.email || '';
      
      console.log("Successfully authenticated with Supabase Auth, user ID:", authUserId);
      
      // First check if user exists in the users table with the correct auth_user_id
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, auth_user_id, email, role, email_confirmed')
        .eq('auth_user_id', authUserId)
        .single();
      
      if (userError) {
        console.error("Error fetching user by auth_user_id:", userError);
      }
      
      // If not found by auth_user_id, check by email
      if (!userData) {
        console.log("User not found by auth_user_id, checking by email");
        
        // Look for user by email
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('id, auth_user_id, email, role')
          .eq('email', authUserEmail)
          .single();
          
        if (emailError) {
          console.error("Error fetching user by email:", emailError);
        }
        
        // If found by email, update the auth_user_id
        if (userByEmail) {
          console.log("Found user by email, updating auth_user_id");
          
          // Update the auth_user_id to match the authenticated user
          const { error: updateError } = await supabase
            .from('users')
            .update({ auth_user_id: authUserId })
            .eq('id', userByEmail.id)
            .select();
            
          if (updateError) {
            console.error("Error updating auth_user_id:", updateError);
          } else {
            console.log("Successfully updated auth_user_id");
            userData = { ...userByEmail, email_confirmed: true };
            userData.auth_user_id = authUserId; // Update the local copy too
          }
        }
      }
      
      // If user still not found, we need to create a new record
      if (!userData) {
        console.log("No user record found in database, creating one");
        
        // Get any available metadata
        const firstName = authUser.user_metadata?.first_name || '';
        const lastName = authUser.user_metadata?.last_name || '';
        const role = authUser.user_metadata?.role || 'homeowner';
        
        // Create user record
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authUserId,
            email: authUserEmail,
            first_name: firstName,
            last_name: lastName,
            role: role,
            email_confirmed: true
          })
          .select('id, auth_user_id, email, role')
          .single();
          
        if (createError) {
          console.error("Error creating user record:", createError);
          throw new Error("Failed to set up your user account. Please contact support.");
        }
        
        userData = { ...newUser, email_confirmed: true };
        console.log("Created new user record with ID:", userData.id);
      }
      
      // Now check if this user has completed their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error checking profile:', profileError);
      }
      
      // Store the user ID in local storage for other parts of the app to use
      // This helps ensure we're using the correct ID consistently
      localStorage.setItem('supaUserDbId', userData.id);
      
      // If no profile exists, redirect to complete-profile page
      if (!profileData || !userData.email_confirmed) {
        console.log('Redirecting to complete profile page');
        router.push('/complete-profile');
      } else {
        console.log('Redirecting to dashboard');
        router.push('/Dashboard');
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

          <form onSubmit={handleLogin} className="space-y-6" noValidate data-testid="login-form">
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
              <div onKeyDown={handlePasswordKeyPress}>
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
                  // hideLabel
                />
              </div>
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
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Signing in...</span>
                  </span>
                ) : (
                  'Sign In'
                )}
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
