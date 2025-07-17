-- Migration: Fix Warmup Content Foreign Key Constraint
-- Problem: account_warmup_phases.assigned_content_id references model_content but 
--          the assign_content_to_all_phases function selects from central_content
-- Solution: Update foreign key to reference central_content instead

-- Drop the existing foreign key constraint
ALTER TABLE account_warmup_phases 
DROP CONSTRAINT IF EXISTS account_warmup_phases_assigned_content_id_fkey;

-- Add the corrected foreign key constraint
ALTER TABLE account_warmup_phases 
ADD CONSTRAINT account_warmup_phases_assigned_content_id_fkey 
FOREIGN KEY (assigned_content_id) REFERENCES central_content(id) ON DELETE SET NULL;

-- Log the fix
DO $$
BEGIN
    RAISE NOTICE 'Fixed foreign key constraint: account_warmup_phases.assigned_content_id now references central_content(id)';
    RAISE NOTICE 'This resolves the error where content assignment selected from central_content but FK expected model_content';
END $$; 