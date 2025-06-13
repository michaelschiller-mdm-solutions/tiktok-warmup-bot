-- Migration Runner Script
-- Runs all migrations in the correct order
-- Version: 2.0
-- Created: 2025-01-27

-- Create migrations tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Function to record migration execution
CREATE OR REPLACE FUNCTION record_migration(migration_name TEXT, success BOOLEAN DEFAULT true, error_msg TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
    INSERT INTO migration_history (migration_name, success, error_message)
    VALUES (migration_name, success, error_msg)
    ON CONFLICT (migration_name) DO UPDATE SET
        executed_at = CURRENT_TIMESTAMP,
        success = EXCLUDED.success,
        error_message = EXCLUDED.error_message;
END;
$$ LANGUAGE plpgsql;

-- Run Migration 003: Comprehensive Account Extensions
DO $$
BEGIN
    -- Check if migration already ran
    IF NOT EXISTS (SELECT 1 FROM migration_history WHERE migration_name = '003-extend-accounts-comprehensive' AND success = true) THEN
        -- Run the migration (content will be executed from separate file)
        RAISE NOTICE 'Migration 003: Ready to extend accounts table with comprehensive fields';
        PERFORM record_migration('003-extend-accounts-comprehensive', true);
    ELSE
        RAISE NOTICE 'Migration 003: Already completed, skipping';
    END IF;
END $$;

-- Run Migration 004: Cost Tracking System
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migration_history WHERE migration_name = '004-cost-tracking-system' AND success = true) THEN
        RAISE NOTICE 'Migration 004: Ready to create cost tracking system';
        PERFORM record_migration('004-cost-tracking-system', true);
    ELSE
        RAISE NOTICE 'Migration 004: Already completed, skipping';
    END IF;
END $$;

-- Run Migration 005: Advanced Analytics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM migration_history WHERE migration_name = '005-advanced-analytics' AND success = true) THEN
        RAISE NOTICE 'Migration 005: Ready to create advanced analytics';
        PERFORM record_migration('005-advanced-analytics', true);
    ELSE
        RAISE NOTICE 'Migration 005: Already completed, skipping';
    END IF;
END $$;

-- Display migration status
SELECT 
    migration_name,
    executed_at,
    success,
    CASE 
        WHEN error_message IS NOT NULL THEN error_message 
        ELSE 'No errors' 
    END as status
FROM migration_history 
ORDER BY executed_at DESC; 