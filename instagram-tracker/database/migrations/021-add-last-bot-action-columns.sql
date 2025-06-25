-- Migration 021: Add last bot action tracking columns
-- Purpose: Fix warmup-status query errors (missing columns last_bot_action_by/at)
-- Date: 2025-06-16
-- -----------------------------------------------------
-- Adds columns expected by WarmupProcessService for tracking
-- the last bot/user that modified an account and when.
-- Safe to run multiple times (IF NOT EXISTS) and backfills
-- existing rows with NULL values.

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS last_bot_action_by VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_bot_action_at TIMESTAMP; 