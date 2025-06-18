-- Migration 018: Ensure Warmup Content Availability
-- Purpose: Add sample content for all warmup phase categories to ensure assignment never fails
-- Date: 2024-06-16

-- Check current content availability
DO $$
DECLARE
    bio_count INTEGER;
    name_count INTEGER;
    highlight_count INTEGER;
    post_count INTEGER;
    story_count INTEGER;
    highlight_group_count INTEGER;
BEGIN
    -- Check text content availability
    SELECT COUNT(*) INTO bio_count FROM central_text_content WHERE categories @> '["bio"]'::jsonb AND status = 'active';
    SELECT COUNT(*) INTO name_count FROM central_text_content WHERE categories @> '["name"]'::jsonb AND status = 'active';
    SELECT COUNT(*) INTO highlight_group_count FROM central_text_content WHERE categories @> '["highlight_group_name"]'::jsonb AND status = 'active';
    
    -- Check image content availability  
    SELECT COUNT(*) INTO highlight_count FROM central_content WHERE categories @> '["highlight"]'::jsonb AND status = 'active';
    SELECT COUNT(*) INTO post_count FROM central_content WHERE categories @> '["post"]'::jsonb AND status = 'active';
    SELECT COUNT(*) INTO story_count FROM central_content WHERE categories @> '["story"]'::jsonb AND status = 'active';
    
    RAISE NOTICE 'Content availability check:';
    RAISE NOTICE '- Bio texts: %', bio_count;
    RAISE NOTICE '- Name texts: %', name_count;
    RAISE NOTICE '- Highlight group names: %', highlight_group_count;
    RAISE NOTICE '- Highlight images: %', highlight_count;
    RAISE NOTICE '- Post images: %', post_count;
    RAISE NOTICE '- Story images: %', story_count;
END $$;

-- Add sample bio text content if missing
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by
) VALUES 
    ('✨ Living my best life | Fashion & lifestyle enthusiast', '["bio"]'::jsonb, '["warmup", "profile", "fashion"]'::jsonb, 'bio_fashion', 'en', 'active', 'system'),
    ('🌟 Model & Content Creator | Beauty & Style Tips', '["bio"]'::jsonb, '["warmup", "profile", "beauty"]'::jsonb, 'bio_beauty', 'en', 'active', 'system'),
    ('💖 Lifestyle blogger | Travel & adventure seeker', '["bio"]'::jsonb, '["warmup", "profile", "travel"]'::jsonb, 'bio_travel', 'en', 'active', 'system'),
    ('🎯 Fitness enthusiast | Healthy living advocate', '["bio"]'::jsonb, '["warmup", "profile", "fitness"]'::jsonb, 'bio_fitness', 'en', 'active', 'system'),
    ('🌸 Art lover & creative soul | Inspiring positivity', '["bio"]'::jsonb, '["warmup", "profile", "art"]'::jsonb, 'bio_art', 'en', 'active', 'system'),
    ('📸 Photography & visual storytelling | Follow my journey', '["bio"]'::jsonb, '["warmup", "profile", "photography"]'::jsonb, 'bio_photo', 'en', 'active', 'system'),
    ('💫 Entrepreneur & motivational speaker | Dream big', '["bio"]'::jsonb, '["warmup", "profile", "business"]'::jsonb, 'bio_business', 'en', 'active', 'system'),
    ('🌺 Mindfulness & wellness advocate | Inner peace seeker', '["bio"]'::jsonb, '["warmup", "profile", "wellness"]'::jsonb, 'bio_wellness', 'en', 'active', 'system'),
    ('🎨 Creative designer | Fashion & lifestyle inspiration', '["bio"]'::jsonb, '["warmup", "profile", "design"]'::jsonb, 'bio_design', 'en', 'active', 'system'),
    ('✨ Spreading love & positivity | Living authentically', '["bio"]'::jsonb, '["warmup", "profile", "lifestyle"]'::jsonb, 'bio_authentic', 'en', 'active', 'system')
ON CONFLICT DO NOTHING;

