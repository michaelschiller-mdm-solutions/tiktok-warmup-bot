-- Migration: 027-fix-central-content-missing-components
-- Purpose: Add missing content_bundles table and get_central_content_with_texts function

-- Create content_bundles table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_bundles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(50) NOT NULL DEFAULT 'mixed', -- 'mixed', 'story', 'post', 'highlight'
    categories JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    created_by INTEGER REFERENCES models(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for content_bundles
CREATE INDEX IF NOT EXISTS idx_content_bundles_type ON content_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS idx_content_bundles_status ON content_bundles(status);
CREATE INDEX IF NOT EXISTS idx_content_bundles_created_by ON content_bundles(created_by);
CREATE INDEX IF NOT EXISTS idx_content_bundles_categories ON content_bundles USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_content_bundles_tags ON content_bundles USING GIN(tags);

-- Create bundle_content_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS bundle_content_assignments (
    id SERIAL PRIMARY KEY,
    bundle_id INTEGER REFERENCES content_bundles(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES central_content(id) ON DELETE CASCADE,
    text_content_id INTEGER REFERENCES central_text_content(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bundle_id, content_id, text_content_id)
);

-- Create indexes for bundle_content_assignments
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_bundle ON bundle_content_assignments(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_content ON bundle_content_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_text ON bundle_content_assignments(text_content_id);

-- Create get_central_content_with_texts function
CREATE OR REPLACE FUNCTION get_central_content_with_texts(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    filename VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    categories JSONB,
    tags JSONB,
    quality_score DECIMAL(3,2),
    usage_count INTEGER,
    last_used TIMESTAMP,
    status VARCHAR(50),
    uploaded_by INTEGER,
    upload_date TIMESTAMP,
    text_content_id INTEGER,
    text_content TEXT,
    text_categories JSONB,
    text_tags JSONB,
    text_status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.filename,
        cc.file_size,
        cc.file_type,
        cc.categories,
        cc.tags,
        cc.quality_score,
        cc.usage_count,
        cc.last_used,
        cc.status,
        cc.uploaded_by,
        cc.upload_date,
        ctc.id as text_content_id,
        ctc.content_text as text_content,
        ctc.categories as text_categories,
        ctc.tags as text_tags,
        ctc.status as text_status
    FROM central_content cc
    LEFT JOIN central_text_content ctc ON ctc.id IS NOT NULL
    WHERE (p_search IS NULL OR 
           cc.filename ILIKE '%' || p_search || '%' OR
           ctc.content_text ILIKE '%' || p_search || '%')
      AND cc.status = 'active'
    ORDER BY cc.upload_date DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create helper function to get content with texts (simplified version)
CREATE OR REPLACE FUNCTION get_central_content_with_texts()
RETURNS TABLE (
    id INTEGER,
    filename VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(100),
    categories JSONB,
    tags JSONB,
    quality_score DECIMAL(3,2),
    usage_count INTEGER,
    last_used TIMESTAMP,
    status VARCHAR(50),
    uploaded_by INTEGER,
    upload_date TIMESTAMP,
    text_content_id INTEGER,
    text_content TEXT,
    text_categories JSONB,
    text_tags JSONB,
    text_status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM get_central_content_with_texts(50, 0, NULL);
END;
$$ LANGUAGE plpgsql;

-- Add some sample content bundles
INSERT INTO content_bundles (name, description, bundle_type, categories, tags, status) 
VALUES 
    ('Story Content Bundle', 'General story content for various uses', 'story', '["story", "general"]', '["daily", "lifestyle"]', 'active'),
    ('Post Content Bundle', 'Feed post content collection', 'post', '["post", "feed"]', '["engaging", "quality"]', 'active'),
    ('Highlight Content Bundle', 'Content for highlight reels', 'highlight', '["highlight", "featured"]', '["best", "memorable"]', 'active'),
    ('Mixed Content Bundle', 'Mixed content for all purposes', 'mixed', '["story", "post", "highlight"]', '["versatile", "general"]', 'active')
ON CONFLICT DO NOTHING;

-- Update timestamp trigger for content_bundles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_content_bundles_updated_at ON content_bundles;
CREATE TRIGGER update_content_bundles_updated_at
    BEFORE UPDATE ON content_bundles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON content_bundles TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON bundle_content_assignments TO admin;
GRANT USAGE, SELECT ON SEQUENCE content_bundles_id_seq TO admin;
GRANT USAGE, SELECT ON SEQUENCE bundle_content_assignments_id_seq TO admin; 