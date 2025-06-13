-- Migration 005: Advanced Analytics Enhancement
-- Creates advanced analytics for follow-back rates, conversions, and performance metrics
-- Version: 2.0
-- Created: 2025-01-27

-- Enhanced follow tracking (extends existing model_target_follows)
ALTER TABLE model_target_follows ADD COLUMN IF NOT EXISTS follow_back_duration_hours INTEGER;
ALTER TABLE model_target_follows ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0;
ALTER TABLE model_target_follows ADD COLUMN IF NOT EXISTS last_interaction TIMESTAMP WITH TIME ZONE;

-- Conversion events table (follow to subscription/sale)
CREATE TABLE conversion_events (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    target_user_id INTEGER NOT NULL REFERENCES target_users(id) ON DELETE CASCADE,
    follow_event_id INTEGER REFERENCES model_target_follows(id),
    conversion_type VARCHAR(50) NOT NULL, -- 'subscription', 'sale', 'lead', 'engagement'
    conversion_value DECIMAL(10,2) DEFAULT 0.00,
    conversion_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    conversion_source VARCHAR(100), -- 'dm', 'bio_link', 'story', 'post'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dynamic columns for custom account data
CREATE TABLE dynamic_columns (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    column_name VARCHAR(100) NOT NULL,
    column_type VARCHAR(20) NOT NULL CHECK (column_type IN ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN')),
    column_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    validation_rules JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, column_name)
);

-- Storage for dynamic column data
CREATE TABLE account_dynamic_data (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    dynamic_column_id INTEGER NOT NULL REFERENCES dynamic_columns(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number DECIMAL(15,4),
    value_date DATE,
    value_boolean BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, dynamic_column_id)
);

-- Account relationships for mother-slave hierarchies
CREATE TABLE account_relationships (
    id SERIAL PRIMARY KEY,
    mother_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    slave_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'mother_slave',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mother_account_id, slave_account_id)
);

-- Performance snapshots for historical analysis
CREATE TABLE performance_snapshots (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_follows INTEGER DEFAULT 0,
    total_unfollows INTEGER DEFAULT 0,
    total_follow_backs INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    follow_back_rate DECIMAL(5,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    revenue_generated DECIMAL(10,2) DEFAULT 0.00,
    costs_incurred DECIMAL(10,2) DEFAULT 0.00,
    net_profit DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, snapshot_date)
);

-- Create indexes for performance
CREATE INDEX idx_conversion_events_account_id ON conversion_events(account_id);
CREATE INDEX idx_conversion_events_model_id ON conversion_events(model_id);
CREATE INDEX idx_conversion_events_target_user ON conversion_events(target_user_id);
CREATE INDEX idx_conversion_events_date ON conversion_events(conversion_date);
CREATE INDEX idx_conversion_events_type ON conversion_events(conversion_type);

CREATE INDEX idx_dynamic_columns_model_id ON dynamic_columns(model_id);
CREATE INDEX idx_dynamic_columns_name ON dynamic_columns(column_name);

CREATE INDEX idx_account_dynamic_data_account_id ON account_dynamic_data(account_id);
CREATE INDEX idx_account_dynamic_data_column_id ON account_dynamic_data(dynamic_column_id);

CREATE INDEX idx_account_relationships_mother ON account_relationships(mother_account_id);
CREATE INDEX idx_account_relationships_slave ON account_relationships(slave_account_id);

CREATE INDEX idx_performance_snapshots_account_id ON performance_snapshots(account_id);
CREATE INDEX idx_performance_snapshots_model_id ON performance_snapshots(model_id);
CREATE INDEX idx_performance_snapshots_date ON performance_snapshots(snapshot_date);

