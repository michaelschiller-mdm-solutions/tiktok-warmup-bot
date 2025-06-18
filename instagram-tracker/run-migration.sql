-- Create model_text_content table
CREATE TABLE IF NOT EXISTS model_text_content (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]',
    template_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create content_text_assignments table
CREATE TABLE IF NOT EXISTS content_text_assignments (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES model_content(id) ON DELETE CASCADE,
    text_content_id INTEGER NOT NULL REFERENCES model_text_content(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL DEFAULT 'random' CHECK (assignment_type IN ('random', 'manual', 'template')),
    template_name VARCHAR(255),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    UNIQUE(content_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_model_text_content_model_id ON model_text_content(model_id);
CREATE INDEX IF NOT EXISTS idx_content_text_assignments_model_id ON content_text_assignments(model_id);
CREATE INDEX IF NOT EXISTS idx_content_text_assignments_content_id ON content_text_assignments(content_id);

-- Drop existing function
DROP FUNCTION IF EXISTS get_content_with_texts(INTEGER);

-- Create updated function with image_url
CREATE OR REPLACE FUNCTION get_content_with_texts(p_model_id INTEGER)
RETURNS TABLE (
    content_id INTEGER,
    filename VARCHAR(255),
    original_name VARCHAR(255),
    content_type VARCHAR(50),
    file_size BIGINT,
    categories JSONB,
    content_status VARCHAR(20),
    content_created_at TIMESTAMP,
    image_url TEXT,
    text_content_id INTEGER,
    text_content TEXT,
    text_categories JSONB,
    text_template_name VARCHAR(255),
    text_status VARCHAR(20),
    text_created_at TIMESTAMP,
    assignment_created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id::INTEGER as content_id,
        mc.filename,
        mc.original_name,
        mc.content_type,
        mc.file_size,
        mc.categories,
        mc.status as content_status,
        mc.created_at as content_created_at,
        ('/uploads/content/' || mc.filename) as image_url,
        mtc.id::INTEGER as text_content_id,
        mtc.text_content,
        mtc.categories as text_categories,
        mtc.template_name as text_template_name,
        mtc.status as text_status,
        mtc.created_at as text_created_at,
        cta.assigned_at as assignment_created_at
    FROM model_content mc
    LEFT JOIN content_text_assignments cta ON mc.id = cta.content_id
    LEFT JOIN model_text_content mtc ON cta.text_content_id = mtc.id
    WHERE mc.model_id = p_model_id
    ORDER BY mc.created_at DESC, cta.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create the missing assign_texts_randomly function
CREATE OR REPLACE FUNCTION assign_texts_randomly(
    p_model_id INTEGER,
    p_template_name VARCHAR(255) DEFAULT NULL,
    p_category_filter JSONB DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    assignment_count INTEGER := 0;
    content_record RECORD;
    text_record RECORD;
    available_texts INTEGER[];
    selected_text_id INTEGER;
    random_index INTEGER;
BEGIN
    -- Clear existing assignments if template_name is provided
    IF p_template_name IS NOT NULL THEN
        DELETE FROM content_text_assignments 
        WHERE model_id = p_model_id 
        AND template_name = p_template_name;
    END IF;

    -- Get available text content IDs for this model
    SELECT ARRAY_AGG(id) INTO available_texts
    FROM model_text_content 
    WHERE model_id = p_model_id 
    AND status = 'active'
    AND (
        p_category_filter IS NULL 
        OR categories ?| (SELECT ARRAY_AGG(value::text) FROM jsonb_array_elements_text(p_category_filter))
    );

    -- If no texts available, return 0
    IF available_texts IS NULL OR array_length(available_texts, 1) = 0 THEN
        RETURN 0;
    END IF;

    -- Loop through content that needs text assignment
    FOR content_record IN 
        SELECT mc.id as content_id
        FROM model_content mc
        LEFT JOIN content_text_assignments cta ON mc.id = cta.content_id 
            AND (p_template_name IS NULL OR cta.template_name = p_template_name)
        WHERE mc.model_id = p_model_id 
        AND mc.status = 'active'
        AND cta.id IS NULL  -- Only assign to content without existing assignments
        AND (
            p_category_filter IS NULL 
            OR mc.categories ?| (SELECT ARRAY_AGG(value::text) FROM jsonb_array_elements_text(p_category_filter))
        )
    LOOP
        -- Select a random text from available texts
        random_index := floor(random() * array_length(available_texts, 1)) + 1;
        selected_text_id := available_texts[random_index];

        -- Insert the assignment
        INSERT INTO content_text_assignments (
            model_id,
            content_id,
            text_content_id,
            assignment_type,
            template_name,
            assigned_at,
            assigned_by,
            status
        ) VALUES (
            p_model_id,
            content_record.content_id,
            selected_text_id,
            'random',
            p_template_name,
            CURRENT_TIMESTAMP,
            'system',
            'active'
        );

        assignment_count := assignment_count + 1;
    END LOOP;

    RETURN assignment_count;
END;
$$ LANGUAGE plpgsql;

-- Central Content Registry Migration
-- This creates a centralized content management system with bundles

-- Central content registry table
CREATE TABLE IF NOT EXISTS central_content (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('image', 'video')),
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    categories JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    uploaded_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Central text content table
CREATE TABLE IF NOT EXISTS central_text_content (
    id SERIAL PRIMARY KEY,
    text_content TEXT NOT NULL,
    categories JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    template_name VARCHAR(255),
    language VARCHAR(10) DEFAULT 'en',
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content bundles table
CREATE TABLE IF NOT EXISTS content_bundles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(50) DEFAULT 'mixed' CHECK (bundle_type IN ('image', 'video', 'text', 'mixed')),
    categories JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bundle content assignments (many-to-many)
CREATE TABLE IF NOT EXISTS bundle_content_assignments (
    id SERIAL PRIMARY KEY,
    bundle_id INTEGER NOT NULL REFERENCES content_bundles(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES central_content(id) ON DELETE CASCADE,
    text_content_id INTEGER REFERENCES central_text_content(id) ON DELETE CASCADE,
    assignment_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure at least one content type is assigned
    CHECK (content_id IS NOT NULL OR text_content_id IS NOT NULL)
);

-- Content-text relationships (multiple texts per content)
CREATE TABLE IF NOT EXISTS central_content_text_assignments (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES central_content(id) ON DELETE CASCADE,
    text_content_id INTEGER NOT NULL REFERENCES central_text_content(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) DEFAULT 'manual' CHECK (assignment_type IN ('manual', 'auto', 'template')),
    template_name VARCHAR(255),
    priority INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    assigned_by VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate assignments
    UNIQUE(content_id, text_content_id)
);

-- Model bundle assignments (models can use multiple bundles)
CREATE TABLE IF NOT EXISTS model_bundle_assignments (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    bundle_id INTEGER NOT NULL REFERENCES content_bundles(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) DEFAULT 'active' CHECK (assignment_type IN ('active', 'backup', 'seasonal')),
    priority INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    assigned_by VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per model-bundle pair
    UNIQUE(model_id, bundle_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_central_content_type ON central_content(content_type);
CREATE INDEX IF NOT EXISTS idx_central_content_status ON central_content(status);
CREATE INDEX IF NOT EXISTS idx_central_content_categories ON central_content USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_central_content_tags ON central_content USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_central_text_content_status ON central_text_content(status);
CREATE INDEX IF NOT EXISTS idx_central_text_content_categories ON central_text_content USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_central_text_content_tags ON central_text_content USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_content_bundles_status ON content_bundles(status);
CREATE INDEX IF NOT EXISTS idx_content_bundles_type ON content_bundles(bundle_type);

CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_bundle_id ON bundle_content_assignments(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_content_id ON bundle_content_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_text_id ON bundle_content_assignments(text_content_id);

CREATE INDEX IF NOT EXISTS idx_central_content_text_assignments_content_id ON central_content_text_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_central_content_text_assignments_text_id ON central_content_text_assignments(text_content_id);

CREATE INDEX IF NOT EXISTS idx_model_bundle_assignments_model_id ON model_bundle_assignments(model_id);
CREATE INDEX IF NOT EXISTS idx_model_bundle_assignments_bundle_id ON model_bundle_assignments(bundle_id);

-- Function to get content with all assigned texts
CREATE OR REPLACE FUNCTION get_central_content_with_texts(
    p_bundle_id INTEGER DEFAULT NULL,
    p_content_type VARCHAR(50) DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT 'active'
) RETURNS TABLE (
    content_id INTEGER,
    filename VARCHAR(255),
    original_name VARCHAR(255),
    content_type VARCHAR(50),
    file_size BIGINT,
    categories JSONB,
    tags JSONB,
    content_status VARCHAR(20),
    content_created_at TIMESTAMP,
    image_url TEXT,
    assigned_texts JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id::INTEGER as content_id,
        cc.filename,
        cc.original_name,
        cc.content_type,
        cc.file_size,
        cc.categories,
        cc.tags,
        cc.status as content_status,
        cc.created_at as content_created_at,
        ('/uploads/content/' || cc.filename) as image_url,
        COALESCE(
            json_agg(
                json_build_object(
                    'text_id', ctc.id,
                    'text_content', ctc.text_content,
                    'categories', ctc.categories,
                    'tags', ctc.tags,
                    'template_name', ctc.template_name,
                    'assignment_type', ccta.assignment_type,
                    'priority', ccta.priority,
                    'assigned_at', ccta.assigned_at
                ) ORDER BY ccta.priority DESC, ccta.assigned_at DESC
            ) FILTER (WHERE ctc.id IS NOT NULL),
            '[]'::json
        )::jsonb as assigned_texts
    FROM central_content cc
    LEFT JOIN central_content_text_assignments ccta ON cc.id = ccta.content_id
    LEFT JOIN central_text_content ctc ON ccta.text_content_id = ctc.id AND ctc.status = 'active'
    LEFT JOIN bundle_content_assignments bca ON cc.id = bca.content_id
    WHERE 
        cc.status = p_status
        AND (p_content_type IS NULL OR cc.content_type = p_content_type)
        AND (p_bundle_id IS NULL OR bca.bundle_id = p_bundle_id)
    GROUP BY cc.id, cc.filename, cc.original_name, cc.content_type, cc.file_size, 
             cc.categories, cc.tags, cc.status, cc.created_at
    ORDER BY cc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get bundle contents
-- Migration 016: Fix Missing Columns for Backend Compatibility
-- Add password_encrypted column (backend expects this for password decryption)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password_encrypted TEXT;

-- Add proxy_password_encrypted column (backend expects this for proxy password decryption)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_password_encrypted TEXT;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_accounts_password_encrypted ON accounts(password_encrypted);
CREATE INDEX IF NOT EXISTS idx_accounts_proxy_password_encrypted ON accounts(proxy_password_encrypted);

-- Helper function to encrypt passwords (reuse existing or create new)
CREATE OR REPLACE FUNCTION encrypt_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql;

-- Helper function to decrypt passwords
CREATE OR REPLACE FUNCTION decrypt_password(encrypted TEXT)
RETURNS TEXT AS $$
BEGIN
    -- For bcrypt, we can't decrypt, so return a placeholder
    -- In real apps, you'd handle this differently based on encryption method
    RETURN '[ENCRYPTED]';
END;
$$ LANGUAGE plpgsql;

-- Update existing records to encrypt plain text passwords
-- This safely encrypts existing passwords without losing data
UPDATE accounts 
SET password_encrypted = encrypt_password(password)
WHERE password IS NOT NULL AND password_encrypted IS NULL;

-- Update existing records to encrypt plain text proxy passwords
-- Only if proxy_password exists (may not be in all setups)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'accounts' AND column_name = 'proxy_password') THEN
        UPDATE accounts 
        SET proxy_password_encrypted = encrypt_password(proxy_password)
        WHERE proxy_password IS NOT NULL AND proxy_password_encrypted IS NULL;
    END IF;
END $$;

-- Add trigger to automatically encrypt passwords on insert/update
CREATE OR REPLACE FUNCTION encrypt_passwords_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Encrypt password if provided and not already encrypted
    IF NEW.password IS NOT NULL AND NEW.password_encrypted IS NULL THEN
        NEW.password_encrypted := encrypt_password(NEW.password);
    END IF;
    
    -- Encrypt proxy password if provided and not already encrypted
    IF NEW.proxy_password IS NOT NULL AND NEW.proxy_password_encrypted IS NULL THEN
        NEW.proxy_password_encrypted := encrypt_password(NEW.proxy_password);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password encryption
DROP TRIGGER IF EXISTS trigger_encrypt_passwords ON accounts;
CREATE TRIGGER trigger_encrypt_passwords
    BEFORE INSERT OR UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_passwords_trigger();

-- Migration 014: Redesign Warmup System for 10-Phase Random Assignment
-- Drop existing warmup phase table (5-phase sequential system)
DROP TABLE IF EXISTS account_warmup_phases CASCADE;

-- Drop related functions and views
DROP FUNCTION IF EXISTS initialize_warmup_phases(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS is_warmup_complete(INTEGER) CASCADE;
DROP VIEW IF EXISTS bot_ready_accounts CASCADE;

-- Define the 10 warmup phases (Phase 0 is manual, Phases 1-9 are bot-automated)
CREATE TYPE warmup_phase_type AS ENUM (
    'manual_setup',      -- Phase 0: Human setup in container
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
    assigned_content_id INTEGER REFERENCES central_content(id),
    assigned_text_id INTEGER REFERENCES central_text_content(id),
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

-- Migration 017: Add Missing Text Categories for 10-Phase Warmup
-- Check if we have the required categories
DO $$
DECLARE
    name_count INTEGER;
    highlight_count INTEGER;
BEGIN
    -- Check for 'name' category
    SELECT COUNT(*) INTO name_count
    FROM central_text_content
    WHERE categories @> '["name"]'::jsonb;
    
    -- Check for 'highlight_group_name' category  
    SELECT COUNT(*) INTO highlight_count
    FROM central_text_content
    WHERE categories @> '["highlight_group_name"]'::jsonb;
    
    RAISE NOTICE 'Current text content with name category: %', name_count;
    RAISE NOTICE 'Current text content with highlight_group_name category: %', highlight_count;
END $$;

-- Add sample 'name' text content if none exists
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by
)
SELECT 
    'Sample Name ' || generate_series,
    '["name"]'::jsonb,
    '["warmup", "profile"]'::jsonb,
    'default_names',
    'en',
    'active',
    'system'
FROM generate_series(1, 10)
WHERE NOT EXISTS (
    SELECT 1 FROM central_text_content 
    WHERE categories @> '["name"]'::jsonb
);

-- Add sample 'highlight_group_name' text content if none exists
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by
)
SELECT 
    'Highlight ' || generate_series,
    '["highlight_group_name"]'::jsonb,
    '["warmup", "highlights"]'::jsonb,
    'default_highlight_names',
    'en',
    'active',
    'system'
FROM generate_series(1, 10)
WHERE NOT EXISTS (
    SELECT 1 FROM central_text_content 
    WHERE categories @> '["highlight_group_name"]'::jsonb
);

-- Add more diverse name options
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by
) VALUES 
    ('Emma', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system'),
    ('Sophia', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system'),
    ('Isabella', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system'),
    ('Olivia', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system'),
    ('Ava', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system'),
    ('Mia', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system'),
    ('Charlotte', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system'),
    ('Amelia', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system'),
    ('Harper', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system'),
    ('Luna', '["name"]'::jsonb, '["warmup", "profile", "female"]'::jsonb, 'female_names', 'en', 'active', 'system')
ON CONFLICT DO NOTHING;

-- Add diverse highlight group names
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by
) VALUES 
    ('My Life', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "lifestyle"]'::jsonb, 'lifestyle_highlights', 'en', 'active', 'system'),
    ('Travel', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "travel"]'::jsonb, 'travel_highlights', 'en', 'active', 'system'),
    ('Fashion', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "fashion"]'::jsonb, 'fashion_highlights', 'en', 'active', 'system'),
    ('Food', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "food"]'::jsonb, 'food_highlights', 'en', 'active', 'system'),
    ('Fitness', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "fitness"]'::jsonb, 'fitness_highlights', 'en', 'active', 'system'),
    ('Beauty', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "beauty"]'::jsonb, 'beauty_highlights', 'en', 'active', 'system'),
    ('Friends', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "social"]'::jsonb, 'social_highlights', 'en', 'active', 'system'),
    ('Work', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "professional"]'::jsonb, 'work_highlights', 'en', 'active', 'system'),
    ('Hobbies', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "hobbies"]'::jsonb, 'hobby_highlights', 'en', 'active', 'system'),
    ('Memories', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "memories"]'::jsonb, 'memory_highlights', 'en', 'active', 'system')
ON CONFLICT DO NOTHING;

-- Create indexes for efficient category searches
CREATE INDEX IF NOT EXISTS idx_central_text_content_name_category 
ON central_text_content USING GIN(categories) 
WHERE categories @> '["name"]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_central_text_content_highlight_category 
ON central_text_content USING GIN(categories) 
WHERE categories @> '["highlight_group_name"]'::jsonb;

CREATE OR REPLACE FUNCTION get_bundle_contents(p_bundle_id INTEGER)
RETURNS TABLE (
    bundle_id INTEGER,
    bundle_name VARCHAR(255),
    bundle_description TEXT,
    content_count BIGINT,
    text_count BIGINT,
    contents JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cb.id::INTEGER as bundle_id,
        cb.name as bundle_name,
        cb.description as bundle_description,
        COUNT(DISTINCT bca.content_id) as content_count,
        COUNT(DISTINCT bca.text_content_id) as text_count,
        json_agg(
            CASE 
                WHEN bca.content_id IS NOT NULL THEN
                    json_build_object(
                        'type', 'content',
                        'id', cc.id,
                        'filename', cc.filename,
                        'original_name', cc.original_name,
                        'content_type', cc.content_type,
                        'file_size', cc.file_size,
                        'categories', cc.categories,
                        'image_url', '/uploads/content/' || cc.filename,
                        'assignment_order', bca.assignment_order
                    )
                WHEN bca.text_content_id IS NOT NULL THEN
                    json_build_object(
                        'type', 'text',
                        'id', ctc.id,
                        'text_content', ctc.text_content,
                        'categories', ctc.categories,
                        'template_name', ctc.template_name,
                        'assignment_order', bca.assignment_order
                    )
            END
            ORDER BY bca.assignment_order, bca.created_at
        )::jsonb as contents
    FROM content_bundles cb
    LEFT JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
    LEFT JOIN central_content cc ON bca.content_id = cc.id
    LEFT JOIN central_text_content ctc ON bca.text_content_id = ctc.id
    WHERE cb.id = p_bundle_id
    GROUP BY cb.id, cb.name, cb.description;
END;
$$ LANGUAGE plpgsql;

-- Migration: 018-proxy-management-system
-- Purpose: Implement comprehensive proxy management system with providers, individual proxies, and assignment tracking
-- Author: AI Agent
-- Date: 2025-01-27

-- Create proxy providers table
CREATE TABLE IF NOT EXISTS proxy_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    monthly_cost_per_proxy DECIMAL(10,2) DEFAULT 0,
    contact_email VARCHAR(255),
    service_type VARCHAR(50) CHECK (service_type IN ('residential', 'datacenter', 'mobile')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create individual proxies table
CREATE TABLE IF NOT EXISTS proxies (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES proxy_providers(id) ON DELETE SET NULL,
    ip VARCHAR(45) NOT NULL,
    port INTEGER NOT NULL CHECK (port > 0 AND port <= 65535),
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    location VARCHAR(100), -- 'US-California', 'UK-London', etc.
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
    
    -- Assignment tracking
    assigned_model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
    account_count INTEGER DEFAULT 0 CHECK (account_count >= 0),
    max_accounts INTEGER DEFAULT 3 CHECK (max_accounts > 0),
    
    -- Health monitoring
    last_tested_at TIMESTAMP,
    last_success_at TIMESTAMP,
    last_error_message TEXT,
    response_time_ms INTEGER CHECK (response_time_ms >= 0),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(ip, port),
    CHECK (account_count <= max_accounts)
);

-- Create proxy assignment history for audit trail
CREATE TABLE IF NOT EXISTS proxy_assignment_history (
    id SERIAL PRIMARY KEY,
    proxy_id INTEGER REFERENCES proxies(id) ON DELETE SET NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('assigned', 'released', 'reassigned', 'failed')),
    reason VARCHAR(100), -- 'automatic', 'manual', 'cleanup', 'account_invalid', 'model_deleted'
    assigned_by VARCHAR(50), -- user or 'system'
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add proxy_id to accounts table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounts' AND column_name = 'proxy_id') THEN
        ALTER TABLE accounts ADD COLUMN proxy_id INTEGER REFERENCES proxies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add proxy assigned timestamp to accounts table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounts' AND column_name = 'proxy_assigned_at') THEN
        ALTER TABLE accounts ADD COLUMN proxy_assigned_at TIMESTAMP;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_proxies_provider_id ON proxies(provider_id);
CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
CREATE INDEX IF NOT EXISTS idx_proxies_assigned_model ON proxies(assigned_model_id);
CREATE INDEX IF NOT EXISTS idx_proxies_account_count ON proxies(account_count);
CREATE INDEX IF NOT EXISTS idx_proxies_location ON proxies(location);
CREATE INDEX IF NOT EXISTS idx_proxy_assignment_history_proxy_id ON proxy_assignment_history(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_assignment_history_account_id ON proxy_assignment_history(account_id);
CREATE INDEX IF NOT EXISTS idx_proxy_assignment_history_model_id ON proxy_assignment_history(model_id);
CREATE INDEX IF NOT EXISTS idx_proxy_assignment_history_created_at ON proxy_assignment_history(created_at);
CREATE INDEX IF NOT EXISTS idx_accounts_proxy_id ON accounts(proxy_id);

-- Create function to get available proxies for assignment
CREATE OR REPLACE FUNCTION get_available_proxies(
    target_model_id INTEGER DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    proxy_id INTEGER,
    ip VARCHAR(45),
    port INTEGER,
    location VARCHAR(100),
    account_count INTEGER,
    max_accounts INTEGER,
    provider_name VARCHAR(255),
    available_slots INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as proxy_id,
        p.ip,
        p.port,
        p.location,
        p.account_count,
        p.max_accounts,
        pp.name as provider_name,
        (p.max_accounts - p.account_count) as available_slots
    FROM proxies p
    LEFT JOIN proxy_providers pp ON p.provider_id = pp.id
    WHERE p.status = 'active'
      AND p.account_count < p.max_accounts
      AND (target_model_id IS NULL OR p.assigned_model_id IS NULL OR p.assigned_model_id = target_model_id)
    ORDER BY 
        (p.max_accounts - p.account_count) DESC,  -- Prioritize proxies with more available slots
        p.last_success_at DESC NULLS LAST,       -- Prioritize recently successful proxies
        p.created_at ASC                         -- FIFO for proxies with same availability
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample proxy providers
INSERT INTO proxy_providers (name, monthly_cost_per_proxy, service_type, status) VALUES
    ('ProxyMesh', 15.00, 'residential', 'active'),
    ('SmartProxy', 12.50, 'datacenter', 'active'),
    ('BrightData', 20.00, 'residential', 'active'),
    ('ProxyRack', 8.00, 'datacenter', 'active')
ON CONFLICT (name) DO NOTHING;

-- Insert sample proxies for testing
DO $$
DECLARE
    provider_id INTEGER;
BEGIN
    -- Get ProxyMesh provider ID
    SELECT id INTO provider_id FROM proxy_providers WHERE name = 'ProxyMesh' LIMIT 1;
    
    IF provider_id IS NOT NULL THEN
        INSERT INTO proxies (provider_id, ip, port, username, password_encrypted, location, status) VALUES
            (provider_id, '192.168.1.100', 8080, 'user1', 'encrypted_pass_1', 'US-California', 'active'),
            (provider_id, '192.168.1.101', 8080, 'user2', 'encrypted_pass_2', 'US-New York', 'active'),
            (provider_id, '192.168.1.102', 8080, 'user3', 'encrypted_pass_3', 'UK-London', 'active')
        ON CONFLICT (ip, port) DO NOTHING;
    END IF;
    
    -- Get SmartProxy provider ID  
    SELECT id INTO provider_id FROM proxy_providers WHERE name = 'SmartProxy' LIMIT 1;
    
    IF provider_id IS NOT NULL THEN
        INSERT INTO proxies (provider_id, ip, port, username, password_encrypted, location, status) VALUES
            (provider_id, '10.0.1.100', 3128, 'smart1', 'encrypted_smart_1', 'US-Texas', 'active'),
            (provider_id, '10.0.1.101', 3128, 'smart2', 'encrypted_smart_2', 'US-Florida', 'active')
        ON CONFLICT (ip, port) DO NOTHING;
    END IF;
END $$; 