-- Migration: 006-content-assignments
-- Purpose: Track content assignments and usage for warmup phases
-- Date: 2025-01-28
-- Task: 2-7 Create Warm-up Process System

-- Create warmup content assignments tracking table
CREATE TABLE IF NOT EXISTS warmup_content_assignments (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  warmup_phase_id INTEGER NOT NULL REFERENCES account_warmup_phases(id) ON DELETE CASCADE,
  
  -- Content details
  content_id INTEGER REFERENCES model_content(id),
  text_id INTEGER REFERENCES text_pools(id),
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('pfp', 'bio', 'post', 'highlight', 'story')),
  
  -- Assignment metadata
  assignment_score DECIMAL(5,2),
  assignment_reason VARCHAR(100),
  assignment_algorithm VARCHAR(50) DEFAULT 'quality_score',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(50) DEFAULT 'system',
  
  -- Usage tracking
  used_at TIMESTAMP,
  performance_score DECIMAL(5,2),
  success BOOLEAN,
  engagement_metrics JSONB,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_content_assignments_account_id ON warmup_content_assignments(account_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_warmup_phase_id ON warmup_content_assignments(warmup_phase_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_content_id ON warmup_content_assignments(content_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_text_id ON warmup_content_assignments(text_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_content_type ON warmup_content_assignments(content_type);
CREATE INDEX IF NOT EXISTS idx_content_assignments_assigned_at ON warmup_content_assignments(assigned_at);
CREATE INDEX IF NOT EXISTS idx_content_assignments_used_at ON warmup_content_assignments(used_at);

-- Composite indexes for content selection algorithms
CREATE INDEX IF NOT EXISTS idx_content_assignments_success_tracking ON warmup_content_assignments(content_id, success, performance_score)
  WHERE success IS NOT NULL;

-- Extend model_content table for usage tracking
ALTER TABLE model_content 
ADD COLUMN IF NOT EXISTS assignment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_performance_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 50.0,
ADD COLUMN IF NOT EXISTS freshness_score DECIMAL(5,2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE;

-- Create indexes for content selection
CREATE INDEX IF NOT EXISTS idx_model_content_quality_score ON model_content(quality_score);
CREATE INDEX IF NOT EXISTS idx_model_content_assignment_count ON model_content(assignment_count);
CREATE INDEX IF NOT EXISTS idx_model_content_success_rate ON model_content((success_count::decimal / NULLIF(assignment_count, 0)));

-- Extend text_pools table for usage tracking
ALTER TABLE text_pools 
ADD COLUMN IF NOT EXISTS assignment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_performance_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 50.0,
ADD COLUMN IF NOT EXISTS freshness_score DECIMAL(5,2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE;

-- Create indexes for text selection
CREATE INDEX IF NOT EXISTS idx_text_pools_quality_score ON text_pools(quality_score);
CREATE INDEX IF NOT EXISTS idx_text_pools_assignment_count ON text_pools(assignment_count);
CREATE INDEX IF NOT EXISTS idx_text_pools_success_rate ON text_pools((success_count::decimal / NULLIF(assignment_count, 0)));

-- Function to calculate content quality score
CREATE OR REPLACE FUNCTION calculate_content_quality_score(
  content_assignment_count INTEGER,
  content_success_count INTEGER,
  content_avg_performance DECIMAL,
  content_last_assigned TIMESTAMP
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  success_rate DECIMAL(5,2);
  performance_weight DECIMAL(5,2);
  freshness_weight DECIMAL(5,2);
  usage_penalty DECIMAL(5,2);
  final_score DECIMAL(5,2);
BEGIN
  -- Calculate success rate (0-100)
  success_rate := CASE 
    WHEN content_assignment_count = 0 THEN 50.0 -- Default for new content
    ELSE (content_success_count::decimal / content_assignment_count) * 100
  END;
  
  -- Performance score weight (0-30 points)
  performance_weight := COALESCE(content_avg_performance * 0.3, 15.0);
  
  -- Freshness weight (0-25 points) - newer content scores higher
  freshness_weight := CASE
    WHEN content_last_assigned IS NULL THEN 25.0 -- Never used
    WHEN content_last_assigned < CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 25.0
    WHEN content_last_assigned < CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 20.0
    WHEN content_last_assigned < CURRENT_TIMESTAMP - INTERVAL '3 days' THEN 15.0
    WHEN content_last_assigned < CURRENT_TIMESTAMP - INTERVAL '1 day' THEN 10.0
    ELSE 5.0
  END;
  
  -- Usage penalty (0-10 point reduction) - overused content gets penalized
  usage_penalty := CASE
    WHEN content_assignment_count > 100 THEN 10.0
    WHEN content_assignment_count > 50 THEN 5.0
    WHEN content_assignment_count > 20 THEN 2.0
    ELSE 0.0
  END;
  
  -- Final score calculation (max 100 points)
  final_score := (success_rate * 0.45) + performance_weight + freshness_weight - usage_penalty;
  
  -- Ensure score is within bounds
  RETURN GREATEST(0.0, LEAST(100.0, final_score));
END;
$$ LANGUAGE plpgsql;

-- Function to update content usage statistics
CREATE OR REPLACE FUNCTION update_content_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update model_content statistics if content was used
  IF NEW.content_id IS NOT NULL AND OLD.used_at IS NULL AND NEW.used_at IS NOT NULL THEN
    UPDATE model_content 
    SET 
      assignment_count = assignment_count + 1,
      success_count = success_count + CASE WHEN NEW.success THEN 1 ELSE 0 END,
      failure_count = failure_count + CASE WHEN NEW.success = FALSE THEN 1 ELSE 0 END,
      last_assigned_at = NEW.used_at,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.content_id;
    
    -- Recalculate quality score
    UPDATE model_content 
    SET quality_score = calculate_content_quality_score(
      assignment_count, success_count, avg_performance_score, last_assigned_at
    )
    WHERE id = NEW.content_id;
  END IF;
  
  -- Update text_pools statistics if text was used
  IF NEW.text_id IS NOT NULL AND OLD.used_at IS NULL AND NEW.used_at IS NOT NULL THEN
    UPDATE text_pools 
    SET 
      assignment_count = assignment_count + 1,
      success_count = success_count + CASE WHEN NEW.success THEN 1 ELSE 0 END,
      failure_count = failure_count + CASE WHEN NEW.success = FALSE THEN 1 ELSE 0 END,
      last_assigned_at = NEW.used_at,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.text_id;
    
    -- Recalculate quality score
    UPDATE text_pools 
    SET quality_score = calculate_content_quality_score(
      assignment_count, success_count, avg_performance_score, last_assigned_at
    )
    WHERE id = NEW.text_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update usage statistics
DROP TRIGGER IF EXISTS trigger_update_content_usage_stats ON warmup_content_assignments;
CREATE TRIGGER trigger_update_content_usage_stats
  AFTER UPDATE ON warmup_content_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_content_usage_stats();

-- View for content selection candidates
CREATE OR REPLACE VIEW available_warmup_content AS
SELECT 
  mc.id,
  mc.model_id,
  mc.content_type,
  mc.image_url,
  mc.quality_score,
  mc.assignment_count,
  mc.success_count,
  mc.last_assigned_at,
  mc.is_blacklisted,
  CASE 
    WHEN mc.assignment_count = 0 THEN 0.0
    ELSE (mc.success_count::decimal / mc.assignment_count) * 100
  END as success_rate
FROM model_content mc
WHERE mc.is_blacklisted = FALSE
ORDER BY mc.quality_score DESC, mc.assignment_count ASC;

-- View for text selection candidates
CREATE OR REPLACE VIEW available_warmup_text AS
SELECT 
  tp.id,
  tp.model_id,
  tp.content_type,
  tp.text_content,
  tp.quality_score,
  tp.assignment_count,
  tp.success_count,
  tp.last_assigned_at,
  tp.is_blacklisted,
  CASE 
    WHEN tp.assignment_count = 0 THEN 0.0
    ELSE (tp.success_count::decimal / tp.assignment_count) * 100
  END as success_rate
FROM text_pools tp
WHERE tp.is_blacklisted = FALSE
ORDER BY tp.quality_score DESC, tp.assignment_count ASC;

-- Initialize quality scores for existing content
UPDATE model_content 
SET quality_score = calculate_content_quality_score(
  COALESCE(assignment_count, 0), 
  COALESCE(success_count, 0), 
  COALESCE(avg_performance_score, 50.0), 
  last_assigned_at
)
WHERE quality_score IS NULL OR quality_score = 0;

UPDATE text_pools 
SET quality_score = calculate_content_quality_score(
  COALESCE(assignment_count, 0), 
  COALESCE(success_count, 0), 
  COALESCE(avg_performance_score, 50.0), 
  last_assigned_at
)
WHERE quality_score IS NULL OR quality_score = 0; 