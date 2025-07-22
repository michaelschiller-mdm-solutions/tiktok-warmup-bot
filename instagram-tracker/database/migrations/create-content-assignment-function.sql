-- Create content assignment function
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
          AND phase NOT IN ('manual_setup', 'gender')  -- These don't need content
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
                -- Select an available username
                SELECT id INTO text_id FROM central_text_content
                WHERE categories @> '["username"]'::jsonb AND status = 'active'
                ORDER BY RANDOM()
                LIMIT 1;
                
            WHEN 'first_highlight', 'new_highlight' THEN
                -- Assign highlight image
                SELECT id INTO content_id
                FROM central_content 
                WHERE (categories @> '["highlight"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Assign highlight group name
                SELECT id INTO text_id
                FROM central_text_content 
                WHERE categories @> '["highlight"]'::jsonb 
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'post_caption' THEN
                -- Assign post image
                SELECT id INTO content_id
                FROM central_content 
                WHERE (categories @> '["post"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Assign post caption (optional)
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
                WHERE (categories @> '["post"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
            WHEN 'story_caption' THEN
                -- Assign story image
                SELECT id INTO content_id
                FROM central_content 
                WHERE (categories @> '["story"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
                  AND status = 'active'
                ORDER BY RANDOM() 
                LIMIT 1;
                
                -- Assign story caption (optional)
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
                WHERE (categories @> '["story"]'::jsonb OR categories @> '["post","highlight","story"]'::jsonb)
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