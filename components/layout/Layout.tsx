import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { UserRole } from '../../types/supabase';
import NavBar from './NavBar';
import Footer from './Footer';
import { supabase } from '../../utils/supabaseClient';

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
  hideNavBar?: boolean;
  hideFooter?: boolean;
}

interface User {
  id: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  title = 'SureSight', 
  children,
  hideNavBar = false,
  hideFooter = false
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<UserRole | ''>('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking auth status:', error.message);
          setIsLoading(false);
          return;
        }
        
        const session = data.session;
        
        const isAuthenticated = !!session;
        setIsLoggedIn(isAuthenticated);
        
        if (isAuthenticated && session?.user) {
          // Store the auth user ID (from Supabase Auth)
          const authUserId = session.user.id;
          setUser({ id: authUserId });
          
          // Fetch user role from the users table using auth_user_id
          try {
            // Get the user from the users table using auth_user_id
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('auth_user_id', authUserId)
              .maybeSingle();
            
            if (userError) {
              console.error('Error fetching user role:', userError);
              setUserRole('');
            } else if (userData && userData.role) {
              setUserRole(userData.role);
            } else {
              setUserRole('');
              console.log('User has no role assigned yet');
            }
          } catch (err) {
            console.error('Error in role processing:', err);
            setUserRole('');
          } finally {
            setIsLoading(false);
          }
        } else {
          setUser(null);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error in auth check:', err);
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes with compatibility for different Supabase versions
    let authListener: {
      data?: {
        subscription?: {
          unsubscribe: () => void;
        };
      };
      unsubscribe?: () => void;
    } | null = null;
    
    try {
      // Use the modern auth state change API
      authListener = supabase.auth.onAuthStateChange(async (event, session) => {
        const isAuthenticated = !!session;
        setIsLoggedIn(isAuthenticated);
        
        if (session?.user) {
          const authUserId = session.user.id;
          setUser({ id: authUserId });
          
          // Fetch user role when auth state changes
          try {
            // Get the user from the users table using auth_user_id
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('auth_user_id', authUserId)
              .maybeSingle();
            
            if (!userError && userData && userData.role) {
              setUserRole(userData.role);
            } else {
              setUserRole('');
              console.log('User has no role assigned yet or error fetching role');
            }
          } catch (err) {
            console.error('Error in role processing:', err);
            setUserRole('');
          }
        } else {
          setUser(null);
          setUserRole('');
        }
      });
    } catch (err) {
      console.error('Error setting up auth listener:', err);
    }
    
    return () => {
      // Clean up subscription based on which API we're using
      if (authListener) {
        if (authListener.data?.subscription) {
          authListener.data.subscription.unsubscribe();
        } else if (authListener.unsubscribe) {
          authListener.unsubscribe();
        }
      }
    };
  }, []);

  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta name="description" content="SureSight - Property Damage Assessment" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {!hideNavBar && (
        <NavBar
          isLoggedIn={isLoggedIn}
          userRole={userRole}
          isLoading={isLoading}
        />
      )}

      <main className="container mx-auto px-4 py-8 min-h-screen">
        {children}
      </main>

      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;