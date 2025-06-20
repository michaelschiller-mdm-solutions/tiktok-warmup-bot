-- Migration: 032-recreate-campaign-pools
-- Purpose: Recreate campaign pools as content collections (story/post/highlight pools) instead of sprint bundling
-- This fixes the fundamental architectural misalignment where campaign pools were treating as sprint bundles

-- =====================================================================================
-- DROP EXISTING INCORRECT CAMPAIGN POOL SYSTEM
-- =====================================================================================

-- Drop existing campaign pools table and related structures
DROP TABLE IF EXISTS campaign_pools CASCADE;
DROP TABLE IF EXISTS campaign_pool_content CASCADE;

-- =====================================================================================
-- CREATE CORRECT CAMPAIGN POOLS AS CONTENT COLLECTIONS  
-- =====================================================================================

-- Campaign Pools Table - Content Collections organized by Instagram posting format
CREATE TABLE campaign_pools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Pool type determines the Instagram format
    pool_type VARCHAR(50) NOT NULL CHECK (pool_type IN ('story', 'post', 'highlight')),
    
    -- Pool-specific configurations
    content_format VARCHAR(50) CHECK (content_format IN ('single', 'multi', 'batch')), -- For posts: single/multi-image, for highlights: batch uploads
    highlight_caption TEXT, -- Single caption for entire highlight group (highlight pools only)
    content_order VARCHAR(20) DEFAULT 'chronological' CHECK (content_order IN ('chronological', 'random')), -- Content ordering (highlight pools only)
    default_delay_hours INTEGER DEFAULT 24 CHECK (default_delay_hours > 0), -- Default delay between uploads (chronological highlights only)
    max_items_per_batch INTEGER DEFAULT 20 CHECK (max_items_per_batch > 0 AND max_items_per_batch <= 20), -- For highlight batch uploads
    
    -- Integration settings
    auto_add_to_highlights BOOLEAN DEFAULT false, -- For story/post pools: auto-transition to highlights
    target_highlight_groups INTEGER[], -- Which existing highlight groups should receive this content
    
    -- Blocking during sprints
    blocked_by_sprint_types TEXT[], -- Sprint types that block this pool (e.g., ['vacation', 'work'])
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints to ensure logical configuration
    CONSTRAINT highlight_caption_for_highlights_only CHECK (
        (pool_type = 'highlight' AND highlight_caption IS NOT NULL) OR 
        (pool_type != 'highlight' AND highlight_caption IS NULL)
    ),
    CONSTRAINT content_order_for_highlights_only CHECK (
        (pool_type = 'highlight') OR 
        (pool_type != 'highlight' AND content_order = 'chronological')
    ),
    CONSTRAINT default_delay_for_chronological_highlights CHECK (
        (pool_type = 'highlight' AND content_order = 'chronological' AND default_delay_hours IS NOT NULL) OR
        (pool_type != 'highlight' OR content_order = 'random')
    )
);

-- Campaign Pool Content Table - Actual content items (images/videos) within pools
CREATE TABLE IF NOT EXISTS campaign_pool_content (
    id SERIAL PRIMARY KEY,
    pool_id INTEGER REFERENCES campaign_pools(id) ON DELETE CASCADE,
    
    -- File information
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    caption TEXT, -- Individual caption for this content item
    
    -- Organization within pool
    content_order INTEGER NOT NULL CHECK (content_order > 0), -- Position in chronological sequence
    custom_delay_hours INTEGER CHECK (custom_delay_hours > 0), -- Override default delay (chronological highlights only)
    
    -- Content type and format
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('story', 'post', 'highlight')), -- What Instagram format this will be posted as
    
    -- Grouping and batching
    post_group_id INTEGER, -- For grouping multiple images into single Instagram post (1-8 images per post)
    batch_number INTEGER CHECK (batch_number > 0), -- For organizing highlight content into upload batches
    
    -- Integration and posting options
    add_to_highlights BOOLEAN DEFAULT false, -- Whether this item should also be added to highlight groups
    story_only BOOLEAN DEFAULT false, -- true = story only, false = post + story (highlight pools only)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure content order is unique within each pool
    UNIQUE(pool_id, content_order)
);

-- =====================================================================================
-- UPDATE CONTENT SPRINTS TO REFERENCE CAMPAIGN POOLS FOR BLOCKING
-- =====================================================================================

-- Add column to content sprints to specify which campaign pools should be blocked during this sprint
ALTER TABLE content_sprints 
ADD COLUMN IF NOT EXISTS blocked_campaign_pools INTEGER[]; -- IDs of campaign pools to block during this sprint

