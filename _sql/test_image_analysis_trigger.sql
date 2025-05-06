-- Test script for verifying the image analysis trigger functionality

-- 1. First, enable trigger debug logging to capture any errors
ALTER DATABASE postgres SET log_min_messages = 'debug';

-- 2. Check if the trigger is properly installed
SELECT trigger_name, event_manipulation, event_object_schema, event_object_table, 
       action_timing, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'analyze_new_image';

-- 3. Check if pg_net extension is properly installed
SELECT extname, extversion, extrelocatable
FROM pg_extension 
WHERE extname = 'pg_net';

-- 4. Check if the Edge Function is deployed and accessible
-- Note: You would need to run this in your application code or manually test the endpoint
/*
Using fetch in browser console or application:

fetch('https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/functions/v1/analyze-image-damage', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer [YOUR_SUPABASE_ANON_KEY]'
  },
  body: JSON.stringify({
    imageUrl: 'https://[PUBLIC_IMAGE_URL]',
    imageId: '[EXISTING_IMAGE_ID_FROM_DATABASE]'
  })
}).then(res => res.json()).then(console.log)
*/

-- 5. Test inserting an image record manually to trigger the analysis
INSERT INTO images (
  storage_path,
  filename,
  ai_processed
) VALUES (
  'property-images/test-image.jpg',  -- Update with a valid storage path to an existing image
  'test-image.jpg',
  false  -- This value triggers the image analysis
) RETURNING id;

-- 6. Check the results after a few seconds
-- You should see the ai_processed flag set to true and analysis results populated
SELECT id, storage_path, filename, ai_processed, ai_damage_type, ai_damage_severity, ai_confidence
FROM images
WHERE filename = 'test-image.jpg'
ORDER BY created_at DESC
LIMIT 1;

-- 7. Check if any image_analysis records were created
SELECT image_id, damage_detected, damage_types, confidence, analyzed_at
FROM image_analysis
WHERE image_id = (
  SELECT id FROM images 
  WHERE filename = 'test-image.jpg'
  ORDER BY created_at DESC
  LIMIT 1
);

-- 8. Check for any trigger errors in the database logs
-- You would need to check your Supabase logs in the dashboard