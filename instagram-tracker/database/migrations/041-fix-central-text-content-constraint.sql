-- Migration 041: Fix central_text_content status constraint
-- 
-- ISSUE: The constraint only allows ('active', 'inactive', 'archived') but 
-- content assignment functions try to set status to 'used' causing violations.
--
-- SOLUTION: Update constraint to include 'used' as valid status.

DO $$
BEGIN
    -- Check if the constraint exists and update it
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'central_text_content_status_check'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE central_text_content 
        DROP CONSTRAINT central_text_content_status_check;
        
        RAISE NOTICE 'Dropped existing central_text_content_status_check constraint';
    END IF;
    
    -- Add the updated constraint with 'used' included
    ALTER TABLE central_text_content 
    ADD CONSTRAINT central_text_content_status_check 
    CHECK (status IN ('active', 'inactive', 'archived', 'used'));
    
    RAISE NOTICE 'Added updated central_text_content_status_check constraint with "used" status';
    
    -- Update the column comment to reflect new valid values
    COMMENT ON COLUMN central_text_content.status IS 'Status of the text content: active, inactive, archived, or used';
    
END $$; 