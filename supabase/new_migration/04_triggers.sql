-- Create triggers for SureSight database to handle automatic updates

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, auth;

-- Add update timestamp triggers to all tables with updated_at column
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_properties_timestamp
BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_reports_timestamp
BEFORE UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_assessment_areas_timestamp
BEFORE UPDATE ON assessment_areas
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_comments_timestamp
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_estimates_timestamp
BEFORE UPDATE ON estimates
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger to update the homeowner's property count when properties are added/removed
CREATE OR REPLACE FUNCTION update_homeowner_property_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update property count for the homeowner profile
    UPDATE homeowner_profiles
    SET property_count = (
      SELECT COUNT(*) FROM properties
      WHERE homeowner_id = NEW.homeowner_id
    )
    WHERE id = NEW.homeowner_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update property count for the homeowner profile
    UPDATE homeowner_profiles
    SET property_count = (
      SELECT COUNT(*) FROM properties
      WHERE homeowner_id = OLD.homeowner_id
    )
    WHERE id = OLD.homeowner_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.homeowner_id <> NEW.homeowner_id THEN
    -- Update property count for both old and new homeowner profiles
    UPDATE homeowner_profiles
    SET property_count = (
      SELECT COUNT(*) FROM properties
      WHERE homeowner_id = OLD.homeowner_id
    )
    WHERE id = OLD.homeowner_id;
    
    UPDATE homeowner_profiles
    SET property_count = (
      SELECT COUNT(*) FROM properties
      WHERE homeowner_id = NEW.homeowner_id
    )
    WHERE id = NEW.homeowner_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public, auth;

CREATE TRIGGER property_homeowner_trigger
AFTER INSERT OR UPDATE OR DELETE ON properties
FOR EACH ROW EXECUTE FUNCTION update_homeowner_property_count();

-- Trigger to automatically add an activity entry when a report's status changes
CREATE OR REPLACE FUNCTION log_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO activities (
      user_id,
      report_id,
      activity_type,
      details
    ) VALUES (
      COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', NEW.creator_id),
      NEW.id,
      'report_status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public, auth;

CREATE TRIGGER report_status_change_trigger
AFTER UPDATE ON reports
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_report_status_change();

-- Trigger to automatically update reviewed_at timestamp when a report moves to in_review status
CREATE OR REPLACE FUNCTION update_report_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'in_review' AND OLD.status <> 'in_review' THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, auth;

CREATE TRIGGER report_review_trigger
BEFORE UPDATE ON reports
FOR EACH ROW
WHEN (NEW.status = 'in_review' AND OLD.status <> 'in_review')
EXECUTE FUNCTION update_report_review_timestamp();

-- Trigger to auto-process images with AI when uploaded
-- This is a placeholder that in a real system would trigger an AI processing job
CREATE OR REPLACE FUNCTION queue_image_for_ai_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- In a real implementation, this would send a job to a queue
  -- For now, we'll just mark it as not processed yet
  NEW.ai_processed = FALSE;
  
  -- Record that we queued it in the activities table
  INSERT INTO activities (
    user_id,
    report_id,
    activity_type,
    details
  ) VALUES (
    NEW.uploaded_by,
    NEW.report_id,
    'image_queued_for_ai',
    jsonb_build_object(
      'image_id', NEW.id,
      'storage_path', NEW.storage_path
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, auth;

CREATE TRIGGER queue_image_ai_trigger
BEFORE INSERT ON images
FOR EACH ROW EXECUTE FUNCTION queue_image_for_ai_processing();