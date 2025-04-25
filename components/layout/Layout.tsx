import React, { ReactNode, useEffect, useState } from 'react';
import NavBar from './NavBar';
import Footer from './Footer';
import { supabase } from '../../utils/supabaseClient';
import Head from 'next/head';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

const Layout = ({ 
  children, 
  title = 'SureSight', 
  description = 'Streamline roofing and siding damage assessment',
  className = ''
}: LayoutProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Check authentication status on component mount
    const checkAuth = async () => {
      try {
        // Use the modern Supabase API
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking authentication:', error);
          return;
        }
        
        const session = data.session;
        
        const isAuthenticated = !!session;
        setIsLoggedIn(isAuthenticated);
        
        if (isAuthenticated && session?.user) {
          // Fetch user role directly from the users table
          try {
            const userId = session.user.id;
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('id', userId)
              .single();
            
            if (userError) {
              console.error('Error fetching user role:', userError);
              // Handle case where user has no role assigned yet
              setUserRole('');
            } else if (userData) {
              setUserRole(userData.role);
            }
          } catch (err) {
            console.error('Error in role processing:', err);
          }
        }
      } catch (err) {
        console.error('Error in auth check:', err);
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
        setIsLoggedIn(!!session);
        
        if (session?.user) {
          // Fetch user role when auth state changes
          try {
            const userId = session.user.id;
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('id', userId)
              .single();
            
            if (!userError && userData) {
              setUserRole(userData.role);
            } else {
              setUserRole('');
              console.log('User has no role assigned yet');
            }
          } catch (err) {
            console.error('Error in auth change role processing:', err);
            setUserRole('');
          }
        } else {
          setUserRole('');
        }
      });
    } catch (e) {
      console.error('Error setting up auth listener:', e);
    }
    
    return () => {
      // Clean up subscription
      if (authListener && authListener.data && authListener.data.subscription) {
        authListener.data.subscription.unsubscribe();
      } else if (authListener && typeof authListener.unsubscribe === 'function') {
        authListener.unsubscribe();
      }
    };
  }, []);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className={`min-h-screen flex flex-col bg-gray-50 ${className}`} data-testid="layout-container">
        <NavBar isLoggedIn={isLoggedIn} userRole={userRole} />
        
        <main className="flex-grow pt-16 px-4 md:px-6 max-w-7xl w-full mx-auto">
          <div className="py-8">
            {children}
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Layout;