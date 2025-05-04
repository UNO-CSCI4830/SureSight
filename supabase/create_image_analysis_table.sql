-- Create image analysis table to store AI-generated damage assessments
DROP TABLE IF EXISTS image_analysis CASCADE;

CREATE TABLE IF NOT EXISTS image_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  assessment_area_id UUID REFERENCES assessment_areas(id) ON DELETE SET NULL,
  damage_detected BOOLEAN DEFAULT FALSE,
  damage_types TEXT[] DEFAULT '{}',
  damage_severity TEXT CHECK (damage_severity IN ('none', 'minor', 'moderate', 'severe', 'critical')) DEFAULT 'none',
  affected_areas TEXT[] DEFAULT '{}',
  confidence FLOAT DEFAULT 0,
  raw_results JSONB DEFAULT '{}',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_image_analysis_image FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
  CONSTRAINT fk_image_analysis_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_image_analysis_assessment_area FOREIGN KEY (assessment_area_id) REFERENCES assessment_areas(id) ON DELETE SET NULL
);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_image_analysis_image_id;
DROP INDEX IF EXISTS idx_image_analysis_report_id;
DROP INDEX IF EXISTS idx_image_analysis_assessment_area_id;
DROP INDEX IF EXISTS idx_image_analysis_damage_detected;
DROP INDEX IF EXISTS idx_image_analysis_damage_severity;

-- Add indexes for efficient querying with IF NOT EXISTS clause
CREATE INDEX IF NOT EXISTS idx_image_analysis_image_id ON image_analysis(image_id);
CREATE INDEX IF NOT EXISTS idx_image_analysis_report_id ON image_analysis(report_id);
CREATE INDEX IF NOT EXISTS idx_image_analysis_assessment_area_id ON image_analysis(assessment_area_id);
CREATE INDEX IF NOT EXISTS idx_image_analysis_damage_detected ON image_analysis(damage_detected);
CREATE INDEX IF NOT EXISTS idx_image_analysis_damage_severity ON image_analysis(damage_severity);

-- Set up Row Level Security
ALTER TABLE image_analysis ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view image analyses for related reports" ON image_analysis;
DROP POLICY IF EXISTS "Only service role can insert image analyses" ON image_analysis;

-- Create policies for the image_analysis table
CREATE POLICY "Users can view image analyses for related reports"
  ON image_analysis
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE image_analysis.report_id = r.id
      AND (
        -- Creator/homeowner
        EXISTS (SELECT 1 FROM users u WHERE u.id = r.creator_id AND u.auth_user_id = auth.uid())
        OR
        -- Assigned contractor
        EXISTS (
          SELECT 1 FROM contractor_profiles cp
          JOIN profiles p ON cp.id = p.id
          JOIN users u ON p.user_id = u.id
          WHERE cp.id = r.contractor_id AND u.auth_user_id = auth.uid()
        )
        OR
        -- Assigned adjuster
        EXISTS (
          SELECT 1 FROM adjuster_profiles ap
          JOIN profiles p ON ap.id = p.id
          JOIN users u ON p.user_id = u.id
          WHERE ap.id = r.adjuster_id AND u.auth_user_id = auth.uid()
        )
      )
    )
    OR 
    EXISTS (
      SELECT 1 FROM images i
      JOIN users u ON i.uploaded_by = u.id
      WHERE i.id = image_analysis.image_id
      AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Only service role can insert image analyses"
  ON image_analysis
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_report_damage_status CASCADE;
DROP FUNCTION IF EXISTS set_image_analysis_relations CASCADE;

-- Add function to store the analysis results in metadata
CREATE OR REPLACE FUNCTION update_report_damage_status()
RETURNS TRIGGER AS $$
DECLARE
  report_id_var UUID;
BEGIN
  -- Get the report_id from the image if not directly provided
  IF NEW.report_id IS NULL THEN
    SELECT report_id INTO report_id_var FROM images WHERE id = NEW.image_id;
  ELSE
    report_id_var := NEW.report_id;
  END IF;

  -- Store AI analysis results in report metadata
  UPDATE reports
  SET 
    updated_at = NOW(),
    description = CASE 
      WHEN NEW.damage_detected THEN 
        COALESCE(description, '') || E'\n\nAI Analysis: ' || 
        CASE NEW.damage_severity
          WHEN 'minor' THEN 'Minor'
          WHEN 'moderate' THEN 'Moderate'
          WHEN 'severe' THEN 'Severe'
          WHEN 'critical' THEN 'Critical'
          ELSE 'Unknown'
        END || ' damage detected.'
      ELSE COALESCE(description, '')
    END
  WHERE id = report_id_var;
  
  -- Update the affected assessment area if it exists
  IF NEW.assessment_area_id IS NOT NULL THEN
    UPDATE assessment_areas
    SET
      damage_type = CASE
        WHEN NEW.damage_types IS NOT NULL AND array_length(NEW.damage_types, 1) > 0 
        THEN NEW.damage_types[1]::damage_type
        ELSE damage_type
      END,
      severity = NEW.damage_severity::damage_severity,
      updated_at = NOW()
    WHERE id = NEW.assessment_area_id;
  END IF;
  
  -- Update AI fields in the images table
  UPDATE images
  SET
    ai_processed = TRUE,
    ai_confidence = NEW.confidence,
    ai_damage_type = CASE
      WHEN NEW.damage_types IS NOT NULL AND array_length(NEW.damage_types, 1) > 0 
      THEN NEW.damage_types[1]::damage_type
      ELSE NULL
    END,
    ai_damage_severity = NEW.damage_severity::damage_severity
  WHERE id = NEW.image_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_report_damage ON image_analysis;

-- Create trigger to update reports when analyses are added
CREATE TRIGGER trigger_update_report_damage
  AFTER INSERT ON image_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_report_damage_status();

-- Add function to automatically fill report_id if only image_id is provided
CREATE OR REPLACE FUNCTION set_image_analysis_relations()
RETURNS TRIGGER AS $$
DECLARE
  image_record RECORD;
BEGIN
  -- Get the image record to access related fields
  SELECT * INTO image_record FROM images WHERE id = NEW.image_id;
  
  -- If report_id is not provided but exists in image record, set it
  IF NEW.report_id IS NULL AND image_record.report_id IS NOT NULL THEN
    NEW.report_id := image_record.report_id;
  END IF;
  
  -- If assessment_area_id is not provided but exists in image record, set it
  IF NEW.assessment_area_id IS NULL AND image_record.assessment_area_id IS NOT NULL THEN
    NEW.assessment_area_id := image_record.assessment_area_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_set_image_analysis_relations ON image_analysis;

-- Create trigger to automatically set related fields before insert
CREATE TRIGGER trigger_set_image_analysis_relations
  BEFORE INSERT ON image_analysis
  FOR EACH ROW
  EXECUTE FUNCTION set_image_analysis_relations();

-- Grant appropriate permissions
GRANT SELECT ON image_analysis TO authenticated;
GRANT SELECT, INSERT ON image_analysis TO service_role;