-- Add comment for clarity
COMMENT ON COLUMN content_sprints.blocked_campaign_pools IS 'Array of campaign pool IDs that should be blocked when this sprint is active';

-- =====================================================================================
-- PERFORMANCE INDEXES
-- =====================================================================================

-- Campaign pool indexes
CREATE INDEX IF NOT EXISTS idx_campaign_pools_type ON campaign_pools(pool_type);
CREATE INDEX IF NOT EXISTS idx_campaign_pools_content_order ON campaign_pools(content_order) WHERE pool_type = 'highlight';
CREATE INDEX IF NOT EXISTS idx_campaign_pools_blocked_by_sprints ON campaign_pools USING GIN(blocked_by_sprint_types) WHERE blocked_by_sprint_types IS NOT NULL;

-- Campaign pool content indexes
CREATE INDEX IF NOT EXISTS idx_campaign_pool_content_pool_id ON campaign_pool_content(pool_id);
CREATE INDEX IF NOT EXISTS idx_campaign_pool_content_order ON campaign_pool_content(pool_id, content_order);
CREATE INDEX IF NOT EXISTS idx_campaign_pool_content_post_group ON campaign_pool_content(pool_id, post_group_id) WHERE post_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_pool_content_batch ON campaign_pool_content(pool_id, batch_number) WHERE batch_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_pool_content_type ON campaign_pool_content(content_type);

-- Content sprints blocking index
CREATE INDEX IF NOT EXISTS idx_content_sprints_blocked_pools ON content_sprints USING GIN(blocked_campaign_pools) WHERE blocked_campaign_pools IS NOT NULL;

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to validate post group doesn't exceed 8 images
CREATE OR REPLACE FUNCTION validate_post_group_size()
RETURNS TRIGGER AS $$
DECLARE
    group_size INTEGER;
BEGIN
    IF NEW.post_group_id IS NOT NULL THEN
        SELECT COUNT(*) INTO group_size
        FROM campaign_pool_content 
        WHERE pool_id = NEW.pool_id 
          AND post_group_id = NEW.post_group_id;
          
        IF group_size >= 8 THEN
            RAISE EXCEPTION 'Post group % already has 8 images (Instagram limit)', NEW.post_group_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to ensure content ordering is sequential within pools
CREATE OR REPLACE FUNCTION ensure_sequential_content_order()
RETURNS TRIGGER AS $$
DECLARE
    max_order INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Auto-assign next order if not provided
        IF NEW.content_order IS NULL THEN
            SELECT COALESCE(MAX(content_order), 0) + 1 INTO NEW.content_order
            FROM campaign_pool_content 
            WHERE pool_id = NEW.pool_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if campaign pool is blocked by active sprints
