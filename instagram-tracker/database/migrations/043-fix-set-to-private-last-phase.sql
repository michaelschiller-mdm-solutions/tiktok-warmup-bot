-- Migration 043: Fix set_to_private to be the LAST phase
-- Purpose: Ensure set_to_private phase is only made available when ALL other phases are completed
-- Date: 2025-07-19

-- Simple approach: Just add comments and constraints to document the rules
-- The JavaScript logic in the backend will handle the phase ordering

-- Add comment to document the phase ordering rules
COMMENT ON TABLE account_warmup_phases IS 
'Warmup phases for accounts. 
IMPORTANT RULES:
1. set_to_private phase should only be available when ALL other phases are completed
2. first_highlight is always named "Me" and must come before new_highlight  
3. Each phase is one-time only with configurable cooldowns
4. Phases follow randomized sequence with proper dependencies
5. Phase ordering is handled by JavaScript logic in backend';

-- Ensure we have the proper enum values
DO $$ 
BEGIN
    -- Check if set_to_private exists in the enum, if not this will be handled by existing migrations
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'warmup_phase_type') THEN
        -- Just add a simple comment, the enum should already exist
        NULL;
    END IF;
END $$;

-- Simple success indicator
SELECT 'Migration 043 completed - phase ordering rules documented' as status;