-- Migration: 042-extend-lifecycle-states
-- Purpose: Extend lifecycle states to support new ready_for_bot_assignment and maintenance states
-- Date: 2025-01-28

-- First, drop the views that depend on the lifecycle_state column
DROP VIEW IF EXISTS account_lifecycle_summary;
DROP VIEW IF EXISTS container_status_overview;
DROP VIEW IF EXISTS account_content_assignment_status;
DROP VIEW IF EXISTS bot_ready_accounts;
DROP VIEW IF EXISTS frontend_ready_accounts;

-- Drop the CHECK constraint to allow modifications
ALTER TABLE accounts 
DROP CONSTRAINT IF EXISTS accounts_lifecycle_state_check;

-- Extend the VARCHAR length to accommodate longer state names
ALTER TABLE accounts 
ALTER COLUMN lifecycle_state TYPE VARCHAR(50);

-- Add the new CHECK constraint with updated states
ALTER TABLE accounts 
ADD CONSTRAINT accounts_lifecycle_state_check CHECK (
    lifecycle_state IN (
        'imported', 
        'ready', 
        'ready_for_bot_assignment',
        'warmup', 
        'active', 
        'paused', 
        'cleanup', 
        'maintenance',
        'archived'
    )
);

-- Extend VARCHAR in state transition tracking tables
ALTER TABLE account_state_transitions 
ALTER COLUMN from_state TYPE VARCHAR(50),
ALTER COLUMN to_state TYPE VARCHAR(50);

-- Extend VARCHAR in state validation rules table
ALTER TABLE state_validation_rules 
ALTER COLUMN state TYPE VARCHAR(50);

-- Add validation rules for the new states
INSERT INTO state_validation_rules (
    state, 
    requires_proxy, 
    requires_model_assignment, 
    requires_warmup_completion, 
    requires_profile_configuration, 
    requires_no_active_errors
) VALUES 
    ('ready_for_bot_assignment', false, true, false, false, false),
    ('maintenance', true, true, true, true, false)
ON CONFLICT (state) DO NOTHING;

-- Update the lifecycle summary view to include new states
CREATE OR REPLACE VIEW account_lifecycle_summary AS
SELECT 
    lifecycle_state,
    COUNT(*) as account_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM accounts 
WHERE lifecycle_state IS NOT NULL
GROUP BY lifecycle_state
ORDER BY 
    CASE lifecycle_state
        WHEN 'imported' THEN 1
        WHEN 'ready' THEN 2
        WHEN 'ready_for_bot_assignment' THEN 3
        WHEN 'warmup' THEN 4
        WHEN 'active' THEN 5
        WHEN 'paused' THEN 6
        WHEN 'cleanup' THEN 7
        WHEN 'maintenance' THEN 8
        WHEN 'archived' THEN 9
        ELSE 10
    END;

-- Create index for the new states (existing index will still work)
-- No action needed as the existing index on lifecycle_state will cover new values

-- Recreate the container_status_overview view
CREATE OR REPLACE VIEW container_status_overview AS
SELECT 
    ca.container_number,
    ca.status,
    ca.assigned_at,
    ca.released_at,
    a.id as account_id,
    a.username,
    a.lifecycle_state,
    ca.notes,
    
    -- Calculate assignment duration
    CASE 
        WHEN ca.status = 'assigned' THEN 
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ca.assigned_at)) / 3600
        WHEN ca.released_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (ca.released_at - ca.assigned_at)) / 3600
        ELSE NULL
    END as assignment_duration_hours
    
FROM container_assignments ca
LEFT JOIN accounts a ON ca.account_id = a.id
ORDER BY ca.container_number;

-- Recreate the account_content_assignment_status view
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

-- Recreate the bot_ready_accounts view
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

-- Recreate the frontend_ready_accounts view
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