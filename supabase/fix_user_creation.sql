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

-- Simple policies for the necessary profile tables
DROP POLICY IF EXISTS "Profile Creation Policy" ON profiles;
CREATE POLICY "Profile Creation Policy" ON profiles FOR INSERT TO authenticated, anon
WITH CHECK (true);

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