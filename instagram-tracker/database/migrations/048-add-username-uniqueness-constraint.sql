-- Migration: Add username uniqueness constraint for text assignments
-- This ensures that username text content can only be assigned to one account at a time

-- First, identify and fix existing duplicate username assignments
DO $$
DECLARE
    duplicate_record RECORD;
    keep_assignment_id INTEGER;
BEGIN
    -- Log the start of duplicate cleanup
    RAISE NOTICE 'Starting cleanup of duplicate username text assignments...';
    
    -- For each duplicate username text, keep the oldest assignment and reset others
    FOR duplicate_record IN 
        SELECT 
            ctc.id as text_id,
            ctc.text_content,
            COUNT(*) as assignment_count,
            MIN(awp.id) as oldest_assignment_id
        FROM account_warmup_phases awp
        JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.phase = 'username'
        AND awp.assigned_text_id IS NOT NULL
        GROUP BY ctc.id, ctc.text_content
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Fixing duplicate username text: "%" (% assignments)', 
            duplicate_record.text_content, duplicate_record.assignment_count;
        
        -- Reset all assignments except the oldest one
        UPDATE account_warmup_phases 
        SET 
            assigned_text_id = NULL,
            status = 'pending',
            content_assigned_at = NULL,
            updated_at = NOW()
        WHERE phase = 'username'
        AND assigned_text_id = duplicate_record.text_id
        AND id != duplicate_record.oldest_assignment_id;
        
        RAISE NOTICE 'Reset % duplicate assignments for username text "%"', 
            (duplicate_record.assignment_count - 1), duplicate_record.text_content;
    END LOOP;
    
    RAISE NOTICE 'Duplicate username assignment cleanup completed.';
END $$;

-- Create a unique constraint to prevent future duplicate username assignments
-- This constraint ensures that each username text can only be assigned once
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_username_text_assignment
ON account_warmup_phases (assigned_text_id) 
WHERE phase = 'username' AND assigned_text_id IS NOT NULL;

-- Add comment to the index
COMMENT ON INDEX idx_unique_username_text_assignment IS 
'Ensures that username text content can only be assigned to one account at a time. This prevents duplicate usernames on Instagram.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Username uniqueness constraint added successfully.';
    RAISE NOTICE 'Each username text can now only be assigned to one account.';
END $$;