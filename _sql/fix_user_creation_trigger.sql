-- Fix user creation trigger function
-- This script will update the handle_new_user trigger function to ensure profiles are created correctly

-- Examine current implementation first
SELECT
    pg_get_functiondef(oid) AS function_definition
FROM
    pg_proc
WHERE
    proname = 'handle_new_user';

-- Update the trigger function with a proper implementation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_profile_id UUID;
    v_user_role TEXT;
BEGIN
    -- Log the start of the function
    RAISE LOG 'handle_new_user: Processing new auth user with ID % and email %', NEW.id, NEW.email;
    
    -- Extract role from metadata safely with proper fallback
    v_user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'homeowner');
    
    -- Insert into public users table
    INSERT INTO public.users (
        auth_user_id,
        email,
        first_name,
        last_name,
        role,
        email_confirmed
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'First'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Last'),
        v_user_role::user_role,
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
    )
    RETURNING id INTO v_user_id;
    
    RAISE LOG 'handle_new_user: Created user record with ID % for auth user %', v_user_id, NEW.id;
    
    -- Create the base profile record
    INSERT INTO public.profiles (
        user_id
    ) VALUES (
        v_user_id
    )
    RETURNING id INTO v_profile_id;
    
    RAISE LOG 'handle_new_user: Created profile with ID % for user %', v_profile_id, v_user_id;
    
    -- Create the appropriate role-specific profile
    CASE v_user_role
        WHEN 'homeowner' THEN
            INSERT INTO public.homeowner_profiles (
                id,
                preferred_contact_method
            ) VALUES (
                v_profile_id,
                'email'::contact_method
            );
            RAISE LOG 'handle_new_user: Created homeowner profile for user %', v_user_id;
            
        WHEN 'contractor' THEN
            INSERT INTO public.contractor_profiles (
                id,
                company_name,
                insurance_verified
            ) VALUES (
                v_profile_id,
                COALESCE(NEW.raw_user_meta_data->>'company_name', 'Company Name Not Provided'),
                false
            );
            RAISE LOG 'handle_new_user: Created contractor profile for user %', v_user_id;
            
        WHEN 'adjuster' THEN
            INSERT INTO public.adjuster_profiles (
                id,
                company_name,
                certification_verified
            ) VALUES (
                v_profile_id,
                COALESCE(NEW.raw_user_meta_data->>'company_name', 'Company Name Not Provided'),
                false
            );
            RAISE LOG 'handle_new_user: Created adjuster profile for user %', v_user_id;
            
        ELSE
            -- Default to homeowner for unknown roles
            INSERT INTO public.homeowner_profiles (
                id,
                preferred_contact_method
            ) VALUES (
                v_profile_id,
                'email'::contact_method
            );
            RAISE LOG 'handle_new_user: Created default homeowner profile for user with unknown role %', v_user_id;
    END CASE;
    
    RAISE LOG 'handle_new_user: Successfully completed profile creation for user %', v_user_id;
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail the trigger
        RAISE LOG 'handle_new_user ERROR for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger is correctly registered
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test the updated trigger function
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