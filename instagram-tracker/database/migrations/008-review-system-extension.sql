-- Migration: 008-review-system-extension
-- Purpose: Add human review queue system integration to existing warmup process
-- Date: 2025-01-20
-- Task: 8-1 Extend Warmup System for Review Status

-- Create review logs table for tracking human interventions
CREATE TABLE IF NOT EXISTS warmup_review_logs (
  id SERIAL PRIMARY KEY,
  warmup_phase_id INTEGER NOT NULL REFERENCES account_warmup_phases(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Review context
  failure_type VARCHAR(50) NOT NULL CHECK (failure_type IN (
    'bot_error', 'instagram_challenge', 'content_rejection', 'captcha', 
    'rate_limit', 'account_suspended', 'network_error', 'timeout', 'other'
  )),
  failure_message TEXT,
  failure_details JSONB,
  original_bot_id VARCHAR(50),
  
  -- Review process
  review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'in_progress', 'resolved', 'escalated', 'cancelled'
  )),
  assigned_to VARCHAR(100), -- User who claimed the review
  priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5), -- 1=urgent, 5=low
  
  -- Resolution tracking
  resolution_method VARCHAR(50) CHECK (resolution_method IN (
    'retry_bot', 'manual_completion', 'skip_phase', 'reset_account', 
    'change_content', 'escalate_support', 'other'
  )),
  resolution_notes TEXT,
  resolution_time_minutes INTEGER,
  
  -- Timestamps
  failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  review_started_at TIMESTAMP,
  resolved_at TIMESTAMP,
  
  -- Analytics
  retry_count_before_review INTEGER DEFAULT 0,
  was_resolved_successfully BOOLEAN,
  required_manual_intervention BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient review queue queries
CREATE INDEX IF NOT EXISTS idx_review_logs_review_status ON warmup_review_logs(review_status);
CREATE INDEX IF NOT EXISTS idx_review_logs_failure_type ON warmup_review_logs(failure_type);
CREATE INDEX IF NOT EXISTS idx_review_logs_priority ON warmup_review_logs(priority_level);
CREATE INDEX IF NOT EXISTS idx_review_logs_assigned_to ON warmup_review_logs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_review_logs_failed_at ON warmup_review_logs(failed_at);
CREATE INDEX IF NOT EXISTS idx_review_logs_account_id ON warmup_review_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_warmup_phase_id ON warmup_review_logs(warmup_phase_id);

-- Create composite indexes for review queue operations
CREATE INDEX IF NOT EXISTS idx_review_queue_pending ON warmup_review_logs(review_status, priority_level, failed_at)
  WHERE review_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_review_queue_in_progress ON warmup_review_logs(review_status, assigned_to, review_started_at)
  WHERE review_status = 'in_progress';

-- Add review-related fields to existing warmup phases table
ALTER TABLE account_warmup_phases 
ADD COLUMN IF NOT EXISTS failure_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS review_required_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS review_escalation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_human_action_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_human_action_by VARCHAR(100);

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_warmup_phases_review_required ON account_warmup_phases(status, review_required_at)
  WHERE status = 'requires_review';
CREATE INDEX IF NOT EXISTS idx_warmup_phases_failure_category ON account_warmup_phases(failure_category)
  WHERE failure_category IS NOT NULL;

-- Function to create review log entry when phase fails
CREATE OR REPLACE FUNCTION create_review_log_on_failure()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create review log when status changes to requires_review
  IF NEW.status = 'requires_review' AND (OLD.status IS NULL OR OLD.status != 'requires_review') THEN
    INSERT INTO warmup_review_logs (
      warmup_phase_id,
      account_id,
      failure_type,
      failure_message,
      failure_details,
      original_bot_id,
      retry_count_before_review,
      failed_at,
      priority_level
    ) VALUES (
      NEW.id,
      NEW.account_id,
      COALESCE(NEW.failure_category, 'other'),
      NEW.error_message,
      NEW.error_details,
      NEW.bot_id,
      COALESCE(NEW.retry_count, 0),
      COALESCE(NEW.review_required_at, CURRENT_TIMESTAMP),
      CASE 
        WHEN NEW.retry_count >= 3 THEN 2  -- High priority for multiple failures
        WHEN NEW.failure_category IN ('account_suspended', 'instagram_challenge') THEN 1 -- Urgent
        ELSE 3 -- Normal priority
      END
    );
    
    -- Update the review_required_at timestamp
    NEW.review_required_at = CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic review log creation
DROP TRIGGER IF EXISTS trigger_create_review_log ON account_warmup_phases;
CREATE TRIGGER trigger_create_review_log
  BEFORE UPDATE ON account_warmup_phases
  FOR EACH ROW
  EXECUTE FUNCTION create_review_log_on_failure();

