-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeowner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjuster_profiles ENABLE ROW LEVEL SECURITY;
-- Remove references to roles and user_roles tables that no longer exist
-- ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- PROFILES TABLE POLICIES
-- Allow users to select their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = profiles.user_id 
    AND u.auth_user_id = auth.uid()
  )
);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id 
    AND u.auth_user_id = auth.uid()
  )
);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id 
    AND u.auth_user_id = auth.uid()
  )
);

-- Remove RLS policies for roles table that no longer exists
/*
-- ROLES TABLE POLICIES
-- Everyone can view roles
CREATE POLICY "Anyone can view roles" 
ON roles FOR SELECT 
USING (true);

-- Only authenticated users can insert roles (if needed)
CREATE POLICY "Auth users can insert roles" 
ON roles FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
*/

-- Remove RLS policies for user_roles table that no longer exists
/*
-- USER_ROLES TABLE POLICIES
-- Users can select their own role assignments
CREATE POLICY "Users can view own role assignments" 
ON user_roles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id 
    AND u.auth_user_id = auth.uid()
  )
);

-- Users can insert their own role assignments
CREATE POLICY "Users can insert own role assignments" 
ON user_roles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id 
    AND u.auth_user_id = auth.uid()
  )
);

-- Users can update their own role assignments
CREATE POLICY "Users can update own role assignments" 
ON user_roles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_id 
    AND u.auth_user_id = auth.uid()
  )
);
*/

-- HOMEOWNER_PROFILES TABLE POLICIES
-- Users can select their own homeowner profile
CREATE POLICY "Users can view own homeowner profile" 
ON homeowner_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE homeowner_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- Users can insert their own homeowner profile
CREATE POLICY "Users can insert own homeowner profile" 
ON homeowner_profiles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE homeowner_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- Users can update their own homeowner profile
CREATE POLICY "Users can update own homeowner profile" 
ON homeowner_profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE homeowner_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- CONTRACTOR_PROFILES TABLE POLICIES
-- Users can select their own contractor profile
CREATE POLICY "Users can view own contractor profile" 
ON contractor_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE contractor_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- Users can insert their own contractor profile
CREATE POLICY "Users can insert own contractor profile" 
ON contractor_profiles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE contractor_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- Users can update their own contractor profile
CREATE POLICY "Users can update own contractor profile" 
ON contractor_profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE contractor_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- ADJUSTER_PROFILES TABLE POLICIES
-- Users can select their own adjuster profile
CREATE POLICY "Users can view own adjuster profile" 
ON adjuster_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE adjuster_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- Users can insert their own adjuster profile
CREATE POLICY "Users can insert own adjuster profile" 
ON adjuster_profiles FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE adjuster_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- Users can update their own adjuster profile
CREATE POLICY "Users can update own adjuster profile" 
ON adjuster_profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE adjuster_profiles.id = p.id
    AND u.auth_user_id = auth.uid()
  )
);

-- Add a comment to explain the database structure change
COMMENT ON TABLE users IS 
'Users table now includes role directly as a field instead of using a separate roles table';