import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { Enums } from '../../types/database.types';
import NavBar from './NavBar';
import Footer from './Footer';
import { supabase } from '../../utils/supabaseClient';

// Define UserRole type using the Enums
type UserRole = Enums<"user_role">;

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
          
          // Try to get stored user database ID first (faster than querying)
          const storedUserDbId = localStorage.getItem('supaUserDbId');
          
          // First check if user has role in user metadata (might be faster)
          if (session.user.user_metadata?.role) {
            setUserRole(session.user.user_metadata.role as UserRole);
            setIsLoading(false);
            return;
          }
          
          // Try to find user with stored DB ID if available
          if (storedUserDbId) {
            const { data: storedUser, error: storedError } = await supabase
              .from('users')
              .select('role')
              .eq('id', storedUserDbId)
              .maybeSingle();
              
            if (!storedError && storedUser?.role) {
              setUserRole(storedUser.role as UserRole);
              setIsLoading(false);
              return;
            }
          }
          
          // Fetch user role from the users table using auth_user_id
          try {
            // Get the user from the users table using auth_user_id
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, role')
              .eq('auth_user_id', authUserId)
              .maybeSingle();
            
            if (userError) {
              console.error('Error fetching user role:', userError);
              setUserRole('');
            } else if (userData && userData.role) {
              // Store the user DB ID for future use
              if (userData.id) {
                localStorage.setItem('supaUserDbId', userData.id);
              }
              
              setUserRole(userData.role as UserRole);
            } else {
              // If not found by auth_user_id, try email as fallback
              const { data: userByEmail, error: emailError } = session.user.email 
                ? await supabase
                    .from('users')
                    .select('id, role')
                    .eq('email', session.user.email)
                    .single()
                : { data: null, error: null };
              
              if (!emailError && userByEmail?.role) {
                // Store the user DB ID for future use
                if (userByEmail.id) {
                  localStorage.setItem('supaUserDbId', userByEmail.id);
                  
                  // Update the auth_user_id in the database to fix this issue permanently
                  const { error: updateError } = await supabase
                    .from('users')
                    .update({ auth_user_id: authUserId })
                    .eq('id', userByEmail.id)
                    .select();
                  
                  if (updateError) {
                    console.error('Error updating auth_user_id:', updateError);
                  }
                }
                
                setUserRole(userByEmail.role as UserRole);
              } else {
                setUserRole('');
                console.log('User has no role assigned yet - may need to complete profile');
              }
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
          
          // First check if user has role in user metadata 
          if (session.user.user_metadata?.role) {
            setUserRole(session.user.user_metadata.role as UserRole);
            return;
          }
          
          // Try to get stored user database ID (faster than querying)
          const storedUserDbId = localStorage.getItem('supaUserDbId');
          
          if (storedUserDbId) {
            const { data: storedUser, error: storedError } = await supabase
              .from('users')
              .select('role')
              .eq('id', storedUserDbId)
              .maybeSingle();
              
            if (!storedError && storedUser?.role) {
              setUserRole(storedUser.role as UserRole);
              return;
            }
          }
          
          // Fetch user role when auth state changes
          try {
            // Get the user from the users table using auth_user_id
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, role')
              .eq('auth_user_id', authUserId)
              .maybeSingle();
            
            if (!userError && userData && userData.role) {
              // Store the user DB ID for future use
              if (userData.id) {
                localStorage.setItem('supaUserDbId', userData.id);
              }
              
              setUserRole(userData.role as UserRole);
            } else {
              // Try one more time by email
              const { data: userByEmail, error: emailError } = session.user.email
                ? await supabase
                    .from('users')
                    .select('id, role')
                    .eq('email', session.user.email)
                    .single()
                : { data: null, error: null };
                
              if (!emailError && userByEmail?.role) {
                setUserRole(userByEmail.role as UserRole);
                
                // Store the user DB ID for future use
                if (userByEmail.id) {
                  localStorage.setItem('supaUserDbId', userByEmail.id);
                  
                  // Update the auth_user_id to fix this permanently
                  await supabase
                    .from('users')
                    .update({ auth_user_id: authUserId })
                    .eq('id', userByEmail.id)
                    .select();
                }
              } else {
                setUserRole('');
                console.log('User has no role assigned yet - may need to complete profile');
              }
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
          user={user ? user : undefined}
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