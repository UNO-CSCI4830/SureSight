ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to access their own profile
CREATE POLICY "Allow individual access" ON profiles
FOR SELECT USING (auth.uid() = id);
