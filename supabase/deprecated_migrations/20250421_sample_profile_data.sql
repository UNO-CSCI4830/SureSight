-- Sample data for SureSight application using the manage_user_profile function

-- First, create a sample admin user
WITH admin_user AS (
  INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
  VALUES (
    '11111111-1111-4111-a111-111111111111'::UUID, -- Sample UUID, replace with generated one in production
    'admin@suresight.com',
    '$2a$10$NZxvZavhJjShdwE...',  -- Placeholder for bcrypt hash
    'Admin',
    'User',
    NOW(),
    NOW()
  ) RETURNING id
)
SELECT manage_user_profile(
  id,                          -- p_user_id
  'admin@suresight.com',       -- p_email
  'Admin',                     -- p_first_name
  'User',                      -- p_last_name
  'Admin',                     -- p_role
  NULL                         -- p_avatar_url (leaving other params as default NULL)
) FROM admin_user;

-- Create a sample homeowner user
WITH homeowner_user AS (
  INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
  VALUES (
    '22222222-2222-4222-a222-222222222222'::UUID,
    'john.doe@example.com',
    '$2a$10$NZxvZavhJjShdwE...',
    'John',
    'Doe',
    NOW(),
    NOW()
  ) RETURNING id
)
SELECT manage_user_profile(
  id,                          -- p_user_id
  'john.doe@example.com',      -- p_email
  'John',                      -- p_first_name
  'Doe',                       -- p_last_name
  'Homeowner',                 -- p_role
  'https://example.com/avatar.jpg', -- p_avatar_url
  'email',                     -- p_preferred_contact_method
  'Prefers weekend appointments' -- p_additional_notes
) FROM homeowner_user;

-- Create a sample contractor user
WITH contractor_user AS (
  INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
  VALUES (
    '33333333-3333-4333-a333-333333333333'::UUID,
    'jane.smith@contractor.com',
    '$2a$10$NZxvZavhJjShdwE...',
    'Jane',
    'Smith',
    NOW(),
    NOW()
  ) RETURNING id
)
SELECT manage_user_profile(
  id,                            -- p_user_id
  'jane.smith@contractor.com',   -- p_email
  'Jane',                        -- p_first_name
  'Smith',                       -- p_last_name
  'Contractor',                  -- p_role
  NULL,                          -- p_avatar_url
  NULL,                          -- p_preferred_contact_method
  NULL,                          -- p_additional_notes
  'Smith Roofing & Repair',      -- p_company_name
  'CR12345',                     -- p_license_number
  ARRAY['Roofing', 'Siding'],    -- p_specialties
  15,                            -- p_years_experience
  'Greater Dallas Area'          -- p_service_area
) FROM contractor_user;

-- Create a sample insurance adjuster user
WITH adjuster_user AS (
  INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
  VALUES (
    '44444444-4444-4444-a444-444444444444'::UUID,
    'alex.johnson@insurance.com',
    '$2a$10$NZxvZavhJjShdwE...',
    'Alex',
    'Johnson',
    NOW(),
    NOW()
  ) RETURNING id
)
SELECT manage_user_profile(
  id,                            -- p_user_id
  'alex.johnson@insurance.com',  -- p_email
  'Alex',                        -- p_first_name
  'Johnson',                     -- p_last_name
  'Adjuster',                    -- p_role
  NULL,                          -- p_avatar_url
  NULL,                          -- p_preferred_contact_method
  NULL,                          -- p_additional_notes
  'Reliable Insurance Co',       -- p_company_name
  NULL,                          -- p_license_number
  NULL,                          -- p_specialties
  NULL,                          -- p_years_experience 
  NULL,                          -- p_service_area
  'ADJ-98765',                   -- p_adjuster_license
  ARRAY['Texas', 'Oklahoma', 'Louisiana'] -- p_territories
) FROM adjuster_user;