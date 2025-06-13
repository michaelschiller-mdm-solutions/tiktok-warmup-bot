-- Migration 004: Cost Tracking System
-- Creates comprehensive cost tracking for profit margin analysis
-- Version: 2.0
-- Created: 2025-01-27

-- Cost categories table
CREATE TABLE cost_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category_type VARCHAR(50) NOT NULL CHECK (category_type IN ('recurring', 'one_time', 'variable')),
    default_unit VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly, per_account, one_time
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined cost categories
INSERT INTO cost_categories (name, description, category_type, default_unit) VALUES
('Cupid', 'Cupid profile management costs', 'variable', 'per_account'),
('Proxies', 'Proxy service costs by provider', 'recurring', 'monthly'),
('VPS', 'Virtual Private Server hosting costs', 'recurring', 'monthly'),
('Accounts', 'Instagram account acquisition/creation costs', 'variable', 'per_account'),
('iPhones', 'iPhone devices for account management', 'one_time', 'one_time'),
('Tunnelbear', 'VPN service costs', 'recurring', 'monthly'),
('Chatter', 'Chat automation service costs', 'recurring', 'monthly'),
('Model', 'Model/campaign setup and management costs', 'variable', 'per_model'),
('Payment Provider', 'Payment processing fees', 'variable', 'percentage');

-- Proxy providers table for better cost tracking
CREATE TABLE proxy_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    base_url VARCHAR(255),
    monthly_cost_per_proxy DECIMAL(10,2) DEFAULT 0.00,
    setup_fee DECIMAL(10,2) DEFAULT 0.00,
    api_endpoint VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Model-level cost tracking
CREATE TABLE model_costs (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    cost_category_id INTEGER NOT NULL REFERENCES cost_categories(id),
    cost_amount DECIMAL(10,2) NOT NULL,
    cost_period VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly, one_time
    cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, cost_category_id, cost_date)
);

-- Account-level cost tracking
CREATE TABLE account_costs (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    cost_category_id INTEGER NOT NULL REFERENCES cost_categories(id),
    cost_amount DECIMAL(10,2) NOT NULL,
    cost_period VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly, one_time, per_action
    cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cost history for trend analysis
CREATE TABLE cost_history (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    cost_category_id INTEGER NOT NULL REFERENCES cost_categories(id),
    cost_amount DECIMAL(10,2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Revenue tracking for profit calculation
CREATE TABLE revenue_events (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    revenue_type VARCHAR(50) NOT NULL, -- 'subscription', 'commission', 'other'
    revenue_amount DECIMAL(10,2) NOT NULL,
    source_user_id INTEGER REFERENCES target_users(id),
    conversion_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX idx_model_costs_model_id ON model_costs(model_id);
CREATE INDEX idx_model_costs_category ON model_costs(cost_category_id);
CREATE INDEX idx_model_costs_date ON model_costs(cost_date);

CREATE INDEX idx_account_costs_account_id ON account_costs(account_id);
CREATE INDEX idx_account_costs_category ON account_costs(cost_category_id);
CREATE INDEX idx_account_costs_date ON account_costs(cost_date);

CREATE INDEX idx_cost_history_model_id ON cost_history(model_id);
CREATE INDEX idx_cost_history_account_id ON cost_history(account_id);
CREATE INDEX idx_cost_history_period ON cost_history(period_start, period_end);

CREATE INDEX idx_revenue_events_account_id ON revenue_events(account_id);
CREATE INDEX idx_revenue_events_model_id ON revenue_events(model_id);
CREATE INDEX idx_revenue_events_date ON revenue_events(conversion_date);
CREATE INDEX idx_revenue_events_type ON revenue_events(revenue_type);

-- Update triggers for cost tracking tables
CREATE TRIGGER update_cost_categories_updated_at BEFORE UPDATE ON cost_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proxy_providers_updated_at BEFORE UPDATE ON proxy_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_model_costs_updated_at BEFORE UPDATE ON model_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_costs_updated_at BEFORE UPDATE ON account_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for profit margin calculation per model
CREATE OR REPLACE VIEW model_profit_analysis AS
SELECT 
    m.id as model_id,
    m.name as model_name,
    m.status,
    -- Cost calculations
    COALESCE(SUM(mc.cost_amount), 0) as total_model_costs,
    COALESCE(SUM(ac.cost_amount), 0) as total_account_costs,
    COALESCE(SUM(mc.cost_amount), 0) + COALESCE(SUM(ac.cost_amount), 0) as total_costs,
    -- Revenue calculations
    COALESCE(SUM(re.revenue_amount), 0) as total_revenue,
    -- Profit calculations
    COALESCE(SUM(re.revenue_amount), 0) - (COALESCE(SUM(mc.cost_amount), 0) + COALESCE(SUM(ac.cost_amount), 0)) as net_profit,
    CASE 
        WHEN COALESCE(SUM(re.revenue_amount), 0) > 0 
        THEN ((COALESCE(SUM(re.revenue_amount), 0) - (COALESCE(SUM(mc.cost_amount), 0) + COALESCE(SUM(ac.cost_amount), 0))) / COALESCE(SUM(re.revenue_amount), 0)) * 100
        ELSE 0 
    END as profit_margin_percentage,
    -- Account metrics
    COUNT(DISTINCT a.id) as total_accounts,
    COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.id END) as active_accounts
FROM models m
LEFT JOIN accounts a ON m.id = a.model_id
LEFT JOIN model_costs mc ON m.id = mc.model_id AND mc.is_active = true
LEFT JOIN account_costs ac ON a.id = ac.account_id AND ac.is_active = true
LEFT JOIN revenue_events re ON m.id = re.model_id
GROUP BY m.id, m.name, m.status; 