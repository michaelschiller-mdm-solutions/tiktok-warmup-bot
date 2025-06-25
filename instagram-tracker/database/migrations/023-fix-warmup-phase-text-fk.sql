-- Migration 023: Fix account_warmup_phases.assigned_text_id foreign key
-- Purpose: Ensure assigned_text_id references central_text_content (not deprecated model_text_content)
-- Date: 2025-06-16

-- Drop old constraint if exists
ALTER TABLE account_warmup_phases
  DROP CONSTRAINT IF EXISTS account_warmup_phases_assigned_text_id_fkey;

-- Add new constraint
ALTER TABLE account_warmup_phases
  ADD CONSTRAINT account_warmup_phases_assigned_text_id_fkey
  FOREIGN KEY (assigned_text_id)
  REFERENCES central_text_content(id)
  ON DELETE SET NULL; 