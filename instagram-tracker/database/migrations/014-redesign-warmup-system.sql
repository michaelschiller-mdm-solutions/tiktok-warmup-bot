-- Migration 014: Redesign Warmup System for 10-Phase Random Assignment
-- Replaces the incorrect 5-phase sequential system with the correct 10-phase randomized system
-- Version: 1.0
-- Created: 2025-06-14

-- ============================================================================
-- STEP 1: DROP OLD 5-PHASE SYSTEM
-- ============================================================================

-- Drop existing warmup phase table (5-phase sequential system)
DROP TABLE IF EXISTS account_warmup_phases CASCADE;

-- Drop related functions and views
DROP FUNCTION IF EXISTS initialize_warmup_phases(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS is_warmup_complete(INTEGER) CASCADE;
DROP VIEW IF EXISTS bot_ready_accounts CASCADE;

-- ============================================================================
-- STEP 2: CREATE NEW 10-PHASE WARMUP SYSTEM
-- ============================================================================

-- Define the 10 warmup phases (Phase 0 is manual, Phases 1-9 are bot-automated)
CREATE TYPE warmup_phase_type AS ENUM (
    'manual_setup',      -- Phase 0: Human setup in container
    'set_to_private',    -- Phase 0.5: Set account to private
    'bio',               -- Phase 1: Change bio text
    'gender',            -- Phase 2: Change gender to female
    'name',              -- Phase 3: Change display name
    'username',          -- Phase 4: Change username + DB update
    'first_highlight',   -- Phase 5: Upload first highlight
    'new_highlight',     -- Phase 6: Upload additional highlight (requires first_highlight)
    'post_caption',      -- Phase 7: Upload post with caption
    'post_no_caption',   -- Phase 8: Upload post without caption
    'story_caption',     -- Phase 9: Upload story with caption
    'story_no_caption'   -- Phase 10: Upload story without caption
);

-- Define warmup phase status
CREATE TYPE warmup_phase_status AS ENUM (
    'pending',           -- Not yet available
    'available',         -- Ready to be started by bot
    'in_progress',       -- Currently being executed by bot
    'completed',         -- Successfully completed
    'failed',            -- Failed but can retry
    'requires_review',   -- Failed multiple times, needs human review
    'skipped'            -- Manually skipped by human
);

-- Create new warmup phases table
CREATE TABLE account_warmup_phases (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    phase warmup_phase_type NOT NULL,
    status warmup_phase_status NOT NULL DEFAULT 'pending',
    
    -- Timing and availability
    available_at TIMESTAMP,           -- When phase becomes available
    started_at TIMESTAMP,             -- When bot started working on it
    completed_at TIMESTAMP,           -- When successfully completed
    
    -- Content assignment
    assigned_content_id INTEGER REFERENCES model_content(id),
    assigned_text_id INTEGER REFERENCES model_text_content(id),
    content_assigned_at TIMESTAMP,
    
    -- Bot execution tracking
    bot_id VARCHAR(100),              -- Which bot is/was working on this
    bot_session_id VARCHAR(100),      -- Bot session identifier
    execution_time_ms INTEGER,        -- How long execution took
    instagram_response JSONB,         -- Response from Instagram API
    
    -- Error handling and retry logic
    error_message TEXT,
    error_details JSONB,
    failure_category VARCHAR(50),     -- Type of failure (instagram_challenge, captcha, etc.)
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 1,    -- Most phases get 1 retry, can be configured
    review_required_at TIMESTAMP,     -- When marked for human review
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(account_id, phase)         -- One record per account per phase
);

-- Create indexes for performance
CREATE INDEX idx_account_warmup_phases_account_id ON account_warmup_phases(account_id);
CREATE INDEX idx_account_warmup_phases_status ON account_warmup_phases(status);
CREATE INDEX idx_account_warmup_phases_phase ON account_warmup_phases(phase);
CREATE INDEX idx_account_warmup_phases_available_at ON account_warmup_phases(available_at);
CREATE INDEX idx_account_warmup_phases_bot_id ON account_warmup_phases(bot_id);

-- ============================================================================
-- STEP 3: WARMUP CONFIGURATION SYSTEM
-- ============================================================================

-- Create warmup configuration table for per-model settings
CREATE TABLE warmup_configuration (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    
    -- Cooldown settings (in hours)
    min_cooldown_hours INTEGER DEFAULT 15,
    max_cooldown_hours INTEGER DEFAULT 24,
    
    -- Phase-specific settings
    phase_retry_limits JSONB DEFAULT '{
        "bio": 1,
        "gender": 1, 
        "name": 1,
        "username": 2,
        "first_highlight": 2,
        "new_highlight": 2,
        "post_caption": 1,
        "post_no_caption": 1,
        "story_caption": 1,
        "story_no_caption": 1
    }'::jsonb,
    
    -- Bot execution settings
    single_bot_constraint BOOLEAN DEFAULT true,
    max_concurrent_accounts INTEGER DEFAULT 1,
    
    -- Content assignment rules
    content_assignment_rules JSONB DEFAULT '{
        "bio": {"text_categories": ["bio"]},
        "name": {"text_categories": ["name"]},
        "username": {"text_categories": ["username"]},
        "first_highlight": {"image_categories": ["highlight"], "text_categories": ["highlight_group_name"]},
        "new_highlight": {"image_categories": ["highlight"], "text_categories": ["highlight_group_name"]},
        "post_caption": {"image_categories": ["post"], "text_categories": ["post"]},
        "post_no_caption": {"image_categories": ["post"]},
        "story_caption": {"image_categories": ["story"], "text_categories": ["story"]},
        "story_no_caption": {"image_categories": ["story"]}
    }'::jsonb,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(model_id)
);

