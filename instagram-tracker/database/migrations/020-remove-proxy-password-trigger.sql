-- Migration 020: Remove obsolete proxy_password trigger
-- Purpose: Fix "record \"new\" has no field \"proxy_password\"" error during account import
-- Date: 2025-06-16
-- -------------------------------------------------------
-- This trigger/function pair was introduced in migration 016 to
-- auto-encrypt proxy passwords. Since migration 019 removed the
-- plain-text proxy_password column and the backend now handles
-- encryption itself, the trigger is no longer valid and causes
-- runtime failures on INSERT/UPDATE.
--
-- Safe to remove because:
-- 1. Column proxy_password no longer exists.
-- 2. Backend encrypts any supplied proxy password before insert.
-- 3. trigger_encrypt_passwords only referenced proxy_password(s).
--
-- The drop statements are idempotent.

-- Drop trigger if it still exists
DROP TRIGGER IF EXISTS trigger_encrypt_passwords ON accounts;

-- Drop the supporting function
DROP FUNCTION IF EXISTS encrypt_passwords_trigger(); 