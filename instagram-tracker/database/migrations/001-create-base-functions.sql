-- Migration 001: Create Base Functions
-- Purpose: Create utility functions that other migrations depend on

-- Create update_updated_at_column function for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION update_updated_at_column IS 'Updates the updated_at column to current timestamp - used by triggers'; 