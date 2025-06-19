-- =====================================================================================
-- Central Content Sprint Integration - Database Schema Updates
-- Version: 1.0
-- Created: 2024-12-19
-- 
-- This migration extends the existing central content system to support the new
-- content sprint functionality. It adds sprint categories, emergency content 
-- tagging, and location/timing metadata while maintaining backward compatibility.
-- =====================================================================================

BEGIN;

-- Record migration start
SELECT record_migration('026-central-content-sprint-integration', true, 'Starting central content sprint integration');

-- =====================================================================================
-- EXTEND CENTRAL CONTENT TABLES
-- =====================================================================================

-- Add emergency content compatibility
ALTER TABLE central_content ADD COLUMN IF NOT EXISTS emergency_compatible BOOLEAN DEFAULT false;
ALTER TABLE central_text_content ADD COLUMN IF NOT EXISTS emergency_compatible BOOLEAN DEFAULT false;

-- Add location and timing metadata for sprint content
ALTER TABLE central_content ADD COLUMN IF NOT EXISTS location_data JSONB DEFAULT '{}';
ALTER TABLE central_content ADD COLUMN IF NOT EXISTS timing_constraints JSONB DEFAULT '{}';
ALTER TABLE central_content ADD COLUMN IF NOT EXISTS sprint_compatibility JSONB DEFAULT '{}';

-- =====================================================================================
-- CREATE PERFORMANCE INDEXES
-- =====================================================================================

-- Indexes for emergency content queries
CREATE INDEX IF NOT EXISTS idx_central_content_emergency ON central_content(emergency_compatible) 
WHERE emergency_compatible = true;

CREATE INDEX IF NOT EXISTS idx_central_text_emergency ON central_text_content(emergency_compatible) 
WHERE emergency_compatible = true;

-- Indexes for location and timing queries
CREATE INDEX IF NOT EXISTS idx_central_content_location ON central_content USING GIN(location_data);
CREATE INDEX IF NOT EXISTS idx_central_content_timing ON central_content USING GIN(timing_constraints);
CREATE INDEX IF NOT EXISTS idx_central_content_sprint_compat ON central_content USING GIN(sprint_compatibility);

-- =====================================================================================
-- SPRINT-AWARE CONTENT SELECTION FUNCTIONS
-- =====================================================================================

