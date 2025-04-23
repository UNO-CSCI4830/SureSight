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
        // Fetch user role from database
        try {
          const userId = data.session.user.id;
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', userId)
            .maybeSingle(); // Use maybeSingle instead of single to prevent errors
          
          if (roleError) {
            console.error('Error fetching user role:', roleError);
          } else if (roleData && roleData.roles) {
            // Handle both object and array formats
            if (typeof roleData.roles === 'object' && roleData.roles !== null) {
              // If it's an array format
              if (Array.isArray(roleData.roles)) {
                setUserRole(roleData.roles[0]?.name || '');
              } else {
                // If it's an object format
                setUserRole(roleData.roles.name || '');
              }
            }
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
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', userId)
            .maybeSingle(); // Use maybeSingle instead of single
          
          if (!roleError && roleData && roleData.roles) {
            // Handle both object and array formats
            if (typeof roleData.roles === 'object' && roleData.roles !== null) {
              // If it's an array format
              if (Array.isArray(roleData.roles)) {
                setUserRole(roleData.roles[0]?.name || '');
              } else {
                // If it's an object format
                setUserRole(roleData.roles.name || '');
              }
            }
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