-- Add sample name text content if missing
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by
) VALUES 
    ('Emma Rose', '["name"]'::jsonb, '["warmup", "profile", "feminine"]'::jsonb, 'name_classic', 'en', 'active', 'system'),
    ('Sofia Grace', '["name"]'::jsonb, '["warmup", "profile", "elegant"]'::jsonb, 'name_elegant', 'en', 'active', 'system'),
    ('Mia Luna', '["name"]'::jsonb, '["warmup", "profile", "modern"]'::jsonb, 'name_modern', 'en', 'active', 'system'),
    ('Aria Belle', '["name"]'::jsonb, '["warmup", "profile", "artistic"]'::jsonb, 'name_artistic', 'en', 'active', 'system'),
    ('Luna Sky', '["name"]'::jsonb, '["warmup", "profile", "nature"]'::jsonb, 'name_nature', 'en', 'active', 'system'),
    ('Zoe Star', '["name"]'::jsonb, '["warmup", "profile", "vibrant"]'::jsonb, 'name_vibrant', 'en', 'active', 'system'),
    ('Ivy Rose', '["name"]'::jsonb, '["warmup", "profile", "botanical"]'::jsonb, 'name_botanical', 'en', 'active', 'system'),
    ('Nova Lei', '["name"]'::jsonb, '["warmup", "profile", "unique"]'::jsonb, 'name_unique', 'en', 'active', 'system'),
    ('Sage Moon', '["name"]'::jsonb, '["warmup", "profile", "mystical"]'::jsonb, 'name_mystical', 'en', 'active', 'system'),
    ('Rain Aurora', '["name"]'::jsonb, '["warmup", "profile", "ethereal"]'::jsonb, 'name_ethereal', 'en', 'active', 'system')
ON CONFLICT DO NOTHING;

-- Add more highlight group names if needed
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by
) VALUES 
    ('Daily Vibes', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "lifestyle"]'::jsonb, 'highlight_daily', 'en', 'active', 'system'),
    ('Style Moments', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "fashion"]'::jsonb, 'highlight_style', 'en', 'active', 'system'),
    ('Adventures', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "travel"]'::jsonb, 'highlight_travel', 'en', 'active', 'system'),
    ('Self Care', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "wellness"]'::jsonb, 'highlight_wellness', 'en', 'active', 'system'),
    ('Creative Flow', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "art"]'::jsonb, 'highlight_creative', 'en', 'active', 'system'),
    ('Good Vibes', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "positive"]'::jsonb, 'highlight_positive', 'en', 'active', 'system'),
    ('Behind Scenes', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "bts"]'::jsonb, 'highlight_bts', 'en', 'active', 'system'),
    ('Inspiration', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "motivational"]'::jsonb, 'highlight_inspiration', 'en', 'active', 'system'),
    ('My Story', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "personal"]'::jsonb, 'highlight_story', 'en', 'active', 'system'),
    ('Moments', '["highlight_group_name"]'::jsonb, '["warmup", "highlights", "memories"]'::jsonb, 'highlight_moments', 'en', 'active', 'system')
ON CONFLICT DO NOTHING;

-- Add sample post and story captions
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by
) VALUES 
    -- Post captions
    ('✨ Embracing the beauty in everyday moments', '["post"]'::jsonb, '["warmup", "captions", "lifestyle"]'::jsonb, 'post_lifestyle', 'en', 'active', 'system'),
    ('💫 Living life in full color', '["post"]'::jsonb, '["warmup", "captions", "vibrant"]'::jsonb, 'post_vibrant', 'en', 'active', 'system'),
    ('🌟 Chasing dreams and making memories', '["post"]'::jsonb, '["warmup", "captions", "aspirational"]'::jsonb, 'post_dreams', 'en', 'active', 'system'),
    ('💖 Grateful for this beautiful life', '["post"]'::jsonb, '["warmup", "captions", "gratitude"]'::jsonb, 'post_gratitude', 'en', 'active', 'system'),
    ('🌸 Finding magic in the ordinary', '["post"]'::jsonb, '["warmup", "captions", "mindful"]'::jsonb, 'post_mindful', 'en', 'active', 'system'),
    
    -- Story captions
    ('Good morning sunshine! ☀️', '["story"]'::jsonb, '["warmup", "captions", "morning"]'::jsonb, 'story_morning', 'en', 'active', 'system'),
    ('Feeling blessed today 🙏', '["story"]'::jsonb, '["warmup", "captions", "gratitude"]'::jsonb, 'story_blessed', 'en', 'active', 'system'),
    ('Just vibing ✨', '["story"]'::jsonb, '["warmup", "captions", "casual"]'::jsonb, 'story_vibing', 'en', 'active', 'system'),
    ('Making memories 📸', '["story"]'::jsonb, '["warmup", "captions", "memories"]'::jsonb, 'story_memories', 'en', 'active', 'system'),
    ('Living my best life 💫', '["story"]'::jsonb, '["warmup", "captions", "lifestyle"]'::jsonb, 'story_bestlife', 'en', 'active', 'system')
