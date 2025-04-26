-- Simple SQL script to allow unauthenticated signup
-- This specifically targets the permissions needed for the signup process

-- Enable direct access to tables during signup
-- This makes auth.uid() IS NULL work for new user creation
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Creation Policy" ON users;
CREATE POLICY "User Creation Policy" ON users FOR INSERT TO authenticated, anon
WITH CHECK (true);

-- Make sure the auth.users extension is available for signup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Simple policies for the necessary profile tables - ensuring they use auth_user_id consistently
DROP POLICY IF EXISTS "Profile Creation Policy" ON profiles;
CREATE POLICY "Profile Creation Policy" ON profiles FOR INSERT TO authenticated, anon
WITH CHECK (true);

-- Modify policies to use consistent auth_user_id references via proper joins
DROP POLICY IF EXISTS "Homeowner Profile Creation Policy" ON homeowner_profiles;
CREATE POLICY "Homeowner Profile Creation Policy" ON homeowner_profiles FOR INSERT TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Contractor Profile Creation Policy" ON contractor_profiles;
CREATE POLICY "Contractor Profile Creation Policy" ON contractor_profiles FOR INSERT TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Adjuster Profile Creation Policy" ON adjuster_profiles;
CREATE POLICY "Adjuster Profile Creation Policy" ON adjuster_profiles FOR INSERT TO authenticated, anon
WITH CHECK (true);

-- Ensure anonymous access to the database function
ALTER FUNCTION create_user_profile(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role user_role,
  p_auth_user_id UUID,
  p_avatar_url TEXT,
  p_phone TEXT,
  p_preferred_contact_method contact_method,
  p_additional_notes TEXT,
  p_company_name TEXT,
  p_license_number TEXT,
  p_specialties TEXT[],
  p_years_experience INTEGER,
  p_service_area TEXT,
  p_insurance_verified BOOLEAN,
  p_adjuster_license TEXT,
  p_territories TEXT[],
  p_certification_verified BOOLEAN
) SECURITY DEFINER;
-- Note: We're changing back to SECURITY DEFINER to ensure function has proper permissions

-- Grant execute permission to the anonymous role
GRANT EXECUTE ON FUNCTION create_user_profile TO anon;

-- Update the trigger permissions if needed
DO $$
BEGIN
  -- Make sure anonymous users can trigger necessary functions
  GRANT USAGE ON SCHEMA public TO anon;
  GRANT USAGE ON SCHEMA auth TO anon;
END $$;

-- Fix User Creation Trigger Function
-- This SQL file implements a comprehensive trigger-based solution to ensure
-- that when a new user is created, all necessary records are created in related tables

-- Drop the existing trigger function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create a new trigger function that creates all necessary profile entries
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_default_role user_role := 'homeowner'; -- Default role for new users, can be changed later
BEGIN
  -- Insert into public.users table with basic information from auth.users
  INSERT INTO public.users (
    auth_user_id,
    email,
    first_name,
    last_name,
    role,
    email_confirmed
  ) VALUES (
    NEW.id, -- auth.users.id
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)), -- Use email prefix as fallback
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''), -- Empty string as fallback
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, v_default_role), -- Default role if not specified
    NEW.email_confirmed
  ) RETURNING id INTO v_user_id;

  -- Create base profile
  INSERT INTO public.profiles (user_id) 
  VALUES (v_user_id)
  RETURNING id INTO v_profile_id;
  
  -- Create role-specific profile based on the user's role
  CASE COALESCE((NEW.raw_user_meta_data->>'role')::user_role, v_default_role)
    WHEN 'homeowner' THEN
      INSERT INTO public.homeowner_profiles (
        id,
        preferred_contact_method,
        additional_notes,
        property_count
      ) VALUES (
        v_profile_id,
        'email', -- Default contact method
        NULL, -- No additional notes by default
        0  -- No properties by default
      );
    
    WHEN 'contractor' THEN
      INSERT INTO public.contractor_profiles (
        id,
        company_name,
        license_number,
        specialties,
        years_experience,
        service_area,
        insurance_verified
      ) VALUES (
        v_profile_id,
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Company Name Not Provided'), -- Default company name
        NULL, -- No license number by default
        NULL, -- No specialties by default
        NULL, -- No years experience by default
        NULL, -- No service area by default
        FALSE -- Not verified by default
      );
    
    WHEN 'adjuster' THEN
      INSERT INTO public.adjuster_profiles (
        id,
        company_name,
        adjuster_license,
        territories,
        certification_verified
      ) VALUES (
        v_profile_id,
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Company Name Not Provided'), -- Default company name
        NULL, -- No adjuster license by default
        NULL, -- No territories by default
        FALSE -- Not verified by default
      );
    
    WHEN 'admin' THEN
      -- Admin doesn't need a specialized profile
      NULL;
      
    ELSE
      -- If somehow we get an invalid role, create a homeowner profile as fallback
      INSERT INTO public.homeowner_profiles (
        id,
        preferred_contact_method
      ) VALUES (
        v_profile_id,
        'email' -- Default contact method
      );
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Create the trigger on the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a maintenance function to fix existing users
-- This function can be run to create missing profile entries for existing users
CREATE OR REPLACE FUNCTION public.fix_missing_user_profiles()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  profile_created BOOLEAN,
  role_profile_created BOOLEAN,
  role user_role
) AS $$
DECLARE
  v_user RECORD;
  v_profile_id UUID;
  v_profile_exists BOOLEAN;
  v_role_profile_exists BOOLEAN;
  v_role user_role;
