-- Migration: 020-iphone-device-management
-- Purpose: Add iPhone device management system
-- Date: 2025-01-28
-- Features: iPhone registration, container management, account tracking

-- Create iPhone device types enum
CREATE TYPE iphone_model_type AS ENUM ('iphone_8', 'iphone_x');
CREATE TYPE iphone_status_type AS ENUM ('active', 'inactive', 'maintenance', 'offline');

-- Create iPhones table for device registration
CREATE TABLE IF NOT EXISTS iphones (
  id SERIAL PRIMARY KEY,
  
  -- Basic device info
  name VARCHAR(100) NOT NULL UNIQUE,
  model iphone_model_type NOT NULL,
  ip_address INET NOT NULL,
  port INTEGER DEFAULT 46952,
  
  -- Authentication & Connection
  ssh_user VARCHAR(50) DEFAULT 'mobile',
  ssh_password_encrypted TEXT,
  xxtouch_port INTEGER DEFAULT 46952,
  
  -- Device Status
  status iphone_status_type DEFAULT 'inactive',
  last_seen TIMESTAMP,
  last_health_check TIMESTAMP,
  connection_test_success BOOLEAN DEFAULT FALSE,
  
  -- Bot Assignment (one bot per iPhone)
  assigned_bot_id VARCHAR(100),
  bot_assigned_at TIMESTAMP,
  
  -- Device Capabilities
  max_containers INTEGER DEFAULT 30,
  container_creation_enabled BOOLEAN DEFAULT TRUE,
  automation_enabled BOOLEAN DEFAULT TRUE,
  
  -- Configuration
  settings JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for iPhones table
CREATE INDEX IF NOT EXISTS idx_iphones_name ON iphones(name);
CREATE INDEX IF NOT EXISTS idx_iphones_status ON iphones(status);
CREATE INDEX IF NOT EXISTS idx_iphones_ip_address ON iphones(ip_address);
CREATE INDEX IF NOT EXISTS idx_iphones_assigned_bot_id ON iphones(assigned_bot_id);
CREATE INDEX IF NOT EXISTS idx_iphones_model ON iphones(model);

-- Create iPhone containers table (extends existing container system)
CREATE TABLE IF NOT EXISTS iphone_containers (
  id SERIAL PRIMARY KEY,
  
  -- iPhone and container relationship
  iphone_id INTEGER NOT NULL REFERENCES iphones(id) ON DELETE CASCADE,
  container_number INTEGER NOT NULL CHECK (container_number BETWEEN 1 AND 30),
  
  -- Container status
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'in_use', 'maintenance', 'error')),
  
  -- Account assignment
  assigned_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP,
  
  -- Container metadata
  container_uuid VARCHAR(100), -- For Crane container UUID
  instagram_logged_in BOOLEAN DEFAULT FALSE,
  last_used TIMESTAMP,
  
  -- Performance tracking
  warmup_phases_completed INTEGER DEFAULT 0,
  total_actions_performed INTEGER DEFAULT 0,
  last_action_at TIMESTAMP,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  
  -- Error tracking
  error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  last_error_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(iphone_id, container_number),
  UNIQUE(assigned_account_id) -- One account per container
);

-- Create indexes for iPhone containers
CREATE INDEX IF NOT EXISTS idx_iphone_containers_iphone_id ON iphone_containers(iphone_id);
CREATE INDEX IF NOT EXISTS idx_iphone_containers_container_number ON iphone_containers(container_number);
CREATE INDEX IF NOT EXISTS idx_iphone_containers_status ON iphone_containers(status);
CREATE INDEX IF NOT EXISTS idx_iphone_containers_assigned_account_id ON iphone_containers(assigned_account_id);
CREATE INDEX IF NOT EXISTS idx_iphone_containers_assigned_at ON iphone_containers(assigned_at);