ON CONFLICT DO NOTHING;

-- Create placeholder image content entries
-- These point to default/placeholder images that should be uploaded separately
INSERT INTO central_content (
    filename,
    original_name,
    file_path,
    content_type,
    file_size,
    mime_type,
    categories,
    tags,
    status,
    uploaded_by,
    metadata
) VALUES 
    -- Highlight placeholder images
    ('placeholder-highlight-1.jpg', 'Highlight Placeholder 1', '/app/placeholders/highlight-1.jpg', 'image', 50000, 'image/jpeg', '["highlight"]'::jsonb, '["warmup", "placeholder"]'::jsonb, 'active', 'system', '{"is_placeholder": true}'::jsonb),
    ('placeholder-highlight-2.jpg', 'Highlight Placeholder 2', '/app/placeholders/highlight-2.jpg', 'image', 50000, 'image/jpeg', '["highlight"]'::jsonb, '["warmup", "placeholder"]'::jsonb, 'active', 'system', '{"is_placeholder": true}'::jsonb),
    ('placeholder-highlight-3.jpg', 'Highlight Placeholder 3', '/app/placeholders/highlight-3.jpg', 'image', 50000, 'image/jpeg', '["highlight"]'::jsonb, '["warmup", "placeholder"]'::jsonb, 'active', 'system', '{"is_placeholder": true}'::jsonb),
    
    -- Post placeholder images
    ('placeholder-post-1.jpg', 'Post Placeholder 1', '/app/placeholders/post-1.jpg', 'image', 75000, 'image/jpeg', '["post"]'::jsonb, '["warmup", "placeholder"]'::jsonb, 'active', 'system', '{"is_placeholder": true}'::jsonb),
    ('placeholder-post-2.jpg', 'Post Placeholder 2', '/app/placeholders/post-2.jpg', 'image', 75000, 'image/jpeg', '["post"]'::jsonb, '["warmup", "placeholder"]'::jsonb, 'active', 'system', '{"is_placeholder": true}'::jsonb),
    ('placeholder-post-3.jpg', 'Post Placeholder 3', '/app/placeholders/post-3.jpg', 'image', 75000, 'image/jpeg', '["post"]'::jsonb, '["warmup", "placeholder"]'::jsonb, 'active', 'system', '{"is_placeholder": true}'::jsonb),
    
    -- Story placeholder images
    ('placeholder-story-1.jpg', 'Story Placeholder 1', '/app/placeholders/story-1.jpg', 'image', 60000, 'image/jpeg', '["story"]'::jsonb, '["warmup", "placeholder"]'::jsonb, 'active', 'system', '{"is_placeholder": true}'::jsonb),
    ('placeholder-story-2.jpg', 'Story Placeholder 2', '/app/placeholders/story-2.jpg', 'image', 60000, 'image/jpeg', '["story"]'::jsonb, '["warmup", "placeholder"]'::jsonb, 'active', 'system', '{"is_placeholder": true}'::jsonb),
    ('placeholder-story-3.jpg', 'Story Placeholder 3', '/app/placeholders/story-3.jpg', 'image', 60000, 'image/jpeg', '["story"]'::jsonb, '["warmup", "placeholder"]'::jsonb, 'active', 'system', '{"is_placeholder": true}'::jsonb)
ON CONFLICT (filename) DO NOTHING;

