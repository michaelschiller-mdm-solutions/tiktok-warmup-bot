-- Migration: 004-add-model-content-table
-- Purpose: Add table for storing uploaded content files for models

-- Create model_content table
CREATE TABLE IF NOT EXISTS model_content (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('image', 'video', 'text')),
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_content_model_id ON model_content(model_id);
CREATE INDEX IF NOT EXISTS idx_model_content_content_type ON model_content(content_type);
CREATE INDEX IF NOT EXISTS idx_model_content_status ON model_content(status);
CREATE INDEX IF NOT EXISTS idx_model_content_categories ON model_content USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_model_content_created_at ON model_content(created_at);

-- Create activity_logs table if it doesn't exist (for logging content uploads)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_model_id ON activity_logs(model_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_account_id ON activity_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to model_content table
DROP TRIGGER IF EXISTS update_model_content_updated_at ON model_content;
CREATE TRIGGER update_model_content_updated_at
    BEFORE UPDATE ON model_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some sample content categories as reference
COMMENT ON COLUMN model_content.categories IS 'JSON array of content categories: ["pfp", "bio", "post", "highlight", "story", "any"]';
COMMENT ON COLUMN model_content.metadata IS 'Additional metadata like dimensions, duration, etc.';
COMMENT ON TABLE model_content IS 'Stores uploaded content files for models with categorization for warmup phases'; 