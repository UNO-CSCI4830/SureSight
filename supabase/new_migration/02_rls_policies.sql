-- Set up Row Level Security (RLS) policies
-- Disable RLS on the public.users table to allow internal signup trigger to insert new user row
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Enable RLS on all tables first
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Allow public insert on users
DROP POLICY IF EXISTS "Allow public signup" ON users;
CREATE POLICY "Allow public signup" ON users
  FOR INSERT WITH CHECK (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Allow public insert on profiles
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
CREATE POLICY "Allow profile creation" ON profiles
  FOR INSERT WITH CHECK (true);

ALTER TABLE homeowner_profiles ENABLE ROW LEVEL SECURITY;
-- Allow public insert on homeowner_profiles
DROP POLICY IF EXISTS "Allow homeowner profile creation" ON homeowner_profiles;
CREATE POLICY "Allow homeowner profile creation" ON homeowner_profiles
  FOR INSERT WITH CHECK (true);

ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;
-- Allow public insert on contractor_profiles
DROP POLICY IF EXISTS "Allow contractor profile creation" ON contractor_profiles;
CREATE POLICY "Allow contractor profile creation" ON contractor_profiles
  FOR INSERT WITH CHECK (true);

ALTER TABLE adjuster_profiles ENABLE ROW LEVEL SECURITY;
-- Allow public insert on adjuster_profiles
DROP POLICY IF EXISTS "Allow adjuster profile creation" ON adjuster_profiles;
CREATE POLICY "Allow adjuster profile creation" ON adjuster_profiles
  FOR INSERT WITH CHECK (true);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

-- Remove admin policies on users
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- Remove legacy admin policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can view all activities" ON activities;

-- User policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Allow authenticated select" ON users;
CREATE POLICY "Allow authenticated select" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Allow authenticated update" ON users;
CREATE POLICY "Allow authenticated update" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Profile policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = profiles.user_id AND auth_user_id = auth.uid()
    )
  );

-- Homeowner profile policies
CREATE POLICY "Users can view their own homeowner profile" ON homeowner_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE homeowner_profiles.id = p.id AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Contractors can view homeowner profiles for their reports" ON homeowner_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports r
      JOIN properties p ON r.property_id = p.id
      JOIN users u ON u.id = (
        SELECT pc.user_id FROM profiles pc 
        JOIN contractor_profiles c ON c.id = pc.id 
        WHERE c.id = r.contractor_id
      )
      WHERE p.homeowner_id = homeowner_profiles.id
        AND u.auth_user_id = auth.uid()
    )
  );

-- Property policies
CREATE POLICY "Homeowners can view their own properties" ON properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM homeowner_profiles hp
      JOIN profiles p ON hp.id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE properties.homeowner_id = hp.id 
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Homeowners can manage their own properties" ON properties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM homeowner_profiles hp
      JOIN profiles p ON hp.id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE properties.homeowner_id = hp.id 
        AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Contractors and adjusters can view assigned properties" ON properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports r
      JOIN users u ON 
        (u.auth_user_id = auth.uid() AND 
         ((u.role = 'contractor' AND EXISTS (
            SELECT 1 FROM contractor_profiles cp
            JOIN profiles p ON cp.id = p.id
            WHERE p.user_id = u.id AND cp.id = r.contractor_id
          )) OR
          (u.role = 'adjuster' AND EXISTS (
            SELECT 1 FROM adjuster_profiles ap
            JOIN profiles p ON ap.id = p.id
            WHERE p.user_id = u.id AND ap.id = r.adjuster_id
          ))
         )
        )
      WHERE r.property_id = properties.id
    )
  );

-- Report policies
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = reports.creator_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Assigned contractors can view their reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contractor_profiles cp
      JOIN profiles p ON cp.id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE cp.id = reports.contractor_id AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Assigned adjusters can view their reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM adjuster_profiles ap
      JOIN profiles p ON ap.id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE ap.id = reports.adjuster_id AND u.auth_user_id = auth.uid()
    )
  );