-- Add username text content for username change phase
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by
) VALUES 
    ('emma.rose.official', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_official', 'en', 'active', 'system'),
    ('sofia_grace_', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_underscore', 'en', 'active', 'system'),
    ('mialuna.style', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_style', 'en', 'active', 'system'),
    ('ariabelle.art', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_art', 'en', 'active', 'system'),
    ('lunasky.vibes', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_vibes', 'en', 'active', 'system'),
    ('zoestar.life', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_life', 'en', 'active', 'system'),
    ('ivyrose.daily', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_daily', 'en', 'active', 'system'),
    ('nova.lei.creative', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_creative', 'en', 'active', 'system'),
    ('sagemoon.inspire', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_inspire', 'en', 'active', 'system'),
    ('rainaurora.dreams', '["username"]'::jsonb, '["warmup", "profile", "username"]'::jsonb, 'username_dreams', 'en', 'active', 'system')
ON CONFLICT DO NOTHING;

-- Function to check content availability for warmup
CREATE OR REPLACE FUNCTION check_warmup_content_availability()
RETURNS TABLE (
    phase VARCHAR(30),
    content_type VARCHAR(20),
    available_count INTEGER,
    content_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    WITH warmup_requirements AS (
        SELECT 'bio'::VARCHAR(30) as phase, 'text'::VARCHAR(20) as content_type, 'bio'::TEXT as category
        UNION ALL SELECT 'name', 'text', 'name'
        UNION ALL SELECT 'username', 'text', 'username'
        UNION ALL SELECT 'first_highlight', 'image', 'highlight'
        UNION ALL SELECT 'first_highlight', 'text', 'highlight_group_name'
        UNION ALL SELECT 'new_highlight', 'image', 'highlight'
        UNION ALL SELECT 'new_highlight', 'text', 'highlight_group_name'
        UNION ALL SELECT 'post_caption', 'image', 'post'
        UNION ALL SELECT 'post_caption', 'text', 'post'
        UNION ALL SELECT 'post_no_caption', 'image', 'post'
        UNION ALL SELECT 'story_caption', 'image', 'story'
        UNION ALL SELECT 'story_caption', 'text', 'story'
        UNION ALL SELECT 'story_no_caption', 'image', 'story'
    ),
    content_counts AS (
        SELECT 
            wr.phase,
            wr.content_type,
            CASE 
                WHEN wr.content_type = 'text' THEN
                    (SELECT COUNT(*) FROM central_text_content ctc
                     WHERE ctc.categories @> format('["%s"]', wr.category)::jsonb 
                     AND ctc.status = 'active')
                ELSE
                    (SELECT COUNT(*) FROM central_content cc
                     WHERE cc.categories @> format('["%s"]', wr.category)::jsonb 
                     AND cc.status = 'active')
            END as available_count
        FROM warmup_requirements wr
    )
    SELECT 
        cc.phase,
        cc.content_type,
        cc.available_count::INTEGER,
        CASE 
            WHEN cc.available_count > 0 THEN 'OK'::VARCHAR(20)
            ELSE 'MISSING'::VARCHAR(20)
        END as content_status
    FROM content_counts cc
    ORDER BY cc.phase, cc.content_type;
END;
$$ LANGUAGE plpgsql;

-- Check final content availability after migration
DO $$
DECLARE
    missing_count INTEGER;
    rec RECORD;
BEGIN
    RAISE NOTICE 'Final content availability check after migration:';
    
    FOR rec IN 
        SELECT * FROM check_warmup_content_availability()
    LOOP
        RAISE NOTICE '% % content: % items - %', rec.phase, rec.content_type, rec.available_count, rec.content_status;
    END LOOP;
    
    SELECT COUNT(*) INTO missing_count 
    FROM check_warmup_content_availability() 
    WHERE content_status = 'MISSING';
    
    IF missing_count > 0 THEN
        RAISE WARNING 'WARNING: % content categories are still missing content!', missing_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All warmup phases have available content!';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_central_content_warmup_categories 
ON central_content USING GIN(categories) 
WHERE categories @> ANY(ARRAY['["highlight"]'::jsonb, '["post"]'::jsonb, '["story"]'::jsonb]);

CREATE INDEX IF NOT EXISTS idx_central_text_content_warmup_categories 
ON central_text_content USING GIN(categories) 
WHERE categories @> ANY(ARRAY['["bio"]'::jsonb, '["name"]'::jsonb, '["username"]'::jsonb, '["highlight_group_name"]'::jsonb, '["post"]'::jsonb, '["story"]'::jsonb]);

-- Add comment
COMMENT ON FUNCTION check_warmup_content_availability IS 'Checks if all required content categories have available content for warmup phases'; 