-- Function to get review queue with account context
CREATE OR REPLACE FUNCTION get_review_queue(
  p_status VARCHAR(20) DEFAULT 'pending',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  review_id INTEGER,
  account_id INTEGER,
  username VARCHAR(255),
  model_name VARCHAR(255),
  phase VARCHAR(20),
  failure_type VARCHAR(50),
  failure_message TEXT,
  priority_level INTEGER,
  failed_at TIMESTAMP,
  retry_count INTEGER,
  days_in_review INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.id as review_id,
    a.id as account_id,
    a.username,
    m.name as model_name,
    awp.phase,
    rl.failure_type,
    rl.failure_message,
    rl.priority_level,
    rl.failed_at,
    rl.retry_count_before_review as retry_count,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - rl.failed_at))::INTEGER as days_in_review
  FROM warmup_review_logs rl
  JOIN account_warmup_phases awp ON rl.warmup_phase_id = awp.id
  JOIN accounts a ON rl.account_id = a.id
  LEFT JOIN models m ON a.model_id = m.id
  WHERE rl.review_status = p_status
  ORDER BY rl.priority_level ASC, rl.failed_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to resolve review and resume warmup
CREATE OR REPLACE FUNCTION resolve_review(
  p_review_id INTEGER,
  p_resolution_method VARCHAR(50),
  p_resolution_notes TEXT,
  p_resolved_by VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_warmup_phase_id INTEGER;
  v_account_id INTEGER;
  v_new_status VARCHAR(30);
BEGIN
  -- Get warmup phase info
  SELECT warmup_phase_id, account_id INTO v_warmup_phase_id, v_account_id
  FROM warmup_review_logs 
  WHERE id = p_review_id AND review_status != 'resolved';
  
  IF v_warmup_phase_id IS NULL THEN
    RETURN FALSE; -- Review not found or already resolved
  END IF;
  
  -- Determine new phase status based on resolution method
  SELECT CASE p_resolution_method
    WHEN 'retry_bot' THEN 'available'
    WHEN 'manual_completion' THEN 'completed'
    WHEN 'skip_phase' THEN 'completed'
    WHEN 'reset_account' THEN 'pending'
    WHEN 'change_content' THEN 'available'
    ELSE 'available'
  END INTO v_new_status;
  
  -- Update review log
  UPDATE warmup_review_logs SET
    review_status = 'resolved',
    resolution_method = p_resolution_method,
    resolution_notes = p_resolution_notes,
    resolved_at = CURRENT_TIMESTAMP,
    was_resolved_successfully = TRUE,
    resolution_time_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - review_started_at)) / 60,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_review_id;
  
  -- Update warmup phase status
  UPDATE account_warmup_phases SET
    status = v_new_status,
    last_human_action_at = CURRENT_TIMESTAMP,
    last_human_action_by = p_resolved_by,
    updated_at = CURRENT_TIMESTAMP,
    -- Reset retry count if manually resolved
    retry_count = CASE WHEN p_resolution_method = 'retry_bot' THEN 0 ELSE retry_count END
  WHERE id = v_warmup_phase_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create view for review queue analytics
CREATE OR REPLACE VIEW review_queue_analytics AS
SELECT 
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN review_status = 'pending' THEN 1 END) as pending_reviews,
  COUNT(CASE WHEN review_status = 'in_progress' THEN 1 END) as in_progress_reviews,
  COUNT(CASE WHEN review_status = 'resolved' THEN 1 END) as resolved_reviews,
  
  -- Failure type breakdown
  COUNT(CASE WHEN failure_type = 'bot_error' THEN 1 END) as bot_errors,
  COUNT(CASE WHEN failure_type = 'instagram_challenge' THEN 1 END) as instagram_challenges,
  COUNT(CASE WHEN failure_type = 'content_rejection' THEN 1 END) as content_rejections,
  COUNT(CASE WHEN failure_type = 'captcha' THEN 1 END) as captcha_failures,
  
  -- Priority breakdown
  COUNT(CASE WHEN priority_level = 1 THEN 1 END) as urgent_reviews,
  COUNT(CASE WHEN priority_level = 2 THEN 1 END) as high_priority_reviews,
  COUNT(CASE WHEN priority_level = 3 THEN 1 END) as normal_priority_reviews,
  
  -- Average resolution time
  AVG(resolution_time_minutes) as avg_resolution_time_minutes,
  AVG(CASE WHEN was_resolved_successfully = TRUE THEN resolution_time_minutes END) as avg_successful_resolution_time,
  
  -- Success rate
  ROUND(
    COUNT(CASE WHEN was_resolved_successfully = TRUE THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN review_status = 'resolved' THEN 1 END), 0) * 100, 
    2
  ) as resolution_success_rate_percent
  
FROM warmup_review_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Insert sample review log for testing (if in development)
-- This helps verify the system works correctly
DO $$
BEGIN
  -- Only insert sample data if we're in development (check for specific model)
  IF EXISTS (SELECT 1 FROM models WHERE name = 'Sample Model') THEN
    -- Insert a sample failed phase for testing
    INSERT INTO account_warmup_phases (
      account_id, phase, status, error_message, retry_count, 
      failure_category, review_required_at, bot_id
    )
    SELECT 
      a.id, 'pfp', 'requires_review', 
      'Sample bot error for testing review queue', 
      2, 'bot_error', CURRENT_TIMESTAMP, 'test_bot_001'
    FROM accounts a 
    JOIN models m ON a.model_id = m.id 
    WHERE m.name = 'Sample Model' 
    AND NOT EXISTS (
      SELECT 1 FROM account_warmup_phases awp 
      WHERE awp.account_id = a.id AND awp.phase = 'pfp'
    )
    LIMIT 1;
  END IF;
END $$; 