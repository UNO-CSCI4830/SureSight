-- Data Migration Script
-- Transfers data from old schema to new schema
-- This should be run after the schema has been created

-- Function to safely migrate user data
CREATE OR REPLACE FUNCTION migrate_users_data() 
RETURNS void AS $$
DECLARE
    old_users RECORD;
    old_homeowner RECORD;
    old_contractor RECORD;
    old_adjuster RECORD;
    v_user_id UUID;
    v_profile_id UUID;
    v_role user_role;
BEGIN
    -- Check if there's data to migrate
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_old') THEN
        -- Iterate through old users
        FOR old_users IN 
            SELECT * FROM users_old
        LOOP
            -- Determine the user's role from user_roles_old if it exists
            BEGIN
                SELECT r.name::user_role INTO v_role
                FROM user_roles_old ur
                JOIN roles_old r ON ur.role_id = r.id
                WHERE ur.user_id = old_users.id
                LIMIT 1;
            EXCEPTION WHEN OTHERS THEN
                -- Default to homeowner if no role found
                v_role := 'homeowner'::user_role;
            END;
            
            -- Insert the user into new schema
            INSERT INTO users (
                id, 
                email, 
                first_name, 
                last_name, 
                role,
                created_at,
                updated_at
            ) VALUES (
                old_users.id,
                old_users.email,
                COALESCE(old_users.first_name, 'Unknown'),
                COALESCE(old_users.last_name, 'User'),
                v_role,
                COALESCE(old_users.created_at, now()),
                COALESCE(old_users.updated_at, now())
            )
            ON CONFLICT (id) DO NOTHING
            RETURNING id INTO v_user_id;
            
            -- Only continue if user was inserted
            IF v_user_id IS NOT NULL THEN
                -- Create base profile
                INSERT INTO profiles (user_id)
                VALUES (v_user_id)
                RETURNING id INTO v_profile_id;
                
                -- Create role-specific profile
                CASE v_role
                    WHEN 'homeowner' THEN
                        -- Check if there's homeowner data
                        SELECT * INTO old_homeowner 
                        FROM homeowner_profiles_old 
                        WHERE user_id = old_users.id
                        LIMIT 1;
                        
                        IF FOUND THEN
                            INSERT INTO homeowner_profiles (
                                id,
                                preferred_contact_method,
                                additional_notes
                            ) VALUES (
                                v_profile_id,
                                COALESCE(old_homeowner.preferred_contact_method, 'email')::contact_method,
                                old_homeowner.additional_notes
                            );
                        ELSE
                            -- Create default homeowner profile
                            INSERT INTO homeowner_profiles (id)
                            VALUES (v_profile_id);
                        END IF;
                        
                    WHEN 'contractor' THEN
                        -- Check if there's contractor data
                        SELECT * INTO old_contractor 
                        FROM contractor_profiles_old 
                        WHERE user_id = old_users.id
                        LIMIT 1;
                        
                        IF FOUND THEN
                            INSERT INTO contractor_profiles (
                                id,
                                company_name,
                                license_number,
                                specialties,
                                years_experience,
                                service_area
                            ) VALUES (
                                v_profile_id,
                                COALESCE(old_contractor.company_name, 'Unknown Company'),
                                old_contractor.license_number,
                                old_contractor.specialties,
                                old_contractor.years_experience,
                                old_contractor.service_area
                            );
                        ELSE
                            -- Create default contractor profile
                            INSERT INTO contractor_profiles (
                                id,
                                company_name
                            ) VALUES (
                                v_profile_id,
                                'Unknown Company'
                            );
                        END IF;
                        
                    WHEN 'adjuster' THEN
                        -- Check if there's adjuster data
                        SELECT * INTO old_adjuster 
                        FROM adjuster_profiles_old 
                        WHERE user_id = old_users.id
                        LIMIT 1;
                        
                        IF FOUND THEN
                            INSERT INTO adjuster_profiles (
                                id,
                                company_name,
                                adjuster_license,
                                territories
                            ) VALUES (
                                v_profile_id,
                                COALESCE(old_adjuster.company_name, 'Unknown Company'),
                                old_adjuster.adjuster_license,
                                old_adjuster.territories
                            );
                        ELSE
                            -- Create default adjuster profile
                            INSERT INTO adjuster_profiles (
                                id,
                                company_name
                            ) VALUES (
                                v_profile_id,
                                'Unknown Insurance Company'
                            );
                        END IF;
                        
                    WHEN 'admin' THEN
                        -- Admin doesn't need a specialized profile
                        NULL;
                        
                    ELSE
                        RAISE NOTICE 'Unknown role: %', v_role;
                END CASE;
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to safely migrate report data
CREATE OR REPLACE FUNCTION migrate_reports_data() 
RETURNS void AS $$
DECLARE
    old_report RECORD;
    old_assessment RECORD;
    v_report_id UUID;
    v_property_id UUID;
    v_assessment_id UUID;
    v_user_id UUID;
    v_profile_id UUID;
    v_homeowner_id UUID;
