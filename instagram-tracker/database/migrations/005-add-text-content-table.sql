-- Migration: 005-add-text-content-table
-- Purpose: Add tables for storing text content and linking texts to images

-- Create model_text_content table for storing text templates
CREATE TABLE IF NOT EXISTS model_text_content (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]',
    template_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create content_text_assignments table for linking images to texts
CREATE TABLE IF NOT EXISTS content_text_assignments (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES model_content(id) ON DELETE CASCADE,
    text_content_id INTEGER NOT NULL REFERENCES model_text_content(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL DEFAULT 'random' CHECK (assignment_type IN ('random', 'manual', 'template')),
    template_name VARCHAR(255),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    
    -- Ensure unique assignment per content item
    UNIQUE(content_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_text_content_model_id ON model_text_content(model_id);
CREATE INDEX IF NOT EXISTS idx_model_text_content_categories ON model_text_content USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_model_text_content_status ON model_text_content(status);
CREATE INDEX IF NOT EXISTS idx_model_text_content_template_name ON model_text_content(template_name);

CREATE INDEX IF NOT EXISTS idx_content_text_assignments_model_id ON content_text_assignments(model_id);
CREATE INDEX IF NOT EXISTS idx_content_text_assignments_content_id ON content_text_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_content_text_assignments_text_content_id ON content_text_assignments(text_content_id);
CREATE INDEX IF NOT EXISTS idx_content_text_assignments_template_name ON content_text_assignments(template_name);
CREATE INDEX IF NOT EXISTS idx_content_text_assignments_status ON content_text_assignments(status);

-- Add trigger to update updated_at timestamp for model_text_content
DROP TRIGGER IF EXISTS update_model_text_content_updated_at ON model_text_content;
CREATE TRIGGER update_model_text_content_updated_at
    BEFORE UPDATE ON model_text_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to randomly assign texts to images for a model
CREATE OR REPLACE FUNCTION assign_texts_randomly(
    p_model_id INTEGER,
    p_template_name VARCHAR(255) DEFAULT NULL,
    p_category_filter JSONB DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    assignment_count INTEGER := 0;
    content_record RECORD;
    text_record RECORD;
    available_texts INTEGER[];
    selected_text_id INTEGER;
    random_index INTEGER;
BEGIN
    -- Clear existing assignments if template_name is provided (template change)
    IF p_template_name IS NOT NULL THEN
        DELETE FROM content_text_assignments 
        WHERE model_id = p_model_id 
        AND (template_name = p_template_name OR template_name IS NULL);
    END IF;
    
    -- Get available text content for the model
    SELECT ARRAY_AGG(id) INTO available_texts
    FROM model_text_content 
    WHERE model_id = p_model_id 
    AND status = 'active'
    AND (p_category_filter IS NULL OR categories && p_category_filter);
    
    -- If no texts available, return 0
    IF available_texts IS NULL OR array_length(available_texts, 1) = 0 THEN
        RETURN 0;
    END IF;
    
    -- Loop through content items that need text assignment
    FOR content_record IN 
        SELECT mc.id, mc.categories
        FROM model_content mc
        LEFT JOIN content_text_assignments cta ON mc.id = cta.content_id AND cta.status = 'active'
        WHERE mc.model_id = p_model_id 
        AND mc.content_type = 'image'
        AND mc.status = 'active'
        AND cta.id IS NULL -- Only unassigned content
        AND (p_category_filter IS NULL OR mc.categories && p_category_filter)
    LOOP
        -- Select random text from available texts
        random_index := floor(random() * array_length(available_texts, 1)) + 1;
        selected_text_id := available_texts[random_index];
        
        -- Create assignment
        INSERT INTO content_text_assignments (
            model_id, 
            content_id, 
            text_content_id, 
            assignment_type,
            template_name,
            assigned_by
        ) VALUES (
            p_model_id,
            content_record.id,
            selected_text_id,
            CASE WHEN p_template_name IS NOT NULL THEN 'template' ELSE 'random' END,
            p_template_name,
            'system'
        );
        
        assignment_count := assignment_count + 1;
    END LOOP;
    
    RETURN assignment_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get content with assigned texts
CREATE OR REPLACE FUNCTION get_content_with_texts(p_model_id INTEGER)
RETURNS TABLE (
    content_id INTEGER,
    filename VARCHAR(255),
    original_name VARCHAR(255),
    content_type VARCHAR(50),
    file_size BIGINT,
    categories JSONB,
    content_status VARCHAR(20),
    content_created_at TIMESTAMP,
    text_content_id INTEGER,
    text_content TEXT,
    text_categories JSONB,
    template_name VARCHAR(255),
    assignment_type VARCHAR(50),
    assigned_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id as content_id,
        mc.filename,
        mc.original_name,
        mc.content_type,
        mc.file_size,
        mc.categories,
        mc.status as content_status,
        mc.created_at as content_created_at,
        mtc.id as text_content_id,
        mtc.text_content,
        mtc.categories as text_categories,
        cta.template_name,
        cta.assignment_type,
        cta.assigned_at
    FROM model_content mc
    LEFT JOIN content_text_assignments cta ON mc.id = cta.content_id AND cta.status = 'active'
    LEFT JOIN model_text_content mtc ON cta.text_content_id = mtc.id
    WHERE mc.model_id = p_model_id
    AND mc.status = 'active'
    ORDER BY mc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE model_text_content IS 'Stores text templates for models with categorization';
COMMENT ON TABLE content_text_assignments IS 'Links image content to text content with assignment tracking';
COMMENT ON FUNCTION assign_texts_randomly IS 'Randomly assigns text content to image content for a model';
COMMENT ON FUNCTION get_content_with_texts IS 'Retrieves content with their assigned texts for a model'; 