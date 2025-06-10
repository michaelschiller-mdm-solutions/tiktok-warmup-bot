-- Instagram Tracker Database Schema
-- Version: 1.0
-- Created: 2024-01-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Models table (campaigns/groups)
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
    unfollow_ratio INTEGER DEFAULT 90 CHECK (unfollow_ratio >= 0 AND unfollow_ratio <= 100),
    daily_follow_limit INTEGER DEFAULT 100 CHECK (daily_follow_limit > 0),
    posting_schedule JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table (Instagram accounts per model)
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    account_code VARCHAR(255),
    display_name VARCHAR(255),
    bio TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'banned', 'suspended', 'inactive')),
    creation_date DATE,
    device_info JSONB DEFAULT '{}',
    profile_picture_url TEXT,
    location VARCHAR(255),
    birth_date DATE,
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, username)
);

-- Target users table (users to be followed)
CREATE TABLE target_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    profile_url TEXT,
    display_name VARCHAR(255),
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    bio TEXT,
    is_private BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    category VARCHAR(255),
    location VARCHAR(255),
    notes TEXT,
    last_scraped TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Follow relationships table (tracks follows per model)
CREATE TABLE model_target_follows (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    target_user_id INTEGER NOT NULL REFERENCES target_users(id) ON DELETE CASCADE,
    followed_at TIMESTAMP WITH TIME ZONE,
    unfollowed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'following', 'unfollowed', 'failed')),
    follow_duration_days INTEGER,
    is_followed_back BOOLEAN DEFAULT false,
    followed_back_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, target_user_id) -- One target per model
);

-- Posts table (content posts per account)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    content TEXT,
    media_urls JSONB DEFAULT '[]',
    caption TEXT,
    hashtags TEXT[],
    scheduled_at TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
    engagement_data JSONB DEFAULT '{}', -- likes, comments, shares
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table (track all actions)
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- 'follow', 'unfollow', 'post', 'login', etc.
    target_username VARCHAR(255),
    details JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_accounts_model_id ON accounts(model_id);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_username ON accounts(username);

CREATE INDEX idx_target_users_username ON target_users(username);
CREATE INDEX idx_target_users_category ON target_users(category);

CREATE INDEX idx_follows_model_id ON model_target_follows(model_id);
CREATE INDEX idx_follows_account_id ON model_target_follows(account_id);
CREATE INDEX idx_follows_target_user_id ON model_target_follows(target_user_id);
CREATE INDEX idx_follows_status ON model_target_follows(status);
CREATE INDEX idx_follows_followed_at ON model_target_follows(followed_at);

CREATE INDEX idx_posts_account_id ON posts(account_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at);

CREATE INDEX idx_activity_logs_account_id ON activity_logs(account_id);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_target_users_updated_at BEFORE UPDATE ON target_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_follows_updated_at BEFORE UPDATE ON model_target_follows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 