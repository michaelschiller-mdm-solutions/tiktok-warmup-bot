-- Extended Sample Data for Instagram Tracker
-- Includes proxy management, cost tracking, and analytics data
-- Version: 2.0
-- Created: 2025-01-27

-- Insert sample proxy providers
INSERT INTO proxy_providers (name, monthly_cost_per_proxy, setup_fee, is_active, notes) VALUES
('ProxyMesh', 15.00, 0.00, true, 'Reliable datacenter proxies'),
('BrightData', 25.00, 10.00, true, 'Premium residential proxies'),
('SmartProxy', 12.50, 0.00, true, 'Budget-friendly residential proxies'),
('Oxylabs', 35.00, 0.00, true, 'Enterprise-grade proxies'),
('NetNut', 18.00, 5.00, true, 'High-speed datacenter proxies');

-- Insert sample accounts with extended data (after models are created)
INSERT INTO accounts (
    model_id, username, password, email, account_code, display_name, bio, status, 
    content_type, campus, niche, cta_text, 
    proxy_host, proxy_port, proxy_username, proxy_password_encrypted, proxy_provider, proxy_status, proxy_location,
    adspower_profile_id, cupid_profile_id, cupid_system_prompt,
    monthly_cost
) VALUES
-- Fitness Influencers Model (model_id = 1)
(1, 'fitlife_sarah', 'encrypted_password', 'sarah@fitlife.com', 'FL001', 'Sarah FitLife', 'Fitness trainer & nutritionist 💪', 'active',
 'fitness', 'Los Angeles', 'health', 'DM for personalized workout plans!',
 '192.168.1.100', 8080, 'proxy_user_1', encrypt_proxy_password('proxy_pass_1'), 'ProxyMesh', 'active', 'US-West',
 'AP_PROFILE_001', 'CUPID_001', 'You are a fitness enthusiast who loves to share workout tips and motivational content.',
 45.00),

(1, 'musclemax_mike', 'encrypted_password', 'mike@musclemax.com', 'MM002', 'Mike MuscleMax', 'Bodybuilder & fitness coach 🏋️', 'active',
 'fitness', 'Miami', 'bodybuilding', 'Transform your body - link in bio!',
 '192.168.1.101', 8080, 'proxy_user_2', encrypt_proxy_password('proxy_pass_2'), 'BrightData', 'active', 'US-East',
 'AP_PROFILE_002', 'CUPID_002', 'You are a bodybuilding coach focused on muscle building and strength training.',
 55.00),

(1, 'yoga_zen_anna', 'encrypted_password', 'anna@yogazen.com', 'YZ003', 'Anna YogaZen', 'Yoga instructor & mindfulness coach 🧘', 'active',
 'fitness', 'San Francisco', 'yoga', 'Find your inner peace - sessions available!',
 '192.168.1.102', 8080, 'proxy_user_3', encrypt_proxy_password('proxy_pass_3'), 'SmartProxy', 'active', 'US-West',
 'AP_PROFILE_003', 'CUPID_003', 'You are a yoga instructor who promotes mindfulness and inner peace.',
 35.00),

-- Fashion Brands Model (model_id = 2)
(2, 'style_queen_lisa', 'encrypted_password', 'lisa@stylequeen.com', 'SQ004', 'Lisa StyleQueen', 'Fashion blogger & style consultant ✨', 'active',
 'fashion', 'New York', 'lifestyle', 'Style tips & outfit inspiration!',
 '192.168.1.103', 8080, 'proxy_user_4', encrypt_proxy_password('proxy_pass_4'), 'ProxyMesh', 'active', 'US-East',
 'AP_PROFILE_004', 'CUPID_004', 'You are a fashion blogger who shares style tips and outfit inspiration.',
 40.00),

(2, 'trendy_tom', 'encrypted_password', 'tom@trendy.com', 'TT005', 'Tom Trendy', 'Mens fashion & lifestyle content creator 🕺', 'active',
 'fashion', 'Chicago', 'menswear', 'Elevate your style game!',
 '192.168.1.104', 8080, 'proxy_user_5', encrypt_proxy_password('proxy_pass_5'), 'BrightData', 'active', 'US-Central',
 'AP_PROFILE_005', 'CUPID_005', 'You are a mens fashion influencer focused on style and lifestyle content.',
 50.00),

