-- Enable RLS on core tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones
DROP POLICY IF EXISTS "Allow individual profile access" ON profiles;
DROP POLICY IF EXISTS "Allow individual user access" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;

-- Allow users to access their own profile
CREATE POLICY "Allow individual profile access" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = profiles.user_id 
    AND u.auth_user_id = auth.uid()
  )
);

-- Allow users to access their own user data
CREATE POLICY "Allow individual user access" ON users
FOR SELECT USING (auth.uid() = auth_user_id);

-- Add INSERT policies for user creation during signup
CREATE POLICY "Allow user creation during signup" ON users 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow profile creation during signup" ON profiles
FOR INSERT WITH CHECK (true);

-- Add comment explaining the schema design
COMMENT ON TABLE users IS 'User table with auth_user_id linking to Supabase Auth';
COMMENT ON TABLE profiles IS 'Profile table with user_id linking to users table';
