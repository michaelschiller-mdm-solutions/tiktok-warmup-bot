-- Migration: 019-cleanup-duplicate-password-fields
-- Purpose: Remove duplicate and unused password fields to eliminate confusion
-- Date: 2025-06-15
-- 
-- ISSUE ANALYSIS:
-- - account_code: Contains email password (ACTIVE - keep this)
-- - password: Contains account password in plain text (ACTIVE - keep this)
-- - proxy_password_encrypted: Contains encrypted proxy password (ACTIVE - keep this)
-- - email_password: Legacy plain text email password field (UNUSED - remove)
-- - email_password_encrypted: Encrypted email password field (UNUSED - remove)
-- - password_encrypted: Legacy encrypted account password field (UNUSED - remove)

-- Step 1: Verify which fields are actually being used
-- Check if any accounts have data in the fields we want to remove
DO $$
DECLARE
    email_password_count INTEGER := 0;
    email_password_encrypted_count INTEGER := 0;
    password_encrypted_count INTEGER := 0;
    email_password_exists BOOLEAN;
    email_password_encrypted_exists BOOLEAN;
    password_encrypted_exists BOOLEAN;
BEGIN
    -- Check if columns exist first
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'accounts' AND column_name = 'email_password') 
    INTO email_password_exists;
    
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'accounts' AND column_name = 'email_password_encrypted') 
    INTO email_password_encrypted_exists;
    
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'accounts' AND column_name = 'password_encrypted') 
    INTO password_encrypted_exists;
    
    -- Check email_password usage only if column exists
    IF email_password_exists THEN
        SELECT COUNT(*) INTO email_password_count 
        FROM accounts 
        WHERE email_password IS NOT NULL AND email_password != '';
    END IF;
    
    -- Check email_password_encrypted usage only if column exists
    IF email_password_encrypted_exists THEN
        SELECT COUNT(*) INTO email_password_encrypted_count 
        FROM accounts 
        WHERE email_password_encrypted IS NOT NULL AND email_password_encrypted != '';
    END IF;
    
    -- Check password_encrypted usage only if column exists
    IF password_encrypted_exists THEN
        SELECT COUNT(*) INTO password_encrypted_count 
        FROM accounts 
        WHERE password_encrypted IS NOT NULL AND password_encrypted != '';
    END IF;
    
    RAISE NOTICE 'Migration 019 - Field Usage Analysis:';
    RAISE NOTICE '  email_password: exists=%, % accounts have data', email_password_exists, email_password_count;
    RAISE NOTICE '  email_password_encrypted: exists=%, % accounts have data', email_password_encrypted_exists, email_password_encrypted_count;
    RAISE NOTICE '  password_encrypted: exists=%, % accounts have data', password_encrypted_exists, password_encrypted_count;
    
    -- Only proceed if fields are truly unused
    IF email_password_exists AND email_password_count > 0 THEN
        RAISE EXCEPTION 'Cannot remove email_password field - % accounts still have data in this field', email_password_count;
    END IF;
    
    IF email_password_encrypted_exists AND email_password_encrypted_count > 0 THEN
        RAISE EXCEPTION 'Cannot remove email_password_encrypted field - % accounts still have data in this field', email_password_encrypted_count;
    END IF;
    
    IF password_encrypted_exists AND password_encrypted_count > 0 THEN
        RAISE EXCEPTION 'Cannot remove password_encrypted field - % accounts still have data in this field', password_encrypted_count;
    END IF;
    
    RAISE NOTICE 'All fields are safe to remove - proceeding with cleanup';
END $$;

-- Step 2: Remove unused password fields
ALTER TABLE accounts DROP COLUMN IF EXISTS email_password;
ALTER TABLE accounts DROP COLUMN IF EXISTS email_password_encrypted;
ALTER TABLE accounts DROP COLUMN IF EXISTS password_encrypted;

-- Step 3: Add comments to clarify the remaining fields
COMMENT ON COLUMN accounts.password IS 'Instagram account password (plain text)';
COMMENT ON COLUMN accounts.account_code IS 'Email password for the associated email account (plain text)';
COMMENT ON COLUMN accounts.proxy_password_encrypted IS 'Proxy password (encrypted using encrypt_proxy_password function)';

