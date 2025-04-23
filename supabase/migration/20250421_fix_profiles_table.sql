-- First, check if email column exists in profiles table
DO $$
DECLARE
   email_exists BOOLEAN;
BEGIN
   -- Check if column exists
   SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'profiles'
      AND column_name = 'email'
   ) INTO email_exists;
   
   -- If email column doesn't exist, add it
   IF NOT email_exists THEN
      ALTER TABLE profiles ADD COLUMN email TEXT UNIQUE;
   END IF;
END $$;

-- Make sure the profiles table has all required columns
DO $$
BEGIN
   -- Add full_name column if it doesn't exist
   IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'full_name'
   ) THEN
      ALTER TABLE profiles ADD COLUMN full_name TEXT;
   END IF;
   
   -- Add avatar_url column if it doesn't exist
   IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'avatar_url'
   ) THEN
      ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
   END IF;
   
   -- Add created_at column if it doesn't exist
   IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name = 'created_at'
   ) THEN
      ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP DEFAULT now();
   END IF;
END $$;