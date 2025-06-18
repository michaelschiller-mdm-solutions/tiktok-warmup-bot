-- Migration 017: Add Missing Text Categories for 10-Phase Warmup
-- Adds the missing text content categories to model_text_content table
-- Version: 1.0
-- Created: 2025-06-14

-- Add missing text content categories for the 10-phase warmup system
-- These categories are required by the warmup configuration rules

-- Check if we have the required categories
DO $$
DECLARE
    name_count INTEGER;
    highlight_count INTEGER;
BEGIN
    -- Check for 'name' category
    SELECT COUNT(*) INTO name_count
    FROM model_text_content
    WHERE categories @> '["name"]'::jsonb;
    
    -- Check for 'highlight_group_name' category  
    SELECT COUNT(*) INTO highlight_count
    FROM model_text_content
    WHERE categories @> '["highlight_group_name"]'::jsonb;
    
    RAISE NOTICE 'Current text content with name category: %', name_count;
    RAISE NOTICE 'Current text content with highlight_group_name category: %', highlight_count;
END $$;

-- Add sample 'name' text content for each model if none exists
INSERT INTO model_text_content (
    model_id,
    text_content,
    categories,
    template_name,
    status
)
SELECT 
    m.id,
    'Sample Name ' || generate_series,
    '["name"]'::jsonb,
    'default_names',
    'active'
FROM models m
CROSS JOIN generate_series(1, 5)
WHERE NOT EXISTS (
    SELECT 1 FROM model_text_content 
    WHERE model_id = m.id AND categories @> '["name"]'::jsonb
);

-- Add sample 'highlight_group_name' text content for each model if none exists
INSERT INTO model_text_content (
    model_id,
    text_content,
    categories,
    template_name,
    status
)
SELECT 
    m.id,
    'Highlight ' || generate_series,
    '["highlight_group_name"]'::jsonb,
    'default_highlight_names',
    'active'
FROM models m
CROSS JOIN generate_series(1, 5)
WHERE NOT EXISTS (
    SELECT 1 FROM model_text_content 
    WHERE model_id = m.id AND categories @> '["highlight_group_name"]'::jsonb
);

-- Add more diverse name options for each model
INSERT INTO model_text_content (
    model_id,
    text_content,
    categories,
    template_name,
    status
) 
SELECT 
    m.id,
    name_option,
    '["name"]'::jsonb,
    'female_names',
    'active'
FROM models m
CROSS JOIN (VALUES 
    ('Emma'), ('Sophia'), ('Isabella'), ('Olivia'), ('Ava'),
    ('Mia'), ('Charlotte'), ('Amelia'), ('Harper'), ('Luna')
) AS names(name_option)
WHERE NOT EXISTS (
    SELECT 1 FROM model_text_content 
    WHERE model_id = m.id AND text_content = name_option AND categories @> '["name"]'::jsonb
);

-- Add diverse highlight group names for each model
INSERT INTO model_text_content (
    model_id,
    text_content,
    categories,
    template_name,
    status
) 
SELECT 
    m.id,
    highlight_option,
    '["highlight_group_name"]'::jsonb,
    'lifestyle_highlights',
    'active'
FROM models m
CROSS JOIN (VALUES 
    ('My Life'), ('Travel'), ('Fashion'), ('Food'), ('Fitness'),
    ('Beauty'), ('Friends'), ('Work'), ('Hobbies'), ('Memories')
) AS highlights(highlight_option)
WHERE NOT EXISTS (
    SELECT 1 FROM model_text_content 
    WHERE model_id = m.id AND text_content = highlight_option AND categories @> '["highlight_group_name"]'::jsonb
);

-- Verify the categories were added
DO $$
DECLARE
    name_count INTEGER;
    highlight_count INTEGER;
    total_count INTEGER;
BEGIN
    -- Check for 'name' category
    SELECT COUNT(*) INTO name_count
    FROM model_text_content
    WHERE categories @> '["name"]'::jsonb;
    
    -- Check for 'highlight_group_name' category  
    SELECT COUNT(*) INTO highlight_count
    FROM model_text_content
    WHERE categories @> '["highlight_group_name"]'::jsonb;
    
    -- Total text content
    SELECT COUNT(*) INTO total_count
    FROM model_text_content;
    
    RAISE NOTICE 'Updated text content with name category: %', name_count;
    RAISE NOTICE 'Updated text content with highlight_group_name category: %', highlight_count;
    RAISE NOTICE 'Total text content entries: %', total_count;
END $$;

-- Create indexes for efficient category searches
CREATE INDEX IF NOT EXISTS idx_model_text_content_name_category 
ON model_text_content USING GIN(categories) 
WHERE categories @> '["name"]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_model_text_content_highlight_category 
ON model_text_content USING GIN(categories) 
WHERE categories @> '["highlight_group_name"]'::jsonb; 