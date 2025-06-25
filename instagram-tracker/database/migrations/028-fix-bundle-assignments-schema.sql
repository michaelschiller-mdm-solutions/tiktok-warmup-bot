-- Migration: 028-fix-bundle-assignments-schema
-- Purpose: Add missing assignment_order column to bundle_content_assignments table

-- Add assignment_order column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bundle_content_assignments' 
        AND column_name = 'assignment_order'
    ) THEN
        ALTER TABLE bundle_content_assignments 
        ADD COLUMN assignment_order INTEGER DEFAULT 0;
        
        -- Update existing records to have sequential order within each bundle
        UPDATE bundle_content_assignments 
        SET assignment_order = subquery.row_number
        FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY bundle_id ORDER BY assigned_at) as row_number
            FROM bundle_content_assignments
        ) AS subquery
        WHERE bundle_content_assignments.id = subquery.id;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_bundle_content_assignments_order 
        ON bundle_content_assignments(bundle_id, assignment_order);
        
        RAISE NOTICE 'Added assignment_order column to bundle_content_assignments';
    ELSE
        RAISE NOTICE 'assignment_order column already exists in bundle_content_assignments';
    END IF;
END $$; 