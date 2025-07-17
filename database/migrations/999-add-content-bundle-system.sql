-- Migration: 999-add-content-bundle-system
-- Purpose: Add complete content bundle system with all required tables

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

-- Bundle content assignments (many-to-many between bundles and content)
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

-- Model bundle assignments (models can use multiple bundles)
CREATE TABLE IF NOT EXISTS model_bundle_assignments (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    bundle_id INTEGER NOT NULL REFERENCES content_bundles(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) DEFAULT 'active' CHECK (assignment_type IN ('active', 'auto', 'backup', 'seasonal')),
    priority INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    assigned_by VARCHAR(100),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per model-bundle pair
    UNIQUE(model_id, bundle_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_bundles_status ON content_bundles(status);
CREATE INDEX IF NOT EXISTS idx_content_bundles_type ON content_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS idx_content_bundles_categories ON content_bundles USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_content_bundles_tags ON content_bundles USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_bundle_id ON bundle_content_assignments(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_content_id ON bundle_content_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_text_id ON bundle_content_assignments(text_content_id);

CREATE INDEX IF NOT EXISTS idx_model_bundle_assignments_model_id ON model_bundle_assignments(model_id);
CREATE INDEX IF NOT EXISTS idx_model_bundle_assignments_bundle_id ON model_bundle_assignments(bundle_id);

-- Add unique constraint to prevent duplicate bundle assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_bundle_content_unique 
ON bundle_content_assignments(bundle_id, content_id) WHERE content_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bundle_text_unique 
ON bundle_content_assignments(bundle_id, text_content_id) WHERE text_content_id IS NOT NULL;

-- Insert some default content bundles
INSERT INTO content_bundles (name, description, bundle_type, categories, tags, status) 
VALUES 
    ('Story Content Bundle', 'General story content for various uses', 'mixed', '["story", "general"]', '["daily", "lifestyle"]', 'active'),
    ('Post Content Bundle', 'Feed post content collection', 'mixed', '["post", "feed"]', '["engaging", "quality"]', 'active'),
    ('Highlight Content Bundle', 'Content for highlight reels', 'mixed', '["highlight", "featured"]', '["best", "memorable"]', 'active'),
    ('Bio Content Bundle', 'Bio and profile content', 'text', '["bio", "profile"]', '["biography", "description"]', 'active'),
    ('Username Content Bundle', 'Username content collection', 'text', '["username", "handles"]', '["names", "handles"]', 'active'),
    ('Mixed Content Bundle', 'Mixed content for all purposes', 'mixed', '["story", "post", "highlight", "bio"]', '["versatile", "general"]', 'active')
ON CONFLICT (name) DO NOTHING;

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