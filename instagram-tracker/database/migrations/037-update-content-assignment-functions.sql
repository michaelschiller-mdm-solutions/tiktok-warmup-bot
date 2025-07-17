-- Migration 037: Update Content Assignment Functions
-- Purpose: Update content assignment functions to exclude set_to_private phase
-- Date: 2025-06-27

-- ============================================================================
-- TRIGGER: Drop and recreate trigger to fix dependency issue
-- Purpose: Handle trigger dependency before updating the function
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_assign_content_on_phase_available ON account_warmup_phases;

-- ============================================================================
-- FUNCTION: assign_content_to_all_phases (UPDATED)
-- Purpose: Assign content to all phases that need content assignment with improved logic
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_content_to_all_phases(p_account_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    phase_rec RECORD;
    content_id INTEGER;
    text_id INTEGER;
    assigned_count INTEGER := 0;
    model_id INTEGER;
BEGIN
    -- Get the account's model ID
    SELECT a.model_id INTO model_id 
    FROM accounts a 
    WHERE a.id = p_account_id;
    
    IF model_id IS NULL THEN
        RAISE NOTICE 'Account % not found or has no model assigned', p_account_id;
        RETURN 0;
    END IF;

    -- Loop through phases that need content assignment
    FOR phase_rec IN 
        SELECT id, phase 
        FROM account_warmup_phases 
        WHERE account_id = p_account_id 
          AND assigned_content_id IS NULL 
          AND assigned_text_id IS NULL
          AND phase NOT IN ('manual_setup', 'gender', 'set_to_private')  -- These don't need pre-assigned content
    LOOP
        content_id := NULL;
        text_id := NULL;
        
        -- Assign content based on phase type
        CASE phase_rec.phase
            WHEN 'bio' THEN
                -- Assign bio text content
                SELECT id INTO text_id 
                FROM central_text_content 
                WHERE categories @> '["bio"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'name' THEN
                -- Assign name text content  
                SELECT id INTO text_id
                FROM central_text_content 
                WHERE categories @> '["name"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'username' THEN
                -- Select an available username and lock it for update
                SELECT id INTO text_id FROM central_text_content
                WHERE categories @> '["username"]'::jsonb AND status = 'active'
                ORDER BY RANDOM()
                LIMIT 1
                FOR UPDATE SKIP LOCKED;
                
                -- If a username was found, mark it as used
                IF text_id IS NOT NULL THEN
                    UPDATE central_text_content SET status = 'used' WHERE id = text_id;
                END IF;
                
            WHEN 'first_highlight', 'new_highlight' THEN
                -- For highlights, try to get content from bundle and use bundle name as text
                BEGIN
                    -- Try to get bundle-assigned content
                    SELECT cc.id, cb.name INTO content_id, text_id
                    FROM model_bundle_assignments mba
                    JOIN content_bundles cb ON mba.bundle_id = cb.id
                    JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
                    JOIN central_content cc ON bca.content_id = cc.id
                    WHERE mba.model_id = model_id
                      AND cc.categories @> '["highlight"]'::jsonb 
                      AND cc.status = 'active'
                      AND mba.assignment_type IN ('active', 'auto')
                      AND cb.status = 'active'
                    ORDER BY RANDOM() 
                    LIMIT 1;
                    
                    -- If we found a bundle, create text content with bundle name
                    IF content_id IS NOT NULL AND text_id IS NOT NULL THEN
                        INSERT INTO central_text_content (
                            text_content, 
                            categories, 
                            template_name, 
                            status
                        ) VALUES (
                            text_id, -- This contains the bundle name from the SELECT above
                            '["highlight_group_name", "bundle_derived"]'::jsonb,
                            'Bundle: ' || text_id,
                            'active'
                        ) RETURNING id INTO text_id;
                    END IF;
                    
                EXCEPTION WHEN OTHERS THEN
                    -- Fallback to regular content if bundle assignment fails
                    content_id := NULL;
                    text_id := NULL;
                END;
                
                -- Fallback to regular content if bundle assignment didn't work
                IF content_id IS NULL THEN
                    SELECT id INTO content_id 
                    FROM central_content 
                    WHERE categories @> '["highlight"]'::jsonb 
                      AND status = 'active'
                    ORDER BY RANDOM() 
                    LIMIT 1;
                END IF;
                
            WHEN 'post_caption' THEN
                -- Assign post image (required)
                SELECT id INTO content_id 
                FROM central_content 
                WHERE categories @> '["post"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Try to assign post text (optional)
                SELECT id INTO text_id 
                FROM central_text_content 
                WHERE categories @> '["post"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'story_caption' THEN
                -- Assign story image (required)
                SELECT id INTO content_id 
                FROM central_content 
                WHERE categories @> '["story"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Try to assign story text (optional)
                SELECT id INTO text_id 
                FROM central_text_content 
                WHERE categories @> '["story"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'post_no_caption', 'story_no_caption' THEN
                -- Assign only image content (no caption)
                SELECT id INTO content_id 
                FROM central_content 
                WHERE categories @> CASE 
                    WHEN phase_rec.phase = 'post_no_caption' THEN '["post"]'::jsonb 
                    ELSE '["story"]'::jsonb 
                END
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            ELSE
                -- Skip phases that don't need content
                CONTINUE;
        END CASE;
        
        -- Update the phase with assigned content (if any was found)
        IF content_id IS NOT NULL OR text_id IS NOT NULL THEN
            UPDATE account_warmup_phases 
            SET assigned_content_id = content_id,
                assigned_text_id = text_id,
                content_assigned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = phase_rec.id;
            
            assigned_count := assigned_count + 1;
        END IF;
    END LOOP;
    
    RETURN assigned_count;
END;
$$;

-- ============================================================================
-- FUNCTION: is_content_assignment_complete (UPDATED)
-- Purpose: Check if all content assignment is complete for an account with new logic
-- ============================================================================
CREATE OR REPLACE FUNCTION is_content_assignment_complete(p_account_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    missing_count INTEGER;
BEGIN
    -- Count phases that need content but don't have it assigned
    SELECT COUNT(*) INTO missing_count
    FROM account_warmup_phases awp
    WHERE awp.account_id = p_account_id
      AND awp.phase NOT IN ('manual_setup', 'gender', 'set_to_private')  -- These don't need pre-assigned content
      AND (
          -- Phases that need text content but don't have it
          (awp.phase IN ('bio', 'name', 'username') AND awp.assigned_text_id IS NULL) OR
          -- Phases that need only image content (highlights use bundle name for text)
          (awp.phase IN ('first_highlight', 'new_highlight') AND awp.assigned_content_id IS NULL) OR
          -- Phases that need only image content (text is optional for captions)
          (awp.phase IN ('post_caption', 'story_caption') AND awp.assigned_content_id IS NULL) OR
          -- Phases that need only image but don't have it
          (awp.phase IN ('post_no_caption', 'story_no_caption') AND awp.assigned_content_id IS NULL)
      );
    
    RETURN missing_count = 0;
END;
$$;

-- ============================================================================
-- UPDATE: account_content_assignment_status view
-- Purpose: Fix view to exclude set_to_private phase from content requirements
-- ============================================================================
DROP VIEW IF EXISTS account_content_assignment_status;
CREATE VIEW account_content_assignment_status AS
SELECT 
    a.id as account_id,
    a.username,
    a.model_id,
    m.name as model_name,
    a.lifecycle_state,
    a.created_at,
    
    -- Phase counts
    COUNT(awp.id) as total_phases,
    COUNT(CASE WHEN awp.phase NOT IN ('manual_setup', 'gender', 'set_to_private') THEN 1 END) as content_requiring_phases,
    
    -- Content assignment status
    SUM(CASE 
        WHEN awp.phase NOT IN ('manual_setup', 'gender', 'set_to_private') 
             AND (awp.assigned_content_id IS NOT NULL OR awp.assigned_text_id IS NOT NULL) 
        THEN 1 
        ELSE 0 
    END) as assigned_phases,
    
    -- Check if all content is assigned
    (COUNT(CASE WHEN awp.phase NOT IN ('manual_setup', 'gender', 'set_to_private') THEN 1 END) = 
     SUM(CASE 
        WHEN awp.phase NOT IN ('manual_setup', 'gender', 'set_to_private') 
             AND (awp.assigned_content_id IS NOT NULL OR awp.assigned_text_id IS NOT NULL) 
        THEN 1 
        ELSE 0 
    END)) as is_content_assignment_complete,
    
    -- List of phases missing content
    jsonb_agg(awp.phase) FILTER (
        WHERE awp.phase NOT IN ('manual_setup', 'gender', 'set_to_private') 
          AND awp.assigned_content_id IS NULL 
          AND awp.assigned_text_id IS NULL
    ) as missing_content_phases

FROM accounts a
LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
LEFT JOIN models m ON a.model_id = m.id
GROUP BY a.id, m.name;

-- ============================================================================
-- TRIGGER: trigger_assign_content_on_phase_available (UPDATED)
-- Purpose: Prevent trigger from assigning content to 'set_to_private' phase
-- ============================================================================
DROP FUNCTION IF EXISTS trigger_assign_content_on_phase_available();
CREATE FUNCTION trigger_assign_content_on_phase_available()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only run for newly available phases that are not 'manual_setup' or 'gender' or 'set_to_private'
    IF NEW.status = 'available' AND OLD.status <> 'available' 
       AND NEW.phase NOT IN ('manual_setup', 'gender', 'set_to_private') THEN
        
        PERFORM assign_content_to_all_phases(NEW.account_id);
    END IF;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_assign_content_on_phase_available
    AFTER UPDATE ON account_warmup_phases
    FOR EACH ROW
    EXECUTE FUNCTION trigger_assign_content_on_phase_available(); 