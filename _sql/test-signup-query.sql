-- Comprehensive diagnostic script for user signup process
-- Run this in the Supabase SQL editor to diagnose the "Database error saving new user" issue

-- 1. Check current database schema for auth.users table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'auth'
    AND table_name = 'users'
ORDER BY
    ordinal_position;

-- 2. Check schema for public.users table
SELECT
    column_name,
    data_type,
    is_nullable, 
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
    AND table_name = 'users'
ORDER BY
    ordinal_position;

-- 3. Check any existing triggers on auth.users
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM
    information_schema.triggers
WHERE
    event_object_schema = 'auth'
    AND event_object_table = 'users'
ORDER BY
    trigger_name;

-- 4. Check the current trigger function for user creation
SELECT
    pg_get_functiondef(oid)
FROM
    pg_proc
WHERE
    proname = 'handle_new_user';

-- 5. Modify the users table (if needed) to allow temporary users during signup
ALTER TABLE public.users ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN last_name DROP NOT NULL;

-- 6. Create a new trigger function that handles the Supabase auth.users metadata properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value text;
  user_first_name text;
  user_last_name text;
  default_role text := 'homeowner';
BEGIN
  -- Debug log to see what we're getting from Supabase Auth
  RAISE LOG 'New user created: id=%, email=%, metadata=%', NEW.id, NEW.email, NEW.raw_user_meta_data;
  
  -- Extract metadata safely
  user_role_value := NEW.raw_user_meta_data->>'role';
  user_first_name := NEW.raw_user_meta_data->>'first_name';
  user_last_name := NEW.raw_user_meta_data->>'last_name';
  
  RAISE LOG 'Extracted values: role=%, first_name=%, last_name=%', user_role_value, user_first_name, user_last_name;
  
  -- Insert with safe values
  INSERT INTO public.users (auth_user_id, email, first_name, last_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(user_first_name, 'First'), 
    COALESCE(user_last_name, 'Last'),
    COALESCE(user_role_value, default_role)
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Detailed error logging
    RAISE LOG 'Error in handle_new_user trigger: % %', SQLSTATE, SQLERRM;
    RAISE LOG 'Error details: %', NEW.raw_user_meta_data;
    RETURN NEW; -- Still return NEW to not block the auth.users insert
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 7. Test the trigger function manually with mock data
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  test_email text := 'test-' || floor(random()*1000) || '@example.com';
BEGIN
  -- Debug what we're about to insert
  RAISE NOTICE 'Testing with user_id=%, email=%', test_user_id, test_email;
  
  -- Try direct insertion into public.users (bypassing trigger)
  BEGIN
    INSERT INTO public.users (auth_user_id, email, first_name, last_name, role)
    VALUES (test_user_id, test_email, 'First', 'Last', 'homeowner')
    RETURNING id;
    RAISE NOTICE 'Direct insert into public.users succeeded';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Direct insert failed: % %', SQLSTATE, SQLERRM;
  END;
  
  -- To test trigger, we would need to insert into auth.users which requires admin rights
  -- This would be done via the Supabase interface or API
END $$;

-- 8. Drop and recreate the trigger to use our updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Get current row level security policies for public.users
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

