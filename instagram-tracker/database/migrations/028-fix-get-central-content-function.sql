-- Migration: 028-fix-get-central-content-function
-- Purpose: Fix the get_central_content_with_texts function to use correct column names

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_central_content_with_texts(integer, integer, text);
DROP FUNCTION IF EXISTS get_central_content_with_texts();

-- Fix the get_central_content_with_texts function with correct column references
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
    uploaded_by VARCHAR(100),
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
        cc.mime_type as file_type, -- Use mime_type instead of file_type
        cc.categories,
        cc.tags,
        NULL::DECIMAL(3,2) as quality_score, -- Default null since column doesn't exist
        0::INTEGER as usage_count, -- Default 0 since column doesn't exist
        NULL::TIMESTAMP as last_used, -- Default null since column doesn't exist
        cc.status,
        cc.uploaded_by, -- This exists in the table
        cc.created_at as upload_date, -- Use created_at instead of upload_date
        ctc.id as text_content_id,
        ctc.text_content as text_content, -- Correct column name
        ctc.categories as text_categories,
        ctc.tags as text_tags,
        ctc.status as text_status
    FROM central_content cc
    LEFT JOIN central_text_content ctc ON ctc.id IS NOT NULL
    WHERE (p_search IS NULL OR 
           cc.filename ILIKE '%' || p_search || '%' OR
           ctc.text_content ILIKE '%' || p_search || '%')
      AND cc.status = 'active'
    ORDER BY cc.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Fix the simplified version too
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
    uploaded_by VARCHAR(100),
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