CREATE OR REPLACE FUNCTION is_campaign_pool_blocked(pool_id_param INTEGER, account_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    blocked_sprint_types TEXT[];
    active_sprint_type TEXT;
    is_blocked BOOLEAN := false;
BEGIN
    -- Get the blocked sprint types for this pool
    SELECT blocked_by_sprint_types INTO blocked_sprint_types
    FROM campaign_pools 
    WHERE id = pool_id_param;
    
    -- If no blocking rules, pool is not blocked
    IF blocked_sprint_types IS NULL OR array_length(blocked_sprint_types, 1) = 0 THEN
        RETURN false;
    END IF;
    
    -- Check if account has any active sprints of the blocking types
    SELECT cs.sprint_type INTO active_sprint_type
    FROM account_sprint_assignments asa
    JOIN content_sprints cs ON asa.sprint_id = cs.id
    WHERE asa.account_id = account_id_param
      AND asa.status = 'active'
      AND cs.sprint_type = ANY(blocked_sprint_types)
    LIMIT 1;
    
    -- If we found a blocking sprint, pool is blocked
    RETURN active_sprint_type IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
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

-- Trigger to validate post group size
DROP TRIGGER IF EXISTS trigger_validate_post_group_size ON campaign_pool_content;
CREATE TRIGGER trigger_validate_post_group_size
    BEFORE INSERT OR UPDATE ON campaign_pool_content
    FOR EACH ROW 
    EXECUTE FUNCTION validate_post_group_size();

-- Trigger to ensure sequential content ordering
DROP TRIGGER IF EXISTS trigger_ensure_sequential_content_order ON campaign_pool_content;
CREATE TRIGGER trigger_ensure_sequential_content_order
    BEFORE INSERT ON campaign_pool_content
    FOR EACH ROW 
    EXECUTE FUNCTION ensure_sequential_content_order();

-- Trigger to update campaign pools timestamp
DROP TRIGGER IF EXISTS trigger_update_campaign_pools_timestamp ON campaign_pools;
CREATE TRIGGER trigger_update_campaign_pools_timestamp
    BEFORE UPDATE ON campaign_pools
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================================================

-- Story Pool Example
INSERT INTO campaign_pools (
    name, 
    description, 
    pool_type,
    auto_add_to_highlights,
    target_highlight_groups,
    blocked_by_sprint_types
) VALUES (
    'Daily Life Stories',
    'Casual daily life content for Instagram stories',
    'story',
    true,
    ARRAY[1, 2], -- Add to highlight groups 1 and 2
    ARRAY['vacation', 'work'] -- Blocked during vacation and work sprints
);

-- Post Pool Example  
INSERT INTO campaign_pools (
    name,
    description, 
    pool_type,
    content_format,
    auto_add_to_highlights,
    blocked_by_sprint_types
) VALUES (
    'Fashion Posts',
    'Fashion and outfit posts for main feed',
    'post',
    'single', -- Single image posts
    false,
    ARRAY['vacation'] -- Blocked during vacation sprints
);

-- Highlight Pool Example
INSERT INTO campaign_pools (
    name,
    description,
    pool_type,
    content_format,
    highlight_caption,
    content_order,
    default_delay_hours,
    max_items_per_batch
) VALUES (
    'Travel Memories',
    'Long-term travel highlight collection',
    'highlight',
    'batch',
    'My adventures around the world',
    'chronological',
    72, -- 3 days between uploads
    15 -- 15 items per batch
);

-- Add some sample content to the story pool
INSERT INTO campaign_pool_content (
    pool_id,
    file_path,
    file_name,
    caption,
    content_order,
    content_type,
    add_to_highlights
) VALUES 
(1, '/uploads/stories/coffee_morning.jpg', 'coffee_morning.jpg', 'Morning coffee', 1, 'story', true),
(1, '/uploads/stories/workout_gym.jpg', 'workout_gym.jpg', 'Gym time', 2, 'story', true),
(1, '/uploads/stories/lunch_salad.jpg', 'lunch_salad.jpg', 'Healthy lunch', 3, 'story', false);

-- Add some sample content to the post pool
INSERT INTO campaign_pool_content (
    pool_id,
    file_path,
    file_name,
    caption,
    content_order,
    content_type,
    post_group_id
) VALUES 
(2, '/uploads/posts/outfit1.jpg', 'outfit1.jpg', 'Today''s look', 1, 'post', 1),
(2, '/uploads/posts/outfit2.jpg', 'outfit2.jpg', 'Casual Friday style', 2, 'post', 2),
(2, '/uploads/posts/outfit3.jpg', 'outfit3.jpg', 'Weekend vibes', 3, 'post', 3);

-- Add some sample content to the highlight pool
INSERT INTO campaign_pool_content (
    pool_id,
    file_path,
    file_name,
    caption,
    content_order,
    content_type,
    batch_number,
    story_only,
    custom_delay_hours
) VALUES 
(3, '/uploads/highlights/paris_eiffel.jpg', 'paris_eiffel.jpg', 'Paris memories', 1, 'highlight', 1, false, 96),
(3, '/uploads/highlights/london_bridge.jpg', 'london_bridge.jpg', 'London adventure', 2, 'highlight', 1, false, 48),
(3, '/uploads/highlights/tokyo_sushi.jpg', 'tokyo_sushi.jpg', 'Tokyo foodie experience', 3, 'highlight', 1, true, NULL);

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify campaign pools structure
SELECT 
    cp.name,
    cp.pool_type,
    cp.content_format,
    COUNT(cpc.id) as content_count,
    cp.highlight_caption,
    cp.blocked_by_sprint_types
FROM campaign_pools cp
LEFT JOIN campaign_pool_content cpc ON cp.id = cpc.pool_id
GROUP BY cp.id, cp.name, cp.pool_type, cp.content_format, cp.highlight_caption, cp.blocked_by_sprint_types
ORDER BY cp.created_at;

-- Verify content organization within pools
SELECT 
    cp.name as pool_name,
    cpc.content_order,
    cpc.file_name,
    cpc.content_type,
    cpc.post_group_id,
    cpc.batch_number,
    cpc.custom_delay_hours
FROM campaign_pools cp
JOIN campaign_pool_content cpc ON cp.id = cpc.pool_id
ORDER BY cp.id, cpc.content_order; 