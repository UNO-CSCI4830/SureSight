-- Fix redundant policies on the profiles table
-- This is a focused script just for the profiles table which still has multiple overlapping policies

-- First, drop all existing policies on the profiles table
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Profile Creation Policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_auth_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_auth_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_auth_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Now create clean, consistent policies

-- Insert policy - allow both anon and authenticated (needed for signup)
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Select policy - only allow users to see their own profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = profiles.user_id 
    AND u.auth_user_id = auth.uid()
));

-- Update policy - only allow users to update their own profiles
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = profiles.user_id 
    AND u.auth_user_id = auth.uid()
));

-- Verify final policy configuration for the profiles table
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles';