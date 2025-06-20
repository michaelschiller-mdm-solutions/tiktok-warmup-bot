-- Migration: 031-add-usage-count-column
-- Purpose: Add missing usage_count column to campaign_pools table for template functionality

-- Add usage_count column for tracking template usage
ALTER TABLE campaign_pools 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Add last_assigned column for tracking when template was last used  
ALTER TABLE campaign_pools
ADD COLUMN IF NOT EXISTS last_assigned TIMESTAMP;

-- Create index for template queries
CREATE INDEX IF NOT EXISTS idx_campaign_pools_template 
ON campaign_pools(is_template, template_category) 
WHERE is_template = true;

-- Update any existing templates to have default usage_count
UPDATE campaign_pools 
SET usage_count = 0 
WHERE usage_count IS NULL; 