-- Update triggers
CREATE TRIGGER update_dynamic_columns_updated_at BEFORE UPDATE ON dynamic_columns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_dynamic_data_updated_at BEFORE UPDATE ON account_dynamic_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_relationships_updated_at BEFORE UPDATE ON account_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate follow-back rate for an account
CREATE OR REPLACE FUNCTION calculate_follow_back_rate(account_id_param INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_follows INTEGER;
    total_follow_backs INTEGER;
    rate DECIMAL(5,2);
BEGIN
    SELECT 
        COUNT(*) as follows,
        COUNT(CASE WHEN is_followed_back = true THEN 1 END) as follow_backs
    INTO total_follows, total_follow_backs
    FROM model_target_follows 
    WHERE account_id = account_id_param;
    
    IF total_follows > 0 THEN
        rate := (total_follow_backs::DECIMAL / total_follows::DECIMAL) * 100;
    ELSE
        rate := 0.00;
    END IF;
    
    RETURN rate;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate conversion rate for an account
CREATE OR REPLACE FUNCTION calculate_conversion_rate(account_id_param INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_follows INTEGER;
    total_conversions INTEGER;
    rate DECIMAL(5,2);
BEGIN
    SELECT 
        COUNT(DISTINCT mtf.id) as follows,
        COUNT(DISTINCT ce.id) as conversions
    INTO total_follows, total_conversions
    FROM model_target_follows mtf
    LEFT JOIN conversion_events ce ON mtf.account_id = ce.account_id AND mtf.target_user_id = ce.target_user_id
    WHERE mtf.account_id = account_id_param;
    
    IF total_follows > 0 THEN
        rate := (total_conversions::DECIMAL / total_follows::DECIMAL) * 100;
    ELSE
        rate := 0.00;
    END IF;
    
    RETURN rate;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update account performance metrics when follow data changes
CREATE OR REPLACE FUNCTION update_account_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update follow back rate and conversion rate for the account
    UPDATE accounts 
    SET 
        follow_back_rate = calculate_follow_back_rate(NEW.account_id),
        conversion_rate = calculate_conversion_rate(NEW.account_id),
        total_follows = (SELECT COUNT(*) FROM model_target_follows WHERE account_id = NEW.account_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to model_target_follows table
CREATE TRIGGER update_account_metrics_on_follow_change 
    AFTER INSERT OR UPDATE ON model_target_follows 
    FOR EACH ROW EXECUTE FUNCTION update_account_performance_metrics();

-- Trigger to update metrics when conversion events are added
CREATE OR REPLACE FUNCTION update_account_conversion_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversion metrics for the account
    UPDATE accounts 
    SET 
        conversion_rate = calculate_conversion_rate(NEW.account_id),
        total_conversions = (SELECT COUNT(*) FROM conversion_events WHERE account_id = NEW.account_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to conversion_events table
CREATE TRIGGER update_account_metrics_on_conversion 
    AFTER INSERT OR UPDATE ON conversion_events 
    FOR EACH ROW EXECUTE FUNCTION update_account_conversion_metrics();

-- View for comprehensive account performance analysis
CREATE OR REPLACE VIEW account_performance_analysis AS
SELECT 
    a.id,
    a.username,
    a.model_id,
    m.name as model_name,
    a.status,
    a.content_type,
    a.niche,
    a.proxy_provider,
    a.proxy_status,
    -- Performance metrics
    a.follow_back_rate,
    a.conversion_rate,
    a.total_follows,
    a.total_conversions,
    -- Financial metrics
    a.monthly_cost,
    COALESCE(SUM(re.revenue_amount), 0) as total_revenue,
    COALESCE(SUM(re.revenue_amount), 0) - a.monthly_cost as net_profit,
    -- Follow metrics
    COUNT(DISTINCT mtf.id) as total_follow_attempts,
    COUNT(DISTINCT CASE WHEN mtf.is_followed_back = true THEN mtf.id END) as successful_follow_backs,
    COUNT(DISTINCT ce.id) as total_conversion_events,
    -- Rankings
    RANK() OVER (PARTITION BY a.model_id ORDER BY a.follow_back_rate DESC) as follow_back_rank,
    RANK() OVER (PARTITION BY a.model_id ORDER BY a.conversion_rate DESC) as conversion_rank,
    RANK() OVER (PARTITION BY a.model_id ORDER BY (COALESCE(SUM(re.revenue_amount), 0) - a.monthly_cost) DESC) as profit_rank
FROM accounts a
JOIN models m ON a.model_id = m.id
LEFT JOIN model_target_follows mtf ON a.id = mtf.account_id
LEFT JOIN conversion_events ce ON a.id = ce.account_id
LEFT JOIN revenue_events re ON a.id = re.account_id
GROUP BY a.id, a.username, a.model_id, m.name, a.status, a.content_type, a.niche, 
         a.proxy_provider, a.proxy_status, a.follow_back_rate, a.conversion_rate, 
         a.total_follows, a.total_conversions, a.monthly_cost; 