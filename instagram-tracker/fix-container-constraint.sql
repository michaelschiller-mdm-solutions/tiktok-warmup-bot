-- Fix container constraint issue
-- This removes the constraint that limits container_number to <= 30

-- Drop the existing check constraint
ALTER TABLE iphone_containers DROP CONSTRAINT IF EXISTS iphone_containers_container_number_check;

-- Optionally, add a new constraint that only ensures container_number is positive
-- ALTER TABLE iphone_containers ADD CONSTRAINT iphone_containers_container_number_positive CHECK (container_number > 0); 