BEGIN
  FOR v_user IN 
    SELECT u.id, u.email, u.role FROM public.users u
  LOOP
    user_id := v_user.id;
    email := v_user.email;
    role := v_user.role;
    
    -- Check if profile exists - fix the ambiguous column reference by using table alias
    SELECT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.user_id = v_user.id
    ) INTO v_profile_exists;
    
    profile_created := FALSE;
    role_profile_created := FALSE;
    
    -- Create profile if it doesn't exist
    IF NOT v_profile_exists THEN
      INSERT INTO public.profiles (user_id)
      VALUES (v_user.id)
      RETURNING id INTO v_profile_id;
      profile_created := TRUE;
    ELSE
      SELECT id INTO v_profile_id FROM public.profiles p WHERE p.user_id = v_user.id;
    END IF;
    
    -- Check if role-specific profile exists
    CASE v_user.role
      WHEN 'homeowner' THEN
        SELECT EXISTS (
          SELECT 1 FROM public.homeowner_profiles WHERE id = v_profile_id
        ) INTO v_role_profile_exists;
        
        IF NOT v_role_profile_exists THEN
          INSERT INTO public.homeowner_profiles (
            id,
            preferred_contact_method
          ) VALUES (
            v_profile_id,
            'email'
          );
          role_profile_created := TRUE;
        END IF;
      
      WHEN 'contractor' THEN
        SELECT EXISTS (
          SELECT 1 FROM public.contractor_profiles WHERE id = v_profile_id
        ) INTO v_role_profile_exists;
        
        IF NOT v_role_profile_exists THEN
          INSERT INTO public.contractor_profiles (
            id,
            company_name,
            insurance_verified
          ) VALUES (
            v_profile_id,
            'Company Name Not Provided',
            FALSE
          );
          role_profile_created := TRUE;
        END IF;
      
      WHEN 'adjuster' THEN
        SELECT EXISTS (
          SELECT 1 FROM public.adjuster_profiles WHERE id = v_profile_id
        ) INTO v_role_profile_exists;
        
        IF NOT v_role_profile_exists THEN
          INSERT INTO public.adjuster_profiles (
            id,
            company_name,
            certification_verified
          ) VALUES (
            v_profile_id,
            'Company Name Not Provided',
            FALSE
          );
          role_profile_created := TRUE;
        END IF;
      
      WHEN 'admin' THEN
        -- Admins don't need a specialized profile
        role_profile_created := NULL;
      
      ELSE
        -- For any unhandled role, create a homeowner profile
        SELECT EXISTS (
          SELECT 1 FROM public.homeowner_profiles WHERE id = v_profile_id
        ) INTO v_role_profile_exists;
        
        IF NOT v_role_profile_exists THEN
          INSERT INTO public.homeowner_profiles (
            id,
            preferred_contact_method
          ) VALUES (
            v_profile_id,
            'email'
          );
          role_profile_created := TRUE;
        END IF;
    END CASE;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public, auth;

-- USAGE INSTRUCTIONS:
-- To fix existing users with missing profiles, run:
-- SELECT * FROM public.fix_missing_user_profiles();

-- Add standard RLS policies that use auth_user_id consistently
COMMENT ON TABLE users IS 'Table storing user information with auth_user_id linking to auth.users';

-- Add helper function to document and standardize auth user ID usage
CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;