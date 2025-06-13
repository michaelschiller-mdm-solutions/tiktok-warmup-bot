-- Create model_text_content table
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

-- Create content_text_assignments table
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
    UNIQUE(content_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_model_text_content_model_id ON model_text_content(model_id);
CREATE INDEX IF NOT EXISTS idx_content_text_assignments_model_id ON content_text_assignments(model_id);
CREATE INDEX IF NOT EXISTS idx_content_text_assignments_content_id ON content_text_assignments(content_id);

-- Drop existing function
DROP FUNCTION IF EXISTS get_content_with_texts(INTEGER);

-- Create updated function with image_url
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
    image_url TEXT,
    text_content_id INTEGER,
    text_content TEXT,
    text_categories JSONB,
    text_template_name VARCHAR(255),
    text_status VARCHAR(20),
    text_created_at TIMESTAMP,
    assignment_created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id::INTEGER as content_id,
        mc.filename,
        mc.original_name,
        mc.content_type,
        mc.file_size,
        mc.categories,
        mc.status as content_status,
        mc.created_at as content_created_at,
        ('/uploads/content/' || mc.filename) as image_url,
        mtc.id::INTEGER as text_content_id,
        mtc.text_content,
        mtc.categories as text_categories,
        mtc.template_name as text_template_name,
        mtc.status as text_status,
        mtc.created_at as text_created_at,
        cta.assigned_at as assignment_created_at
    FROM model_content mc
    LEFT JOIN content_text_assignments cta ON mc.id = cta.content_id
    LEFT JOIN model_text_content mtc ON cta.text_content_id = mtc.id
    WHERE mc.model_id = p_model_id
    ORDER BY mc.created_at DESC, cta.assigned_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create the missing assign_texts_randomly function
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
    -- Clear existing assignments if template_name is provided
    IF p_template_name IS NOT NULL THEN
        DELETE FROM content_text_assignments 
        WHERE model_id = p_model_id 
        AND template_name = p_template_name;
    END IF;

    -- Get available text content IDs for this model
    SELECT ARRAY_AGG(id) INTO available_texts
    FROM model_text_content 
    WHERE model_id = p_model_id 
    AND status = 'active'
    AND (
        p_category_filter IS NULL 
        OR categories ?| (SELECT ARRAY_AGG(value::text) FROM jsonb_array_elements_text(p_category_filter))
    );

    -- If no texts available, return 0
    IF available_texts IS NULL OR array_length(available_texts, 1) = 0 THEN
        RETURN 0;
    END IF;

    -- Loop through content that needs text assignment
    FOR content_record IN 
        SELECT mc.id as content_id
        FROM model_content mc
        LEFT JOIN content_text_assignments cta ON mc.id = cta.content_id 
            AND (p_template_name IS NULL OR cta.template_name = p_template_name)
        WHERE mc.model_id = p_model_id 
        AND mc.status = 'active'
        AND cta.id IS NULL  -- Only assign to content without existing assignments
        AND (
            p_category_filter IS NULL 
            OR mc.categories ?| (SELECT ARRAY_AGG(value::text) FROM jsonb_array_elements_text(p_category_filter))
        )
    LOOP
        -- Select a random text from available texts
        random_index := floor(random() * array_length(available_texts, 1)) + 1;
        selected_text_id := available_texts[random_index];

        -- Insert the assignment
        INSERT INTO content_text_assignments (
            model_id,
            content_id,
            text_content_id,
            assignment_type,
            template_name,
            assigned_at,
            assigned_by,
            status
        ) VALUES (
            p_model_id,
            content_record.content_id,
            selected_text_id,
            'random',
            p_template_name,
            CURRENT_TIMESTAMP,
            'system',
            'active'
        );

        assignment_count := assignment_count + 1;
    END LOOP;

    RETURN assignment_count;
END;
$$ LANGUAGE plpgsql; 