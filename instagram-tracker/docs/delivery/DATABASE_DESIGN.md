# Database Design - Instagram Automation Platform

## Overview
Complete database schema design for the Instagram account management platform, including all tables, relationships, indexes, and constraints needed to support account lifecycle management, proxy management, content management, and bot integration.

## Database Architecture

### **Core Principles**
- **Data Integrity**: Foreign key constraints and validation rules
- **Performance**: Strategic indexing for common queries  
- **Scalability**: Designed for 10,000+ accounts per model
- **Audit Trail**: Complete logging of all state changes
- **Bot Integration**: Optimized for high-frequency bot operations

## **Table Definitions**

### **1. Core Tables (Existing - Extended)**

#### **models**
```sql
CREATE TABLE models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
  unfollow_ratio INTEGER DEFAULT 90 CHECK (unfollow_ratio BETWEEN 0 AND 100),
  daily_follow_limit INTEGER DEFAULT 50 CHECK (daily_follow_limit BETWEEN 1 AND 1000),
  posting_schedule JSONB DEFAULT '{}',
  
  -- Enhanced fields
  total_accounts INTEGER DEFAULT 0,
  active_accounts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_models_status ON models(status);
CREATE INDEX idx_models_created_at ON models(created_at);
```

#### **accounts** (Major Extensions)
```sql
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  
  -- Basic account info
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  password_encrypted TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'banned', 'suspended', 'inactive')),
  
  -- Model relationship
  model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP,
  
  -- Lifecycle management
  lifecycle_state VARCHAR(20) DEFAULT 'imported' CHECK (lifecycle_state IN (
    'imported', 'proxy_assigned', 'warming_up', 'human_review', 'ready', 'active', 'cleanup'
  )),
  warmup_step INTEGER CHECK (warmup_step BETWEEN 1 AND 5),
  warmup_started_at TIMESTAMP,
  warmup_completed_at TIMESTAMP,
  
  -- Proxy relationship
  proxy_id INTEGER REFERENCES proxies(id) ON DELETE SET NULL,
  proxy_assigned_at TIMESTAMP,
  
  -- Bot tracking
  last_bot_action_by VARCHAR(50),
  last_bot_action_at TIMESTAMP,
  
  -- Error handling
  requires_human_review BOOLEAN DEFAULT FALSE,
  last_error_message TEXT,
  last_error_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  
  -- Additional fields
  bio TEXT,
  profile_picture_url VARCHAR(500),
  location_city VARCHAR(100),
  location_campus VARCHAR(100),
  location_niche VARCHAR(100),
  birthday DATE,
  device_info JSONB,
  content_type VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_username ON accounts(username);
CREATE INDEX idx_accounts_model_id ON accounts(model_id);
CREATE INDEX idx_accounts_lifecycle_state ON accounts(lifecycle_state);
CREATE INDEX idx_accounts_warmup_step ON accounts(warmup_step) WHERE warmup_step IS NOT NULL;
CREATE INDEX idx_accounts_proxy_id ON accounts(proxy_id);
CREATE INDEX idx_accounts_requires_review ON accounts(requires_human_review) WHERE requires_human_review = TRUE;
CREATE INDEX idx_accounts_last_bot_action ON accounts(last_bot_action_at);
CREATE INDEX idx_accounts_status ON accounts(status);
```

### **2. New Tables (Platform Extensions)**

#### **proxies**
```sql
CREATE TABLE proxies (
  id SERIAL PRIMARY KEY,
  
  -- Connection details
  ip VARCHAR(45) NOT NULL,
  port INTEGER NOT NULL CHECK (port BETWEEN 1 AND 65535),
  username VARCHAR(255) NOT NULL,
  password_encrypted TEXT NOT NULL,
  
  -- Metadata
  provider VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  monthly_cost DECIMAL(10,2) NOT NULL CHECK (monthly_cost >= 0),
  
  -- Status and assignment
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  assigned_model_id INTEGER REFERENCES models(id) ON DELETE SET NULL,
  account_count INTEGER DEFAULT 0 CHECK (account_count BETWEEN 0 AND 3),
  max_accounts INTEGER DEFAULT 3 CHECK (max_accounts = 3),
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_tested_at TIMESTAMP,
  last_error_message TEXT,
  
  UNIQUE(ip, port)
);

CREATE INDEX idx_proxies_status ON proxies(status);
CREATE INDEX idx_proxies_assigned_model ON proxies(assigned_model_id);
CREATE INDEX idx_proxies_account_count ON proxies(account_count);
CREATE INDEX idx_proxies_location ON proxies(location);
```

