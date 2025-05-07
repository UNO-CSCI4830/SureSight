-- Add property_id column to images table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'images' 
        AND column_name = 'property_id'
    ) THEN
        ALTER TABLE images ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Re-create the insert_image_record function with the proper name and parameters
-- First drop the function if it exists with any signature
DROP FUNCTION IF EXISTS public.insert_image_record(text, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.insert_image_record(text, uuid, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.insert_image_record;

-- Create the improved function that handles both property images and assessment area images
CREATE OR REPLACE FUNCTION public.insert_image_record(
  p_filename text,
  p_storage_path text,
  p_uploaded_by uuid,
  p_report_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_assessment_area_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_image_id uuid;
BEGIN
  -- Insert the image record
  INSERT INTO images (
    filename,
    storage_path,
    uploaded_by,
    report_id,
    property_id,
    assessment_area_id
  ) VALUES (
    p_filename,
    p_storage_path,
    p_uploaded_by,
    p_report_id,
    p_property_id,
    p_assessment_area_id
  )
  RETURNING id INTO v_image_id;
  
  RETURN v_image_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_image_record(text, text, uuid, uuid, uuid, uuid) TO authenticated;

-- Comment on function
COMMENT ON FUNCTION public.insert_image_record(text, text, uuid, uuid, uuid, uuid) 
IS 'Inserts a new image record and associates it with a report, property, and/or assessment area';