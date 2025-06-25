-- Migration: 035-add-enhanced-bio-content
-- Purpose: Add enhanced bio content with location, age, and highlight awareness
-- Date: 2024-12-19

-- Add enhanced bio content samples based on the new bio generation system
INSERT INTO central_text_content (
    text_content,
    categories,
    tags,
    template_name,
    language,
    status,
    created_by,
    metadata
) VALUES 
    -- Location-based bios
    ('Chicago, USA', '["bio", "location"]'::jsonb, '["location", "simple", "chicago"]'::jsonb, 'bio_location_simple', 'en', 'active', 'system', '{"type": "location", "city": "Chicago", "style": "simple"}'::jsonb),
    ('📍Munich📍', '["bio", "location"]'::jsonb, '["location", "emoji", "munich"]'::jsonb, 'bio_location_emoji', 'en', 'active', 'system', '{"type": "location", "city": "Munich", "style": "emoji"}'::jsonb),
    ('📍🇺🇸OKC', '["bio", "location"]'::jsonb, '["location", "flag", "oklahoma"]'::jsonb, 'bio_location_flag', 'en', 'active', 'system', '{"type": "location", "city": "OKC", "style": "flag"}'::jsonb),
    ('San Francisco, Bay Area 🌥️🇵🇭', '["bio", "location"]'::jsonb, '["location", "detailed", "san_francisco"]'::jsonb, 'bio_location_detailed', 'en', 'active', 'system', '{"type": "location", "city": "San Francisco", "style": "detailed"}'::jsonb),
    
    -- Fashion & Beauty focused bios
    ('Emma | 𝑭𝒂𝒔𝒉𝒊𝒐𝒏 & 𝑩𝒆𝒂𝒖𝒕𝒚\nSan Francisco, Bay Area 🌥️🇵🇭\nthings i do, fits i wear ✨', '["bio", "fashion", "beauty"]'::jsonb, '["fashion", "beauty", "lifestyle", "multiline"]'::jsonb, 'bio_fashion_beauty', 'en', 'active', 'system', '{"type": "fashion_beauty", "name": "Emma", "style": "detailed"}'::jsonb),
    ('Sofia | 𝑭𝒂𝒔𝒉𝒊𝒐𝒏 & 𝑩𝒆𝒂𝒖𝒕𝒚\nMunich vibes ✨\nfits & feels 💫', '["bio", "fashion", "beauty"]'::jsonb, '["fashion", "beauty", "lifestyle", "multiline"]'::jsonb, 'bio_fashion_munich', 'en', 'active', 'system', '{"type": "fashion_beauty", "name": "Sofia", "city": "Munich"}'::jsonb),
    
    -- Lifestyle bios
    ('dance | outfits | lifestyle\n📍munich📍', '["bio", "lifestyle"]'::jsonb, '["lifestyle", "dance", "fashion", "munich"]'::jsonb, 'bio_lifestyle_dance', 'en', 'active', 'system', '{"type": "lifestyle", "activities": ["dance", "outfits"], "city": "Munich"}'::jsonb),
    ('lifestyle • fashion\nchicago | milwaukee', '["bio", "lifestyle"]'::jsonb, '["lifestyle", "fashion", "chicago", "milwaukee"]'::jsonb, 'bio_lifestyle_fashion', 'en', 'active', 'system', '{"type": "lifestyle", "cities": ["chicago", "milwaukee"]}'::jsonb),
    
    -- University bios
    ('WashU | STL', '["bio", "university"]'::jsonb, '["university", "education", "st_louis"]'::jsonb, 'bio_university_simple', 'en', 'active', 'system', '{"type": "university", "school": "WashU", "city": "STL"}'::jsonb),
    ('Stanford | Bay Area', '["bio", "university"]'::jsonb, '["university", "education", "stanford"]'::jsonb, 'bio_university_stanford', 'en', 'active', 'system', '{"type": "university", "school": "Stanford", "city": "Bay Area"}'::jsonb),
    ('NYU ''25 | NYC', '["bio", "university", "age"]'::jsonb, '["university", "graduation", "nyc", "2025"]'::jsonb, 'bio_university_grad', 'en', 'active', 'system', '{"type": "university", "school": "NYU", "grad_year": "25", "city": "NYC"}'::jsonb),
    
    -- Age-integrated bios
    ('Chicago | 22', '["bio", "age", "location"]'::jsonb, '["age", "location", "chicago"]'::jsonb, 'bio_age_location', 'en', 'active', 'system', '{"type": "age_location", "age": 22, "city": "Chicago"}'::jsonb),
    ('lifestyle vibes | ''02', '["bio", "age", "lifestyle"]'::jsonb, '["age", "birth_year", "lifestyle"]'::jsonb, 'bio_age_lifestyle', 'en', 'active', 'system', '{"type": "age_lifestyle", "birth_year": "02"}'::jsonb),
    ('Miami | 24 | ✨', '["bio", "age", "location"]'::jsonb, '["age", "location", "miami", "vibes"]'::jsonb, 'bio_age_miami', 'en', 'active', 'system', '{"type": "age_location", "age": 24, "city": "Miami"}'::jsonb),
    
    -- Highlight-based bios (sunset lover)
    ('🌅 sunset lover\n📍San Diego📍', '["bio", "highlight", "sunset"]'::jsonb, '["sunset", "nature", "san_diego"]'::jsonb, 'bio_highlight_sunset', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "sunset", "city": "San Diego"}'::jsonb),
    ('chasing sunsets ✨\nCalifornia dreaming', '["bio", "highlight", "sunset"]'::jsonb, '["sunset", "california", "dreaming"]'::jsonb, 'bio_sunset_california', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "sunset", "location": "California"}'::jsonb),
    
    -- Highlight-based bios (beach lover)
    ('🏖️ beach lover\nMiami vibes 🌊', '["bio", "highlight", "beach"]'::jsonb, '["beach", "ocean", "miami"]'::jsonb, 'bio_highlight_beach', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "beach", "city": "Miami"}'::jsonb),
    ('salty air, don''t care 🌊\n📍Malibu📍', '["bio", "highlight", "beach"]'::jsonb, '["beach", "ocean", "malibu", "carefree"]'::jsonb, 'bio_beach_malibu', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "beach", "city": "Malibu"}'::jsonb),
    
    -- Highlight-based bios (travel)
    ('✈️ wanderlust\ncollecting passport stamps 🗺️', '["bio", "highlight", "travel"]'::jsonb, '["travel", "wanderlust", "adventure"]'::jsonb, 'bio_highlight_travel', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "travel"}'::jsonb),
    ('🌍 travel addict\nbased in NYC', '["bio", "highlight", "travel"]'::jsonb, '["travel", "nyc", "adventure"]'::jsonb, 'bio_travel_nyc', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "travel", "city": "NYC"}'::jsonb),
    
    -- Highlight-based bios (fitness)
    ('💪 fitness enthusiast\nstrong is beautiful 💪', '["bio", "highlight", "fitness"]'::jsonb, '["fitness", "strength", "health"]'::jsonb, 'bio_highlight_fitness', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "fitness"}'::jsonb),
    ('🏋️‍♀️ gym life\nLA fitness vibes', '["bio", "highlight", "fitness"]'::jsonb, '["fitness", "gym", "los_angeles"]'::jsonb, 'bio_fitness_la', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "fitness", "city": "LA"}'::jsonb),
    
    -- Creative/Art bios
    ('🎨 creative soul\nart is life 🖼️', '["bio", "highlight", "art"]'::jsonb, '["art", "creative", "soul"]'::jsonb, 'bio_highlight_art', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "art"}'::jsonb),
    ('✨ creating magic\nPDX artist', '["bio", "highlight", "art"]'::jsonb, '["art", "creative", "portland"]'::jsonb, 'bio_art_portland', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "art", "city": "PDX"}'::jsonb),
    
    -- Music lover bios
    ('🎵 music lover\nlife is a playlist 🎧', '["bio", "highlight", "music"]'::jsonb, '["music", "playlist", "lifestyle"]'::jsonb, 'bio_highlight_music', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "music"}'::jsonb),
    ('🎶 good vibes only\nNashville sounds', '["bio", "highlight", "music"]'::jsonb, '["music", "vibes", "nashville"]'::jsonb, 'bio_music_nashville', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "music", "city": "Nashville"}'::jsonb),
    
    -- Nature lover bios
    ('🌿 nature lover\nwild & free 🦋', '["bio", "highlight", "nature"]'::jsonb, '["nature", "wild", "free"]'::jsonb, 'bio_highlight_nature', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "nature"}'::jsonb),
    ('🌸 bloom where planted\nPacific Northwest vibes', '["bio", "highlight", "nature"]'::jsonb, '["nature", "bloom", "pacific_northwest"]'::jsonb, 'bio_nature_pnw', 'en', 'active', 'system', '{"type": "highlight_based", "highlight": "nature", "location": "Pacific Northwest"}'::jsonb),
    
    -- Mixed template bios
    ('Aria | lifestyle & fashion\n📍Austin📍 | 23', '["bio", "mixed", "age", "location"]'::jsonb, '["lifestyle", "fashion", "austin", "age"]'::jsonb, 'bio_mixed_austin', 'en', 'active', 'system', '{"type": "mixed", "name": "Aria", "city": "Austin", "age": 23}'::jsonb),
    ('Luna | creative vibes ✨\nSeattle | coffee lover ☕', '["bio", "mixed", "creative"]'::jsonb, '["creative", "seattle", "coffee"]'::jsonb, 'bio_mixed_seattle', 'en', 'active', 'system', '{"type": "mixed", "name": "Luna", "city": "Seattle", "interests": ["creative", "coffee"]}'::jsonb),
    ('Nova | dance & design 💃\nMiami University | ''03', '["bio", "mixed", "university", "age"]'::jsonb, '["dance", "design", "university", "miami"]'::jsonb, 'bio_mixed_university', 'en', 'active', 'system', '{"type": "mixed", "name": "Nova", "university": "Miami University", "birth_year": "03", "interests": ["dance", "design"]}'::jsonb)

ON CONFLICT DO NOTHING;

-- Update existing bio content to include enhanced metadata
UPDATE central_text_content 
SET metadata = metadata || '{"enhanced": true, "generation_type": "template_based"}'::jsonb
WHERE categories @> '["bio"]'::jsonb 
  AND template_name IS NOT NULL;

-- Create indexes for enhanced bio queries
CREATE INDEX IF NOT EXISTS idx_central_text_bio_enhanced 
ON central_text_content USING GIN(metadata) 
WHERE categories @> '["bio"]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_central_text_bio_tags 
ON central_text_content USING GIN(tags) 
WHERE categories @> '["bio"]'::jsonb;

-- Add comment
COMMENT ON INDEX idx_central_text_bio_enhanced IS 'Index for enhanced bio content queries with metadata filtering';
COMMENT ON INDEX idx_central_text_bio_tags IS 'Index for bio content tag-based searches';

-- Migration completion handled by external migration tracker (record_migration) 