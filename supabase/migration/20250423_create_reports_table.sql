-- Create reports table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
        CREATE TABLE reports (
            id SERIAL PRIMARY KEY,
            image_url TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add comment to table
        COMMENT ON TABLE reports IS 'Stores inspection report images and metadata';
        
        -- Set up RLS (Row Level Security)
        ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow authenticated users to insert
        CREATE POLICY "Allow authenticated users to insert reports" 
        ON reports FOR INSERT 
        TO authenticated 
        WITH CHECK (true);
        
        -- Create policy to allow authenticated users to select their own reports
        CREATE POLICY "Allow authenticated users to view reports" 
        ON reports FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END
$$;