-- Migration 022: Add error tracking columns to accounts
-- Purpose: Needed by mark-invalid route (last_error_message, last_error_at)
-- Date: 2025-06-16

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS last_error_message TEXT,
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP; 