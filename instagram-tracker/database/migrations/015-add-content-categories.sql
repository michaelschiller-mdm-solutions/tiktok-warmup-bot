-- Migration 015: Add Content Categories for 10-Phase Warmup System
-- Purpose: Add missing text content categories for name and highlight phases
-- Priority: 3 (Required for complete 10-phase system functionality)
-- Task: 2-7 Warmup Process System Redesign

-- Add cooldown_until column to accounts table if it doesn't exist
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMP;

-- Add new text content categories for the 10-phase warmup system
-- These categories support the new phases: name, username, first_highlight, new_highlight

-- Check current categories first
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Current text content categories:';
  FOR rec IN SELECT DISTINCT jsonb_array_elements_text(categories) as category FROM model_text_content ORDER BY category
  LOOP
    RAISE NOTICE '  - %', rec.category;
  END LOOP;
END $$;

-- Add the missing categories if they don't exist
-- These will be used by the warmup phases

-- 1. 'name' category for the name warmup phase
-- Used when setting profile display names during warmup
INSERT INTO model_text_content (model_id, text_content, categories, created_at, updated_at)
SELECT DISTINCT 
  m.id as model_id,
  'Sample Name ' || m.id as text_content,
  '["name"]'::jsonb as categories,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM models m
WHERE NOT EXISTS (
  SELECT 1 FROM model_text_content mtc 
  WHERE mtc.model_id = m.id AND mtc.categories ? 'name'
);

-- 2. 'highlight_group_name' category for highlight phases
-- Used when creating highlight groups during first_highlight and new_highlight phases
INSERT INTO model_text_content (model_id, text_content, categories, created_at, updated_at)
SELECT DISTINCT 
  m.id as model_id,
  'Highlight ' || m.id as text_content,
  '["highlight_group_name"]'::jsonb as categories,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM models m
WHERE NOT EXISTS (
  SELECT 1 FROM model_text_content mtc 
  WHERE mtc.model_id = m.id AND mtc.categories ? 'highlight_group_name'
);

-- Verify the categories were added
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Updated text content categories:';
  FOR rec IN SELECT DISTINCT jsonb_array_elements_text(categories) as category FROM model_text_content ORDER BY category
  LOOP
    RAISE NOTICE '  - %', rec.category;
  END LOOP;
END $$;

-- Update the warmup phase content assignment logic
-- Create a function to properly assign content for each phase type
CREATE OR REPLACE FUNCTION assign_phase_content(
  account_id_param INTEGER,
  phase_param VARCHAR(30)
)
RETURNS VOID AS $$
DECLARE
  account_model_id INTEGER;
  content_id INTEGER;
  text_id INTEGER;
BEGIN
  -- Get the account's model
  SELECT model_id INTO account_model_id FROM accounts WHERE id = account_id_param;
  
  IF account_model_id IS NULL THEN
    RAISE EXCEPTION 'Account % not found or has no model assigned', account_id_param;
  END IF;
  
  -- Assign content based on phase type
  CASE phase_param
    WHEN 'bio' THEN
      -- Assign bio text content
      SELECT id INTO text_id FROM model_text_content 
      WHERE model_id = account_model_id AND categories ? 'bio' 
      ORDER BY RANDOM() LIMIT 1;
      
    WHEN 'gender' THEN
      -- Assign gender text content
      SELECT id INTO text_id FROM model_text_content 
      WHERE model_id = account_model_id AND categories ? 'bio' -- Gender uses bio category for now
      ORDER BY RANDOM() LIMIT 1;
      
    WHEN 'name' THEN
      -- Assign name text content
      SELECT id INTO text_id FROM model_text_content 
      WHERE model_id = account_model_id AND categories ? 'name' 
      ORDER BY RANDOM() LIMIT 1;
      
    WHEN 'username' THEN
      -- Username doesn't need pre-assigned content (generated dynamically)
      text_id := NULL;
      
    WHEN 'first_highlight', 'new_highlight' THEN
      -- Assign highlight group name and image content
      SELECT id INTO text_id FROM model_text_content 
      WHERE model_id = account_model_id AND categories ? 'highlight_group_name' 
      ORDER BY RANDOM() LIMIT 1;
      
      SELECT id INTO content_id FROM model_content 
      WHERE model_id = account_model_id AND categories ? 'highlight' 
      ORDER BY RANDOM() LIMIT 1;
      
    WHEN 'post_caption', 'story_caption' THEN
      -- Assign caption and image content
      SELECT id INTO text_id FROM model_text_content 
      WHERE model_id = account_model_id AND categories ? 'post_caption' 
      ORDER BY RANDOM() LIMIT 1;
      
      SELECT id INTO content_id FROM model_content 
      WHERE model_id = account_model_id AND categories ? 'post' 
      ORDER BY RANDOM() LIMIT 1;
      
    WHEN 'post_no_caption', 'story_no_caption' THEN
      -- Assign only image content (no caption)
      text_id := NULL;
      
      SELECT id INTO content_id FROM model_content 
      WHERE model_id = account_model_id AND categories ? 'post' 
      ORDER BY RANDOM() LIMIT 1;
      
    ELSE
      -- No content assignment needed for manual_setup or unknown phases
      RETURN;
  END CASE;
  
  -- Update the warmup phase with assigned content
  UPDATE account_warmup_phases 
  SET 
    assigned_content_id = content_id,
    assigned_text_id = text_id,
    content_assigned_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE account_id = account_id_param AND phase = phase_param;
  
