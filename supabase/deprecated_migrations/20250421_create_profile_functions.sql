-- Function to manage user profiles including roles and type-specific profiles
CREATE OR REPLACE FUNCTION manage_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role TEXT,
    -- Generic profile fields
    p_avatar_url TEXT DEFAULT NULL,
    -- Homeowner fields
    p_preferred_contact_method TEXT DEFAULT NULL,
    p_additional_notes TEXT DEFAULT NULL,
    -- Contractor fields
    p_company_name TEXT DEFAULT NULL,
    p_license_number TEXT DEFAULT NULL,
    p_specialties TEXT[] DEFAULT NULL,
    p_years_experience INTEGER DEFAULT NULL,
    p_service_area TEXT DEFAULT NULL,
    -- Adjuster fields
    p_adjuster_license TEXT DEFAULT NULL,
    p_territories TEXT[] DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_timestamp TIMESTAMP := NOW();
    v_role_id UUID;
    v_role_exists BOOLEAN;
    v_profile_exists BOOLEAN;
    v_homeowner_exists BOOLEAN;
    v_contractor_exists BOOLEAN;
    v_adjuster_exists BOOLEAN;
    v_full_name TEXT;
    v_result JSONB := '{}'::JSONB;
    v_email_column_exists BOOLEAN;
BEGIN
    -- Set full name
    v_full_name := p_first_name || ' ' || p_last_name;
    
    -- Check if email column exists in profiles table
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'email'
    ) INTO v_email_column_exists;
    
    -- Check if role exists
    SELECT id INTO v_role_id FROM roles WHERE name = p_role;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Invalid role specified: %', p_role;
    END IF;
    
    -- Check if user exists in profiles table
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
    
    -- Check if user has role association
    SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = p_user_id) INTO v_role_exists;
    
    -- Check if type-specific profiles exist
    SELECT EXISTS(SELECT 1 FROM homeowner_profiles WHERE user_id = p_user_id) INTO v_homeowner_exists;
    SELECT EXISTS(SELECT 1 FROM contractor_profiles WHERE user_id = p_user_id) INTO v_contractor_exists;
    SELECT EXISTS(SELECT 1 FROM adjuster_profiles WHERE user_id = p_user_id) INTO v_adjuster_exists;
    
    -- Create or update base profile
    IF v_profile_exists THEN
        IF v_email_column_exists THEN
            -- Update with email if the column exists
            UPDATE profiles
            SET 
                email = p_email,
                full_name = v_full_name,
                avatar_url = COALESCE(p_avatar_url, avatar_url)
            WHERE id = p_user_id;
        ELSE
            -- Update without email if the column doesn't exist
            UPDATE profiles
            SET 
                full_name = v_full_name,
                avatar_url = COALESCE(p_avatar_url, avatar_url)
            WHERE id = p_user_id;
        END IF;
        v_result := v_result || jsonb_build_object('profile_updated', true);
    ELSE
        IF v_email_column_exists THEN
            -- Insert with email if the column exists
            INSERT INTO profiles (id, email, full_name, avatar_url, created_at)
            VALUES (p_user_id, p_email, v_full_name, p_avatar_url, v_timestamp);
        ELSE
            -- Insert without email if the column doesn't exist
            INSERT INTO profiles (id, full_name, avatar_url, created_at)
            VALUES (p_user_id, v_full_name, p_avatar_url, v_timestamp);
        END IF;
        v_result := v_result || jsonb_build_object('profile_created', true);
    END IF;
    
    -- Manage role assignment
    IF v_role_exists THEN
        UPDATE user_roles
        SET role_id = v_role_id
        WHERE user_id = p_user_id;
        v_result := v_result || jsonb_build_object('role_updated', true);
    ELSE
        INSERT INTO user_roles (id, user_id, role_id, created_at)
        VALUES (uuid_generate_v4(), p_user_id, v_role_id, v_timestamp);
        v_result := v_result || jsonb_build_object('role_created', true);
    END IF;
    
    -- Manage role-specific profiles
    CASE p_role
        WHEN 'Homeowner' THEN
            -- Handle homeowner profile
            IF v_homeowner_exists THEN
                UPDATE homeowner_profiles
                SET 
                    preferred_contact_method = COALESCE(p_preferred_contact_method, preferred_contact_method),
                    additional_notes = COALESCE(p_additional_notes, additional_notes),
                    updated_at = v_timestamp
                WHERE user_id = p_user_id;
                v_result := v_result || jsonb_build_object('homeowner_profile_updated', true);
            ELSE
                INSERT INTO homeowner_profiles (id, user_id, preferred_contact_method, additional_notes, created_at, updated_at)
                VALUES (uuid_generate_v4(), p_user_id, p_preferred_contact_method, p_additional_notes, v_timestamp, v_timestamp);
                v_result := v_result || jsonb_build_object('homeowner_profile_created', true);
            END IF;
            
        WHEN 'Contractor' THEN
            -- Handle contractor profile
            IF v_contractor_exists THEN
                UPDATE contractor_profiles
                SET 
                    company_name = COALESCE(p_company_name, company_name),
                    license_number = COALESCE(p_license_number, license_number),
                    specialties = COALESCE(p_specialties, specialties),
                    years_experience = COALESCE(p_years_experience, years_experience),
                    service_area = COALESCE(p_service_area, service_area),
                    updated_at = v_timestamp
                WHERE user_id = p_user_id;
                v_result := v_result || jsonb_build_object('contractor_profile_updated', true);
            ELSE
                INSERT INTO contractor_profiles (id, user_id, company_name, license_number, specialties, years_experience, service_area, created_at, updated_at)
                VALUES (uuid_generate_v4(), p_user_id, p_company_name, p_license_number, p_specialties, p_years_experience, p_service_area, v_timestamp, v_timestamp);
                v_result := v_result || jsonb_build_object('contractor_profile_created', true);
            END IF;
            
        WHEN 'Adjuster' THEN
            -- Handle adjuster profile
            IF v_adjuster_exists THEN
                UPDATE adjuster_profiles
                SET 
                    company_name = COALESCE(p_company_name, company_name),
                    adjuster_license = COALESCE(p_adjuster_license, adjuster_license),
                    territories = COALESCE(p_territories, territories),
                    updated_at = v_timestamp
                WHERE user_id = p_user_id;
                v_result := v_result || jsonb_build_object('adjuster_profile_updated', true);
            ELSE
                INSERT INTO adjuster_profiles (id, user_id, company_name, adjuster_license, territories, created_at, updated_at)
                VALUES (uuid_generate_v4(), p_user_id, p_company_name, p_adjuster_license, p_territories, v_timestamp, v_timestamp);
                v_result := v_result || jsonb_build_object('adjuster_profile_created', true);
            END IF;
            
        WHEN 'Admin' THEN
            -- Admin has no special profile, just assign the role
            v_result := v_result || jsonb_build_object('admin_role_assigned', true);
            
        ELSE
            RAISE EXCEPTION 'Unsupported role: %', p_role;
    END CASE;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;