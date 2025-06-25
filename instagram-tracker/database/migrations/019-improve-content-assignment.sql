-- Migration 019: Improve Content Assignment System
-- Purpose: Add bulk content assignment function and improve assignment triggers
-- Date: 2025-01-20

-- ============================================================================
-- FUNCTION: assign_content_to_all_phases
-- Purpose: Bulk assign content to all phases that need content for an account
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
BEGIN
    -- Loop through phases that need content assignment
    FOR phase_rec IN 
        SELECT id, phase 
        FROM account_warmup_phases 
        WHERE account_id = p_account_id 
          AND assigned_content_id IS NULL 
          AND assigned_text_id IS NULL
          AND phase != 'manual_setup'  -- Manual setup doesn't need content
          AND phase != 'gender'        -- Gender doesn't need pre-assigned content
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
                -- Assign highlight image
                SELECT id INTO content_id
                FROM central_content 
                WHERE categories @> '["highlight"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Assign highlight group name
                SELECT id INTO text_id
                FROM central_text_content 
                WHERE categories @> '["highlight_group_name"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'post_caption' THEN
                -- Assign post image
                SELECT id INTO content_id
                FROM central_content 
                WHERE categories @> '["post"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Assign post caption
                SELECT id INTO text_id
                FROM central_text_content 
                WHERE categories @> '["post"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'post_no_caption' THEN
                -- Assign only post image
                SELECT id INTO content_id
                FROM central_content 
                WHERE categories @> '["post"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'story_caption' THEN
                -- Assign story image
                SELECT id INTO content_id
                FROM central_content 
                WHERE categories @> '["story"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Assign story caption
                SELECT id INTO text_id
                FROM central_text_content 
                WHERE categories @> '["story"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'story_no_caption' THEN
                -- Assign only story image
                SELECT id INTO content_id
                FROM central_content 
                WHERE categories @> '["story"]'::jsonb 
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
-- FUNCTION: initialize_warmup_phases_with_content
-- Purpose: Initialize warmup phases AND assign content in one operation
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_warmup_phases_with_content(p_account_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    phase_count INTEGER;
    assigned_count INTEGER;
BEGIN
    -- First, check if phases already exist
    SELECT COUNT(*) INTO phase_count
    FROM account_warmup_phases 
    WHERE account_id = p_account_id;
    
    -- Initialize phases if they don't exist
    IF phase_count = 0 THEN
        PERFORM initialize_warmup_phases(p_account_id);
    END IF;
    
    -- Assign content to all phases that need it
    SELECT assign_content_to_all_phases(p_account_id) INTO assigned_count;
    
    -- Log the content assignment
    RAISE NOTICE 'Initialized warmup phases for account % with % content assignments', p_account_id, assigned_count;
END;
$$;

-- ============================================================================
-- FUNCTION: is_content_assignment_complete
-- Purpose: Check if all content assignment is complete for an account
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
      AND awp.phase NOT IN ('manual_setup', 'gender')  -- These don't need pre-assigned content
      AND (
          -- Phases that need text content but don't have it
          (awp.phase IN ('bio', 'name', 'username') AND awp.assigned_text_id IS NULL) OR
          -- Phases that need both image and text but don't have both
          (awp.phase IN ('first_highlight', 'new_highlight', 'post_caption', 'story_caption') 
           AND (awp.assigned_content_id IS NULL OR awp.assigned_text_id IS NULL)) OR
          -- Phases that need only image but don't have it
          (awp.phase IN ('post_no_caption', 'story_no_caption') AND awp.assigned_content_id IS NULL)
      );
    
    RETURN missing_count = 0;
END;
$$;

-- ============================================================================
-- TRIGGER: Automatically assign content when phases become available
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_assign_content_on_phase_available()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If a phase just became available and doesn't have content assigned
    IF NEW.status = 'available' AND OLD.status != 'available' 
       AND NEW.assigned_content_id IS NULL AND NEW.assigned_text_id IS NULL
       AND NEW.phase NOT IN ('manual_setup', 'gender') THEN
        
        -- Assign content to this specific phase
        PERFORM assign_content_to_all_phases(NEW.account_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_assign_content_on_phase_available ON account_warmup_phases;
CREATE TRIGGER trigger_assign_content_on_phase_available
    AFTER UPDATE ON account_warmup_phases
    FOR EACH ROW
    EXECUTE FUNCTION trigger_assign_content_on_phase_available();

-- ============================================================================
-- VIEW: account_content_assignment_status
-- Purpose: Monitor content assignment status across all accounts
-- ============================================================================
CREATE OR REPLACE VIEW account_content_assignment_status AS
SELECT 
    a.id as account_id,
    a.username,
    a.model_id,
    m.name as model_name,
    a.lifecycle_state,
    a.created_at,
    
    -- Phase counts
    COUNT(awp.id) as total_phases,
    COUNT(CASE WHEN awp.phase NOT IN ('manual_setup', 'gender') THEN 1 END) as content_requiring_phases,
    
    -- Content assignment status
    COUNT(CASE 
        WHEN awp.phase IN ('bio', 'name', 'username') AND awp.assigned_text_id IS NOT NULL THEN 1
        WHEN awp.phase IN ('first_highlight', 'new_highlight', 'post_caption', 'story_caption') 
             AND awp.assigned_content_id IS NOT NULL AND awp.assigned_text_id IS NOT NULL THEN 1
        WHEN awp.phase IN ('post_no_caption', 'story_no_caption') AND awp.assigned_content_id IS NOT NULL THEN 1
        WHEN awp.phase IN ('manual_setup', 'gender') THEN 1  -- These don't need content
    END) as phases_with_content_assigned,
    
    -- Calculate completion percentage
    CASE 
        WHEN COUNT(CASE WHEN awp.phase NOT IN ('manual_setup', 'gender') THEN 1 END) > 0 THEN
            ROUND((COUNT(CASE 
                WHEN awp.phase IN ('bio', 'name', 'username') AND awp.assigned_text_id IS NOT NULL THEN 1
                WHEN awp.phase IN ('first_highlight', 'new_highlight', 'post_caption', 'story_caption') 
                     AND awp.assigned_content_id IS NOT NULL AND awp.assigned_text_id IS NOT NULL THEN 1
                WHEN awp.phase IN ('post_no_caption', 'story_no_caption') AND awp.assigned_content_id IS NOT NULL THEN 1
            END)::decimal / COUNT(CASE WHEN awp.phase NOT IN ('manual_setup', 'gender') THEN 1 END)) * 100, 2)
        ELSE 100.00  -- If no content-requiring phases, consider it 100% complete
    END as content_assignment_percent,
    
    -- Status flag
    is_content_assignment_complete(a.id) as is_assignment_complete,
    
    -- Last assignment timestamp
    MAX(awp.content_assigned_at) as last_content_assignment_at
    
FROM accounts a
LEFT JOIN models m ON a.model_id = m.id
LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
WHERE a.lifecycle_state IN ('warmup', 'ready', 'active')
GROUP BY a.id, a.username, a.model_id, m.name, a.lifecycle_state, a.created_at
ORDER BY a.created_at DESC;

-- ============================================================================
-- Update the existing initialize_warmup_phases trigger to use enhanced function
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_initialize_warmup_phases()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- When account moves to warmup, initialize phases with content assignment
    IF NEW.lifecycle_state = 'warmup' AND (OLD.lifecycle_state IS NULL OR OLD.lifecycle_state != 'warmup') THEN
        PERFORM initialize_warmup_phases_with_content(NEW.id);
        RAISE NOTICE 'Initialized warmup phases with content for account %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_initialize_warmup ON accounts;
CREATE TRIGGER trigger_initialize_warmup
    AFTER UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_warmup_phases();

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_account_warmup_phases_content_assignment 
    ON account_warmup_phases(account_id, assigned_content_id, assigned_text_id);
    
CREATE INDEX IF NOT EXISTS idx_central_content_categories_status 
    ON central_content USING GIN(categories) WHERE status = 'active';
    
CREATE INDEX IF NOT EXISTS idx_central_text_content_categories_status 
    ON central_text_content USING GIN(categories) WHERE status = 'active';

-- ============================================================================
-- GRANT permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION assign_content_to_all_phases(INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION initialize_warmup_phases_with_content(INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_content_assignment_complete(INTEGER) TO PUBLIC;
GRANT SELECT ON account_content_assignment_status TO PUBLIC;

-- Show completion message
DO $$
DECLARE
    accounts_needing_content INTEGER;
BEGIN
    -- Check how many accounts need content assignment
    SELECT COUNT(*) INTO accounts_needing_content
    FROM account_content_assignment_status
    WHERE is_assignment_complete = false;
    
    RAISE NOTICE 'Content assignment system improved. % accounts may need content assignment.', accounts_needing_content;
    
    IF accounts_needing_content > 0 THEN
        RAISE NOTICE 'Run the following to assign content to existing accounts:';
        RAISE NOTICE 'SELECT assign_content_to_all_phases(account_id) FROM account_content_assignment_status WHERE is_assignment_complete = false;';
    END IF;
END $$; 