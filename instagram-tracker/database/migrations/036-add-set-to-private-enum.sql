-- Migration 036: Add SET_TO_PRIVATE to warmup_phase_type enum
-- Purpose: Add the 'set_to_private' value to the warmup_phase_type enum. This must be done in a separate transaction before the value can be used.
-- Date: 2025-06-27

ALTER TYPE warmup_phase_type ADD VALUE IF NOT EXISTS 'set_to_private'; 