-- ============================================================================
-- STEP 4: CORE WARMUP FUNCTIONS
-- ============================================================================

-- Function to initialize warmup phases for an account
CREATE OR REPLACE FUNCTION initialize_warmup_phases(p_account_id INTEGER)
RETURNS VOID AS $$
DECLARE
    config_record RECORD;
    phase_name warmup_phase_type;
    retry_limit INTEGER;
BEGIN
    -- Get configuration for this account's model
    SELECT * INTO config_record 
    FROM warmup_configuration wc
    JOIN accounts a ON a.model_id = wc.model_id
    WHERE a.id = p_account_id;
    
    -- If no config exists, create default
    IF NOT FOUND THEN
        INSERT INTO warmup_configuration (model_id)
        SELECT model_id FROM accounts WHERE id = p_account_id;
        
        -- Reload config
        SELECT * INTO config_record 
        FROM warmup_configuration wc
        JOIN accounts a ON a.model_id = wc.model_id
        WHERE a.id = p_account_id;
    END IF;
    
    -- Create phase records for all 10 phases
    FOREACH phase_name IN ARRAY ARRAY[
        'manual_setup'::warmup_phase_type,
        'set_to_private'::warmup_phase_type,
        'bio'::warmup_phase_type,
        'gender'::warmup_phase_type,
        'name'::warmup_phase_type,
        'username'::warmup_phase_type,
        'first_highlight'::warmup_phase_type,
        'new_highlight'::warmup_phase_type,
        'post_caption'::warmup_phase_type,
        'post_no_caption'::warmup_phase_type,
        'story_caption'::warmup_phase_type,
        'story_no_caption'::warmup_phase_type
    ] LOOP
        -- Get retry limit for this phase
        retry_limit := COALESCE(
            (config_record.phase_retry_limits->phase_name::text)::integer,
            1
        );
        
        -- Insert phase record
        INSERT INTO account_warmup_phases (
            account_id,
            phase,
            status,
            max_retries
        ) VALUES (
            p_account_id,
            phase_name,
            CASE 
                WHEN phase_name = 'manual_setup' THEN 'available'::warmup_phase_status
                WHEN phase_name = 'bio' THEN 'available'::warmup_phase_status
                ELSE 'pending'::warmup_phase_status
            END,
            retry_limit
        ) ON CONFLICT (account_id, phase) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next available time with random cooldown
