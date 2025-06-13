-- Migration: 004-account-lifecycle-states
-- Purpose: Add account lifecycle state management system
-- Date: 2025-01-28

-- Add lifecycle_state column to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS lifecycle_state VARCHAR(20) DEFAULT 'imported' CHECK (
    lifecycle_state IN ('imported', 'ready', 'warmup', 'active', 'paused', 'cleanup', 'archived')
);

-- Add state transition timestamp tracking
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS state_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS state_changed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS state_notes TEXT;

-- Create account state transitions audit table
CREATE TABLE IF NOT EXISTS account_state_transitions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    from_state VARCHAR(20),
    to_state VARCHAR(20) NOT NULL,
    transition_reason VARCHAR(255),
    validation_passed BOOLEAN DEFAULT true,
    validation_errors JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create state validation rules table
CREATE TABLE IF NOT EXISTS state_validation_rules (
    id SERIAL PRIMARY KEY,
    state VARCHAR(20) NOT NULL UNIQUE,
    requires_proxy BOOLEAN DEFAULT false,
    requires_model_assignment BOOLEAN DEFAULT false,
    requires_warmup_completion BOOLEAN DEFAULT false,
    requires_profile_configuration BOOLEAN DEFAULT false,
    requires_no_active_errors BOOLEAN DEFAULT false,
    custom_validation_rules JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default validation rules for each state
INSERT INTO state_validation_rules (
    state, 
    requires_proxy, 
    requires_model_assignment, 
    requires_warmup_completion, 
    requires_profile_configuration, 
    requires_no_active_errors
) VALUES 
    ('imported', false, false, false, false, false),
    ('ready', true, true, false, true, true),
    ('warmup', true, true, false, true, true),
    ('active', true, true, true, true, true),
    ('paused', false, false, false, false, false),
    ('cleanup', false, false, false, false, true),
    ('archived', false, false, false, false, false)
ON CONFLICT (state) DO NOTHING;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_accounts_lifecycle_state ON accounts(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_accounts_state_changed_at ON accounts(state_changed_at);
CREATE INDEX IF NOT EXISTS idx_account_state_transitions_account_id ON account_state_transitions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_state_transitions_changed_at ON account_state_transitions(changed_at);
CREATE INDEX IF NOT EXISTS idx_account_state_transitions_to_state ON account_state_transitions(to_state);

-- Create function to automatically log state transitions
CREATE OR REPLACE FUNCTION log_account_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if lifecycle_state actually changed
    IF OLD.lifecycle_state IS DISTINCT FROM NEW.lifecycle_state THEN
        INSERT INTO account_state_transitions (
            account_id,
            from_state,
            to_state,
            changed_by,
            changed_at,
            notes
        ) VALUES (
            NEW.id,
            OLD.lifecycle_state,
            NEW.lifecycle_state,
            NEW.state_changed_by,
            NEW.state_changed_at,
            NEW.state_notes
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log state transitions
DROP TRIGGER IF EXISTS trigger_log_account_state_transition ON accounts;
CREATE TRIGGER trigger_log_account_state_transition
    AFTER UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION log_account_state_transition();

-- Update existing accounts to have 'imported' state if they don't have one
UPDATE accounts 
SET lifecycle_state = 'imported', 
    state_changed_at = CURRENT_TIMESTAMP,
    state_changed_by = 'system_migration'
WHERE lifecycle_state IS NULL;

-- Create view for account lifecycle summary
CREATE OR REPLACE VIEW account_lifecycle_summary AS
SELECT 
    lifecycle_state,
    COUNT(*) as account_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM accounts 
WHERE lifecycle_state IS NOT NULL
GROUP BY lifecycle_state
ORDER BY 
    CASE lifecycle_state
        WHEN 'imported' THEN 1
        WHEN 'ready' THEN 2
        WHEN 'warmup' THEN 3
        WHEN 'active' THEN 4
        WHEN 'paused' THEN 5
        WHEN 'cleanup' THEN 6
        WHEN 'archived' THEN 7
        ELSE 8
    END; 