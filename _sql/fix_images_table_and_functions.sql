-- Add property_id column to images table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'images'
    AND column_name = 'property_id'
  ) THEN
    ALTER TABLE public.images ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE ON UPDATE CASCADE;
    
    -- Add an index to speed up queries by property_id
    CREATE INDEX idx_images_property_id ON public.images(property_id);
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.images.property_id IS 'The property this image is associated with. Images can be associated with both a report and a property directly. CASCADE on delete.';
  END IF;
END
$$;

-- First, drop the existing function (all versions) to avoid conflicts
DROP FUNCTION IF EXISTS public.insert_image_record;

-- Create or replace the insert_image_record RPC function with all needed parameters
CREATE OR REPLACE FUNCTION public.insert_image_record(
    p_storage_path TEXT,
    p_filename TEXT,
    p_content_type TEXT DEFAULT NULL,
    p_file_size INTEGER DEFAULT NULL,
    p_ai_processed BOOLEAN DEFAULT FALSE,
    p_property_id TEXT DEFAULT NULL,
    p_report_id TEXT DEFAULT NULL,
    p_assessment_area_id TEXT DEFAULT NULL,
    p_uploaded_by TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_image_id UUID;
    v_result JSONB;
    v_property_id UUID;
    v_report_id UUID;
    v_assessment_area_id UUID;
    v_uploaded_by UUID;
BEGIN
    -- Handle UUID conversions safely
    BEGIN
        IF p_property_id IS NOT NULL AND p_property_id != '' THEN
            v_property_id := p_property_id::UUID;
        ELSE
            v_property_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_property_id := NULL;
    END;
    
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
            -- Use current user ID if not specified
            v_uploaded_by := auth.uid();
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_uploaded_by := auth.uid();
    END;
    
    -- Insert record into the images table
    INSERT INTO public.images (
        storage_path,
        filename,
        content_type,
        file_size,
        property_id,
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
        v_property_id,
        v_report_id, 
        v_assessment_area_id, 
        v_uploaded_by,
        p_ai_processed
    )
    RETURNING id INTO v_image_id;
    
    -- Build a comprehensive result object with all information
    v_result := jsonb_build_object(
        'id', v_image_id,
        'storage_path', p_storage_path,
        'filename', p_filename,
        'content_type', p_content_type,
        'file_size', p_file_size,
        'property_id', v_property_id,
        'report_id', v_report_id,
        'assessment_area_id', v_assessment_area_id,
        'uploaded_by', v_uploaded_by,
        'ai_processed', p_ai_processed
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute privilege to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.insert_image_record TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_image_record TO service_role;

-- Add comprehensive comment
COMMENT ON FUNCTION public.insert_image_record IS 'Inserts an image record with proper relationships to properties, reports, and assessment areas with proper cascading behavior. Supports AI processing flags and returns comprehensive result data.';

-- Make sure all other foreign keys in the images table have proper cascade behavior
DO $$
BEGIN
    -- Check and update the report_id foreign key
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'images' 
        AND tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.column_name = 'report_id'
    ) THEN
        -- Drop the existing constraint
        EXECUTE (
            SELECT 'ALTER TABLE public.images DROP CONSTRAINT ' || tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'images' 
            AND tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.column_name = 'report_id'
            LIMIT 1
        );
        
        -- Re-add with CASCADE behavior
        ALTER TABLE public.images 
        ADD CONSTRAINT images_report_id_fkey 
        FOREIGN KEY (report_id) REFERENCES public.reports(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- Check and update the assessment_area_id foreign key
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'images' 
        AND tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.column_name = 'assessment_area_id'
    ) THEN
        -- Drop the existing constraint
        EXECUTE (
            SELECT 'ALTER TABLE public.images DROP CONSTRAINT ' || tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'images' 
            AND tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.column_name = 'assessment_area_id'
            LIMIT 1
        );
        
        -- Re-add with CASCADE behavior
        ALTER TABLE public.images 
        ADD CONSTRAINT images_assessment_area_id_fkey 
        FOREIGN KEY (assessment_area_id) REFERENCES public.assessment_areas(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END;
$$;