-- Fix for 500 Internal Server Error during signup
-- This script modifies the auth.users hooks to prevent automatic profile creation

-- Disable any hooks that try to automatically create profile entries
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Solution 1: Modify the users table to allow null first_name and last_name for initial signup
ALTER TABLE public.users ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN last_name DROP NOT NULL;

-- Create a trigger that only stores auth_user_id for later profile completion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value text;
  user_first_name text;
  user_last_name text;
  default_role user_role := 'homeowner'::user_role;
BEGIN
  -- Extract data from metadata safely
  user_role_value := NEW.raw_user_meta_data->>'role';
  user_first_name := NEW.raw_user_meta_data->>'first_name';
  user_last_name := NEW.raw_user_meta_data->>'last_name';
  
  -- Only attempt to create a temporary user record with auth_user_id
  -- Use the provided metadata or fallback to defaults
  INSERT INTO public.users (auth_user_id, email, first_name, last_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(user_first_name, 'First'), -- Use metadata value or default to 'First'
    COALESCE(user_last_name, 'Last'),   -- Use metadata value or default to 'Last'
    CASE 
      WHEN user_role_value IS NULL THEN default_role
      ELSE (user_role_value)::user_role
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the transaction
    RAISE LOG 'Error in handle_new_user for user %: %. Falling back to default role', NEW.email, SQLERRM;
    
    -- Try again with the default role
    INSERT INTO public.users (auth_user_id, email, first_name, last_name, role)
    VALUES (
      NEW.id, 
      NEW.email, 
      'First', -- Default first name 
      'Last',  -- Default last name
      default_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Create the trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to allow access during signup flow
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for users to select their own data
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = auth_user_id);

-- Policy for users to update their own data
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = auth_user_id);

-- Policy to allow insertion of user data for authenticated users
DROP POLICY IF EXISTS "Auth users can insert user data" ON public.users;
CREATE POLICY "Auth users can insert user data" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

-- Base profile table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to select their own profiles
DROP POLICY IF EXISTS "profiles_auth_select" ON public.profiles;
CREATE POLICY "profiles_auth_select" 
  ON public.profiles 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = profiles.user_id 
    AND users.auth_user_id = auth.uid()
  ));

-- Policy for users to insert their own profiles
DROP POLICY IF EXISTS "profiles_auth_insert" ON public.profiles;
CREATE POLICY "profiles_auth_insert" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = profiles.user_id 
    AND users.auth_user_id = auth.uid()
  ));

-- Policy for users to update their own profiles
DROP POLICY IF EXISTS "profiles_auth_update" ON public.profiles;
CREATE POLICY "profiles_auth_update" 
  ON public.profiles 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = profiles.user_id 
    AND users.auth_user_id = auth.uid()
  ));

-- Homeowner profiles table policies
ALTER TABLE public.homeowner_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to select their own homeowner profiles
DROP POLICY IF EXISTS "homeowner_profiles_auth_select" ON public.homeowner_profiles;
CREATE POLICY "homeowner_profiles_auth_select" 
  ON public.homeowner_profiles 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    JOIN public.users ON profiles.user_id = users.id
    WHERE homeowner_profiles.id = profiles.id 
    AND users.auth_user_id = auth.uid()
  ));

-- Policy for users to insert their own homeowner profiles
DROP POLICY IF EXISTS "homeowner_profiles_auth_insert" ON public.homeowner_profiles;
CREATE POLICY "homeowner_profiles_auth_insert" 
  ON public.homeowner_profiles 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.users ON profiles.user_id = users.id
    WHERE homeowner_profiles.id = profiles.id
    AND users.auth_user_id = auth.uid()
  ));

-- Policy for users to update their own homeowner profiles
DROP POLICY IF EXISTS "homeowner_profiles_auth_update" ON public.homeowner_profiles;
CREATE POLICY "homeowner_profiles_auth_update" 
  ON public.homeowner_profiles 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.users ON profiles.user_id = users.id
    WHERE homeowner_profiles.id = profiles.id
    AND users.auth_user_id = auth.uid()
  ));

-- Contractor profiles table policies
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to select their own contractor profiles
DROP POLICY IF EXISTS "contractor_profiles_auth_select" ON public.contractor_profiles;
CREATE POLICY "contractor_profiles_auth_select" 
  ON public.contractor_profiles 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    JOIN public.users ON profiles.user_id = users.id
    WHERE contractor_profiles.id = profiles.id 
    AND users.auth_user_id = auth.uid()
  ));

-- Policy for users to insert their own contractor profiles
DROP POLICY IF EXISTS "contractor_profiles_auth_insert" ON public.contractor_profiles;
CREATE POLICY "contractor_profiles_auth_insert" 
  ON public.contractor_profiles 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.users ON profiles.user_id = users.id
    WHERE contractor_profiles.id = profiles.id
    AND users.auth_user_id = auth.uid()
  ));

-- Policy for users to update their own contractor profiles
DROP POLICY IF EXISTS "contractor_profiles_auth_update" ON public.contractor_profiles;
CREATE POLICY "contractor_profiles_auth_update" 
  ON public.contractor_profiles 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.users ON profiles.user_id = users.id
    WHERE contractor_profiles.id = profiles.id
    AND users.auth_user_id = auth.uid()
  ));

-- Adjuster profiles table policies
ALTER TABLE public.adjuster_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to select their own adjuster profiles
DROP POLICY IF EXISTS "adjuster_profiles_auth_select" ON public.adjuster_profiles;
CREATE POLICY "adjuster_profiles_auth_select" 
  ON public.adjuster_profiles 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    JOIN public.users ON profiles.user_id = users.id
    WHERE adjuster_profiles.id = profiles.id 
    AND users.auth_user_id = auth.uid()
  ));

-- Policy for users to insert their own adjuster profiles
DROP POLICY IF EXISTS "adjuster_profiles_auth_insert" ON public.adjuster_profiles;
CREATE POLICY "adjuster_profiles_auth_insert" 
  ON public.adjuster_profiles 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.users ON profiles.user_id = users.id
    WHERE adjuster_profiles.id = profiles.id
    AND users.auth_user_id = auth.uid()
  ));

-- Policy for users to update their own adjuster profiles
DROP POLICY IF EXISTS "adjuster_profiles_auth_update" ON public.adjuster_profiles;
CREATE POLICY "adjuster_profiles_auth_update" 
  ON public.adjuster_profiles 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.users ON profiles.user_id = users.id
    WHERE adjuster_profiles.id = profiles.id
    AND users.auth_user_id = auth.uid()
  ));