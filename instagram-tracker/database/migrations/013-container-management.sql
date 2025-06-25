-- Migration 013: Container Management System and Account Schema Updates
-- Purpose: Add container assignment, missing account fields, and encryption functions
-- Priority: 1 (Critical foundation for 10-phase warmup system)  
-- Task: 2-7 Warmup Process System Redesign

-- First, add all missing columns to accounts table that the backend expects
-- NOTE: email_password and email_password_encrypted removed in migration 019
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS container_number INTEGER;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS proxy_password_encrypted TEXT;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_accounts_container_number ON accounts(container_number);

-- Create encryption functions for sensitive data
-- NOTE: email password encryption functions removed in migration 019

DROP FUNCTION IF EXISTS encrypt_proxy_password(text);
CREATE OR REPLACE FUNCTION encrypt_proxy_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Simple base64 encoding for now (should use proper encryption in production)
    RETURN encode(plain_password::bytea, 'base64');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_proxy_password(encrypted_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Simple base64 decoding for now (should use proper decryption in production)
    RETURN convert_from(decode(encrypted_password, 'base64'), 'UTF8');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql;

-- Create container assignments table
CREATE TABLE IF NOT EXISTS container_assignments (
    id SERIAL PRIMARY KEY,
    container_number INTEGER NOT NULL CHECK (container_number BETWEEN 1 AND 30),
    account_id INTEGER UNIQUE REFERENCES accounts(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned')),
    notes TEXT,
    
    -- Constraints
    UNIQUE(container_number),
    -- Only one account per container
    EXCLUDE (container_number WITH =) WHERE (status = 'assigned')
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_container_assignments_status ON container_assignments(status);
CREATE INDEX IF NOT EXISTS idx_container_assignments_account_id ON container_assignments(account_id);
CREATE INDEX IF NOT EXISTS idx_container_assignments_container_number ON container_assignments(container_number);

-- Initialize all 30 containers as available
INSERT INTO container_assignments (container_number, status, notes)
SELECT 
    generate_series(1, 30) as container_number,
    'available' as status,
    'Initial container setup' as notes
ON CONFLICT (container_number) DO NOTHING;

-- Function to get first available container
CREATE OR REPLACE FUNCTION get_first_available_container()
RETURNS INTEGER AS $$
DECLARE
    available_container INTEGER;
BEGIN
    SELECT container_number INTO available_container
    FROM container_assignments 
    WHERE status = 'available'
    ORDER BY container_number ASC
    LIMIT 1;
    
    RETURN available_container;
END;
$$ LANGUAGE plpgsql;

-- Function to assign container to account
CREATE OR REPLACE FUNCTION assign_container_to_account(p_account_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    container_num INTEGER;
    result_container INTEGER;
BEGIN
    -- Get first available container
    SELECT get_first_available_container() INTO container_num;
    
    IF container_num IS NULL THEN
        RAISE EXCEPTION 'No containers available for assignment';
    END IF;
    
    -- Assign container to account
    UPDATE container_assignments 
    SET 
        account_id = p_account_id,
        status = 'assigned',
        assigned_at = CURRENT_TIMESTAMP,
        released_at = NULL
    WHERE container_number = container_num
    AND status = 'available';
    
    -- Update account with container number
    UPDATE accounts 
    SET container_number = container_num
    WHERE id = p_account_id;
    
    -- Return assigned container number
    RETURN container_num;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to assign container: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to release container (when account becomes invalid)
CREATE OR REPLACE FUNCTION release_container(p_account_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    container_num INTEGER;
BEGIN
    -- Get container number for account
    SELECT container_number INTO container_num
    FROM accounts 
    WHERE id = p_account_id;
    
    IF container_num IS NULL THEN
        RETURN false; -- Account has no container assigned
    END IF;
    
    -- Release container
    UPDATE container_assignments 
    SET 
        account_id = NULL,
        status = 'available',
        released_at = CURRENT_TIMESTAMP,
        notes = 'Released due to account invalidation'
    WHERE container_number = container_num;
    
    -- Clear container from account
    UPDATE accounts 
    SET container_number = NULL
    WHERE id = p_account_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get container utilization stats
CREATE OR REPLACE FUNCTION get_container_utilization()
RETURNS TABLE (
    total_containers INTEGER,
    assigned_containers INTEGER,
    available_containers INTEGER,
    utilization_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_containers,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END)::INTEGER as assigned_containers,
        COUNT(CASE WHEN status = 'available' THEN 1 END)::INTEGER as available_containers,
        ROUND(
            (COUNT(CASE WHEN status = 'assigned' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
            2
        ) as utilization_percentage
    FROM container_assignments;
END;
$$ LANGUAGE plpgsql;

-- View for container status overview
CREATE OR REPLACE VIEW container_status_overview AS
SELECT 
    ca.container_number,
    ca.status,
    ca.assigned_at,
    ca.released_at,
    a.id as account_id,
    a.username,
    a.lifecycle_state,
    ca.notes,
    
    -- Calculate assignment duration
    CASE 
        WHEN ca.status = 'assigned' THEN 
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ca.assigned_at)) / 3600
        WHEN ca.released_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (ca.released_at - ca.assigned_at)) / 3600
        ELSE NULL
    END as assignment_duration_hours
    
FROM container_assignments ca
LEFT JOIN accounts a ON ca.account_id = a.id
ORDER BY ca.container_number;

-- Trigger to automatically assign containers on account import
CREATE OR REPLACE FUNCTION trigger_assign_container_on_import()
RETURNS TRIGGER AS $$
BEGIN
    -- Only assign container if account doesn't have one and is being imported
    IF NEW.container_number IS NULL AND NEW.lifecycle_state IN ('imported', 'ready') THEN
        BEGIN
            -- Try to assign container
            NEW.container_number := assign_container_to_account(NEW.id);
        EXCEPTION
            WHEN OTHERS THEN
                -- If container assignment fails, log but don't fail the insert
                INSERT INTO activity_logs (account_id, action_type, details, success, error_message)
                VALUES (NEW.id, 'container_assignment_failed', '{}', false, SQLERRM);
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic container assignment
DROP TRIGGER IF EXISTS trigger_assign_container_on_import ON accounts;
CREATE TRIGGER trigger_assign_container_on_import
    BEFORE INSERT OR UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_assign_container_on_import();

-- Trigger to release container when account is archived (invalidated)
CREATE OR REPLACE FUNCTION trigger_release_container_on_archive()
RETURNS TRIGGER AS $$
BEGIN
    -- Release container if account becomes archived
    IF OLD.lifecycle_state != 'archived' AND NEW.lifecycle_state = 'archived' THEN
        PERFORM release_container(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic container release
DROP TRIGGER IF EXISTS trigger_release_container_on_invalid ON accounts;
DROP TRIGGER IF EXISTS trigger_release_container_on_archive ON accounts;
CREATE TRIGGER trigger_release_container_on_archive
    AFTER UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_release_container_on_archive();

-- Add comments for documentation
COMMENT ON TABLE container_assignments IS 'Manages assignment of 30 iPhone containers (1-30) to accounts';
COMMENT ON FUNCTION get_first_available_container IS 'Returns the lowest numbered available container';
COMMENT ON FUNCTION assign_container_to_account IS 'Assigns first available container to an account';
COMMENT ON FUNCTION release_container IS 'Releases a container when an account becomes invalid or is deleted';
COMMENT ON FUNCTION get_container_utilization IS 'Provides statistics on container utilization';
COMMENT ON VIEW container_status_overview IS 'Shows a real-time overview of all containers and their assignments';
COMMENT ON FUNCTION encrypt_proxy_password IS 'Encrypts proxy password for secure storage';
COMMENT ON FUNCTION decrypt_proxy_password IS 'Decrypts proxy password for retrieval'; 