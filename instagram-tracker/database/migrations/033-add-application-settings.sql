-- Migration: 033-add-application-settings
-- Purpose: Add a table for global application settings, including Gemini AI configuration
-- Date: 2025-02-01

CREATE TABLE IF NOT EXISTS application_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_application_settings_key ON application_settings(key);

COMMENT ON TABLE application_settings IS 'Stores global key-value settings for the application.';
COMMENT ON COLUMN application_settings.key IS 'The unique key for the setting (e.g., gemini_api_key).';
COMMENT ON COLUMN application_settings.value IS 'The value of the setting, stored in JSONB for flexibility.';

-- Insert default Gemini settings
INSERT INTO application_settings (key, value)
VALUES
    ('gemini_api_key', '""'::jsonb),
    ('gemini_model_name', '"gemini-1.5-flash"'::jsonb)
ON CONFLICT (key) DO NOTHING; 