#### **model_content**
```sql
CREATE TABLE model_content (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  
  -- Content classification
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('pfp', 'post', 'highlight', 'story', 'any')),
  
  -- Content data
  image_url VARCHAR(500) NOT NULL,
  text_content TEXT,
  
  -- Organization
  is_template BOOLEAN DEFAULT FALSE,
  order_priority INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  
  -- Performance tracking
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  last_used_at TIMESTAMP
);

CREATE INDEX idx_model_content_model_id ON model_content(model_id);
CREATE INDEX idx_model_content_type ON model_content(content_type);
CREATE INDEX idx_model_content_template ON model_content(is_template) WHERE is_template = TRUE;
CREATE INDEX idx_model_content_usage ON model_content(usage_count);
```

#### **text_pools**
```sql
CREATE TABLE text_pools (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  
  -- Content classification
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('bio', 'post', 'story', 'highlight')),
  
  -- Text content
  text_content TEXT NOT NULL,
  
  -- Organization
  is_template BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  
  -- Quality tracking
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  last_used_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100)
);

CREATE INDEX idx_text_pools_model_id ON text_pools(model_id);
CREATE INDEX idx_text_pools_content_type ON text_pools(content_type);
CREATE INDEX idx_text_pools_template ON text_pools(is_template) WHERE is_template = TRUE;
CREATE INDEX idx_text_pools_usage ON text_pools(usage_count);
```

#### **warmup_step_logs**
```sql
CREATE TABLE warmup_step_logs (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Step identification
  step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 5),
  step_name VARCHAR(50) NOT NULL CHECK (step_name IN (
    'change_pfp', 'change_bio', 'post_highlight', 'post_story', 'post_post'
  )),
  
  -- Execution timeline
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'failed', 'requires_review'
  )),
  
  -- Bot information
  bot_id VARCHAR(50),
  bot_session_id VARCHAR(100),
  
  -- Content used
  content_used JSONB,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  execution_time_ms INTEGER,
  instagram_response JSONB,
  
  UNIQUE(account_id, step_number)
);

CREATE INDEX idx_warmup_logs_account_id ON warmup_step_logs(account_id);
CREATE INDEX idx_warmup_logs_step_number ON warmup_step_logs(step_number);
CREATE INDEX idx_warmup_logs_status ON warmup_step_logs(status);
CREATE INDEX idx_warmup_logs_bot_id ON warmup_step_logs(bot_id);
CREATE INDEX idx_warmup_logs_started_at ON warmup_step_logs(started_at);
CREATE INDEX idx_warmup_logs_failed ON warmup_step_logs(status) WHERE status = 'failed';
```

#### **account_state_history**
```sql
CREATE TABLE account_state_history (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- State transition
  from_state VARCHAR(20),
  to_state VARCHAR(20) NOT NULL,
  transition_reason VARCHAR(100),
  
  -- Context
  triggered_by VARCHAR(20) CHECK (triggered_by IN ('user', 'bot', 'system', 'scheduler')),
  bot_id VARCHAR(50),
  user_id VARCHAR(50),
  
  -- Additional data
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_state_history_account_id ON account_state_history(account_id);
CREATE INDEX idx_state_history_to_state ON account_state_history(to_state);
CREATE INDEX idx_state_history_created_at ON account_state_history(created_at);
CREATE INDEX idx_state_history_triggered_by ON account_state_history(triggered_by);
```

### **3. Analytics Tables**

#### **daily_metrics**
```sql
CREATE TABLE daily_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
  
  -- Account metrics
  total_accounts INTEGER DEFAULT 0,
  active_accounts INTEGER DEFAULT 0,
  warming_up_accounts INTEGER DEFAULT 0,
  failed_accounts INTEGER DEFAULT 0,
  
  -- Step success rates
  step_1_success_rate DECIMAL(5,2) DEFAULT 0.00,
  step_2_success_rate DECIMAL(5,2) DEFAULT 0.00,
  step_3_success_rate DECIMAL(5,2) DEFAULT 0.00,
  step_4_success_rate DECIMAL(5,2) DEFAULT 0.00,
  step_5_success_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Proxy metrics
  active_proxies INTEGER DEFAULT 0,
  proxy_utilization_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Bot metrics
  bot_actions INTEGER DEFAULT 0,
  bot_errors INTEGER DEFAULT 0,
  average_execution_time_ms INTEGER DEFAULT 0,
  
  UNIQUE(date, model_id)
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX idx_daily_metrics_model_id ON daily_metrics(model_id);
```

## **Database Relationships**