-- Assessment areas policies
CREATE POLICY "Report creators can view assessment areas" ON assessment_areas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports r
      JOIN users u ON r.creator_id = u.id
      WHERE assessment_areas.report_id = r.id AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Assigned contractors can view assessment areas" ON assessment_areas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports r
      JOIN contractor_profiles cp ON r.contractor_id = cp.id
      JOIN profiles p ON cp.id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE assessment_areas.report_id = r.id AND u.auth_user_id = auth.uid()
    )
  );

-- Images policies
CREATE POLICY "Report users can view images" ON images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE (images.report_id = r.id OR 
             images.assessment_area_id IN (SELECT id FROM assessment_areas WHERE report_id = r.id))
        AND (
          -- Creator
          EXISTS (SELECT 1 FROM users u WHERE u.id = r.creator_id AND u.auth_user_id = auth.uid())
          OR
          -- Contractor
          EXISTS (
            SELECT 1 FROM contractor_profiles cp
            JOIN profiles p ON cp.id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE cp.id = r.contractor_id AND u.auth_user_id = auth.uid()
          )
          OR
          -- Adjuster
          EXISTS (
            SELECT 1 FROM adjuster_profiles ap
            JOIN profiles p ON ap.id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE ap.id = r.adjuster_id AND u.auth_user_id = auth.uid()
          )
        )
    )
  );

-- Comments policies
CREATE POLICY "Anyone involved can view comments" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE comments.report_id = r.id
        AND (
          -- Creator
          EXISTS (SELECT 1 FROM users u WHERE u.id = r.creator_id AND u.auth_user_id = auth.uid())
          OR
          -- Contractor
          EXISTS (
            SELECT 1 FROM contractor_profiles cp
            JOIN profiles p ON cp.id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE cp.id = r.contractor_id AND u.auth_user_id = auth.uid()
          )
          OR
          -- Adjuster
          EXISTS (
            SELECT 1 FROM adjuster_profiles ap
            JOIN profiles p ON ap.id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE ap.id = r.adjuster_id AND u.auth_user_id = auth.uid()
          )
        )
    )
  );

-- Activities policies (audit trail - admins only)
DROP POLICY IF EXISTS "Admins can view all activities" ON activities;

-- Estimates policies
CREATE POLICY "Contractors can create estimates" ON estimates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM contractor_profiles cp
      JOIN profiles p ON cp.id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE cp.id = estimates.contractor_id AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Report participants can view estimates" ON estimates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE estimates.report_id = r.id
        AND (
          -- Creator/homeowner
          EXISTS (SELECT 1 FROM users u WHERE u.id = r.creator_id AND u.auth_user_id = auth.uid())
          OR
          -- Contractor who created the estimate
          EXISTS (
            SELECT 1 FROM contractor_profiles cp
            JOIN profiles p ON cp.id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE cp.id = estimates.contractor_id AND u.auth_user_id = auth.uid()
          )
          OR
          -- Adjuster on the report
          EXISTS (
            SELECT 1 FROM adjuster_profiles ap
            JOIN profiles p ON ap.id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE ap.id = r.adjuster_id AND u.auth_user_id = auth.uid()
          )
        )
    )
  );

-- Estimate items policies
CREATE POLICY "Users can view estimate items for visible estimates" ON estimate_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM estimates e
      JOIN reports r ON e.report_id = r.id
      WHERE estimate_items.estimate_id = e.id
        AND (
          -- Creator/homeowner
          EXISTS (SELECT 1 FROM users u WHERE u.id = r.creator_id AND u.auth_user_id = auth.uid())
          OR
          -- Contractor who created the estimate
          EXISTS (
            SELECT 1 FROM contractor_profiles cp
            JOIN profiles p ON cp.id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE cp.id = e.contractor_id AND u.auth_user_id = auth.uid()
          )
          OR
          -- Adjuster on the report
          EXISTS (
            SELECT 1 FROM adjuster_profiles ap
            JOIN profiles p ON ap.id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE ap.id = r.adjuster_id AND u.auth_user_id = auth.uid()
          )
        )
    )
  );