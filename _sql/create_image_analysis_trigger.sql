-- Function that makes HTTP requests to the analyze-image-damage Edge Function
CREATE OR REPLACE FUNCTION public.trigger_image_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT;
  supabase_anon_key TEXT;
  function_url TEXT;
  public_url TEXT;
  payload JSONB;
  result JSONB;
BEGIN
  -- Get the necessary configuration
  -- Note: These values should be set in your database via the SQL editor
  SELECT setting INTO supabase_url FROM pg_settings WHERE name = 'app.settings.supabase_url';
  SELECT setting INTO supabase_anon_key FROM pg_settings WHERE name = 'app.settings.supabase_anon_key';
  
  -- Construct the Edge Function URL
  function_url := supabase_url || '/functions/v1/analyze-image-damage';
  
  -- Generate the public URL for the image
  -- Extract the bucket name from the storage_path
  DECLARE
    bucket_name TEXT;
    path_without_bucket TEXT;
  BEGIN
    bucket_name := split_part(NEW.storage_path, '/', 1);
    path_without_bucket := substr(NEW.storage_path, length(bucket_name) + 2);
    public_url := supabase_url || '/storage/v1/object/public/' || bucket_name || '/' || path_without_bucket;
  END;
  
  -- Prepare the payload for the Edge Function
  payload := jsonb_build_object(
    'imageId', NEW.id,
    'imageUrl', public_url
  );
  
  -- Make the HTTP request to the Edge Function
  -- Note: This requires the pg_net extension, which should be enabled in your project
  PERFORM net.http_post(
    url := function_url,
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_anon_key
    )
  );
  
  -- Return the NEW record to complete the trigger
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't stop the transaction
  RAISE WARNING 'Error in trigger_image_analysis: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create a trigger to call the function on image insert
CREATE OR REPLACE TRIGGER analyze_new_image
AFTER INSERT ON public.images
FOR EACH ROW
WHEN (NEW.ai_processed = FALSE)
EXECUTE FUNCTION public.trigger_image_analysis();

-- Comment for the function
COMMENT ON FUNCTION public.trigger_image_analysis IS 'Calls the analyze-image-damage Edge Function when a new image is inserted';

-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

-- Set up the necessary settings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.settings.supabase_url') THEN
    PERFORM set_config('app.settings.supabase_url', 'YOUR_SUPABASE_URL_HERE', false);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_settings WHERE name = 'app.settings.supabase_anon_key') THEN
    PERFORM set_config('app.settings.supabase_anon_key', 'YOUR_SUPABASE_ANON_KEY_HERE', false);
  END IF;
END
$$;