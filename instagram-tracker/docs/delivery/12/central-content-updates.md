# Central Content System Updates for Sprint Integration

## Overview
This document outlines the necessary updates to the central content storage system to support the new content sprint functionality while maintaining compatibility with the existing warmup system.

## Current State Analysis

### Existing Content Categories
- **Warmup Categories**: `bio`, `name`, `username`, `highlight_group_name`, `post`, `story`, `highlight`
- **Universal Category**: `any` - fallback for all content types
- **Selection Method**: Random selection with category filtering
- **Post-Warmup Gap**: No content system currently exists for accounts after warmup completion

### Current System Strengths
- ✅ Flexible JSONB category/tag system
- ✅ Central storage with performance indexing
- ✅ Bundle system for content organization
- ✅ Content-text assignment relationships
- ✅ Usage tracking and quality scoring

## Required Updates

### 1. New Content Categories for Sprints

#### Location-Based Categories
```json
// Geographic locations
"jamaica", "germany", "home", "university", "work", "gym", "beach", "mountains"

// Location context
"indoor", "outdoor", "travel", "domestic"
```

#### Thematic Categories  
```json
// Sprint themes
"vacation", "university_life", "work_life", "fitness", "lifestyle", "social"

// Content mood/style
"relaxed", "professional", "energetic", "candid", "posed"
```

#### Seasonal Categories
```json
// Seasons
"spring", "summer", "fall", "winter"

// Weather context
"sunny", "beach_weather", "cold_weather", "holiday_season"
```

#### Instagram Feature Categories
```json
// Content types (expand existing)
"story", "post", "highlight" // Keep existing

// New feature-specific
"story_highlight_candidate", "post_group", "story_series"

// Group posting
"post_group_1", "post_group_2", "post_group_3" // For 1-8 image posts
```

### 2. Content Metadata Enhancements

#### Location Metadata
```sql
-- Add location fields to central_content
ALTER TABLE central_content ADD COLUMN location_data JSONB DEFAULT '{}';

-- Example location_data structure:
{
  "primary_location": "jamaica",
  "secondary_locations": ["beach", "outdoor"],
  "coordinates": {"lat": 18.1096, "lng": -77.2975},
  "location_name": "Montego Bay",
  "is_indoor": false
}
```

#### Timing Metadata
```sql
-- Add timing constraints
ALTER TABLE central_content ADD COLUMN timing_constraints JSONB DEFAULT '{}';

-- Example timing_constraints structure:
{
  "seasons": ["summer", "spring"],
  "months": [6, 7, 8, 9], // June-September
  "time_of_day": ["morning", "afternoon"],
  "days_of_week": ["weekend"]
}
```

#### Sprint Compatibility
```sql
-- Add sprint relationship data
ALTER TABLE central_content ADD COLUMN sprint_compatibility JSONB DEFAULT '{}';

-- Example sprint_compatibility structure:
{
  "compatible_sprints": ["vacation", "lifestyle"],
  "incompatible_sprints": ["work_life", "university"],
  "min_delay_hours": 24,
  "max_delay_hours": 72,
  "can_be_emergency": true
}
```

### 3. New Content Selection Functions

#### Sprint-Aware Content Selection
```sql
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
      WHERE cq.content_id = cc.id 
      AND cq.created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' * p_exclude_recent_hours
    )
  ORDER BY 
    RANDOM() -- TODO: Replace with quality scoring
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### 4. Emergency Content System Integration

#### Emergency Content Tagging
```sql
-- Add emergency content support
ALTER TABLE central_content ADD COLUMN emergency_compatible BOOLEAN DEFAULT false;
ALTER TABLE central_text_content ADD COLUMN emergency_compatible BOOLEAN DEFAULT false;

