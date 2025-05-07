-- Fix for redundant RLS policies on public.users table
-- This script cleans up overlapping insert policies that may cause signup issues

-- First, let's list all current policies on the users table to verify
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename = 'users';

-- Drop all redundant INSERT policies
DROP POLICY IF EXISTS "Allow public signup" ON public.users;
DROP POLICY IF EXISTS "Auth users can insert user data" ON public.users;
DROP POLICY IF EXISTS "User Creation Policy" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;

-- Create a single, clean INSERT policy for user creation
CREATE POLICY "Allow user creation during signup" 
ON public.users 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Keep the Select/Update policies as they're fine
-- But let's make sure they're properly configured
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.users;

-- Create a single SELECT policy
CREATE POLICY "Users can view own data" 
ON public.users 
FOR SELECT 
TO authenticated
USING (auth.uid() = auth_user_id);

-- Update policies
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.users;

-- Create a single UPDATE policy
CREATE POLICY "Users can update own data" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (auth.uid() = auth_user_id);

-- Update our trigger function to properly handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value text;
  default_role text := 'homeowner';
BEGIN
  -- Log what we're getting from Supabase Auth
  RAISE LOG 'New user creation triggered: id=%, email=%', NEW.id, NEW.email;
  
  -- Extract role from metadata safely
  user_role_value := NEW.raw_user_meta_data->>'role';
  
  -- Only attempt to create a temporary user record with auth_user_id
  -- Using COALESCE to handle potential NULL values safely
  INSERT INTO public.users (auth_user_id, email, first_name, last_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    'First', -- Default first name
    'Last',  -- Default last name
    COALESCE(user_role_value, default_role)::user_role
  );
  
  RAISE LOG 'New user record created successfully for %', NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the transaction
    RAISE LOG 'Error in handle_new_user for user %: %. Falling back to default values', NEW.email, SQLERRM;
    
    -- Try again with fallback approach
    BEGIN
      INSERT INTO public.users (auth_user_id, email, first_name, last_name, role)
      VALUES (
        NEW.id, 
        NEW.email, 
        'First', 
        'Last',
        default_role::user_role
      );
      RAISE LOG 'Fallback user creation succeeded for %', NEW.email;
    EXCEPTION
      WHEN others THEN
        RAISE LOG 'Critical failure creating user record: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Make sure the users table has RLS enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on role-specific profile tables
ALTER TABLE homeowner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjuster_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing role-specific profile policies
DROP POLICY IF EXISTS "Allow homeowner profile creation during signup" ON homeowner_profiles;
DROP POLICY IF EXISTS "Allow contractor profile creation during signup" ON contractor_profiles;
DROP POLICY IF EXISTS "Allow adjuster profile creation during signup" ON adjuster_profiles;
DROP POLICY IF EXISTS "Users can view their own homeowner profile" ON homeowner_profiles;
DROP POLICY IF EXISTS "Users can view their own contractor profile" ON contractor_profiles;
DROP POLICY IF EXISTS "Users can view their own adjuster profile" ON adjuster_profiles;

-- Allow creation of role-specific profiles during signup
CREATE POLICY "Allow homeowner profile creation during signup" ON homeowner_profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow contractor profile creation during signup" ON contractor_profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow adjuster profile creation during signup" ON adjuster_profiles
FOR INSERT WITH CHECK (true);

-- Allow users to view their own role-specific profile
CREATE POLICY "Users can view their own homeowner profile" ON homeowner_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE homeowner_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own contractor profile" ON contractor_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE contractor_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own adjuster profile" ON adjuster_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE adjuster_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- Check final policies after our changes
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename IN ('users', 'homeowner_profiles', 'contractor_profiles', 'adjuster_profiles');