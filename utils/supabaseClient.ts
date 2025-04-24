import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { useEffect, useState } from 'react';

// Use environment variables for Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are not set.');
}

// Create a singleton Supabase client instance
// Using a global variable outside of any module system to ensure single instance
declare global {
  var supabaseInstance: ReturnType<typeof createClient<Database>> | undefined;
}

export const supabase = global.supabaseInstance || createClient<Database>(supabaseUrl, supabaseAnonKey);

// Only assign to global in non-production to avoid memory leaks in development from HMR
if (process.env.NODE_ENV !== 'production') {
  global.supabaseInstance = supabase;
}

// Helper function for handling common Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  return {
    message: error.message || 'An unexpected error occurred',
    status: error.status || 500,
  };
};

// Custom hook for Supabase authentication state
export function useSupabaseAuth() {
  const [user, setUser] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || undefined);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || undefined);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading };
}
