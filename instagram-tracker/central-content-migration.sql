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