CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Link profiles to the auth.users table
ALTER TABLE profiles
ADD CONSTRAINT fk_user
FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
