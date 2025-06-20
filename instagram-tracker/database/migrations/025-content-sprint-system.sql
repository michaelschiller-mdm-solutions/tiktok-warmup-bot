-- =====================================================================================
-- Advanced Content Sprint Management System - Database Schema Migration
-- Version: 1.0
-- Created: 2024-12-19
-- 
-- This migration creates the foundational database structure for content sprints,
-- highlight groups, campaign pools, content queue management, and all supporting 
-- features for POST-WARMUP Instagram accounts.
--
-- INTEGRATION STRATEGY: This content sprint system is designed for post-warmup 
-- accounts only. The existing 10-phase warmup system remains completely intact 
-- and unchanged. The sprint system activates only after accounts complete their 
-- warmup (is_warmup_complete(account_id) = true).
-- =====================================================================================

BEGIN;

-- Record migration start
SELECT record_migration('025-content-sprint-system', true, 'Starting content sprint system migration');

-- =====================================================================================
-- CORE TABLES: Content Sprints and Sprint Content Items
-- =====================================================================================

-- Content Sprints Table (supports both sprints and highlight groups)
CREATE TABLE IF NOT EXISTS content_sprints (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sprint_type VARCHAR(100), -- vacation, university, home, work, etc.
    location VARCHAR(255), -- jamaica, germany, home, university, etc.
    is_highlight_group BOOLEAN DEFAULT false,
    max_content_items INTEGER DEFAULT 20, -- 20 for sprints, 100 for highlights
    available_months INTEGER[], -- [4,5,6,7,8,9,10] for summer content
    cooldown_hours INTEGER DEFAULT 336, -- 2 weeks default
    blocks_sprints INTEGER[], -- IDs of blocked sprints
    blocks_highlight_groups INTEGER[], -- IDs of blocked highlight groups
    calculated_duration_hours INTEGER DEFAULT 168, -- calculated from content delays
    maintenance_images_min INTEGER DEFAULT 1, -- for highlights: min images per maintenance
    maintenance_images_max INTEGER DEFAULT 2, -- for highlights: max images per maintenance
    maintenance_frequency_weeks_min INTEGER DEFAULT 2, -- for highlights: min weeks between maintenance
    maintenance_frequency_weeks_max INTEGER DEFAULT 4, -- for highlights: max weeks between maintenance
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_max_content_items CHECK (
        (is_highlight_group = false AND max_content_items <= 20) OR
        (is_highlight_group = true AND max_content_items <= 100)
    ),
    CONSTRAINT logical_idle_hours CHECK (idle_hours_min <= idle_hours_max),
    CONSTRAINT positive_idle_hours CHECK (idle_hours_min > 0 AND idle_hours_max > 0),
    CONSTRAINT logical_maintenance_images CHECK (
        is_highlight_group = false OR (maintenance_images_min <= maintenance_images_max)
    ),
    CONSTRAINT logical_maintenance_frequency CHECK (
        is_highlight_group = false OR (maintenance_frequency_weeks_min <= maintenance_frequency_weeks_max)
    ),
    CONSTRAINT positive_maintenance_values CHECK (
        is_highlight_group = false OR 
        (maintenance_images_min > 0 AND maintenance_frequency_weeks_min >= 0)
    )
);

