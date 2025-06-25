-- Migration: 034-add-status-to-text-content
-- Purpose: Add a status to the central_text_content table to track usage
-- Date: 2025-02-02

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'central_text_content_status_check') THEN
        ALTER TABLE central_text_content
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL,
        ADD CONSTRAINT central_text_content_status_check CHECK (status IN ('active', 'used', 'archived'));
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_central_text_content_status ON central_text_content(status);

COMMENT ON COLUMN central_text_content.status IS 'The status of the content item (active, used, archived).';

-- Update existing text content to have an active status
UPDATE central_text_content SET status = 'active' WHERE status IS NULL; 