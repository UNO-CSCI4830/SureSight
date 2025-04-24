-- Database Functions for SureSight Application

-- User Profile Management function - Creates user profile with proper role-specific data
CREATE OR REPLACE FUNCTION create_user_profile(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role user_role,
  p_auth_user_id UUID,
  p_avatar_url TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  -- Homeowner specific
  p_preferred_contact_method contact_method DEFAULT 'email',
  p_additional_notes TEXT DEFAULT NULL,
  -- Contractor specific
  p_company_name TEXT DEFAULT NULL,
  p_license_number TEXT DEFAULT NULL,
  p_specialties TEXT[] DEFAULT NULL,
  p_years_experience INTEGER DEFAULT NULL,
  p_service_area TEXT DEFAULT NULL,
  p_insurance_verified BOOLEAN DEFAULT FALSE,
  -- Adjuster specific
  p_adjuster_license TEXT DEFAULT NULL,
  p_territories TEXT[] DEFAULT NULL,
  p_certification_verified BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  -- Insert the base user
  INSERT INTO users (
    email, 
    first_name, 
    last_name, 
    role, 
    auth_user_id,
    avatar_url,
    phone
  ) VALUES (
    p_email, 
    p_first_name, 
    p_last_name, 
    p_role, 
    p_auth_user_id,
    p_avatar_url,
    p_phone
  ) RETURNING id INTO v_user_id;
  
  -- Create base profile
  INSERT INTO profiles (user_id) 
  VALUES (v_user_id)
  RETURNING id INTO v_profile_id;
  
  -- Create role-specific profile
  CASE p_role
    WHEN 'homeowner' THEN
      INSERT INTO homeowner_profiles (
        id, 
        preferred_contact_method, 
        additional_notes
      ) VALUES (
        v_profile_id, 
        p_preferred_contact_method, 
        p_additional_notes
      );
    
    WHEN 'contractor' THEN
      INSERT INTO contractor_profiles (
        id, 
        company_name, 
        license_number, 
        specialties, 
        years_experience, 
        service_area,
        insurance_verified
      ) VALUES (
        v_profile_id, 
        p_company_name, 
        p_license_number, 
        p_specialties, 
        p_years_experience, 
        p_service_area,
        p_insurance_verified
      );
    
    WHEN 'adjuster' THEN
      INSERT INTO adjuster_profiles (
        id, 
        company_name, 
        adjuster_license, 
        territories,
        certification_verified
      ) VALUES (
        v_profile_id, 
        p_company_name, 
        p_adjuster_license, 
        p_territories,
        p_certification_verified
      );
    
    WHEN 'admin' THEN
      -- Admin doesn't need a specialized profile
      NULL;
      
    ELSE
      RAISE EXCEPTION 'Invalid user role: %', p_role;
  END CASE;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with role-specific data
CREATE OR REPLACE FUNCTION get_complete_user_profile(p_user_id UUID) 
RETURNS JSONB AS $$
DECLARE
  v_user users;
  v_profile_id UUID;
  v_role user_role;
  v_result JSONB;
  v_role_data JSONB := '{}'::JSONB;
BEGIN
  -- Get the user
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get the base profile
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = p_user_id;
  
  -- Get role-specific data
  v_role := v_user.role;
  
  CASE v_role
    WHEN 'homeowner' THEN
      SELECT jsonb_build_object(
        'preferred_contact_method', hp.preferred_contact_method,
        'additional_notes', hp.additional_notes,
        'property_count', hp.property_count
      ) INTO v_role_data
      FROM homeowner_profiles hp
      WHERE hp.id = v_profile_id;
    
    WHEN 'contractor' THEN
      SELECT jsonb_build_object(
        'company_name', cp.company_name,
        'license_number', cp.license_number,
        'specialties', cp.specialties,
        'years_experience', cp.years_experience,
        'service_area', cp.service_area,
        'insurance_verified', cp.insurance_verified,
        'rating', cp.rating
      ) INTO v_role_data
      FROM contractor_profiles cp
      WHERE cp.id = v_profile_id;
    
    WHEN 'adjuster' THEN
      SELECT jsonb_build_object(
        'company_name', ap.company_name,
        'adjuster_license', ap.adjuster_license,
        'territories', ap.territories,
        'certification_verified', ap.certification_verified
      ) INTO v_role_data
      FROM adjuster_profiles ap
      WHERE ap.id = v_profile_id;
    
    WHEN 'admin' THEN
      v_role_data := '{}'::JSONB;
    
    ELSE
      RAISE EXCEPTION 'Invalid user role: %', v_role;
  END CASE;
  
  -- Build the complete profile
  v_result := jsonb_build_object(
    'id', v_user.id,
    'email', v_user.email,
    'first_name', v_user.first_name,
    'last_name', v_user.last_name,
    'role', v_user.role,
    'avatar_url', v_user.avatar_url,
    'phone', v_user.phone,
    'email_confirmed', v_user.email_confirmed,
    'active', v_user.active,
    'created_at', v_user.created_at,
    'updated_at', v_user.updated_at,
    'profile_id', v_profile_id,
    'role_data', v_role_data
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new property
CREATE OR REPLACE FUNCTION create_property(
  p_homeowner_profile_id UUID,
  p_address_line1 TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_address_line2 TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'USA',
  p_property_type TEXT DEFAULT NULL,
  p_year_built INTEGER DEFAULT NULL,
  p_square_footage INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_property_id UUID;
  v_homeowner_exists BOOLEAN;
BEGIN
  -- Verify homeowner profile exists
  SELECT EXISTS (
    SELECT 1 FROM homeowner_profiles 
    WHERE id = p_homeowner_profile_id
  ) INTO v_homeowner_exists;
  
  IF NOT v_homeowner_exists THEN
    RAISE EXCEPTION 'Homeowner profile not found: %', p_homeowner_profile_id;
  END IF;
  
  -- Create the property
  INSERT INTO properties (
    homeowner_id,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    property_type,
    year_built,
    square_footage
  ) VALUES (
    p_homeowner_profile_id,
    p_address_line1,
    p_address_line2,
    p_city,
    p_state,
    p_postal_code,
    p_country,
    p_property_type,
    p_year_built,
    p_square_footage
  ) RETURNING id INTO v_property_id;
  
  -- Update the homeowner's property count
  UPDATE homeowner_profiles 
  SET property_count = (
    SELECT COUNT(*) FROM properties 
    WHERE homeowner_id = p_homeowner_profile_id
  )
  WHERE id = p_homeowner_profile_id;
  
  RETURN v_property_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new report
CREATE OR REPLACE FUNCTION create_report(
  p_property_id UUID,
  p_creator_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_incident_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
BEGIN
  -- Create the report
  INSERT INTO reports (
    property_id,
    creator_id,
    title,
    description,
    incident_date
  ) VALUES (
    p_property_id,
    p_creator_id,
    p_title,
    p_description,
    p_incident_date
  ) RETURNING id INTO v_report_id;
  
  -- Create an activity log entry
  INSERT INTO activities (
    user_id,
    report_id,
    activity_type,
    details
  ) VALUES (
    p_creator_id,
    v_report_id,
    'report_created',
    jsonb_build_object(
      'title', p_title,
      'property_id', p_property_id
    )
  );
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql;

-- Function to assign a contractor to a report
CREATE OR REPLACE FUNCTION assign_contractor_to_report(
  p_report_id UUID,
  p_contractor_profile_id UUID,
  p_assigned_by_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_report_exists BOOLEAN;
  v_contractor_exists BOOLEAN;
  v_report_creator UUID;
  v_property_id UUID;
  v_homeowner_id UUID;
BEGIN
  -- Verify report exists
  SELECT EXISTS (
    SELECT 1 FROM reports WHERE id = p_report_id
  ) INTO v_report_exists;
  
  IF NOT v_report_exists THEN
    RAISE EXCEPTION 'Report not found: %', p_report_id;
  END IF;
  
  -- Verify contractor exists
  SELECT EXISTS (
    SELECT 1 FROM contractor_profiles WHERE id = p_contractor_profile_id
  ) INTO v_contractor_exists;
  
  IF NOT v_contractor_exists THEN
    RAISE EXCEPTION 'Contractor profile not found: %', p_contractor_profile_id;
  END IF;
  
  -- Get report creator and property info (for permission check)
  SELECT 
    r.creator_id, r.property_id, p.homeowner_id 
  INTO 
    v_report_creator, v_property_id, v_homeowner_id
  FROM 
    reports r
    JOIN properties p ON r.property_id = p.id
  WHERE r.id = p_report_id;
  
  -- Check permissions (only report creator or admin can assign)
  -- In a real app, we'd check user role here but for simplicity we'll just check creator
  IF v_report_creator <> p_assigned_by_user_id THEN
    RAISE EXCEPTION 'User does not have permission to assign contractors to this report';
  END IF;
  
  -- Assign contractor to report
  UPDATE reports SET 
    contractor_id = p_contractor_profile_id,
    updated_at = NOW()
  WHERE id = p_report_id;
  
  -- Create an activity log entry
  INSERT INTO activities (
    user_id,
    report_id,
    activity_type,
    details
  ) VALUES (
    p_assigned_by_user_id,
    p_report_id,
    'contractor_assigned',
    jsonb_build_object(
      'contractor_profile_id', p_contractor_profile_id
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to submit a report (changing status from draft to submitted)
CREATE OR REPLACE FUNCTION submit_report(
  p_report_id UUID,
  p_submitted_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_report_exists BOOLEAN;
  v_report_creator UUID;
BEGIN
  -- Check if report exists and get creator
  SELECT 
    EXISTS(SELECT 1 FROM reports WHERE id = p_report_id),
    creator_id
  INTO 
    v_report_exists, v_report_creator
  FROM reports
  WHERE id = p_report_id;
  
  IF NOT v_report_exists THEN
    RAISE EXCEPTION 'Report not found: %', p_report_id;
  END IF;
  
  -- Check if user is the creator
  IF v_report_creator <> p_submitted_by THEN
    RAISE EXCEPTION 'Only the report creator can submit the report';
  END IF;
  
  -- Update report status
  UPDATE reports SET 
    status = 'submitted',
    submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_report_id;
  
  -- Create activity log
  INSERT INTO activities (
    user_id,
    report_id,
    activity_type,
    details
  ) VALUES (
    p_submitted_by,
    p_report_id,
    'report_submitted',
    jsonb_build_object(
      'submitted_at', NOW()
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to add an assessment area to a report
CREATE OR REPLACE FUNCTION add_assessment_area(
  p_report_id UUID,
  p_damage_type damage_type,
  p_location TEXT,
  p_severity damage_severity,
  p_added_by UUID,
  p_dimensions TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_report_exists BOOLEAN;
  v_area_id UUID;
BEGIN
  -- Check if report exists
  SELECT EXISTS(
    SELECT 1 FROM reports WHERE id = p_report_id
  ) INTO v_report_exists;
  
  IF NOT v_report_exists THEN
    RAISE EXCEPTION 'Report not found: %', p_report_id;
  END IF;
  
  -- Create assessment area
  INSERT INTO assessment_areas (
    report_id,
    damage_type,
    location,
    severity,
    dimensions,
    notes
  ) VALUES (
    p_report_id,
    p_damage_type,
    p_location,
    p_severity,
    p_dimensions,
    p_notes
  ) RETURNING id INTO v_area_id;
  
  -- Create activity log
  INSERT INTO activities (
    user_id,
    report_id,
    activity_type,
    details
  ) VALUES (
    p_added_by,
    p_report_id,
    'assessment_added',
    jsonb_build_object(
      'assessment_id', v_area_id,
      'damage_type', p_damage_type,
      'location', p_location,
      'severity', p_severity
    )
  );
  
  RETURN v_area_id;
END;
$$ LANGUAGE plpgsql;