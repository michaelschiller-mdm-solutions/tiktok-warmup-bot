-- Migration Runner Script
-- This script sets up the infrastructure for tracking migrations.
-- It creates the migration_history table and a helper function to record entries.
-- Version: 3.0
-- Created: 2025-06-17

-- Create migrations tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Function to record migration execution
DROP FUNCTION IF EXISTS record_migration(text,boolean,text);
CREATE OR REPLACE FUNCTION record_migration(p_migration_name TEXT, p_success BOOLEAN DEFAULT true, p_error_msg TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
    INSERT INTO migration_history (migration_name, success, error_message)
    VALUES (p_migration_name, p_success, p_error_msg)
    ON CONFLICT (migration_name) DO UPDATE SET
        executed_at = CURRENT_TIMESTAMP,
        success = EXCLUDED.success,
        error_message = EXCLUDED.error_message;
END;
$$ LANGUAGE plpgsql;

-- The migration runner script (`migrate.ts`) will handle the execution of individual migration files.
-- This file just ensures the tracking tools are present. 