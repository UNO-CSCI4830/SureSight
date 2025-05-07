-- Test script for user signup
-- This tests the user creation trigger flow directly

-- First, check if our trigger is properly registered
SELECT
    tgname AS "trigger_name",
    tgrelid::regclass AS "table",
    tgtype,
    tgenabled,
    pg_get_triggerdef(oid) AS "trigger_definition"
FROM
    pg_trigger
WHERE
    tgname = 'on_auth_user_created';

-- Examine the handle_new_user function 
SELECT
    pg_get_functiondef(oid) AS function_definition
FROM
    pg_proc
WHERE
    proname = 'handle_new_user';

-- Test the user trigger manually
-- Note: This is a test only. In real applications, users should be created via Auth API.
BEGIN;

-- Create a mock auth user record
DO $$
DECLARE
    v_user_id uuid := gen_random_uuid();
BEGIN
    -- Insert temporary record in auth.users table
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'test_user_' || floor(random() * 1000000) || '@example.com',
        '********',
        now(),
        '{"role": "homeowner", "first_name": "Test", "last_name": "User"}'::jsonb
    );

    RAISE NOTICE 'Created test user with ID %', v_user_id;

    -- Now check if our trigger worked
    PERFORM pg_sleep(0.1); -- Small pause to ensure trigger processed
    
    RAISE NOTICE 'Checking for created user records...';
    
    -- Check users table
    PERFORM * FROM public.users WHERE auth_user_id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Failed: No record created in public.users';
    END IF;
    
    -- Get the public user ID for further checks
    DECLARE
        public_user_id uuid;
    BEGIN
        SELECT id INTO public_user_id FROM public.users WHERE auth_user_id = v_user_id;
        RAISE NOTICE 'Found public user with ID %', public_user_id;
        
        -- Check for profile
        PERFORM * FROM public.profiles WHERE user_id = public_user_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed: No profile created for user';
        END IF;
        
        -- Check for homeowner profile (as per role in metadata)
        DECLARE 
            profile_id uuid;
        BEGIN
            SELECT id INTO profile_id FROM public.profiles WHERE user_id = public_user_id;
            RAISE NOTICE 'Found profile with ID %', profile_id;
            
            PERFORM * FROM public.homeowner_profiles WHERE id = profile_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Failed: No homeowner profile created';
            END IF;
            
            RAISE NOTICE 'Success! User creation trigger flow works correctly';
        END;
    END;
END $$;

-- Roll back our test data
ROLLBACK;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Test complete. If you see "Success!" message, the user creation flow is working correctly.';
    RAISE NOTICE 'You should now be able to sign up without database errors.';
    RAISE NOTICE '======================================';
END $$;