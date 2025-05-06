-- Function to safely insert image records without JSON parsing issues
CREATE OR REPLACE FUNCTION public.insert_image_record(
  p_storage_path TEXT,
  p_filename TEXT,
  p_content_type TEXT,
  p_file_size INTEGER,
  p_report_id UUID DEFAULT NULL,
  p_assessment_area_id UUID DEFAULT NULL,
  p_uploaded_by UUID DEFAULT NULL,
  p_ai_processed BOOLEAN DEFAULT FALSE
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_image_id UUID;
BEGIN
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
    p_report_id,
    p_assessment_area_id,
    p_uploaded_by,
    p_ai_processed
  )
  RETURNING id INTO v_image_id;
  
  RETURN v_image_id;
END;
$$;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_image_record TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_image_record TO service_role;

-- Comment to explain the function
COMMENT ON FUNCTION public.insert_image_record IS 'Safely inserts an image record in the database without JSON parsing issues';