CREATE OR REPLACE FUNCTION calculate_next_available_time(p_account_id INTEGER)
RETURNS TIMESTAMP AS $$
DECLARE
    config_record RECORD;
    min_hours INTEGER;
    max_hours INTEGER;
    random_hours NUMERIC;
BEGIN
    -- Get configuration
    SELECT wc.min_cooldown_hours, wc.max_cooldown_hours
    INTO config_record
    FROM warmup_configuration wc
    JOIN accounts a ON a.model_id = wc.model_id
    WHERE a.id = p_account_id;
    
    -- Use defaults if no config
    min_hours := COALESCE(config_record.min_cooldown_hours, 15);
    max_hours := COALESCE(config_record.max_cooldown_hours, 24);
    
    -- Calculate random cooldown between min and max
    random_hours := min_hours + (random() * (max_hours - min_hours));
    
    RETURN CURRENT_TIMESTAMP + (random_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to make next random phase available
CREATE OR REPLACE FUNCTION make_next_phase_available(p_account_id INTEGER)
RETURNS warmup_phase_type AS $$
DECLARE
    available_phases warmup_phase_type[];
    selected_phase warmup_phase_type;
    next_available_time TIMESTAMP;
    first_highlight_completed BOOLEAN;
BEGIN
    -- Check if first_highlight is completed (required for new_highlight)
    SELECT EXISTS(
        SELECT 1 FROM account_warmup_phases 
        WHERE account_id = p_account_id 
        AND phase = 'first_highlight' 
        AND status = 'completed'
    ) INTO first_highlight_completed;
    
    -- Get all pending phases that can be made available
    SELECT ARRAY_AGG(phase) INTO available_phases
    FROM account_warmup_phases
    WHERE account_id = p_account_id
    AND status = 'pending'
    AND phase != 'manual_setup'  -- Skip manual setup
    AND (
        phase != 'new_highlight' OR first_highlight_completed  -- new_highlight requires first_highlight
    );
    
    -- If no phases available, return null
    IF available_phases IS NULL OR array_length(available_phases, 1) = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Select random phase from available phases
    selected_phase := available_phases[floor(random() * array_length(available_phases, 1)) + 1];
    
    -- Calculate next available time
    next_available_time := calculate_next_available_time(p_account_id);
    
    -- Update the selected phase to available
    UPDATE account_warmup_phases
    SET status = 'available',
        available_at = next_available_time,
        updated_at = CURRENT_TIMESTAMP
    WHERE account_id = p_account_id
    AND phase = selected_phase;
    
    RETURN selected_phase;
END;
$$ LANGUAGE plpgsql;

-- Function to check if warmup is complete
CREATE OR REPLACE FUNCTION is_warmup_complete(p_account_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    total_phases INTEGER;
    completed_phases INTEGER;
BEGIN
    -- Count total phases (excluding manual_setup)
    SELECT COUNT(*) INTO total_phases
    FROM account_warmup_phases
    WHERE account_id = p_account_id
    AND phase != 'manual_setup';
    
    -- Count completed phases (excluding manual_setup)
    SELECT COUNT(*) INTO completed_phases
    FROM account_warmup_phases
    WHERE account_id = p_account_id
    AND phase != 'manual_setup'
    AND status = 'completed';
    
    -- Warmup is complete when all non-manual phases are completed
    RETURN (completed_phases = total_phases AND total_phases > 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: SINGLE BOT CONSTRAINT ENFORCEMENT
-- ============================================================================

-- Function to check if bot can start working (single bot constraint)
CREATE OR REPLACE FUNCTION can_bot_start_work(p_bot_id VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    active_accounts INTEGER;
BEGIN
    -- Count accounts currently being processed by any bot
    SELECT COUNT(*) INTO active_accounts
    FROM account_warmup_phases
    WHERE status = 'in_progress';
    
    -- Allow if no accounts are being processed, or if this bot is already working
    RETURN (active_accounts = 0) OR EXISTS(
        SELECT 1 FROM account_warmup_phases 
        WHERE status = 'in_progress' AND bot_id = p_bot_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: BOT READY ACCOUNTS VIEW
-- ============================================================================

-- Create view for bot to find accounts ready for processing
CREATE OR REPLACE VIEW bot_ready_accounts AS
SELECT 
    a.id,
    a.username,
    a.model_id,
    m.name as model_name,
    a.lifecycle_state,
    a.container_number,
    
    -- Phase summary
    COUNT(awp.id) as total_phases,
    COUNT(CASE WHEN awp.status = 'completed' THEN 1 END) as completed_phases,
    COUNT(CASE WHEN awp.status = 'available' AND awp.available_at <= CURRENT_TIMESTAMP THEN 1 END) as ready_phases,
    
    -- Next available phase info
    (
        SELECT json_build_object(
            'phase', awp2.phase,
            'available_at', awp2.available_at,
            'assigned_content_id', awp2.assigned_content_id,
            'assigned_text_id', awp2.assigned_text_id
        )
        FROM account_warmup_phases awp2
        WHERE awp2.account_id = a.id
        AND awp2.status = 'available'
        AND awp2.available_at <= CURRENT_TIMESTAMP
        ORDER BY awp2.available_at ASC
        LIMIT 1
    ) as next_phase_info
    
FROM accounts a
JOIN models m ON a.model_id = m.id
LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
WHERE a.lifecycle_state IN ('warmup', 'ready')
AND a.container_number IS NOT NULL
GROUP BY a.id, a.username, a.model_id, m.name, a.lifecycle_state, a.container_number
HAVING COUNT(CASE WHEN awp.status = 'available' AND awp.available_at <= CURRENT_TIMESTAMP THEN 1 END) > 0;

-- ============================================================================
-- STEP 7: AUTOMATIC TRIGGERS
-- ============================================================================

-- Trigger to initialize warmup phases when account moves to warmup state
CREATE OR REPLACE FUNCTION trigger_initialize_warmup()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize warmup phases when account moves to warmup state
    IF NEW.lifecycle_state = 'warmup' AND (OLD.lifecycle_state IS NULL OR OLD.lifecycle_state != 'warmup') THEN
        PERFORM initialize_warmup_phases(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_initialize_warmup ON accounts;
CREATE TRIGGER trigger_initialize_warmup
    AFTER UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_warmup();

-- Trigger to make next phase available when one completes
CREATE OR REPLACE FUNCTION trigger_next_phase_available()
RETURNS TRIGGER AS $$
BEGIN
    -- When a phase is completed, make next random phase available
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM make_next_phase_available(NEW.account_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_next_phase_available ON account_warmup_phases;
CREATE TRIGGER trigger_next_phase_available
    AFTER UPDATE ON account_warmup_phases
    FOR EACH ROW
    EXECUTE FUNCTION trigger_next_phase_available();

-- ============================================================================
-- STEP 8: MIGRATION CLEANUP AND INITIALIZATION
-- ============================================================================

-- Create default warmup configurations for existing models
INSERT INTO warmup_configuration (model_id)
SELECT id FROM models
ON CONFLICT (model_id) DO NOTHING;

-- Initialize warmup phases for any accounts already in warmup state
DO $$
DECLARE
    account_record RECORD;
BEGIN
    FOR account_record IN 
        SELECT id FROM accounts WHERE lifecycle_state = 'warmup'
    LOOP
        PERFORM initialize_warmup_phases(account_record.id);
    END LOOP;
END $$;

-- Update timestamp function for warmup phases
CREATE OR REPLACE FUNCTION update_warmup_phases_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create timestamp trigger
DROP TRIGGER IF EXISTS trigger_update_warmup_phases_timestamp ON account_warmup_phases;
CREATE TRIGGER trigger_update_warmup_phases_timestamp
    BEFORE UPDATE ON account_warmup_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_warmup_phases_timestamp(); 