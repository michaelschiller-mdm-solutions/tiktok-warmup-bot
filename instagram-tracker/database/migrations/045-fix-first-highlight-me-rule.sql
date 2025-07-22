-- Migration 045: Fix first highlight "Me" rule
-- Purpose: Ensure first_highlight is always assigned "Me" as text content
-- Date: 2025-07-19

-- Simple approach: Just document the rule and ensure "Me" text exists
-- The JavaScript logic in the backend will handle the assignment

-- Add comment to document the first highlight "Me" rule
COMMENT ON TABLE account_warmup_phases IS 
'Warmup phases for accounts. 
IMPORTANT RULES:
1. set_to_private phase should only be available when ALL other phases are completed
2. first_highlight is ALWAYS assigned "Me" as text content
3. new_highlight can only be assigned after first_highlight is completed
4. new_highlight cannot use "Me" as text content (reserved for first_highlight)
5. Each phase is one-time only with configurable cooldowns
6. Phase ordering and content assignment handled by JavaScript logic in backend';

-- Ensure "Me" text content exists in the database (safe upsert)
INSERT INTO central_text_content (text_content, categories, template_name, status)
SELECT 'Me', '["highlight", "highlight_group_name"]'::jsonb, 'First Highlight - Me', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM central_text_content 
    WHERE LOWER(text_content) = 'me' 
      AND categories @> '["highlight"]'::jsonb 
      AND status = 'active'
);

-- Simple success indicator
SELECT 'Migration 045 completed - first highlight Me rule documented and Me text content ensured' as status;