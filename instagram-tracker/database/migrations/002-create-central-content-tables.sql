-- Migration 002: Create Central Content Tables
-- Purpose: Create the central content tables that other migrations expect
-- This creates a global content repository that can be referenced by multiple models

-- Create central_text_content table
CREATE TABLE IF NOT EXISTS central_text_content (
    id SERIAL PRIMARY KEY,
    text_content TEXT NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    template_name VARCHAR(255),
    language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_by VARCHAR(100) DEFAULT 'system',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create central_content table for images
CREATE TABLE IF NOT EXISTS central_content (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    original_name VARCHAR(255),
    file_path TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    categories JSONB NOT NULL DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    uploaded_by VARCHAR(100) DEFAULT 'system',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_central_text_content_status ON central_text_content(status);
CREATE INDEX IF NOT EXISTS idx_central_text_content_categories ON central_text_content USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_central_text_content_tags ON central_text_content USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_central_text_content_template ON central_text_content(template_name);

CREATE INDEX IF NOT EXISTS idx_central_content_status ON central_content(status);
CREATE INDEX IF NOT EXISTS idx_central_content_categories ON central_content USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_central_content_tags ON central_content USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_central_content_type ON central_content(content_type);

-- Add trigger to update updated_at timestamp for central_text_content
DROP TRIGGER IF EXISTS update_central_text_content_updated_at ON central_text_content;
CREATE TRIGGER update_central_text_content_updated_at
    BEFORE UPDATE ON central_text_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to update updated_at timestamp for central_content
DROP TRIGGER IF EXISTS update_central_content_updated_at ON central_content;
CREATE TRIGGER update_central_content_updated_at
    BEFORE UPDATE ON central_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE central_text_content IS 'Global repository for text content that can be shared across models';
COMMENT ON TABLE central_content IS 'Global repository for image/media content that can be shared across models'; 