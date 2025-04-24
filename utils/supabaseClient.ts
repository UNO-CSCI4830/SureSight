export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Functions: {
      manage_user_profile: {
        Args: {
          p_user_id: string;
          p_email: string;
          p_first_name: string;
          p_last_name: string;
          p_role: string;
          p_avatar_url?: string | null;
          p_preferred_contact_method?: string | null;
          p_additional_notes?: string | null;
          p_company_name?: string | null;
          p_license_number?: string | null;
          p_specialties?: string[] | null;
          p_years_experience?: number | null;
          p_service_area?: string | null;
          p_adjuster_license?: string | null;
          p_territories?: string[] | null;
        };
        Returns: unknown;
      };
    };
  };
}

import { createClient } from '@supabase/supabase-js';
import { Database as SupabaseDatabase } from '../types/supabase';
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

export const supabase = createClient<SupabaseDatabase>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Helper function for handling common Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  return {
    message: error.message || 'An unexpected error occurred',
    status: error.status || 500,
  };
};
