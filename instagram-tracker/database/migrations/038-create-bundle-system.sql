-- Migration: 038-create-bundle-system
-- Purpose: Create the complete content bundle system with all required tables

-- Create content_bundles table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_bundles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    bundle_type VARCHAR(50) NOT NULL DEFAULT 'mixed', -- 'mixed', 'story', 'post', 'highlight'
    categories JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    created_by INTEGER REFERENCES models(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create model_bundle_assignments table (this was missing!)
CREATE TABLE IF NOT EXISTS model_bundle_assignments (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    bundle_id INTEGER REFERENCES content_bundles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    UNIQUE(model_id, bundle_id)
);

-- Create bundle_content_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS bundle_content_assignments (
    id SERIAL PRIMARY KEY,
    bundle_id INTEGER REFERENCES content_bundles(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES central_content(id) ON DELETE CASCADE,
    text_content_id INTEGER REFERENCES central_text_content(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bundle_id, content_id, text_content_id)
);

-- Create indexes for content_bundles
CREATE INDEX IF NOT EXISTS idx_content_bundles_type ON content_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS idx_content_bundles_status ON content_bundles(status);
CREATE INDEX IF NOT EXISTS idx_content_bundles_created_by ON content_bundles(created_by);
CREATE INDEX IF NOT EXISTS idx_content_bundles_categories ON content_bundles USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_content_bundles_tags ON content_bundles USING GIN(tags);

-- Create indexes for model_bundle_assignments  
CREATE INDEX IF NOT EXISTS idx_model_bundle_assignments_model_id ON model_bundle_assignments(model_id);
CREATE INDEX IF NOT EXISTS idx_model_bundle_assignments_bundle_id ON model_bundle_assignments(bundle_id);
CREATE INDEX IF NOT EXISTS idx_model_bundle_assignments_status ON model_bundle_assignments(status);

-- Create indexes for bundle_content_assignments
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_bundle ON bundle_content_assignments(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_content ON bundle_content_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_text ON bundle_content_assignments(text_content_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON content_bundles TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON model_bundle_assignments TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON bundle_content_assignments TO admin;
GRANT USAGE, SELECT ON SEQUENCE content_bundles_id_seq TO admin;
GRANT USAGE, SELECT ON SEQUENCE model_bundle_assignments_id_seq TO admin;
GRANT USAGE, SELECT ON SEQUENCE bundle_content_assignments_id_seq TO admin; 