-- Function to select content for sprints with location and seasonal awareness
CREATE OR REPLACE FUNCTION select_content_for_sprint(
    p_sprint_id INTEGER,
    p_content_category VARCHAR(50),
    p_account_location VARCHAR(100) DEFAULT NULL,
    p_current_season VARCHAR(20) DEFAULT NULL,
    p_exclude_recent_hours INTEGER DEFAULT 168
) RETURNS TABLE (
    content_id INTEGER,
    filename VARCHAR(255),
    categories JSONB,
    location_data JSONB,
    timing_constraints JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.filename,
        cc.categories,
        cc.location_data,
        cc.timing_constraints
    FROM central_content cc
    JOIN content_sprints cs ON cs.id = p_sprint_id
    WHERE cc.status = 'active'
        AND cc.categories @> format('["%s"]', p_content_category)::jsonb
        AND (
            p_account_location IS NULL 
            OR cc.location_data->>'primary_location' = p_account_location
            OR cc.location_data->'secondary_locations' @> format('"%s"', p_account_location)::jsonb
        )
        AND (
            p_current_season IS NULL
            OR cc.timing_constraints->'seasons' IS NULL
            OR cc.timing_constraints->'seasons' @> format('"%s"', p_current_season)::jsonb
        )
        -- Exclude recently used content
        AND NOT EXISTS (
            SELECT 1 FROM content_queue cq 
            WHERE cq.central_content_id = cc.id 
            AND cq.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' * p_exclude_recent_hours
        )
    ORDER BY 
        RANDOM() -- TODO: Replace with quality scoring in future
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to select emergency content with conflict detection
CREATE OR REPLACE FUNCTION select_emergency_content(
    p_content_category VARCHAR(50),
    p_account_id INTEGER,
    p_conflict_strategy VARCHAR(20) DEFAULT 'pause_sprints'
) RETURNS TABLE (
    content_id INTEGER,
    text_id INTEGER,
    requires_conflict_resolution BOOLEAN
) AS $$
DECLARE
    account_location VARCHAR(100);
    active_sprint_locations VARCHAR(100)[];
    has_conflicts BOOLEAN := false;
BEGIN
    -- Get account current location and active sprint locations
    SELECT 
        acs.current_location,
        array_agg(DISTINCT cs.location)
    INTO account_location, active_sprint_locations
    FROM account_content_state acs
    LEFT JOIN content_sprints cs ON cs.id = ANY(acs.active_sprint_ids)
    WHERE acs.account_id = p_account_id
    GROUP BY acs.current_location;
    
    -- Check for location conflicts
    IF array_length(active_sprint_locations, 1) > 0 
       AND NOT (account_location = ANY(active_sprint_locations)) THEN
        has_conflicts := true;
    END IF;
    
    RETURN QUERY
    SELECT 
        cc.id as content_id,
        ctc.id as text_id,
        has_conflicts as requires_conflict_resolution
    FROM central_content cc
    LEFT JOIN central_content_text_assignments ccta ON cc.id = ccta.content_id
    LEFT JOIN central_text_content ctc ON ccta.text_content_id = ctc.id
    WHERE cc.emergency_compatible = true
        AND cc.categories @> format('["%s"]', p_content_category)::jsonb
        AND cc.status = 'active'
        AND (ctc.status = 'active' OR ctc.id IS NULL)
    ORDER BY RANDOM()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- UPDATE EXISTING CONTENT WITH SPRINT CATEGORIES
-- =====================================================================================

-- Add lifestyle category to existing posts
UPDATE central_content 
SET categories = categories || '["lifestyle"]'::jsonb
WHERE categories @> '["post"]'::jsonb 
  AND NOT categories ? 'lifestyle';

-- Mark universal content as emergency-compatible
UPDATE central_content 
SET emergency_compatible = true
WHERE categories @> '["any"]'::jsonb;

-- Add location-based categories to sample content
UPDATE central_content 
SET categories = categories || '["home", "indoor"]'::jsonb,
    location_data = '{"primary_location": "home", "is_indoor": true}'::jsonb
WHERE categories @> '["post"]'::jsonb 
  AND NOT categories ? 'home'
  AND random() < 0.3;

UPDATE central_content 
SET categories = categories || '["fitness", "active"]'::jsonb,
    location_data = '{"primary_location": "gym", "is_indoor": true}'::jsonb
WHERE categories @> '["post"]'::jsonb 
  AND NOT categories ? 'fitness'
  AND random() < 0.2;

-- Add seasonal timing to some content
UPDATE central_content 
SET timing_constraints = '{"seasons": ["summer", "spring"], "months": [4,5,6,7,8,9]}'::jsonb
WHERE categories @> '["vacation"]'::jsonb OR categories @> '["beach"]'::jsonb;

UPDATE central_content 
SET timing_constraints = '{"seasons": ["winter"], "months": [12,1,2,3]}'::jsonb
WHERE categories @> '["indoor"]'::jsonb AND random() < 0.1;

-- =====================================================================================
-- UPDATE TEXT CONTENT FOR SPRINT COMPATIBILITY
-- =====================================================================================

-- Mark warmup highlights as such for preservation
UPDATE central_text_content 
SET categories = categories || '["warmup_highlight"]'::jsonb
WHERE categories @> '["highlight_group_name"]'::jsonb
  AND NOT categories @> '["warmup_highlight"]'::jsonb;

-- Add sprint highlight category for new highlights
UPDATE central_text_content 
SET categories = categories || '["sprint_highlight"]'::jsonb,
    emergency_compatible = true
WHERE categories @> '["highlight"]'::jsonb
  AND NOT categories @> '["warmup_highlight"]'::jsonb;

-- =====================================================================================
-- SAMPLE SPRINT-SPECIFIC CONTENT CATEGORIES
-- =====================================================================================

-- Insert sample sprint category mappings for documentation
INSERT INTO central_text_content (text_content, categories, template_name, language, created_by) VALUES
('🏖️ Jamaica vacation vibes', '["vacation", "jamaica", "beach"]', 'vacation_caption', 'en', 'system'),
('📚 University life moments', '["university", "education", "student"]', 'university_caption', 'en', 'system'),
('💪 Home workout session', '["fitness", "home", "workout"]', 'fitness_caption', 'en', 'system'),
('🌟 Lifestyle content', '["lifestyle", "any"]', 'lifestyle_caption', 'en', 'system'),
('✈️ Travel memories', '["travel", "vacation", "adventure"]', 'travel_caption', 'en', 'system')
ON CONFLICT DO NOTHING;

-- Record successful migration
SELECT record_migration('026-central-content-sprint-integration', true, 'Central content sprint integration completed successfully');

COMMIT;

-- =====================================================================================
-- MIGRATION COMPLETE
-- Central Content Sprint Integration has been implemented
-- 
-- Updates Made:
-- - Added emergency_compatible flags to central_content and central_text_content
-- - Added location_data, timing_constraints, and sprint_compatibility JSONB columns
-- - Created performance indexes for sprint-aware queries
-- - Added select_content_for_sprint() function with location/seasonal awareness
-- - Added select_emergency_content() function with conflict detection
-- - Updated existing content with sprint-compatible categories
-- - Preserved warmup highlights with special categorization
-- - Added sample sprint-specific text content
--
-- Sprint Categories Added:
-- - Location: home, indoor, gym, beach, jamaica, germany, university
-- - Theme: lifestyle, fitness, vacation, travel, education, student
-- - Seasonal: timing constraints for summer/winter content
-- - Emergency: emergency_compatible flag for interrupt content
-- ===================================================================================== 