-- Migration: 051-disable-new-highlight-phase
-- Purpose: Temporarily disable new_highlight phase from warmup queue processing
-- Date: 2025-07-31

-- Mark all new_highlight phases as completed to prevent queue processing
UPDATE account_warmup_phases 
SET status = 'completed', 
    updated_at = NOW(),
    error_message = 'Phase temporarily disabled - script not available'
WHERE phase = 'new_highlight' 
AND status IN ('available', 'in_progress', 'failed');

-- Log the changes
INSERT INTO migration_history (migration_name, executed_at) 
VALUES ('051-disable-new-highlight-phase', NOW());