-- Create iPhone action logs table for detailed tracking
CREATE TABLE IF NOT EXISTS iphone_action_logs (
  id SERIAL PRIMARY KEY,
  
  -- iPhone and container context
  iphone_id INTEGER NOT NULL REFERENCES iphones(id) ON DELETE CASCADE,
  container_id INTEGER REFERENCES iphone_containers(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Action details
  action_type VARCHAR(50) NOT NULL,
  action_description TEXT,
  bot_id VARCHAR(100),
  
  -- Execution details
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  success BOOLEAN,
  
  -- Results and errors
  result_data JSONB,
  error_message TEXT,
  error_details JSONB,
  
  -- Performance metrics
  response_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for iPhone action logs
CREATE INDEX IF NOT EXISTS idx_iphone_action_logs_iphone_id ON iphone_action_logs(iphone_id);
CREATE INDEX IF NOT EXISTS idx_iphone_action_logs_container_id ON iphone_action_logs(container_id);
CREATE INDEX IF NOT EXISTS idx_iphone_action_logs_account_id ON iphone_action_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_iphone_action_logs_action_type ON iphone_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_iphone_action_logs_success ON iphone_action_logs(success);
CREATE INDEX IF NOT EXISTS idx_iphone_action_logs_started_at ON iphone_action_logs(started_at);

-- Add iPhone reference to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS iphone_id INTEGER REFERENCES iphones(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS iphone_container_id INTEGER REFERENCES iphone_containers(id) ON DELETE SET NULL;

-- Create indexes for new account fields
CREATE INDEX IF NOT EXISTS idx_accounts_iphone_id ON accounts(iphone_id);
CREATE INDEX IF NOT EXISTS idx_accounts_iphone_container_id ON accounts(iphone_container_id);

-- Functions for iPhone container management

-- Function to assign account to iPhone container
CREATE OR REPLACE FUNCTION assign_account_to_iphone_container(
  account_id_param INTEGER,
  iphone_id_param INTEGER DEFAULT NULL,
  container_number_param INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  container_id INTEGER;
  iphone_record RECORD;
BEGIN
  -- If specific iPhone not provided, find best available iPhone
  IF iphone_id_param IS NULL THEN
    SELECT id, name INTO iphone_record
    FROM iphones 
    WHERE status = 'active' 
      AND automation_enabled = TRUE
      AND assigned_bot_id IS NOT NULL
    ORDER BY 
      (SELECT COUNT(*) FROM iphone_containers ic WHERE ic.iphone_id = iphones.id AND ic.status = 'assigned') ASC,
      last_seen DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No active iPhone available for container assignment';
    END IF;
    
    iphone_id_param := iphone_record.id;
  END IF;

  -- Find available container on the iPhone
  SELECT id INTO container_id
  FROM iphone_containers
  WHERE iphone_id = iphone_id_param
    AND status = 'available'
    AND (container_number_param IS NULL OR container_number = container_number_param)
  ORDER BY container_number ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No available container found on iPhone %', iphone_id_param;
  END IF;

  -- Assign container to account
  UPDATE iphone_containers 
  SET 
    assigned_account_id = account_id_param,
    assigned_at = CURRENT_TIMESTAMP,
    status = 'assigned',
    updated_at = CURRENT_TIMESTAMP
  WHERE id = container_id;

  -- Update account with iPhone and container references
  UPDATE accounts 
  SET 
    iphone_id = iphone_id_param,
    iphone_container_id = container_id,
    container_number = (SELECT container_number FROM iphone_containers WHERE id = container_id),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = account_id_param;

  RETURN container_id;
END;
$$ LANGUAGE plpgsql;

-- Function to release account from iPhone container
CREATE OR REPLACE FUNCTION release_account_from_iphone_container(account_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  container_id INTEGER;
BEGIN
  -- Get container ID from account
  SELECT iphone_container_id INTO container_id
  FROM accounts
  WHERE id = account_id_param;

  IF container_id IS NULL THEN
    RETURN FALSE; -- Account not assigned to any container
  END IF;

  -- Release container
  UPDATE iphone_containers 
  SET 
    assigned_account_id = NULL,
    assigned_at = NULL,
    status = 'available',
    instagram_logged_in = FALSE,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = container_id;

  -- Clear account references
  UPDATE accounts 
  SET 
    iphone_id = NULL,
    iphone_container_id = NULL,
    container_number = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = account_id_param;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check iPhone health and update status
CREATE OR REPLACE FUNCTION check_iphone_health(iphone_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_status iphone_status_type;
BEGIN
  -- This would typically make an HTTP request to the iPhone
  -- For now, we'll update the last_health_check timestamp
  
  UPDATE iphones 
  SET 
    last_health_check = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = iphone_id_param;

  SELECT status INTO current_status
  FROM iphones
  WHERE id = iphone_id_param;

  RETURN current_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to get iPhone container statistics
CREATE OR REPLACE FUNCTION get_iphone_container_stats(iphone_id_param INTEGER)
RETURNS TABLE(
  total_containers INTEGER,
  available_containers INTEGER,
  assigned_containers INTEGER,
  in_use_containers INTEGER,
  maintenance_containers INTEGER,
  error_containers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_containers,
    COUNT(CASE WHEN status = 'available' THEN 1 END)::INTEGER as available_containers,
    COUNT(CASE WHEN status = 'assigned' THEN 1 END)::INTEGER as assigned_containers,
    COUNT(CASE WHEN status = 'in_use' THEN 1 END)::INTEGER as in_use_containers,
    COUNT(CASE WHEN status = 'maintenance' THEN 1 END)::INTEGER as maintenance_containers,
    COUNT(CASE WHEN status = 'error' THEN 1 END)::INTEGER as error_containers
  FROM iphone_containers
  WHERE iphone_id = iphone_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create view for iPhone management dashboard
CREATE OR REPLACE VIEW iphone_management_dashboard AS
SELECT 
  i.id,
  i.name,
  i.model,
  i.ip_address,
  i.port,
  i.status,
  i.last_seen,
  i.assigned_bot_id,
  i.max_containers,
  
  -- Container statistics
  COALESCE(stats.total_containers, 0) as total_containers,
  COALESCE(stats.available_containers, 0) as available_containers,
  COALESCE(stats.assigned_containers, 0) as assigned_containers,
  COALESCE(stats.in_use_containers, 0) as in_use_containers,
  
  -- Performance metrics
  COALESCE(ic_stats.avg_success_rate, 100.0) as avg_success_rate,
  COALESCE(ic_stats.total_actions, 0) as total_actions_performed,
  COALESCE(ic_stats.total_errors, 0) as total_error_count,
  
  -- Health indicators
  CASE 
    WHEN i.last_seen > CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN 'online'
    WHEN i.last_seen > CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 'idle'
    ELSE 'offline'
  END as connection_status,
  
  i.created_at,
  i.updated_at

FROM iphones i
LEFT JOIN LATERAL (
  SELECT * FROM get_iphone_container_stats(i.id)
) stats ON true
LEFT JOIN (
  SELECT 
    iphone_id,
    AVG(success_rate) as avg_success_rate,
    SUM(total_actions_performed) as total_actions,
    SUM(error_count) as total_errors
  FROM iphone_containers
  GROUP BY iphone_id
) ic_stats ON ic_stats.iphone_id = i.id
ORDER BY i.name;

-- Trigger to update iPhone last_seen when action is logged
CREATE OR REPLACE FUNCTION trigger_update_iphone_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE iphones 
  SET last_seen = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.iphone_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_iphone_last_seen
  AFTER INSERT ON iphone_action_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_iphone_last_seen();

-- Insert default encryption functions for iPhone passwords
CREATE OR REPLACE FUNCTION encrypt_iphone_ssh_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Simple base64 encoding for now (should use proper encryption in production)
    RETURN encode(plain_password::bytea, 'base64');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_iphone_ssh_password(encrypted_password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Simple base64 decoding for now (should use proper decryption in production)
    RETURN convert_from(decode(encrypted_password, 'base64'), 'UTF8');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE iphones IS 'Registered iPhone devices for Instagram automation';
COMMENT ON TABLE iphone_containers IS 'Container assignments and tracking for each iPhone';
COMMENT ON TABLE iphone_action_logs IS 'Detailed logs of all actions performed on iPhones';
COMMENT ON FUNCTION assign_account_to_iphone_container IS 'Assigns an account to an available container on an iPhone';
COMMENT ON FUNCTION release_account_from_iphone_container IS 'Releases an account from its assigned iPhone container';
COMMENT ON VIEW iphone_management_dashboard IS 'Dashboard view for iPhone management with statistics'; 