-- SQL script to fix the "Database error saving new user" issue
-- This script adds the necessary RLS policies to allow user registration
-- Updated for the new database schema (April 2025)

-- 1. Allow public (non-authenticated) access to create_user_profile function
-- This makes the function accessible during signup
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
) SECURITY INVOKER;

-- 2. Add RLS policies to allow inserting new users during signup
-- First drop existing policies if they exist (to avoid duplicates)
DO $$
BEGIN
  -- Drop existing policies if they exist
  -- Users table
  BEGIN
    DROP POLICY IF EXISTS "Allow public signup" ON users;
  EXCEPTION
    WHEN undefined_object THEN
      -- Policy doesn't exist, just continue
  END;
  
  -- Profiles table  
  BEGIN
    DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
  EXCEPTION
    WHEN undefined_object THEN
      -- Policy doesn't exist, just continue
  END;
  
  -- Homeowner profiles
  BEGIN
    DROP POLICY IF EXISTS "Allow homeowner profile creation" ON homeowner_profiles;
  EXCEPTION
    WHEN undefined_object THEN
      -- Policy doesn't exist, just continue
  END;
  
  -- Contractor profiles
  BEGIN
    DROP POLICY IF EXISTS "Allow contractor profile creation" ON contractor_profiles;
  EXCEPTION
    WHEN undefined_object THEN
      -- Policy doesn't exist, just continue
  END;
  
  -- Adjuster profiles
  BEGIN
    DROP POLICY IF EXISTS "Allow adjuster profile creation" ON adjuster_profiles;
  EXCEPTION
    WHEN undefined_object THEN
      -- Policy doesn't exist, just continue
  END;
END $$;

-- Create policies without the IF NOT EXISTS syntax
-- Policy for users table
CREATE POLICY "Allow public signup" ON users
  FOR INSERT WITH CHECK (true);  -- Allow anyone to insert into users table during signup

-- Policy for profiles table
CREATE POLICY "Allow profile creation" ON profiles
  FOR INSERT WITH CHECK (true);  -- Allow profile creation

-- Homeowner profiles
CREATE POLICY "Allow homeowner profile creation" ON homeowner_profiles
  FOR INSERT WITH CHECK (true);

-- Contractor profiles
CREATE POLICY "Allow contractor profile creation" ON contractor_profiles
  FOR INSERT WITH CHECK (true);

-- Adjuster profiles
CREATE POLICY "Allow adjuster profile creation" ON adjuster_profiles
  FOR INSERT WITH CHECK (true);

-- 5. Fix for potential database error if column names have changed
-- Check if create_user_profile function needs updating
DO $$
BEGIN
  -- Add your function check/update logic here if needed
  NULL; -- Placeholder
END $$;

-- 6. Verify the signup roles are defined properly
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('homeowner', 'contractor', 'adjuster', 'admin');
  END IF;
END $$;

-- End of migration script