-- Index for emergency content queries
CREATE INDEX idx_central_content_emergency ON central_content(emergency_compatible) 
WHERE emergency_compatible = true;
```

#### Emergency Content Selection
```sql
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
  LEFT JOIN central_text_content ctc ON ctc.categories @> format('["%s"]', p_content_category)::jsonb
  WHERE cc.emergency_compatible = true
    AND cc.categories @> format('["%s"]', p_content_category)::jsonb
    AND cc.status = 'active'
    AND (ctc.status = 'active' OR ctc.id IS NULL)
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### 5. Content Queue Integration

#### Queue Content with Sprint Context
```sql
-- Update content_queue table to reference central content
ALTER TABLE content_queue 
ADD COLUMN central_content_id INTEGER REFERENCES central_content(id),
ADD COLUMN central_text_id INTEGER REFERENCES central_text_content(id);

-- Add indexes
CREATE INDEX idx_content_queue_central_content ON content_queue(central_content_id);
CREATE INDEX idx_content_queue_central_text ON content_queue(central_text_id);
```

### 6. Highlight System Integration

#### Warmup Highlight Preservation
```sql
-- Ensure warmup highlights are properly categorized
UPDATE central_text_content 
SET categories = categories || '["warmup_highlight"]'::jsonb
WHERE categories @> '["highlight_group_name"]'::jsonb
  AND NOT categories @> '["warmup_highlight"]'::jsonb;

-- Separate sprint highlights from warmup highlights
UPDATE central_text_content 
SET categories = categories || '["sprint_highlight"]'::jsonb
WHERE categories @> '["highlight_group_name"]'::jsonb
  AND NOT categories @> '["warmup_highlight"]'::jsonb;
```

### 7. Bundle System Enhancements

#### Location-Themed Bundles
```sql
-- Create location-specific bundles
INSERT INTO content_bundles (name, description, bundle_type, categories, tags) VALUES 
('Jamaica Vacation Content', 'Beach and tropical vacation content', 'mixed', '["vacation", "jamaica", "beach"]', '["summer", "tropical"]'),
('Germany Travel Content', 'European travel and culture content', 'mixed', '["travel", "germany", "cultural"]', '["spring", "fall"]'),
('University Life Content', 'Campus and student lifestyle content', 'mixed', '["university", "education", "social"]', '["academic", "young_adult"]'),
('Fitness Content', 'Gym and workout content', 'mixed', '["fitness", "gym", "health"]', '["active", "motivational"]');
```

## Implementation Priority

### Phase 1: Core Updates (High Priority)
1. Add new content categories to existing content
2. Create sprint-aware content selection functions
3. Update content queue integration
4. Add emergency content tagging

### Phase 2: Enhanced Metadata (Medium Priority)
1. Add location_data and timing_constraints columns
2. Implement seasonal content filtering
3. Create location-themed bundles
4. Add conflict detection logic

### Phase 3: Advanced Features (Lower Priority)
1. Quality scoring for sprint content
2. Advanced usage analytics
3. Machine learning content recommendations
4. Performance optimization

## Migration Strategy

### Backward Compatibility
- All existing warmup functionality remains unchanged
- New categories are additive, not replacing existing ones
- Existing content continues to work without modification
- Sprint system only activates after `is_warmup_complete(account_id) = true`

### Data Migration
```sql
-- Migrate existing content to have sprint-compatible categories
UPDATE central_content 
SET categories = categories || '["lifestyle"]'::jsonb
WHERE categories @> '["post"]'::jsonb 
  AND NOT categories ? 'lifestyle';

UPDATE central_content 
SET emergency_compatible = true
WHERE categories @> '["any"]'::jsonb;
```

### Testing Strategy
1. Test warmup system continues to function normally
2. Test new sprint content selection with various filters
3. Test emergency content system with conflict scenarios
4. Performance test with large content libraries

## Success Metrics

### Technical Metrics
- Content selection query performance < 100ms
- Zero disruption to existing warmup flows
- Emergency content available within 5 seconds
- Location-based filtering accuracy > 95%

### User Experience Metrics
- Realistic content variety within sprints
- Proper seasonal content matching
- Smooth warmup-to-sprint transition
- Effective conflict resolution for emergency content 