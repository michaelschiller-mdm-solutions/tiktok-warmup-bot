-- Migration: 040-fix-bot-ready-accounts-view
-- Purpose: Fix bot_ready_accounts view to properly validate content assignment completeness

-- Drop existing views if they exist
DROP VIEW IF EXISTS bot_ready_accounts CASCADE;
DROP VIEW IF EXISTS frontend_ready_accounts CASCADE;

-- Create function to check if model has required content bundles for warmup phases
CREATE OR REPLACE FUNCTION model_has_required_content_bundles(p_model_id INTEGER)
RETURNS BOOLEAN 
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    required_categories TEXT[] := ARRAY['bio', 'name', 'username', 'highlight', 'post', 'story'];
    category_name TEXT;
    has_content BOOLEAN;
BEGIN
    -- Check if model has content bundles assigned
    IF NOT EXISTS (
        SELECT 1 FROM model_bundle_assignments mba
        JOIN content_bundles cb ON mba.bundle_id = cb.id
        WHERE mba.model_id = p_model_id 
        AND mba.status = 'active'
        AND cb.status = 'active'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Check each required category
    FOREACH category_name IN ARRAY required_categories LOOP
        -- Check if model has content for this category
        SELECT EXISTS (
            SELECT 1 FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            LEFT JOIN central_content cc ON bca.content_id = cc.id
            LEFT JOIN central_text_content ctc ON bca.text_content_id = ctc.id
            WHERE mba.model_id = p_model_id 
            AND mba.status = 'active'
            AND cb.status = 'active'
            AND (
                (cc.id IS NOT NULL AND cc.category = category_name)
                OR (ctc.id IS NOT NULL AND ctc.category = category_name)
            )
        ) INTO has_content;
        
        IF NOT has_content THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$;

-- Create function to get content readiness details for an account
CREATE OR REPLACE FUNCTION get_content_readiness_details(p_account_id INTEGER)
RETURNS JSONB 
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    account_record RECORD;
    missing_categories TEXT[] := ARRAY[]::TEXT[];
    category_name TEXT;
    has_content BOOLEAN;
    result JSONB;
BEGIN
    -- Get account info
    SELECT a.id, a.username, a.model_id, m.name as model_name
    INTO account_record
    FROM accounts a
    JOIN models m ON a.model_id = m.id
    WHERE a.id = p_account_id;
    
    IF NOT FOUND THEN
        RETURN '{"ready": false, "error": "Account not found"}'::jsonb;
    END IF;
    
    -- Check if model has any bundles assigned
    IF NOT EXISTS (
        SELECT 1 FROM model_bundle_assignments mba
        WHERE mba.model_id = account_record.model_id 
        AND mba.status = 'active'
    ) THEN
        RETURN jsonb_build_object(
            'ready', false,
            'error', 'No content bundles assigned to model',
            'model_id', account_record.model_id,
            'model_name', account_record.model_name
        );
    END IF;
    
    -- Check each required category
    FOREACH category_name IN ARRAY ARRAY['bio', 'name', 'username', 'highlight', 'post', 'story'] LOOP
        SELECT EXISTS (
            SELECT 1 FROM model_bundle_assignments mba
            JOIN content_bundles cb ON mba.bundle_id = cb.id
            JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
            LEFT JOIN central_content cc ON bca.content_id = cc.id
            LEFT JOIN central_text_content ctc ON bca.text_content_id = ctc.id
            WHERE mba.model_id = account_record.model_id 
            AND mba.status = 'active'
            AND cb.status = 'active'
            AND (
                (cc.id IS NOT NULL AND cc.category = category_name)
                OR (ctc.id IS NOT NULL AND ctc.category = category_name)
            )
        ) INTO has_content;
        
        IF NOT has_content THEN
            missing_categories := array_append(missing_categories, category_name);
        END IF;
    END LOOP;
    
    -- Build result
    IF array_length(missing_categories, 1) > 0 THEN
        result := jsonb_build_object(
            'ready', false,
            'error', 'Missing content for categories',
            'missing_categories', to_jsonb(missing_categories),
            'model_id', account_record.model_id,
            'model_name', account_record.model_name
        );
    ELSE
        result := jsonb_build_object(
            'ready', true,
            'model_id', account_record.model_id,
            'model_name', account_record.model_name
        );
    END IF;
    
    RETURN result;
END;
$$;

-- Create function to check if account has content assignment complete
CREATE OR REPLACE FUNCTION is_content_assignment_complete(p_account_id INTEGER)
RETURNS BOOLEAN 
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    account_model_id INTEGER;
BEGIN
    -- Get account's model_id
    SELECT model_id INTO account_model_id 
    FROM accounts 
    WHERE id = p_account_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Use the model content validation function
    RETURN model_has_required_content_bundles(account_model_id);
END;
$$;

-- Recreate bot_ready_accounts view (enhancing the existing one from migration 014)
CREATE OR REPLACE VIEW bot_ready_accounts AS
SELECT 
    a.id,
    a.username,
    a.model_id,
    a.container_number,
    a.lifecycle_state,
    
    -- Warmup progress info
    (SELECT COUNT(*) FROM account_warmup_phases WHERE account_id = a.id AND status = 'completed') as completed_phases,
    (SELECT COUNT(*) FROM account_warmup_phases WHERE account_id = a.id AND status = 'available') as ready_phases,
    
    -- Content readiness 
    model_has_required_content_bundles(a.model_id) as has_required_content,
    get_content_readiness_details(a.id) as content_readiness,
    
    -- Next available phase info
    (
        SELECT jsonb_build_object(
            'phase', phase::text,
            'available_at', available_at
        )
        FROM account_warmup_phases 
        WHERE account_id = a.id 
        AND status = 'available' 
        AND (available_at IS NULL OR available_at <= CURRENT_TIMESTAMP)
        ORDER BY CASE phase
            WHEN 'manual_setup' THEN 1
            WHEN 'set_to_private' THEN 2
            WHEN 'bio' THEN 3
            WHEN 'gender' THEN 4
            WHEN 'name' THEN 5
            WHEN 'username' THEN 6
            WHEN 'first_highlight' THEN 7
            WHEN 'new_highlight' THEN 8
            WHEN 'post_caption' THEN 9
            WHEN 'post_no_caption' THEN 10
            WHEN 'story_caption' THEN 11
            WHEN 'story_no_caption' THEN 12
        END
        LIMIT 1
    ) as next_phase_info
    
FROM accounts a
WHERE a.lifecycle_state IN ('warmup', 'ready')
AND a.container_number IS NOT NULL
AND model_has_required_content_bundles(a.model_id) = true
AND EXISTS (
    SELECT 1 FROM account_warmup_phases awp 
    WHERE awp.account_id = a.id 
    AND awp.status = 'available'
    AND (awp.available_at IS NULL OR awp.available_at <= CURRENT_TIMESTAMP)
);

-- Create frontend view with detailed status information
CREATE OR REPLACE VIEW frontend_ready_accounts AS
SELECT 
    a.id,
    a.username,
    a.model_id,
    m.name as model_name,
    a.container_number,
    a.lifecycle_state,
    
    -- Warmup progress
    COALESCE((SELECT COUNT(*) FROM account_warmup_phases WHERE account_id = a.id AND status = 'completed'), 0) as completed_phases,
    COALESCE((SELECT COUNT(*) FROM account_warmup_phases WHERE account_id = a.id), 0) as total_phases,
    
    -- Content readiness
    model_has_required_content_bundles(a.model_id) as has_required_content,
    get_content_readiness_details(a.id) as content_readiness,
    
    -- Status message for UI
    CASE 
        WHEN a.lifecycle_state NOT IN ('warmup', 'ready') THEN 'Account not in warmup/ready state'
        WHEN a.container_number IS NULL THEN 'No container number assigned'
        WHEN NOT model_has_required_content_bundles(a.model_id) THEN 'Missing content bundles'
        ELSE 'Ready'
    END as status_message,
    
    -- Next phase info if any
    (
        SELECT jsonb_build_object(
            'phase', phase::text,
            'available_at', available_at,
            'status', status::text
        )
        FROM account_warmup_phases 
        WHERE account_id = a.id 
        AND status = 'available'
        ORDER BY available_at ASC NULLS FIRST
        LIMIT 1
    ) as next_phase_info
    
FROM accounts a
JOIN models m ON a.model_id = m.id
WHERE a.lifecycle_state IN ('warmup', 'ready');

-- Create performance indexes (without problematic predicates)
CREATE INDEX IF NOT EXISTS idx_model_bundle_assignments_active ON model_bundle_assignments(model_id, status);
CREATE INDEX IF NOT EXISTS idx_content_bundles_active ON content_bundles(status);
CREATE INDEX IF NOT EXISTS idx_account_warmup_phases_available ON account_warmup_phases(account_id, status, available_at);
CREATE INDEX IF NOT EXISTS idx_accounts_lifecycle_container ON accounts(lifecycle_state, container_number) WHERE container_number IS NOT NULL;

-- Grant permissions
GRANT SELECT ON bot_ready_accounts TO PUBLIC;
GRANT SELECT ON frontend_ready_accounts TO PUBLIC; 