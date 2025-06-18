-- Fix proxy_providers table - add missing columns
ALTER TABLE proxy_providers 
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) CHECK (service_type IN ('residential', 'datacenter', 'mobile')),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update the constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'proxy_providers_service_type_check' 
                   AND table_name = 'proxy_providers') THEN
        ALTER TABLE proxy_providers 
        ADD CONSTRAINT proxy_providers_service_type_check 
        CHECK (service_type IN ('residential', 'datacenter', 'mobile'));
    END IF;
END $$;

-- Insert sample proxy providers with correct schema
UPDATE proxy_providers SET 
    service_type = 'residential', 
    status = 'active' 
WHERE name IN ('ProxyMesh', 'BrightData') AND service_type IS NULL;

UPDATE proxy_providers SET 
    service_type = 'datacenter', 
    status = 'active' 
WHERE name IN ('SmartProxy', 'ProxyRack') AND service_type IS NULL; 