END;
$$ LANGUAGE plpgsql;

-- Update the existing assign_random_warmup_phase function to include content assignment
CREATE OR REPLACE FUNCTION assign_random_warmup_phase(account_id_param INTEGER, cooldown_hours INTEGER DEFAULT 18)
RETURNS VARCHAR(30) AS $$
DECLARE
  available_phases VARCHAR(30)[];
  selected_phase VARCHAR(30);
  first_highlight_completed BOOLEAN;
  cooldown_time TIMESTAMP;
BEGIN
  -- Calculate cooldown time (randomized between 15-24 hours, default 18)
  cooldown_time := CURRENT_TIMESTAMP + INTERVAL '1 hour' * (cooldown_hours + random() * 6 - 3);
  
  -- Check if first_highlight is completed (required for new_highlight)
  SELECT (status = 'completed') INTO first_highlight_completed
  FROM account_warmup_phases 
  WHERE account_id = account_id_param AND phase = 'first_highlight';
  
  -- Get available phases that are pending
  SELECT ARRAY_AGG(phase) INTO available_phases
  FROM account_warmup_phases
  WHERE account_id = account_id_param 
    AND status = 'pending'
    AND phase != 'manual_setup'
    AND (phase != 'new_highlight' OR first_highlight_completed = true);
  
  -- If no phases available, return null
  IF available_phases IS NULL OR array_length(available_phases, 1) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Randomly select a phase
  selected_phase := available_phases[floor(random() * array_length(available_phases, 1)) + 1];
  
  -- Make the selected phase available after cooldown
  UPDATE account_warmup_phases 
  SET 
    status = 'available',
    available_at = cooldown_time,
    updated_at = CURRENT_TIMESTAMP
  WHERE account_id = account_id_param 
    AND phase = selected_phase;
    
  -- Update account cooldown
  UPDATE accounts 
  SET cooldown_until = cooldown_time
  WHERE id = account_id_param;
  
  -- Assign appropriate content for the phase
  PERFORM assign_phase_content(account_id_param, selected_phase);
  
  RETURN selected_phase;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION assign_phase_content IS 'Assigns appropriate content (text and/or images) to a warmup phase based on phase type';

-- Show completion summary
DO $$
DECLARE
  name_count INTEGER;
  highlight_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO name_count FROM model_text_content WHERE categories ? 'name';
  SELECT COUNT(*) INTO highlight_count FROM model_text_content WHERE categories ? 'highlight_group_name';
  
  RAISE NOTICE '=== Content Categories Migration Complete ===';
  RAISE NOTICE 'Added "name" category: % entries', name_count;
  RAISE NOTICE 'Added "highlight_group_name" category: % entries', highlight_count;
  RAISE NOTICE 'Phase content assignment function created';
  RAISE NOTICE 'Random phase assignment updated with content assignment';
END $$; 