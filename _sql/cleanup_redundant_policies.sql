-- SQL Script to clean up redundant RLS policies
-- Based on the policy list from the database

-- ===== ADJUSTER PROFILES =====
DROP POLICY IF EXISTS "Adjuster Profile Creation Policy" ON public.adjuster_profiles;
DROP POLICY IF EXISTS "Allow adjuster profile creation" ON public.adjuster_profiles;
DROP POLICY IF EXISTS "Allow adjuster profile creation during signup" ON public.adjuster_profiles;
DROP POLICY IF EXISTS "Users can insert own adjuster profile" ON public.adjuster_profiles;
DROP POLICY IF EXISTS "Users can update own adjuster profile" ON public.adjuster_profiles;
DROP POLICY IF EXISTS "Users can view own adjuster profile" ON public.adjuster_profiles;
DROP POLICY IF EXISTS "Users can view their own adjuster profile" ON public.adjuster_profiles;
DROP POLICY IF EXISTS "adjuster_profiles_auth_insert" ON public.adjuster_profiles;
DROP POLICY IF EXISTS "adjuster_profiles_auth_select" ON public.adjuster_profiles;
DROP POLICY IF EXISTS "adjuster_profiles_auth_update" ON public.adjuster_profiles;

-- Create single clean policies for adjuster_profiles
CREATE POLICY "adjuster_profiles_insert_policy" ON public.adjuster_profiles
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "adjuster_profiles_select_policy" ON public.adjuster_profiles
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE adjuster_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
));

CREATE POLICY "adjuster_profiles_update_policy" ON public.adjuster_profiles
FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE adjuster_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
));

-- ===== CONTRACTOR PROFILES =====
DROP POLICY IF EXISTS "Allow contractor profile creation" ON public.contractor_profiles;
DROP POLICY IF EXISTS "Allow contractor profile creation during signup" ON public.contractor_profiles;
DROP POLICY IF EXISTS "Contractor Profile Creation Policy" ON public.contractor_profiles;
DROP POLICY IF EXISTS "Users can insert own contractor profile" ON public.contractor_profiles;
DROP POLICY IF EXISTS "Users can update own contractor profile" ON public.contractor_profiles;
DROP POLICY IF EXISTS "Users can view own contractor profile" ON public.contractor_profiles;
DROP POLICY IF EXISTS "Users can view their own contractor profile" ON public.contractor_profiles;
DROP POLICY IF EXISTS "contractor_profiles_auth_insert" ON public.contractor_profiles;
DROP POLICY IF EXISTS "contractor_profiles_auth_select" ON public.contractor_profiles;
DROP POLICY IF EXISTS "contractor_profiles_auth_update" ON public.contractor_profiles;

-- Create single clean policies for contractor_profiles
CREATE POLICY "contractor_profiles_insert_policy" ON public.contractor_profiles
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "contractor_profiles_select_policy" ON public.contractor_profiles
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE contractor_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
));

CREATE POLICY "contractor_profiles_update_policy" ON public.contractor_profiles
FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE contractor_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
));

-- ===== HOMEOWNER PROFILES =====
DROP POLICY IF EXISTS "Allow homeowner profile creation" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "Allow homeowner profile creation during signup" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "Contractors can view homeowner profiles" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "Homeowner Profile Creation Policy" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "Users can insert own homeowner profile" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "Users can update own homeowner profile" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "Users can view own homeowner profile" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "Users can view their own homeowner profile" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "homeowner_profiles_auth_insert" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "homeowner_profiles_auth_select" ON public.homeowner_profiles;
DROP POLICY IF EXISTS "homeowner_profiles_auth_update" ON public.homeowner_profiles;

-- Create single clean policies for homeowner_profiles
CREATE POLICY "homeowner_profiles_insert_policy" ON public.homeowner_profiles
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "homeowner_profiles_select_policy" ON public.homeowner_profiles
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE homeowner_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
));

CREATE POLICY "homeowner_profiles_update_policy" ON public.homeowner_profiles
FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE homeowner_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
));

-- Note: Removed the "contractors_view_homeowner_profiles" policy that referenced
-- the non-existent "projects" table

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Allow individual profile access" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;

-- Create clean profile policies
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = profiles.user_id 
    AND u.auth_user_id = auth.uid()
));

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = profiles.user_id 
    AND u.auth_user_id = auth.uid()
));

-- ===== USERS =====
-- Users table policies look clean, but let's ensure they're properly defined
DROP POLICY IF EXISTS "Allow individual user access" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;

-- Create clean user policies
CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (auth.uid() = auth_user_id);

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = auth_user_id);

-- Make sure we have proper indexing on foreign keys
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Verify our policy configuration
SELECT
    schemaname,
    tablename, 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 
    'profiles', 
    'homeowner_profiles', 
    'contractor_profiles', 
    'adjuster_profiles'
);