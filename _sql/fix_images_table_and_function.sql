-- Fix the missing property_id column in images table

-- First check if the column already exists (to make this script idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'images' AND column_name = 'property_id'
    ) THEN
        ALTER TABLE public.images ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE;
        
        -- Add an index for better query performance
        CREATE INDEX idx_images_property_id ON public.images(property_id);
        
        -- Comment to document the column
        COMMENT ON COLUMN public.images.property_id IS 'Foreign key to the property this image belongs to';
    END IF;
END $$;

-- First, drop all existing versions of the function
DROP FUNCTION IF EXISTS public.insert_image_record CASCADE;

-- Create or replace the insert_image_record function with proper parameter handling
CREATE OR REPLACE FUNCTION public.insert_image_record(
    p_storage_path TEXT,
    p_filename TEXT,
    p_content_type TEXT DEFAULT NULL,
    p_file_size INTEGER DEFAULT NULL,
    p_ai_processed BOOLEAN DEFAULT false,
    p_property_id UUID DEFAULT NULL,
    p_report_id UUID DEFAULT NULL,
    p_assessment_area_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
    v_id UUID;
BEGIN
    -- Insert the record
    INSERT INTO public.images(
        storage_path,
        filename,
        content_type, 
        file_size,
        ai_processed,
        property_id,
        report_id,
        assessment_area_id,
        uploaded_by
    )
    VALUES (
        p_storage_path,
        p_filename,
        p_content_type,
        p_file_size,
        p_ai_processed,
        p_property_id,
        p_report_id,
        p_assessment_area_id,
        auth.uid()
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- Grant execute privilege to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_image_record TO authenticated;