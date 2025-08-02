-- Migration: Make new_highlight phase optional for warmup completion
-- This allows accounts to complete warmup without requiring the new_highlight phase

-- Update the is_warmup_complete function to exclude new_highlight from required phases
CREATE OR REPLACE FUNCTION is_warmup_complete(p_account_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    total_phases INTEGER;
    completed_phases INTEGER;
BEGIN
    -- Count total phases (excluding manual_setup, first_highlight, and new_highlight)
    -- first_highlight and new_highlight are now optional and not required for warmup completion
    SELECT COUNT(*) INTO total_phases
    FROM account_warmup_phases
    WHERE account_id = p_account_id
    AND phase != 'manual_setup'
    AND phase != 'first_highlight'
    AND phase != 'new_highlight';
    
    -- Count completed phases (excluding manual_setup, first_highlight, and new_highlight)
    SELECT COUNT(*) INTO completed_phases
    FROM account_warmup_phases
    WHERE account_id = p_account_id
    AND phase != 'manual_setup'
    AND phase != 'first_highlight'
    AND phase != 'new_highlight'
    AND status = 'completed';
    
    -- Warmup is complete when all required non-manual phases are completed
    -- first_highlight and new_highlight are optional and don't block completion
    RETURN (completed_phases = total_phases AND total_phases > 0);
END;
$$ LANGUAGE plpgsql;

-- Add a comment to document this change
COMMENT ON FUNCTION is_warmup_complete(INTEGER) IS 
'Determines if warmup is complete for an account. Excludes manual_setup, first_highlight, and new_highlight phases. 
Both highlight phases are optional and do not block warmup completion.';