-- Tech Startups Model (model_id = 3)
(3, 'tech_innovator_david', 'encrypted_password', 'david@techinnovator.com', 'TI006', 'David TechInnovator', 'Entrepreneur & tech evangelist 🚀', 'active',
 'technology', 'Silicon Valley', 'startups', 'Building the future - lets connect!',
 '192.168.1.105', 8080, 'proxy_user_6', encrypt_proxy_password('proxy_pass_6'), 'Oxylabs', 'active', 'US-West',
 'AP_PROFILE_006', 'CUPID_006', 'You are a tech entrepreneur who shares insights about startups and innovation.',
 60.00),

(3, 'ai_specialist_emma', 'encrypted_password', 'emma@aispecialist.com', 'AS007', 'Emma AI Specialist', 'AI researcher & machine learning expert 🤖', 'active',
 'technology', 'Boston', 'AI', 'Exploring the future of AI - thoughts welcome!',
 '192.168.1.106', 8080, 'proxy_user_7', encrypt_proxy_password('proxy_pass_7'), 'NetNut', 'active', 'US-East',
 'AP_PROFILE_007', 'CUPID_007', 'You are an AI researcher who shares insights about artificial intelligence and machine learning.',
 45.00);

-- Insert sample cost data for models
INSERT INTO model_costs (model_id, cost_category_id, cost_amount, cost_period, description) VALUES
-- Fitness Influencers Model costs
(1, (SELECT id FROM cost_categories WHERE name = 'VPS'), 50.00, 'monthly', 'Dedicated server for automation'),
(1, (SELECT id FROM cost_categories WHERE name = 'Tunnelbear'), 15.00, 'monthly', 'VPN service for secure connections'),
(1, (SELECT id FROM cost_categories WHERE name = 'Chatter'), 25.00, 'monthly', 'Chat automation service'),
(1, (SELECT id FROM cost_categories WHERE name = 'Model'), 100.00, 'monthly', 'Model management and optimization'),

-- Fashion Brands Model costs
(2, (SELECT id FROM cost_categories WHERE name = 'VPS'), 40.00, 'monthly', 'Shared server resources'),
(2, (SELECT id FROM cost_categories WHERE name = 'Tunnelbear'), 15.00, 'monthly', 'VPN service'),
(2, (SELECT id FROM cost_categories WHERE name = 'Chatter'), 20.00, 'monthly', 'Basic chat automation'),
(2, (SELECT id FROM cost_categories WHERE name = 'Model'), 75.00, 'monthly', 'Model management'),

-- Tech Startups Model costs
(3, (SELECT id FROM cost_categories WHERE name = 'VPS'), 75.00, 'monthly', 'High-performance server'),
(3, (SELECT id FROM cost_categories WHERE name = 'Tunnelbear'), 25.00, 'monthly', 'Premium VPN service'),
(3, (SELECT id FROM cost_categories WHERE name = 'Chatter'), 35.00, 'monthly', 'Advanced chat automation'),
(3, (SELECT id FROM cost_categories WHERE name = 'Model'), 150.00, 'monthly', 'Premium model management');

-- Insert sample account costs
INSERT INTO account_costs (account_id, cost_category_id, cost_amount, cost_period, description) 
SELECT 
    a.id,
    (SELECT id FROM cost_categories WHERE name = 'Proxies'),
    pp.monthly_cost_per_proxy,
    'monthly',
    'Proxy service cost'
FROM accounts a
JOIN proxy_providers pp ON a.proxy_provider = pp.name;

-- Insert sample account costs for Cupid profiles
INSERT INTO account_costs (account_id, cost_category_id, cost_amount, cost_period, description)
SELECT 
    id,
    (SELECT id FROM cost_categories WHERE name = 'Cupid'),
    10.00,
    'monthly',
    'Cupid profile management'
FROM accounts;

-- Insert some sample follow data
INSERT INTO model_target_follows (model_id, account_id, target_user_id, followed_at, status, is_followed_back, followed_back_at)
SELECT 
    1, -- Fitness model
    a.id,
    tu.id,
    CURRENT_TIMESTAMP - INTERVAL '1 day' * FLOOR(RANDOM() * 30),
    CASE WHEN RANDOM() > 0.3 THEN 'following' ELSE 'unfollowed' END,
    RANDOM() > 0.6, -- 40% follow back rate
    CASE WHEN RANDOM() > 0.6 THEN CURRENT_TIMESTAMP - INTERVAL '1 hour' * FLOOR(RANDOM() * 48) ELSE NULL END
FROM accounts a
CROSS JOIN target_users tu
WHERE a.model_id = 1 AND tu.category = 'fitness'
LIMIT 20;