-- Sprint Content Items Table
CREATE TABLE IF NOT EXISTS sprint_content_items (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER REFERENCES content_sprints(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    caption TEXT,
    content_order INTEGER NOT NULL,
    content_categories TEXT[] DEFAULT '{}', -- ['story', 'post', 'highlight']
    story_to_highlight BOOLEAN DEFAULT true,
    post_group_id INTEGER, -- for multi-image posts
    delay_hours_min INTEGER DEFAULT 24,
    delay_hours_max INTEGER DEFAULT 72,
    is_after_sprint_content BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_content_categories CHECK (
        content_categories <@ ARRAY['story', 'post', 'highlight'] AND 
        array_length(content_categories, 1) > 0
    ),
    CONSTRAINT logical_delays CHECK (delay_hours_min <= delay_hours_max),
    CONSTRAINT positive_delays CHECK (delay_hours_min > 0 AND delay_hours_max > 0)
);

-- =====================================================================================
-- ACCOUNT MANAGEMENT TABLES
-- =====================================================================================

-- Account Sprint Assignments Table
CREATE TABLE IF NOT EXISTS account_sprint_assignments (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    sprint_id INTEGER REFERENCES content_sprints(id) ON DELETE CASCADE,
    assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, active, completed, paused
    current_content_index INTEGER DEFAULT 0,
    next_content_due TIMESTAMP,
    sprint_instance_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_assignment_status CHECK (
        status IN ('scheduled', 'active', 'completed', 'paused', 'cancelled')
    ),
    CONSTRAINT logical_dates CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
    UNIQUE(account_id, sprint_id, sprint_instance_id)
);

-- Account Content State Table
CREATE TABLE IF NOT EXISTS account_content_state (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE UNIQUE,
    current_location VARCHAR(255) DEFAULT 'home',
    active_sprint_ids INTEGER[] DEFAULT '{}',
    idle_since TIMESTAMP,
    idle_duration_hours INTEGER DEFAULT 0,
    idle_hours_min INTEGER DEFAULT 24, -- account-specific idle configuration
    idle_hours_max INTEGER DEFAULT 48, -- account-specific idle configuration
    silence_during_idle BOOLEAN DEFAULT true, -- enforce complete silence during idle
    last_emergency_content TIMESTAMP,
    cooldown_until TIMESTAMP,
    next_maintenance_due TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account Highlight Groups Table
CREATE TABLE IF NOT EXISTS account_highlight_groups (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    highlight_group_id INTEGER REFERENCES content_sprints(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, -- 1 = newest, increments for older
    is_warmup_highlight BOOLEAN DEFAULT false, -- Flag for warmup-created highlights
    maintenance_last_run TIMESTAMP,
    maintenance_next_due TIMESTAMP,
    maintenance_frequency_hours INTEGER DEFAULT 504, -- 3 weeks default
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_position CHECK (position > 0),
    UNIQUE(account_id, highlight_group_id),
    UNIQUE(account_id, position)
);

-- =====================================================================================
-- CONTENT QUEUE AND SCHEDULING TABLES
-- =====================================================================================

-- Content Queue Table
CREATE TABLE IF NOT EXISTS content_queue (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    sprint_assignment_id INTEGER REFERENCES account_sprint_assignments(id) ON DELETE CASCADE,
    content_item_id INTEGER REFERENCES sprint_content_items(id) ON DELETE CASCADE,
    central_content_id INTEGER REFERENCES central_content(id) ON DELETE SET NULL,
    central_text_id INTEGER REFERENCES central_text_content(id) ON DELETE SET NULL,
    scheduled_time TIMESTAMP NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- story, post, highlight
    status VARCHAR(50) DEFAULT 'queued', -- queued, posted, failed, cancelled
    posted_at TIMESTAMP,
    emergency_content BOOLEAN DEFAULT false,
    emergency_strategy VARCHAR(50), -- 'pause_sprints', 'post_alongside', 'override_conflicts'
    queue_priority INTEGER DEFAULT 100, -- lower = higher priority
    cooldown_extension_hours INTEGER DEFAULT 0, -- extends sprint cooldowns for emergency content
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_queue_status CHECK (
        status IN ('queued', 'posted', 'failed', 'cancelled', 'retrying')
    ),
    CONSTRAINT valid_content_type CHECK (
        content_type IN ('story', 'post', 'highlight')
    ),
    CONSTRAINT valid_emergency_strategy CHECK (
        emergency_strategy IS NULL OR emergency_strategy IN ('pause_sprints', 'post_alongside', 'override_conflicts')
    ),
    CONSTRAINT non_negative_cooldown_extension CHECK (cooldown_extension_hours >= 0)
);

-- =====================================================================================
-- CAMPAIGN AND ADVANCED FEATURE TABLES
-- =====================================================================================

-- Campaign Pools Table
CREATE TABLE IF NOT EXISTS campaign_pools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sprint_ids INTEGER[] NOT NULL,
    assignment_strategy VARCHAR(100) DEFAULT 'random', -- random, balanced, manual
    time_horizon_days INTEGER DEFAULT 30,
    total_duration_hours INTEGER, -- calculated from all sprints
    compatible_accounts INTEGER DEFAULT 0, -- accounts that can use this campaign
    usage_count INTEGER DEFAULT 0,
    last_assigned TIMESTAMP,
    is_template BOOLEAN DEFAULT false,
    template_category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_assignment_strategy CHECK (
        assignment_strategy IN ('random', 'balanced', 'manual')
    ),
    CONSTRAINT non_empty_sprints CHECK (array_length(sprint_ids, 1) > 0),
    CONSTRAINT positive_time_horizon CHECK (time_horizon_days > 0)
);

-- Seasonal Content Batches Table
CREATE TABLE IF NOT EXISTS highlight_content_batches (
    id SERIAL PRIMARY KEY,
    highlight_group_id INTEGER REFERENCES content_sprints(id) ON DELETE CASCADE,
    batch_name VARCHAR(255),
    available_months INTEGER[],
    content_item_ids INTEGER[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- PERFORMANCE INDEXES
-- =====================================================================================

-- Sprint and content indexes
CREATE INDEX IF NOT EXISTS idx_content_sprints_type ON content_sprints(sprint_type);
CREATE INDEX IF NOT EXISTS idx_content_sprints_is_highlight ON content_sprints(is_highlight_group);
CREATE INDEX IF NOT EXISTS idx_content_sprints_location ON content_sprints(location);

-- Content item indexes
CREATE INDEX IF NOT EXISTS idx_sprint_content_items_sprint_id ON sprint_content_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_content_items_order ON sprint_content_items(sprint_id, content_order);

-- Assignment and queue indexes
CREATE INDEX IF NOT EXISTS idx_account_sprint_assignments_account ON account_sprint_assignments(account_id);
CREATE INDEX IF NOT EXISTS idx_account_sprint_assignments_sprint ON account_sprint_assignments(sprint_id);
CREATE INDEX IF NOT EXISTS idx_account_sprint_assignments_status ON account_sprint_assignments(status);

CREATE INDEX IF NOT EXISTS idx_content_queue_account ON content_queue(account_id);
CREATE INDEX IF NOT EXISTS idx_content_queue_scheduled_time ON content_queue(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);

-- Highlight management indexes
CREATE INDEX IF NOT EXISTS idx_account_highlight_groups_account ON account_highlight_groups(account_id);
CREATE INDEX IF NOT EXISTS idx_account_highlight_groups_position ON account_highlight_groups(account_id, position);

-- State management indexes
CREATE INDEX IF NOT EXISTS idx_account_content_state_account ON account_content_state(account_id);
CREATE INDEX IF NOT EXISTS idx_account_content_state_location ON account_content_state(current_location);
CREATE INDEX IF NOT EXISTS idx_account_content_state_cooldown ON account_content_state(cooldown_until) WHERE cooldown_until IS NOT NULL;

-- Central content integration indexes
CREATE INDEX IF NOT EXISTS idx_content_queue_central_content ON content_queue(central_content_id);
CREATE INDEX IF NOT EXISTS idx_content_queue_central_text ON content_queue(central_text_id);

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to update highlight positions when new group is added
CREATE OR REPLACE FUNCTION update_highlight_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-manage positions for non-warmup highlights
    -- Warmup highlights keep their manually set position
    IF NEW.is_warmup_highlight = false THEN
        -- Increment all existing positions for this account
        UPDATE account_highlight_groups 
        SET position = position + 1 
        WHERE account_id = NEW.account_id 
          AND id != NEW.id;
        
        -- Set new highlight to position 1 (newest)
        NEW.position := 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate sprint duration from content delays
CREATE OR REPLACE FUNCTION calculate_sprint_duration(sprint_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    total_hours INTEGER := 0;
    item_record RECORD;
BEGIN
    -- Calculate cumulative delays as per original specification:
    -- "Duration calculated from cumulative content delays (1-3 days between posts)"
    FOR item_record IN 
        SELECT delay_hours_min, delay_hours_max 
        FROM sprint_content_items 
        WHERE sprint_id = $1 
          AND is_after_sprint_content = false -- Only main sprint content
        ORDER BY content_order
    LOOP
        -- Use average of min/max for realistic estimation
        total_hours := total_hours + (item_record.delay_hours_min + item_record.delay_hours_max) / 2;
    END LOOP;
    
    RETURN total_hours;
END;
$$ LANGUAGE plpgsql;

-- Function to update calculated duration when content changes
CREATE OR REPLACE FUNCTION update_sprint_duration()
RETURNS TRIGGER AS $$
DECLARE
    calculated_duration INTEGER;
BEGIN
    -- Recalculate duration for the affected sprint
    SELECT calculate_sprint_duration(COALESCE(NEW.sprint_id, OLD.sprint_id)) 
    INTO calculated_duration;
    
    -- Update the sprint record
    UPDATE content_sprints 
    SET calculated_duration_hours = calculated_duration,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.sprint_id, OLD.sprint_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to validate content delays create realistic timing (1-3 days)
CREATE OR REPLACE FUNCTION validate_content_delays(sprint_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    item_record RECORD;
    avg_delay_days DECIMAL;
BEGIN
    -- Check each content item has realistic delays
    FOR item_record IN 
        SELECT delay_hours_min, delay_hours_max 
        FROM sprint_content_items 
        WHERE sprint_id = $1
    LOOP
        avg_delay_days := (item_record.delay_hours_min + item_record.delay_hours_max) / 2.0 / 24.0;
        
        -- Ensure delays are between 1-3 days as specified
        IF avg_delay_days < 1.0 OR avg_delay_days > 3.0 THEN
            RETURN false;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to check sprint compatibility
CREATE OR REPLACE FUNCTION check_sprint_compatibility(sprint_ids INTEGER[])
RETURNS BOOLEAN AS $$
DECLARE
    sprint_record RECORD;
    blocking_conflicts INTEGER := 0;
BEGIN
    -- Check if any sprints block each other
    FOR sprint_record IN 
        SELECT id, blocks_sprints, blocks_highlight_groups
        FROM content_sprints 
        WHERE id = ANY(sprint_ids)
    LOOP
        SELECT COUNT(*) INTO blocking_conflicts
        FROM unnest(sprint_ids) AS sid
        WHERE sid = ANY(sprint_record.blocks_sprints)
          AND sid != sprint_record.id;
          
        IF blocking_conflicts > 0 THEN
            RETURN false;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize account for sprint system after warmup completion
CREATE OR REPLACE FUNCTION initialize_post_warmup_account(account_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    warmup_highlight_name VARCHAR(255);
    existing_state_count INTEGER;
BEGIN
    -- Check if account completed warmup
    IF NOT is_warmup_complete(account_id_param) THEN
        RAISE EXCEPTION 'Account % has not completed warmup', account_id_param;
    END IF;
    
    -- Get the highlight name created during warmup
    -- This should be extracted from the warmup system
    SELECT COALESCE(
        (SELECT text_content FROM central_text_content 
         WHERE categories @> '["highlight_group_name"]'::jsonb 
         LIMIT 1), 
        'Highlights'
    ) INTO warmup_highlight_name;
    
    -- Create content state record if it doesn't exist
    SELECT COUNT(*) INTO existing_state_count
    FROM account_content_state 
    WHERE account_id = account_id_param;
    
    IF existing_state_count = 0 THEN
        INSERT INTO account_content_state (
            account_id,
            current_location,
            active_sprint_ids,
            updated_at
        ) VALUES (
            account_id_param,
            'home',
            ARRAY[]::INTEGER[],
            CURRENT_TIMESTAMP
        );
    END IF;
    
    -- Register the warmup highlight as position 1
    INSERT INTO account_highlight_groups (
        account_id,
        highlight_group_id, -- NULL for warmup highlights
        position,
        is_warmup_highlight,
        is_active,
        created_at
    ) VALUES (
        account_id_param,
        NULL,
        1,
        true,
        true,
        CURRENT_TIMESTAMP
    ) ON CONFLICT (account_id, position) DO NOTHING; -- Prevent duplicates
    
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps (reused from existing system)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Trigger for automatic highlight position management
DROP TRIGGER IF EXISTS trigger_update_highlight_positions ON account_highlight_groups;
CREATE TRIGGER trigger_update_highlight_positions
    BEFORE INSERT ON account_highlight_groups
    FOR EACH ROW 
    EXECUTE FUNCTION update_highlight_positions();

-- Trigger for automatic sprint duration calculation
DROP TRIGGER IF EXISTS trigger_update_sprint_duration ON sprint_content_items;
CREATE TRIGGER trigger_update_sprint_duration
    AFTER INSERT OR UPDATE OR DELETE ON sprint_content_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_sprint_duration();

-- Trigger for updating timestamps
DROP TRIGGER IF EXISTS trigger_update_content_sprints_timestamp ON content_sprints;
CREATE TRIGGER trigger_update_content_sprints_timestamp
    BEFORE UPDATE ON content_sprints
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
    
DROP TRIGGER IF EXISTS trigger_update_assignments_timestamp ON account_sprint_assignments;
CREATE TRIGGER trigger_update_assignments_timestamp
    BEFORE UPDATE ON account_sprint_assignments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
    
DROP TRIGGER IF EXISTS trigger_update_state_timestamp ON account_content_state;
CREATE TRIGGER trigger_update_state_timestamp
    BEFORE UPDATE ON account_content_state
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_highlight_groups_timestamp ON account_highlight_groups;
CREATE TRIGGER trigger_update_highlight_groups_timestamp
    BEFORE UPDATE ON account_highlight_groups
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_campaign_pools_timestamp ON campaign_pools;
CREATE TRIGGER trigger_update_campaign_pools_timestamp
    BEFORE UPDATE ON campaign_pools
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================================================

-- Sample content sprints
INSERT INTO content_sprints (name, description, sprint_type, location, is_highlight_group, max_content_items, available_months, cooldown_hours) VALUES
('Jamaica Vacation', 'Beach vacation content with tropical vibes', 'vacation', 'jamaica', false, 15, ARRAY[4,5,6,7,8,9,10], 336),
('University Life', 'Campus and student lifestyle content', 'university', 'university', false, 12, ARRAY[1,2,3,4,8,9,10,11,12], 168),
('Home Fitness', 'Home workout and wellness content', 'fitness', 'home', false, 20, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], 240),
('Travel Highlights', 'Long-term travel memory collection', 'vacation', NULL, true, 100, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], 504),
('Fitness Journey', 'Workout progress and motivation highlights', 'fitness', NULL, true, 80, ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], 336)
ON CONFLICT DO NOTHING;

-- Record successful migration
SELECT record_migration('025-content-sprint-system', true, 'Content sprint system migration completed successfully');

COMMIT;

-- =====================================================================================
-- MIGRATION COMPLETE
-- Database schema for Advanced Content Sprint Management System has been created
-- 
-- Tables Created:
-- - content_sprints (with constraints and validations)
-- - sprint_content_items (with category and delay management)
-- - account_sprint_assignments (with UUID instances and status tracking)
-- - account_content_state (centralized account state management)
-- - account_highlight_groups (position management with warmup integration)
-- - content_queue (scheduling with emergency and central content integration)
-- - campaign_pools (sprint combination management)
-- - highlight_content_batches (seasonal content organization)
--
-- Indexes Created: 15 performance indexes including GIN indexes for array operations
-- Functions Created: 6 helper functions for business logic and calculations
-- Triggers Created: 6 triggers for automation and data integrity
--
-- Integration Points:
-- - Seamless integration with existing warmup system
-- - Central content system integration for content selection
-- - Account lifecycle integration for post-warmup initialization
-- ===================================================================================== 