-- Sample data for Instagram Tracker
-- This file provides initial test data for development

-- Insert sample models
INSERT INTO models (name, description, unfollow_ratio, daily_follow_limit, posting_schedule) VALUES
('Fitness Influencers', 'Campaign targeting fitness and wellness accounts', 85, 150, '{"times": ["09:00", "15:00", "21:00"], "frequency": "daily"}'),
('Fashion Brands', 'Fashion and lifestyle brand partnerships', 90, 100, '{"times": ["12:00", "18:00"], "frequency": "daily"}'),
('Tech Startups', 'B2B technology and startup accounts', 95, 75, '{"times": ["10:00", "16:00"], "frequency": "weekdays"}');

-- Insert sample target users
INSERT INTO target_users (username, display_name, follower_count, following_count, category, is_verified) VALUES
('fitness_guru_2024', 'Alex Fitness', 125000, 1200, 'fitness', true),
('style_maven_nyc', 'Sarah Style', 89000, 850, 'fashion', false),
('tech_innovator', 'Mike Tech', 45000, 2100, 'technology', true),
('wellness_coach', 'Emma Wellness', 67000, 980, 'fitness', false),
('fashion_forward', 'Zoe Fashion', 156000, 750, 'fashion', true),
('startup_founder', 'David Startup', 34000, 1500, 'technology', false),
('yoga_master', 'Lisa Yoga', 78000, 650, 'fitness', false),
('designer_dreams', 'Anna Designer', 112000, 890, 'fashion', false);

-- Note: Accounts will be imported via the web interface using the bulk import feature
-- The format for import will be: username:password:email:account_code

-- Sample activity logs (for demonstration)
INSERT INTO activity_logs (action_type, target_username, details, success) VALUES
('system_init', NULL, '{"message": "Database initialized with sample data"}', true),
('model_created', NULL, '{"model_name": "Fitness Influencers"}', true),
('model_created', NULL, '{"model_name": "Fashion Brands"}', true),
('model_created', NULL, '{"model_name": "Tech Startups"}', true); 