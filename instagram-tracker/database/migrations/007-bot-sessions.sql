-- Migration: 007-bot-sessions
-- Purpose: Track bot activity and session management for warmup processes
-- Date: 2025-01-28
-- Task: 2-7 Create Warm-up Process System

-- Create bot sessions tracking table
CREATE TABLE IF NOT EXISTS bot_sessions (
  id SERIAL PRIMARY KEY,
  
  -- Bot identification
  bot_id VARCHAR(50) NOT NULL,
  session_id VARCHAR(100) NOT NULL UNIQUE,
  bot_type VARCHAR(30) DEFAULT 'warmup' CHECK (bot_type IN ('warmup', 'engagement', 'content', 'maintenance')),
  
  -- Session details
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'idle', 'error', 'completed', 'terminated')),
  
  -- Performance tracking
  accounts_processed INTEGER DEFAULT 0,
  phases_completed INTEGER DEFAULT 0,
  phases_failed INTEGER DEFAULT 0,
  total_actions INTEGER DEFAULT 0,
  
  -- Error tracking
  error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  last_error_at TIMESTAMP,
  
  -- Configuration
  max_accounts_per_session INTEGER DEFAULT 10,
  session_timeout_minutes INTEGER DEFAULT 120,
  retry_limit INTEGER DEFAULT 3,
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  system_info JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bot session queries
CREATE INDEX IF NOT EXISTS idx_bot_sessions_bot_id ON bot_sessions(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_session_id ON bot_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_status ON bot_sessions(status);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_started_at ON bot_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_last_heartbeat ON bot_sessions(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_bot_type ON bot_sessions(bot_type);

-- Composite indexes for active session queries
CREATE INDEX IF NOT EXISTS idx_bot_sessions_active ON bot_sessions(bot_id, status, last_heartbeat)
  WHERE status = 'active';

-- Create bot action logs table
CREATE TABLE IF NOT EXISTS bot_action_logs (
  id SERIAL PRIMARY KEY,
  
  -- Session and bot tracking
  bot_session_id INTEGER NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  bot_id VARCHAR(50) NOT NULL,
  
  -- Account and phase context
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  warmup_phase_id INTEGER REFERENCES account_warmup_phases(id) ON DELETE CASCADE,
  phase_name VARCHAR(20),
  
  -- Action details
  action_type VARCHAR(50) NOT NULL,
  action_description TEXT,
  action_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action_completed_at TIMESTAMP,
  action_duration_ms INTEGER,
  
  -- Status and results
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  success BOOLEAN,
  
  -- Content used
  content_used JSONB,
  instagram_response JSONB,
  
  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(20),
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  response_time_ms INTEGER,
  memory_usage_mb INTEGER,
  cpu_usage_percent DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bot action logs
CREATE INDEX IF NOT EXISTS idx_bot_action_logs_session_id ON bot_action_logs(bot_session_id);
CREATE INDEX IF NOT EXISTS idx_bot_action_logs_bot_id ON bot_action_logs(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_action_logs_account_id ON bot_action_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_bot_action_logs_warmup_phase_id ON bot_action_logs(warmup_phase_id);
CREATE INDEX IF NOT EXISTS idx_bot_action_logs_action_type ON bot_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_bot_action_logs_status ON bot_action_logs(status);
CREATE INDEX IF NOT EXISTS idx_bot_action_logs_started_at ON bot_action_logs(action_started_at);
CREATE INDEX IF NOT EXISTS idx_bot_action_logs_success ON bot_action_logs(success);

-- Composite indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_bot_action_logs_success_metrics ON bot_action_logs(account_id, success, action_completed_at)
  WHERE success IS NOT NULL;

-- Function to check if bot session is still active
CREATE OR REPLACE FUNCTION is_bot_session_active(session_id_param VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
  session_timeout INTEGER;
  last_beat TIMESTAMP;
  session_status VARCHAR(20);
BEGIN
  SELECT session_timeout_minutes, last_heartbeat, status
  INTO session_timeout, last_beat, session_status
  FROM bot_sessions
  WHERE session_id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if session is marked as inactive
  IF session_status != 'active' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if heartbeat is within timeout window
  IF last_beat < CURRENT_TIMESTAMP - (session_timeout || ' minutes')::INTERVAL THEN
    -- Auto-mark session as timed out
    UPDATE bot_sessions 
    SET status = 'terminated', 
        ended_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = session_id_param;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to update bot session statistics
CREATE OR REPLACE FUNCTION update_bot_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session stats when an action is completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    UPDATE bot_sessions 
    SET 
      total_actions = total_actions + 1,
      phases_completed = phases_completed + CASE WHEN NEW.success THEN 1 ELSE 0 END,
      phases_failed = phases_failed + CASE WHEN NEW.success = FALSE THEN 1 ELSE 0 END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.bot_session_id;
  END IF;
  
  -- Update error count if action failed
  IF OLD.status != 'failed' AND NEW.status = 'failed' THEN
    UPDATE bot_sessions 
    SET 
      error_count = error_count + 1,
      last_error_message = NEW.error_message,
      last_error_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.bot_session_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update session statistics
DROP TRIGGER IF EXISTS trigger_update_bot_session_stats ON bot_action_logs;
CREATE TRIGGER trigger_update_bot_session_stats
  AFTER UPDATE ON bot_action_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_session_stats();

-- Function to cleanup old bot sessions and logs
CREATE OR REPLACE FUNCTION cleanup_old_bot_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_sessions INTEGER;
  deleted_logs INTEGER;
BEGIN
  -- Delete old completed sessions and their logs
  DELETE FROM bot_sessions 
  WHERE ended_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL
    AND status IN ('completed', 'terminated');
  
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  
  -- Delete orphaned action logs (cascade should handle this, but just in case)
  DELETE FROM bot_action_logs 
  WHERE action_completed_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL
    AND NOT EXISTS (SELECT 1 FROM bot_sessions WHERE id = bot_session_id);
  
  GET DIAGNOSTICS deleted_logs = ROW_COUNT;
  
  RETURN deleted_sessions + deleted_logs;
END;
$$ LANGUAGE plpgsql;

-- View for active bot sessions with performance metrics
CREATE OR REPLACE VIEW active_bot_sessions AS
SELECT 
  bs.id,
  bs.bot_id,
  bs.session_id,
  bs.bot_type,
  bs.started_at,
  bs.last_heartbeat,
  bs.status,
  bs.accounts_processed,
  bs.phases_completed,
  bs.phases_failed,
  bs.total_actions,
  bs.error_count,
  
  -- Calculate session duration
  EXTRACT(EPOCH FROM (COALESCE(bs.ended_at, CURRENT_TIMESTAMP) - bs.started_at))/60 as session_duration_minutes,
  
  -- Performance metrics
  CASE 
    WHEN bs.total_actions > 0 THEN ROUND((bs.phases_completed::decimal / bs.total_actions) * 100, 2)
    ELSE 0 
  END as success_rate_percent,
  
  -- Recent activity indicator
  CASE 
    WHEN bs.last_heartbeat > CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN 'active'
    WHEN bs.last_heartbeat > CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN 'idle'
    ELSE 'stale'
  END as activity_status,
  
  -- Recent action counts
  (SELECT COUNT(*) FROM bot_action_logs bal 
   WHERE bal.bot_session_id = bs.id 
     AND bal.action_started_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
  ) as actions_last_hour
  
FROM bot_sessions bs
WHERE bs.status IN ('active', 'idle', 'error')
ORDER BY bs.last_heartbeat DESC;

-- View for bot performance analytics
CREATE OR REPLACE VIEW bot_performance_analytics AS
SELECT 
  bs.bot_id,
  bs.bot_type,
  COUNT(bs.id) as total_sessions,
  COUNT(CASE WHEN bs.status = 'completed' THEN 1 END) as completed_sessions,
  COUNT(CASE WHEN bs.status = 'terminated' THEN 1 END) as terminated_sessions,
  
  -- Performance aggregates
  COALESCE(SUM(bs.accounts_processed), 0) as total_accounts_processed,
  COALESCE(SUM(bs.phases_completed), 0) as total_phases_completed,
  COALESCE(SUM(bs.phases_failed), 0) as total_phases_failed,
  COALESCE(SUM(bs.total_actions), 0) as total_actions,
  
  -- Success rates
  CASE 
    WHEN SUM(bs.total_actions) > 0 THEN 
      ROUND((SUM(bs.phases_completed)::decimal / SUM(bs.total_actions)) * 100, 2)
    ELSE 0 
  END as overall_success_rate,
  
  -- Time metrics
  ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(bs.ended_at, CURRENT_TIMESTAMP) - bs.started_at))/60), 2) as avg_session_duration_minutes,
  
  -- Recent activity
  MAX(bs.last_heartbeat) as last_seen,
  COUNT(CASE WHEN bs.started_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as sessions_today
  
FROM bot_sessions bs
GROUP BY bs.bot_id, bs.bot_type
ORDER BY total_actions DESC, overall_success_rate DESC; 