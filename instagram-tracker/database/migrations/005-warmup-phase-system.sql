-- Migration: 005-warmup-phase-system
-- Purpose: Add detailed warmup phase tracking for bot-driven processes
-- Date: 2025-01-28
-- Task: 2-7 Create Warm-up Process System

-- Create account warmup phases tracking table
CREATE TABLE IF NOT EXISTS account_warmup_phases (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phase VARCHAR(20) NOT NULL CHECK (phase IN ('pfp', 'bio', 'post', 'highlight', 'story')),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending', 'available', 'content_assigned', 'in_progress', 
    'completed', 'failed', 'requires_review'
  )),
  
  -- Timing controls
  available_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  min_interval_hours INTEGER DEFAULT 24, -- Minimum hours between phases
  
  -- Bot tracking
  bot_id VARCHAR(50),
  bot_session_id VARCHAR(100),
  
  -- Content assignment
  assigned_content_id INTEGER,
  assigned_text_id INTEGER,
  content_assigned_at TIMESTAMP,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Performance tracking
  execution_time_ms INTEGER,
  instagram_response JSONB,
  success_rate DECIMAL(5,2),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(account_id, phase)
);

-- Create indexes for efficient bot queries
CREATE INDEX IF NOT EXISTS idx_warmup_phases_account_id ON account_warmup_phases(account_id);
CREATE INDEX IF NOT EXISTS idx_warmup_phases_status ON account_warmup_phases(status);
CREATE INDEX IF NOT EXISTS idx_warmup_phases_available_at ON account_warmup_phases(available_at);
CREATE INDEX IF NOT EXISTS idx_warmup_phases_bot_id ON account_warmup_phases(bot_id);
CREATE INDEX IF NOT EXISTS idx_warmup_phases_phase ON account_warmup_phases(phase);

-- Create composite indexes for bot operations
CREATE INDEX IF NOT EXISTS idx_warmup_phases_status_available ON account_warmup_phases(status, available_at)
  WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_warmup_phases_bot_active ON account_warmup_phases(bot_id, status)
  WHERE status IN ('content_assigned', 'in_progress');

-- Function to initialize warmup phases for an account
CREATE OR REPLACE FUNCTION initialize_warmup_phases(account_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
  phase_name VARCHAR(20);
  phase_order INTEGER;
BEGIN
  -- Define phase order
  FOR phase_order, phase_name IN VALUES 
    (1, 'pfp'), (2, 'bio'), (3, 'post'), (4, 'highlight'), (5, 'story')
  LOOP
    INSERT INTO account_warmup_phases (
      account_id, 
      phase, 
      status,
      available_at,
      min_interval_hours
    ) VALUES (
      account_id_param, 
      phase_name,
      CASE WHEN phase_order = 1 THEN 'available' ELSE 'pending' END,
      CASE WHEN phase_order = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
      24
    )
    ON CONFLICT (account_id, phase) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to make next phase available after completion
CREATE OR REPLACE FUNCTION advance_to_next_phase(completed_account_id INTEGER, completed_phase VARCHAR(20))
RETURNS VOID AS $$
DECLARE
  next_phase VARCHAR(20);
BEGIN
  -- Determine next phase
  SELECT CASE completed_phase
    WHEN 'pfp' THEN 'bio'
    WHEN 'bio' THEN 'post'
    WHEN 'post' THEN 'highlight'
    WHEN 'highlight' THEN 'story'
    ELSE NULL
  END INTO next_phase;
  
  -- Make next phase available if it exists
  IF next_phase IS NOT NULL THEN
    UPDATE account_warmup_phases 
    SET 
      status = 'available',
      available_at = CURRENT_TIMESTAMP + INTERVAL '24 hours',
      updated_at = CURRENT_TIMESTAMP
    WHERE 
      account_id = completed_account_id 
      AND phase = next_phase 
      AND status = 'pending';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically advance phases on completion
CREATE OR REPLACE FUNCTION trigger_advance_warmup_phase()
RETURNS TRIGGER AS $$
BEGIN
  -- If phase was just completed, advance to next phase
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM advance_to_next_phase(NEW.account_id, NEW.phase);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_advance_warmup_phase ON account_warmup_phases;
CREATE TRIGGER trigger_advance_warmup_phase
  AFTER UPDATE ON account_warmup_phases
  FOR EACH ROW
  EXECUTE FUNCTION trigger_advance_warmup_phase();

-- Function to check if account warmup is complete
CREATE OR REPLACE FUNCTION is_warmup_complete(account_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  incomplete_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO incomplete_count
  FROM account_warmup_phases
  WHERE account_id = account_id_param
    AND status != 'completed';
    
  RETURN incomplete_count = 0;
END;
$$ LANGUAGE plpgsql;

-- View for bot-ready accounts
CREATE OR REPLACE VIEW bot_ready_accounts AS
SELECT DISTINCT
  a.id,
  a.username,
  a.model_id,
  a.lifecycle_state,
  m.name as model_name,
  COUNT(awp.id) as total_phases,
  COUNT(CASE WHEN awp.status = 'completed' THEN 1 END) as completed_phases,
  COUNT(CASE WHEN awp.status = 'available' AND awp.available_at <= CURRENT_TIMESTAMP THEN 1 END) as ready_phases
FROM accounts a
JOIN models m ON a.model_id = m.id
LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
WHERE a.lifecycle_state IN ('ready', 'warmup')
  AND a.status = 'active'
  AND a.proxy_host IS NOT NULL
GROUP BY a.id, a.username, a.model_id, a.lifecycle_state, m.name
HAVING COUNT(CASE WHEN awp.status = 'available' AND awp.available_at <= CURRENT_TIMESTAMP THEN 1 END) > 0;

-- Initialize phases for existing accounts in warmup state
INSERT INTO account_warmup_phases (account_id, phase, status, available_at, min_interval_hours)
SELECT 
  a.id,
  phase_data.phase,
  CASE WHEN phase_data.phase_order = 1 THEN 'available' ELSE 'pending' END,
  CASE WHEN phase_data.phase_order = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
  24
FROM accounts a
CROSS JOIN (
  VALUES 
    ('pfp', 1), ('bio', 2), ('post', 3), ('highlight', 4), ('story', 5)
) AS phase_data(phase, phase_order)
WHERE a.lifecycle_state = 'warmup'
  AND NOT EXISTS (
    SELECT 1 FROM account_warmup_phases awp 
    WHERE awp.account_id = a.id AND awp.phase = phase_data.phase
  ); 