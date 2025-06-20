-- Migration 028: Add Campaign Pool Template Columns
-- Purpose: Add template-related columns to campaign_pools table for template functionality
-- Date: 2025-06-19

-- Add template-related columns to campaign_pools table
ALTER TABLE campaign_pools ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE campaign_pools ADD COLUMN IF NOT EXISTS template_category VARCHAR(100);
ALTER TABLE campaign_pools ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Create indexes for the new template columns
CREATE INDEX IF NOT EXISTS idx_campaign_pools_is_template ON campaign_pools(is_template);
CREATE INDEX IF NOT EXISTS idx_campaign_pools_template_category ON campaign_pools(template_category) WHERE template_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_pools_usage_count ON campaign_pools(usage_count) WHERE is_template = true;

-- Update existing records to have sensible defaults
UPDATE campaign_pools SET is_template = false WHERE is_template IS NULL;
UPDATE campaign_pools SET usage_count = 0 WHERE usage_count IS NULL; 