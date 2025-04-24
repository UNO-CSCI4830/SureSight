import React, { ReactNode, useEffect, useState } from 'react';
import NavBar from './NavBar';
import Footer from './Footer';
import { supabase } from '../../utils/supabaseClient';
import Head from 'next/head';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const Layout = ({ 
  children, 
  title = 'SureSight', 
  description = 'Streamline roofing and siding damage assessment' 
}: LayoutProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Check authentication status on component mount
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking authentication:', error);
        return;
      }
      
      const isAuthenticated = !!data.session;
      setIsLoggedIn(isAuthenticated);
      
      if (isAuthenticated && data.session?.user) {
        // Fetch user role from the users table using the new schema
        try {
          const userId = data.session.user.id;
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();
          
          if (userError) {
            console.error('Error fetching user role:', userError);
          } else if (userData && userData.role) {
            setUserRole(userData.role.toLowerCase());
          }
        } catch (err) {
          console.error('Error in role processing:', err);
        }
      }
    };
    
    checkAuth();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
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
          
          if (!userError && userData && userData.role) {
            setUserRole(userData.role.toLowerCase());
          } else {
            setUserRole('');
          }
        } catch (err) {
          console.error('Error in auth change role processing:', err);
          setUserRole('');
        }
      } else {
        setUserRole('');
      }
    });
    
    return () => {
      // Clean up subscription
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
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
      
      <div className="min-h-screen flex flex-col bg-gray-50">
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