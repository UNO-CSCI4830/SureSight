-- First, create a function that will be called by the trigger
-- This function will invoke our Edge Function using pg_net extension
CREATE OR REPLACE FUNCTION trigger_image_analysis()
RETURNS TRIGGER AS $$
DECLARE
  public_url text;
  bucket text := 'property-images';
  edge_function_url text;
  service_role_key text;
  payload jsonb;
  image_id uuid := NEW.id;
  file_path text;
  http_response_code int;
BEGIN
  -- Skip processing if ai_processed is already true
  IF NEW.ai_processed = true THEN
    RETURN NEW;
  END IF;

  -- Only process rows with valid storage_path
  IF NEW.storage_path IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get settings from app_settings table
  SELECT value INTO edge_function_url FROM app_settings WHERE key = 'edge_function_url';
  
  -- If no URL found, log error and exit
  IF edge_function_url IS NULL THEN
    RAISE LOG 'Edge function URL not found in app_settings table';
    RETURN NEW;
  END IF;

  -- Extract the file path from storage_path
  file_path := NEW.storage_path;

  -- Generate a public URL for the image
  public_url := 'https://khqevpnoodeggshfxeaa.supabase.co/storage/v1/object/public/' || bucket || '/' || file_path;

  -- Prepare the payload for the Edge Function
  payload := jsonb_build_object(
    'imageUrl', public_url,
    'imageId', image_id
  );

  -- Using pg_net extension to make an asynchronous HTTP call to the edge function
  -- Since we don't have the service_role_key stored in the table, we use the built-in auth system
  PERFORM net.http_post(
    url := edge_function_url || '/analyze-image-damage',
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || auth.jwt() -- Use the current auth token
    )
  );

  -- Mark this image as being processed
  UPDATE images
  SET ai_processed = true
  WHERE id = image_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that will fire when a new image is inserted
DROP TRIGGER IF EXISTS trigger_image_analysis ON images;
CREATE TRIGGER trigger_image_analysis
AFTER INSERT ON images
FOR EACH ROW
EXECUTE FUNCTION trigger_image_analysis();

-- Add comment for documentation
COMMENT ON FUNCTION trigger_image_analysis() IS 'Trigger function that calls the image analysis edge function when a new image is uploaded';