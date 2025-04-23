-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeowner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjuster_profiles ENABLE ROW LEVEL SECURITY;

-- PROFILES TABLE POLICIES
-- Allow users to select their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- ROLES TABLE POLICIES
-- Everyone can view roles
CREATE POLICY "Anyone can view roles" 
ON roles FOR SELECT 
USING (true);

-- Only authenticated users can insert roles (if needed)
CREATE POLICY "Auth users can insert roles" 
ON roles FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- USER_ROLES TABLE POLICIES
-- Users can select their own role assignments
CREATE POLICY "Users can view own role assignments" 
ON user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own role assignments
CREATE POLICY "Users can insert own role assignments" 
ON user_roles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own role assignments
CREATE POLICY "Users can update own role assignments" 
ON user_roles FOR UPDATE 
USING (auth.uid() = user_id);

-- HOMEOWNER_PROFILES TABLE POLICIES
-- Users can select their own homeowner profile
CREATE POLICY "Users can view own homeowner profile" 
ON homeowner_profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own homeowner profile
CREATE POLICY "Users can insert own homeowner profile" 
ON homeowner_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own homeowner profile
CREATE POLICY "Users can update own homeowner profile" 
ON homeowner_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- CONTRACTOR_PROFILES TABLE POLICIES
-- Users can select their own contractor profile
CREATE POLICY "Users can view own contractor profile" 
ON contractor_profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own contractor profile
CREATE POLICY "Users can insert own contractor profile" 
ON contractor_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own contractor profile
CREATE POLICY "Users can update own contractor profile" 
ON contractor_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- ADJUSTER_PROFILES TABLE POLICIES
-- Users can select their own adjuster profile
CREATE POLICY "Users can view own adjuster profile" 
ON adjuster_profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own adjuster profile
CREATE POLICY "Users can insert own adjuster profile" 
ON adjuster_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own adjuster profile
CREATE POLICY "Users can update own adjuster profile" 
ON adjuster_profiles FOR UPDATE 
USING (auth.uid() = user_id);