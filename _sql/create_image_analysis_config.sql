-- Create a configuration table for our image analysis settings
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add initial settings (replace with your actual values)
INSERT INTO app_settings (key, value, description) 
VALUES 
    ('edge_function_url', 'https://khqevpnoodeggshfxeaa.supabase.co/functions/v1', 'Base URL for edge functions')
ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW();

-- Enable RLS for the settings table
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Allow anyone to read settings" 
    ON app_settings
    FOR SELECT 
    USING (true);

-- Only allow authorized roles to modify settings
CREATE POLICY "Only service_role can modify settings" 
    ON app_settings
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;