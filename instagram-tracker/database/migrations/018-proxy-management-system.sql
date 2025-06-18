-- Migration: 018-proxy-management-system
-- Purpose: Implement comprehensive proxy management system with providers, individual proxies, and assignment tracking
-- Author: AI Agent
-- Date: 2025-01-27

-- Extend existing proxy_providers table with missing columns
-- (Table was created in 004-cost-tracking-system.sql)
DO $$ 
BEGIN
    -- Add contact_email if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proxy_providers' AND column_name = 'contact_email') THEN
        ALTER TABLE proxy_providers ADD COLUMN contact_email VARCHAR(255);
    END IF;
    
    -- Add service_type if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proxy_providers' AND column_name = 'service_type') THEN
        ALTER TABLE proxy_providers ADD COLUMN service_type VARCHAR(50) CHECK (service_type IN ('residential', 'datacenter', 'mobile'));
    END IF;
    
    -- Add status if not exists (rename is_active to status if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proxy_providers' AND column_name = 'status') THEN
        ALTER TABLE proxy_providers ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
        -- Copy data from is_active to status
        UPDATE proxy_providers SET status = CASE WHEN is_active = true THEN 'active' ELSE 'inactive' END;
    END IF;
END $$;

-- Create individual proxies table
CREATE TABLE IF NOT EXISTS proxies (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES proxy_providers(id) ON DELETE SET NULL,
    ip VARCHAR(45) NOT NULL,
    port INTEGER NOT NULL CHECK (port > 0 AND port <= 65535),
    username VARCHAR(255) NOT NULL,
    password_encrypted TEXT NOT NULL,
    location VARCHAR(100), -- 'US-California', 'UK-London', etc.
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
    
    -- Assignment tracking
    assigned_model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
    account_count INTEGER DEFAULT 0 CHECK (account_count >= 0),
    max_accounts INTEGER DEFAULT 3 CHECK (max_accounts > 0),
    
    -- Health monitoring
    last_tested_at TIMESTAMP,
    last_success_at TIMESTAMP,
    last_error_message TEXT,
    response_time_ms INTEGER CHECK (response_time_ms >= 0),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(ip, port),
    CHECK (account_count <= max_accounts)
);

-- Create proxy assignment history for audit trail
CREATE TABLE IF NOT EXISTS proxy_assignment_history (
    id SERIAL PRIMARY KEY,
    proxy_id INTEGER REFERENCES proxies(id) ON DELETE SET NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('assigned', 'released', 'reassigned', 'failed')),
    reason VARCHAR(100), -- 'automatic', 'manual', 'cleanup', 'account_invalid', 'model_deleted'
    assigned_by VARCHAR(50), -- user or 'system'
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add proxy_id to accounts table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounts' AND column_name = 'proxy_id') THEN
        ALTER TABLE accounts ADD COLUMN proxy_id INTEGER REFERENCES proxies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add proxy assigned timestamp to accounts table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'accounts' AND column_name = 'proxy_assigned_at') THEN
        ALTER TABLE accounts ADD COLUMN proxy_assigned_at TIMESTAMP;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_proxies_provider_id ON proxies(provider_id);
CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
CREATE INDEX IF NOT EXISTS idx_proxies_assigned_model ON proxies(assigned_model_id);
CREATE INDEX IF NOT EXISTS idx_proxies_account_count ON proxies(account_count);
CREATE INDEX IF NOT EXISTS idx_proxies_location ON proxies(location);
CREATE INDEX IF NOT EXISTS idx_proxy_assignment_history_proxy_id ON proxy_assignment_history(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_assignment_history_account_id ON proxy_assignment_history(account_id);
CREATE INDEX IF NOT EXISTS idx_proxy_assignment_history_model_id ON proxy_assignment_history(model_id);
CREATE INDEX IF NOT EXISTS idx_proxy_assignment_history_created_at ON proxy_assignment_history(created_at);
CREATE INDEX IF NOT EXISTS idx_accounts_proxy_id ON accounts(proxy_id);

-- Create function to update proxy account count automatically
CREATE OR REPLACE FUNCTION update_proxy_account_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account count for old proxy (if exists)
    IF OLD.proxy_id IS NOT NULL THEN
        UPDATE proxies 
        SET account_count = (
            SELECT COUNT(*) 
            FROM accounts 
            WHERE proxy_id = OLD.proxy_id AND proxy_id IS NOT NULL
        )
        WHERE id = OLD.proxy_id;
    END IF;
    
    -- Update account count for new proxy (if exists)
    IF NEW.proxy_id IS NOT NULL THEN
        UPDATE proxies 
        SET account_count = (
            SELECT COUNT(*) 
            FROM accounts 
            WHERE proxy_id = NEW.proxy_id AND proxy_id IS NOT NULL
        )
        WHERE id = NEW.proxy_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update proxy account counts
DROP TRIGGER IF EXISTS trigger_update_proxy_account_count ON accounts;
CREATE TRIGGER trigger_update_proxy_account_count
    AFTER INSERT OR UPDATE OF proxy_id OR DELETE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_proxy_account_count();

-- Create function to get available proxies for assignment
CREATE OR REPLACE FUNCTION get_available_proxies(
    target_model_id INTEGER DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    proxy_id INTEGER,
    ip VARCHAR(45),
    port INTEGER,
    location VARCHAR(100),
    account_count INTEGER,
    max_accounts INTEGER,
    provider_name VARCHAR(255),
    available_slots INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as proxy_id,
        p.ip,
        p.port,
        p.location,
        p.account_count,
        p.max_accounts,
        pp.name as provider_name,
        (p.max_accounts - p.account_count) as available_slots
    FROM proxies p
    LEFT JOIN proxy_providers pp ON p.provider_id = pp.id
    WHERE p.status = 'active'
      AND p.account_count < p.max_accounts
      AND (target_model_id IS NULL OR p.assigned_model_id IS NULL OR p.assigned_model_id = target_model_id)
    ORDER BY 
        (p.max_accounts - p.account_count) DESC,  -- Prioritize proxies with more available slots
        p.last_success_at DESC NULLS LAST,       -- Prioritize recently successful proxies
        p.created_at ASC                         -- FIFO for proxies with same availability
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to assign proxy to account with constraints checking
CREATE OR REPLACE FUNCTION assign_proxy_to_account(
    account_id_param INTEGER,
    proxy_id_param INTEGER DEFAULT NULL,
    assigned_by_param VARCHAR(50) DEFAULT 'system'
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    proxy_id INTEGER,
    account_id INTEGER
) AS $$
DECLARE
    target_proxy_id INTEGER;
    account_model_id INTEGER;
    proxy_model_id INTEGER;
    proxy_account_count INTEGER;
    proxy_max_accounts INTEGER;
    proxy_status VARCHAR(20);
BEGIN
    -- Get account model
    SELECT model_id INTO account_model_id FROM accounts WHERE id = account_id_param;
    
    IF account_model_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Account not found or has no model assigned', NULL::INTEGER, account_id_param;
        RETURN;
    END IF;
    
    -- If proxy_id not specified, find available proxy
    IF proxy_id_param IS NULL THEN
        SELECT p.proxy_id INTO target_proxy_id 
        FROM get_available_proxies(account_model_id, 1) p
        LIMIT 1;
        
        IF target_proxy_id IS NULL THEN
            RETURN QUERY SELECT FALSE, 'No available proxies found for this model', NULL::INTEGER, account_id_param;
            RETURN;
        END IF;
    ELSE
        target_proxy_id := proxy_id_param;
    END IF;
    
    -- Check proxy constraints
    SELECT assigned_model_id, account_count, max_accounts, status 
    INTO proxy_model_id, proxy_account_count, proxy_max_accounts, proxy_status
    FROM proxies WHERE id = target_proxy_id;
    
    IF proxy_status != 'active' THEN
        RETURN QUERY SELECT FALSE, 'Proxy is not active', target_proxy_id, account_id_param;
        RETURN;
    END IF;
    
    IF proxy_account_count >= proxy_max_accounts THEN
        RETURN QUERY SELECT FALSE, 'Proxy has reached maximum account capacity', target_proxy_id, account_id_param;
        RETURN;
    END IF;
    
    IF proxy_model_id IS NOT NULL AND proxy_model_id != account_model_id THEN
        RETURN QUERY SELECT FALSE, 'Proxy is assigned to a different model', target_proxy_id, account_id_param;
        RETURN;
    END IF;
    
    -- Perform assignment
    UPDATE accounts 
    SET proxy_id = target_proxy_id, 
        proxy_assigned_at = CURRENT_TIMESTAMP 
    WHERE id = account_id_param;
    
    -- Update proxy model assignment if not set
    IF proxy_model_id IS NULL THEN
        UPDATE proxies 
        SET assigned_model_id = account_model_id 
        WHERE id = target_proxy_id;
    END IF;
    
    -- Log assignment history
    INSERT INTO proxy_assignment_history (proxy_id, account_id, model_id, action, reason, assigned_by)
    VALUES (target_proxy_id, account_id_param, account_model_id, 'assigned', 'automatic', assigned_by_param);
    
    RETURN QUERY SELECT TRUE, 'Proxy assigned successfully', target_proxy_id, account_id_param;
END;
$$ LANGUAGE plpgsql;

-- Insert sample proxy providers
INSERT INTO proxy_providers (name, monthly_cost_per_proxy, service_type, status) VALUES
    ('ProxyMesh', 15.00, 'residential', 'active'),
    ('SmartProxy', 12.50, 'datacenter', 'active'),
    ('BrightData', 20.00, 'residential', 'active'),
    ('ProxyRack', 8.00, 'datacenter', 'active')
ON CONFLICT (name) DO NOTHING;

-- Insert sample proxies for testing
DO $$
DECLARE
    provider_id INTEGER;
BEGIN
    -- Get ProxyMesh provider ID
    SELECT id INTO provider_id FROM proxy_providers WHERE name = 'ProxyMesh' LIMIT 1;
    
    IF provider_id IS NOT NULL THEN
        INSERT INTO proxies (provider_id, ip, port, username, password_encrypted, location, status) VALUES
            (provider_id, '192.168.1.100', 8080, 'user1', 'encrypted_pass_1', 'US-California', 'active'),
            (provider_id, '192.168.1.101', 8080, 'user2', 'encrypted_pass_2', 'US-New York', 'active'),
            (provider_id, '192.168.1.102', 8080, 'user3', 'encrypted_pass_3', 'UK-London', 'active')
        ON CONFLICT (ip, port) DO NOTHING;
    END IF;
    
    -- Get SmartProxy provider ID
    SELECT id INTO provider_id FROM proxy_providers WHERE name = 'SmartProxy' LIMIT 1;
    
    IF provider_id IS NOT NULL THEN
        INSERT INTO proxies (provider_id, ip, port, username, password_encrypted, location, status) VALUES
            (provider_id, '10.0.1.100', 3128, 'smart1', 'encrypted_smart_1', 'US-Texas', 'active'),
            (provider_id, '10.0.1.101', 3128, 'smart2', 'encrypted_smart_2', 'US-Florida', 'active')
        ON CONFLICT (ip, port) DO NOTHING;
    END IF;
END $$; 