BEGIN
    -- Check if there's data to migrate
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports_old') THEN
        -- For each report, we need to first create a property
        FOR old_report IN 
            SELECT * FROM reports_old
        LOOP
            -- Get the user ID
            v_user_id := old_report.user_id;
            
            -- Find the homeowner profile for this user
            SELECT p.id INTO v_profile_id
            FROM profiles p
            JOIN users u ON p.user_id = u.id
            WHERE u.id = v_user_id;
            
            IF v_profile_id IS NULL THEN
                -- Skip if we can't find a profile
                CONTINUE;
            END IF;
            
            -- Get the homeowner profile ID
            SELECT id INTO v_homeowner_id
            FROM homeowner_profiles
            WHERE id = v_profile_id;
            
            IF v_homeowner_id IS NULL THEN
                -- Create a homeowner profile if one doesn't exist
                INSERT INTO homeowner_profiles (
                    id
                ) VALUES (
                    v_profile_id
                )
                RETURNING id INTO v_homeowner_id;
            END IF;
            
            -- Create a property for this report
            INSERT INTO properties (
                homeowner_id,
                address_line1,
                city,
                state,
                postal_code
            ) VALUES (
                v_homeowner_id,
                COALESCE(old_report.address, 'Unknown Address'),
                'Unknown City',  -- These aren't in the old schema
                'Unknown State',
                'Unknown'
            )
            RETURNING id INTO v_property_id;
            
            -- Parse status to enum
            INSERT INTO reports (
                id,
                property_id,
                creator_id,
                title,
                status,
                created_at,
                updated_at
            ) VALUES (
                old_report.id,
                v_property_id,
                v_user_id,
                'Report ' || old_report.id,
                CASE 
                    WHEN old_report.status = 'draft' THEN 'draft'::report_status
                    WHEN old_report.status = 'submitted' THEN 'submitted'::report_status
                    WHEN old_report.status = 'in_review' THEN 'in_review'::report_status
                    ELSE 'draft'::report_status
                END,
                COALESCE(old_report.created_at, now()),
                COALESCE(old_report.updated_at, now())
            )
            ON CONFLICT (id) DO NOTHING
            RETURNING id INTO v_report_id;
            
            -- Migrate assessments if they exist
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments_old') THEN
                FOR old_assessment IN 
                    SELECT * FROM assessments_old
                    WHERE report_id = old_report.id
                LOOP
                    INSERT INTO assessment_areas (
                        report_id,
                        damage_type,
                        location,
                        severity,
                        notes
                    ) VALUES (
                        v_report_id,
                        'roof'::damage_type,  -- Default since old data doesn't have enum
                        'Unknown Location',
                        'moderate'::damage_severity, -- Default since old data doesn't have enum
                        old_assessment.notes
                    )
                    RETURNING id INTO v_assessment_id;
                    
                    -- Migrate images if they exist
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'images_old') THEN
                        INSERT INTO images (
                            assessment_area_id,
                            storage_path,
                            filename,
                            uploaded_by
                        )
                        SELECT 
                            v_assessment_id,
                            i.storage_path,
                            split_part(i.storage_path, '/', -1),
                            v_user_id
                        FROM images_old i
                        WHERE i.assessment_id = old_assessment.id;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Main migration process
DO $$
BEGIN
    -- Rename current tables to preserve data
    ALTER TABLE IF EXISTS users RENAME TO users_old;
    ALTER TABLE IF EXISTS roles RENAME TO roles_old;
    ALTER TABLE IF EXISTS user_roles RENAME TO user_roles_old;
    ALTER TABLE IF EXISTS profiles RENAME TO profiles_old;
    ALTER TABLE IF EXISTS homeowner_profiles RENAME TO homeowner_profiles_old;
    ALTER TABLE IF EXISTS contractor_profiles RENAME TO contractor_profiles_old;
    ALTER TABLE IF EXISTS adjuster_profiles RENAME TO adjuster_profiles_old;
    ALTER TABLE IF EXISTS reports RENAME TO reports_old;
    ALTER TABLE IF EXISTS assessments RENAME TO assessments_old;
    ALTER TABLE IF EXISTS images RENAME TO images_old;
    
    -- Run migration functions after schema creation
    PERFORM migrate_users_data();
    PERFORM migrate_reports_data();
    
    -- Drop temporary functions
    DROP FUNCTION IF EXISTS migrate_users_data();
    DROP FUNCTION IF EXISTS migrate_reports_data();
END
$$;