-- Step 4: Update any views or functions that might reference the removed fields
-- Note: We already fixed the application code, but let's check for any database objects

-- Check for views that might reference the removed columns
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT schemaname, viewname, definition 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND (definition ILIKE '%email_password%' OR definition ILIKE '%password_encrypted%')
    LOOP
        RAISE WARNING 'View %.% contains references to removed password fields: %', 
            view_record.schemaname, view_record.viewname, view_record.definition;
    END LOOP;
END $$;

-- Step 5: Verify the cleanup was successful
DO $$
DECLARE
    remaining_columns TEXT[];
BEGIN
    SELECT array_agg(column_name) INTO remaining_columns
    FROM information_schema.columns 
    WHERE table_name = 'accounts' 
    AND table_schema = 'public'
    AND column_name LIKE '%password%';
    
    RAISE NOTICE 'Migration 019 Complete - Remaining password-related columns: %', remaining_columns;
END $$;

-- Step 6: Create a summary of the current password field structure
-- Dynamically create view based on existing columns
DO $$
DECLARE
    view_sql TEXT := 'CREATE OR REPLACE VIEW account_password_fields_summary AS ';
    password_exists BOOLEAN;
    account_code_exists BOOLEAN;
    proxy_password_encrypted_exists BOOLEAN;
    first_union BOOLEAN := true;
BEGIN
    -- Check which columns exist
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'accounts' AND column_name = 'password') INTO password_exists;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'accounts' AND column_name = 'account_code') INTO account_code_exists;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'accounts' AND column_name = 'proxy_password_encrypted') INTO proxy_password_encrypted_exists;
    
    -- Build view SQL dynamically
    IF password_exists THEN
        view_sql := view_sql || 
            'SELECT ''password'' as field_name, ''Instagram account password'' as purpose, ''plain text'' as storage_type, ''ACTIVE'' as status, ' ||
            'COUNT(CASE WHEN password IS NOT NULL AND password != '''' THEN 1 END) as accounts_with_data FROM accounts';
        first_union := false;
    END IF;
    
    IF account_code_exists THEN
        IF NOT first_union THEN
            view_sql := view_sql || ' UNION ALL ';
        END IF;
        view_sql := view_sql || 
            'SELECT ''account_code'' as field_name, ''Email account password'' as purpose, ''plain text'' as storage_type, ''ACTIVE'' as status, ' ||
            'COUNT(CASE WHEN account_code IS NOT NULL AND account_code != '''' THEN 1 END) as accounts_with_data FROM accounts';
        first_union := false;
    END IF;
    
    IF proxy_password_encrypted_exists THEN
        IF NOT first_union THEN
            view_sql := view_sql || ' UNION ALL ';
        END IF;
        view_sql := view_sql || 
            'SELECT ''proxy_password_encrypted'' as field_name, ''Proxy password'' as purpose, ''encrypted'' as storage_type, ''ACTIVE'' as status, ' ||
            'COUNT(CASE WHEN proxy_password_encrypted IS NOT NULL AND proxy_password_encrypted != '''' THEN 1 END) as accounts_with_data FROM accounts';
        first_union := false;
    END IF;
    
    -- Add fallback if no columns exist
    IF first_union THEN
        view_sql := view_sql || 'SELECT ''none'' as field_name, ''No password columns found'' as purpose, ''N/A'' as storage_type, ''N/A'' as status, 0 as accounts_with_data';
    END IF;
    
    EXECUTE view_sql;
    RAISE NOTICE 'Created account_password_fields_summary view with existing columns';
END $$;

-- Display the summary safely
DO $$
BEGIN
    BEGIN
        PERFORM * FROM account_password_fields_summary LIMIT 1;
        RAISE NOTICE 'View account_password_fields_summary created successfully. Use: SELECT * FROM account_password_fields_summary; to see the structure.';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not display summary view, but migration completed successfully.';
    END;
END $$;

-- Final completion message
DO $$
BEGIN
    RAISE NOTICE 'Migration 019 completed successfully!';
    RAISE NOTICE 'Password field structure has been cleaned up and simplified.';
    RAISE NOTICE 'Use: SELECT * FROM account_password_fields_summary; to see the current structure.';
END $$; 