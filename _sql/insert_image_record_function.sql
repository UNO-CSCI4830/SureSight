-- First, drop the existing function (all versions) to avoid conflicts
DROP FUNCTION IF EXISTS public.insert_image_record;

-- Create a new function with a clear parameter list
CREATE OR REPLACE FUNCTION public.insert_image_record(
  p_storage_path TEXT,
  p_filename TEXT,
  p_content_type TEXT DEFAULT NULL,
  p_file_size INTEGER DEFAULT NULL,
  p_report_id TEXT DEFAULT NULL,
  p_assessment_area_id TEXT DEFAULT NULL,
  p_uploaded_by TEXT DEFAULT NULL,
  p_ai_processed BOOLEAN DEFAULT FALSE
) 
RETURNS JSONB  -- Changed to return JSONB with more details
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_image_id UUID;
  v_report_id UUID;
  v_assessment_area_id UUID;
  v_uploaded_by UUID;
  v_result JSONB;
BEGIN
  -- Handle UUID conversions safely
  BEGIN
    IF p_report_id IS NOT NULL AND p_report_id != '' THEN
      v_report_id := p_report_id::UUID;
    ELSE
      v_report_id := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_report_id := NULL;
  END;

  BEGIN
    IF p_assessment_area_id IS NOT NULL AND p_assessment_area_id != '' THEN
      v_assessment_area_id := p_assessment_area_id::UUID;
    ELSE
      v_assessment_area_id := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_assessment_area_id := NULL;
  END;

  BEGIN
    IF p_uploaded_by IS NOT NULL AND p_uploaded_by != '' THEN
      v_uploaded_by := p_uploaded_by::UUID;
    ELSE
      v_uploaded_by := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_uploaded_by := NULL;
  END;

  -- Insert the record with explicit parameters to avoid JSON parsing issues
  INSERT INTO public.images (
    storage_path,
    filename,
    content_type,
    file_size,
    report_id,
    assessment_area_id,
    uploaded_by,
    ai_processed
  ) 
  VALUES (
    p_storage_path,
    p_filename,
    p_content_type,
    p_file_size,
    v_report_id,
    v_assessment_area_id,
    v_uploaded_by,
    p_ai_processed
  )
  RETURNING id INTO v_image_id;
  
  -- Build a result JSON with all details needed for client-side processing
  v_result := jsonb_build_object(
    'id', v_image_id,
    'storage_path', p_storage_path,
    'filename', p_filename,
    'content_type', p_content_type,
    'file_size', p_file_size,
    'ai_processed', p_ai_processed
  );
  
  RETURN v_result;
END;
$$;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_image_record(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_image_record(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

-- Comment to explain the function
COMMENT ON FUNCTION public.insert_image_record(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, BOOLEAN) IS 'Safely inserts an image record in the database with support for both report images and property images, returning detailed information for client-side processing';