### **Primary Relationships**
1. **models** → **accounts** (1:many)
2. **proxies** → **accounts** (1:many, max 3)
3. **models** → **model_content** (1:many)
4. **models** → **text_pools** (1:many)
5. **accounts** → **warmup_step_logs** (1:many)
6. **accounts** → **account_state_history** (1:many)

### **Constraint Rules**
```sql
-- Proxy capacity enforcement
ALTER TABLE accounts ADD CONSTRAINT check_proxy_capacity 
  EXCLUDE USING gist (proxy_id WITH =) 
  WHERE (proxy_id IS NOT NULL) 
  HAVING COUNT(*) > 3;

-- Warmup step sequence
ALTER TABLE warmup_step_logs ADD CONSTRAINT check_step_sequence
  CHECK (
    (step_number = 1 AND step_name = 'change_pfp') OR
    (step_number = 2 AND step_name = 'change_bio') OR
    (step_number = 3 AND step_name = 'post_highlight') OR
    (step_number = 4 AND step_name = 'post_story') OR
    (step_number = 5 AND step_name = 'post_post')
  );
```

## **Performance Optimization**

### **Query Optimization Indexes**
```sql
-- Complex queries for dashboard
CREATE INDEX idx_accounts_dashboard ON accounts(model_id, lifecycle_state, status);
CREATE INDEX idx_warmup_progress ON warmup_step_logs(account_id, step_number, status);
CREATE INDEX idx_proxy_availability ON proxies(status, account_count) WHERE status = 'active';

-- Bot operation indexes
CREATE INDEX idx_bot_next_task ON accounts(lifecycle_state, warmup_step) 
  WHERE lifecycle_state = 'warming_up';
CREATE INDEX idx_bot_content_lookup ON model_content(model_id, content_type, is_template);
```

### **Triggers for Data Consistency**
```sql
-- Update account count on proxy assignment
CREATE OR REPLACE FUNCTION update_proxy_account_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Update old proxy
    IF OLD.proxy_id IS NOT NULL THEN
      UPDATE proxies SET account_count = account_count - 1 WHERE id = OLD.proxy_id;
    END IF;
    -- Update new proxy
    IF NEW.proxy_id IS NOT NULL THEN
      UPDATE proxies SET account_count = account_count + 1 WHERE id = NEW.proxy_id;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.proxy_id IS NOT NULL THEN
      UPDATE proxies SET account_count = account_count + 1 WHERE id = NEW.proxy_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.proxy_id IS NOT NULL THEN
      UPDATE proxies SET account_count = account_count - 1 WHERE id = OLD.proxy_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proxy_account_count
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_proxy_account_count();

-- Log state changes
CREATE OR REPLACE FUNCTION log_account_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.lifecycle_state != NEW.lifecycle_state THEN
    INSERT INTO account_state_history (
      account_id, from_state, to_state, transition_reason, triggered_by, metadata
    ) VALUES (
      NEW.id, OLD.lifecycle_state, NEW.lifecycle_state, 
      'automated_transition', 'system', 
      jsonb_build_object('timestamp', NOW())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_account_state_history
  AFTER UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION log_account_state_change();
```

## **Migration Strategy**

### **Phase 1: Core Extensions**
1. Add new columns to existing `accounts` table
2. Create `proxies` table with basic structure
3. Add essential indexes

### **Phase 2: Content Management**
1. Create `model_content` and `text_pools` tables
2. Add content-related indexes
3. Implement content validation constraints

### **Phase 3: Lifecycle Tracking**
1. Create `warmup_step_logs` table
2. Create `account_state_history` table
3. Add lifecycle triggers and functions

### **Phase 4: Analytics**
1. Create `daily_metrics` table
2. Add performance monitoring indexes
3. Implement analytics aggregation triggers

## **Security Considerations**

### **Data Protection**
- All passwords encrypted with bcrypt
- Proxy credentials encrypted at rest
- Bot session data encrypted
- Audit trail for all sensitive operations

### **Access Control**
- Row-level security for multi-tenant support
- API-level authentication for bot operations
- Rate limiting on sensitive endpoints
- Input validation at database level

## **Backup and Recovery**

### **Backup Strategy**
- Daily full backups of all tables
- Hourly incremental backups of critical tables (accounts, warmup_step_logs)
- Real-time replication for high availability
- Point-in-time recovery capability

### **Critical Data Priority**
1. **accounts** - Core business data
2. **warmup_step_logs** - Cannot be recreated
3. **account_state_history** - Audit trail
4. **proxies** - Expensive to replace
5. **model_content/text_pools** - User-created content 