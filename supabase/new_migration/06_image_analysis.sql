-- Create table for storing image analysis results
CREATE TABLE IF NOT EXISTS image_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID NOT NULL,
  damage_detected BOOLEAN NOT NULL,
  confidence FLOAT,
  raw_results JSONB,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_image_analysis_image_id ON image_analysis(image_id);

-- RLS policies for image_analysis table
ALTER TABLE image_analysis ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own analysis results
-- Fixed to correctly reference the images.uploaded_by column
CREATE POLICY "Allow users to read their own image analysis" 
  ON image_analysis 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM images i
      JOIN users u ON i.uploaded_by = u.id
      WHERE i.id = image_analysis.image_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Allow service role to manage all records
CREATE POLICY "Allow service role full access to image analysis" 
  ON image_analysis 
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE image_analysis IS 'Stores results from image damage analysis';