-- Insert some sample conversion events
INSERT INTO conversion_events (account_id, model_id, target_user_id, conversion_type, conversion_value, conversion_source)
SELECT 
    mtf.account_id,
    mtf.model_id,
    mtf.target_user_id,
    'subscription',
    50.00 + RANDOM() * 200,
    CASE FLOOR(RANDOM() * 4)
        WHEN 0 THEN 'dm'
        WHEN 1 THEN 'bio_link'
        WHEN 2 THEN 'story'
        ELSE 'post'
    END
FROM model_target_follows mtf
WHERE mtf.is_followed_back = true
AND RANDOM() > 0.8 -- 20% conversion rate from follow backs
LIMIT 10;

-- Insert sample revenue events
INSERT INTO revenue_events (account_id, model_id, revenue_type, revenue_amount, source_user_id)
SELECT 
    ce.account_id,
    ce.model_id,
    'subscription',
    ce.conversion_value,
    ce.target_user_id
FROM conversion_events ce;

-- Insert some sample dynamic columns for models
INSERT INTO dynamic_columns (model_id, column_name, column_type, column_order, description) VALUES
(1, 'Workout_Type', 'TEXT', 1, 'Primary workout type promoted'),
(1, 'Training_Level', 'TEXT', 2, 'Beginner, Intermediate, or Advanced'),
(1, 'Certification', 'BOOLEAN', 3, 'Has fitness certification'),
(2, 'Style_Category', 'TEXT', 1, 'Primary style category'),
(2, 'Brand_Partnerships', 'NUMBER', 2, 'Number of brand partnerships'),
(2, 'Fashion_Week_Attendance', 'BOOLEAN', 3, 'Attended fashion week events'),
(3, 'Tech_Stack', 'TEXT', 1, 'Primary technology stack'),
(3, 'Years_Experience', 'NUMBER', 2, 'Years of experience in tech'),
(3, 'Startup_Founded', 'BOOLEAN', 3, 'Has founded a startup');

-- Insert sample dynamic data for accounts
INSERT INTO account_dynamic_data (account_id, dynamic_column_id, value_text, value_number, value_boolean)
SELECT 
    a.id,
    dc.id,
    CASE dc.column_type
        WHEN 'TEXT' THEN 
            CASE dc.column_name
                WHEN 'Workout_Type' THEN 'Strength Training'
                WHEN 'Training_Level' THEN 'Advanced'
                WHEN 'Style_Category' THEN 'Streetwear'
                WHEN 'Tech_Stack' THEN 'React/Node.js'
                ELSE 'Sample Text'
            END
        ELSE NULL
    END,
    CASE dc.column_type
        WHEN 'NUMBER' THEN FLOOR(RANDOM() * 10) + 1
        ELSE NULL
    END,
    CASE dc.column_type
        WHEN 'BOOLEAN' THEN RANDOM() > 0.5
        ELSE NULL
    END
FROM accounts a
JOIN dynamic_columns dc ON a.model_id = dc.model_id;

-- Update account performance metrics (this will be done automatically by triggers in production)
UPDATE accounts 
SET 
    follow_back_rate = calculate_follow_back_rate(id),
    conversion_rate = calculate_conversion_rate(id),
    total_follows = (SELECT COUNT(*) FROM model_target_follows WHERE account_id = accounts.id),
    total_conversions = (SELECT COUNT(*) FROM conversion_events WHERE account_id = accounts.id);

-- Insert sample activity logs for new features
INSERT INTO activity_logs (account_id, model_id, action_type, target_username, details, success) 
SELECT 
    a.id,
    a.model_id,
    'proxy_health_check',
    NULL,
    jsonb_build_object('proxy_provider', a.proxy_provider, 'status', a.proxy_status),
    true
FROM accounts a;

-- Create some sample performance snapshots
INSERT INTO performance_snapshots (account_id, model_id, snapshot_date, total_follows, total_follow_backs, total_conversions, follow_back_rate, conversion_rate, revenue_generated, costs_incurred, net_profit)
SELECT 
    a.id,
    a.model_id,
    CURRENT_DATE - INTERVAL '1 day' * generate_series(1, 7),
    a.total_follows,
    FLOOR(a.total_follows * a.follow_back_rate / 100),
    a.total_conversions,
    a.follow_back_rate,
    a.conversion_rate,
    COALESCE((SELECT SUM(revenue_amount) FROM revenue_events WHERE account_id = a.id), 0),
    a.monthly_cost,
    COALESCE((SELECT SUM(revenue_amount) FROM revenue_events WHERE account_id = a.id), 0) - a.monthly_cost
FROM accounts a; 