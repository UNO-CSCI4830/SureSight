-- Extending messages with context fields
-- This implements the third part of the contractor integration plan
-- It enhances the messages table with report and property context

-- Create function to add message context fields to avoid DO block issues
CREATE OR REPLACE FUNCTION add_message_context_fields()
RETURNS void AS $$
BEGIN
  -- Check if the messages table exists
  IF EXISTS (SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'messages') THEN
    -- Add report_id column if it doesn't exist
    BEGIN
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES reports(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_column THEN
      -- Column already exists, do nothing
    END;
    
    -- Add property_id column if it doesn't exist
    BEGIN
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_column THEN
      -- Column already exists, do nothing
    END;
    
    -- Add message_type column if it doesn't exist
    BEGIN
      ALTER TABLE messages 
        ADD COLUMN IF NOT EXISTS message_type VARCHAR DEFAULT 'text' 
        CHECK (message_type IN ('text', 'image', 'document', 'notification'));
    EXCEPTION WHEN duplicate_column THEN
      -- Column already exists, do nothing
    END;
    
    -- Add indexes for improved querying performance
    CREATE INDEX IF NOT EXISTS idx_messages_report_id ON messages(report_id);
    CREATE INDEX IF NOT EXISTS idx_messages_property_id ON messages(property_id);
    CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
    
    -- Create a function to generate conversation IDs
    -- This will be used to group messages between the same users
    CREATE OR REPLACE FUNCTION generate_conversation_id(sender UUID, recipient UUID)
    RETURNS TEXT AS $$
    BEGIN
      -- Create a stable ID regardless of sender/recipient order
      IF sender < recipient THEN
        RETURN sender::text || '-' || recipient::text;
      ELSE
        RETURN recipient::text || '-' || sender::text;
      END IF;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
    
    -- Add conversation_id column for grouping messages
    BEGIN
      ALTER TABLE messages 
        ADD COLUMN IF NOT EXISTS conversation_id TEXT 
        GENERATED ALWAYS AS (generate_conversation_id(sender_id, recipient_id)) STORED;
    EXCEPTION WHEN duplicate_column THEN
      -- Column already exists, do nothing
    END;
    
    -- Create an index on conversation_id for faster conversation retrieval
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    
  ELSE
    RAISE NOTICE 'Table messages does not exist. Please create the messages table first.';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to add fields
SELECT add_message_context_fields();

-- Remove the temporary function
DROP FUNCTION IF EXISTS add_message_context_fields();

-- Update or create RLS policies for the enhanced messages table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'messages') THEN

    -- Policy for searching messages by context
    DROP POLICY IF EXISTS "Users can search messages by context" ON messages;
    CREATE POLICY "Users can search messages by context"
    ON messages
    FOR SELECT
    USING (
      (auth.uid() = (SELECT auth_user_id FROM users WHERE id = sender_id))
      OR
      (auth.uid() = (SELECT auth_user_id FROM users WHERE id = recipient_id))
      OR
      (
        -- Messages related to reports the user created or is assigned to
        report_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM reports r
          WHERE r.id = messages.report_id
          AND (
            -- Report creator
            EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND id = r.creator_id)
            OR
            -- Assigned contractor
            EXISTS (
              SELECT 1 FROM contractor_profiles cp
              JOIN profiles p ON cp.id = p.id
              JOIN users u ON p.user_id = u.id
              WHERE u.auth_user_id = auth.uid() AND cp.id = r.contractor_id
            )
            OR
            -- Assigned adjuster
            EXISTS (
              SELECT 1 FROM adjuster_profiles ap
              JOIN profiles p ON ap.id = p.id
              JOIN users u ON p.user_id = u.id
              WHERE u.auth_user_id = auth.uid() AND ap.id = r.adjuster_id
            )
            OR
            -- Report collaborator
            EXISTS (
              SELECT 1 
              FROM report_collaborators rc
              JOIN users u ON rc.user_id = u.id
              WHERE rc.report_id = messages.report_id
              AND u.auth_user_id = auth.uid()
              AND rc.invitation_status = 'accepted'
            )
          )
        )
      )
      OR
      (
        -- Messages related to properties the user owns or has access to
        property_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM properties p
          WHERE p.id = messages.property_id
          AND (
            -- Property owner
            EXISTS (
              SELECT 1 FROM homeowner_profiles hp
              JOIN profiles prof ON hp.id = prof.id
              JOIN users u ON prof.user_id = u.id
              WHERE u.auth_user_id = auth.uid() AND hp.id = p.homeowner_id
            )
            OR
            -- Report collaborator for a report on this property
            EXISTS (
              SELECT 1 
              FROM reports r
              JOIN report_collaborators rc ON r.id = rc.report_id
              JOIN users u ON rc.user_id = u.id
              WHERE r.property_id = messages.property_id
              AND u.auth_user_id = auth.uid()
              AND rc.invitation_status = 'accepted'
            )
          )
        )
      )
    );
  END IF;
END $$;

-- Function to automatically mark messages as read when queried
CREATE OR REPLACE FUNCTION mark_messages_as_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all queried messages as read if the current user is the recipient
  UPDATE messages
  SET is_read = TRUE
  WHERE id = NEW.id 
    AND recipient_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND is_read = FALSE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to mark messages as read when they're selected by the recipient
DROP TRIGGER IF EXISTS mark_messages_as_read_trigger ON messages;
CREATE TRIGGER mark_messages_as_read_trigger
AFTER SELECT ON messages
FOR EACH ROW
EXECUTE FUNCTION mark_messages_as_read();

-- Add a function to count unread messages
CREATE OR REPLACE FUNCTION count_unread_messages(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM messages
  WHERE recipient_id = p_user_id
    AND is_read = FALSE;
    
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;