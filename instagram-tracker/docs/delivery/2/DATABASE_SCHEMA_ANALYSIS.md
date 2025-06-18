# Database Schema Analysis - Current vs Required State

## Executive Summary

We need to redesign the database schema to support the **10-phase warmup system** with **container management**. The current system has a 5-phase sequential warmup system, but the actual requirement is a 10-phase randomized system with container assignment and new content categories.

---

## Current Database State Analysis

### ✅ **Existing Tables (Well Established)**

#### **1. Core Tables**
- `models` - Instagram model configurations ✅ **COMPLETE**
- `accounts` - Instagram account management ✅ **MOSTLY COMPLETE**
- `target_users` - Follow target management ✅ **COMPLETE**
- `model_target_follows` - Follow tracking ✅ **COMPLETE**
- `posts` - Content posting ✅ **COMPLETE**
- `activity_logs` - Action tracking ✅ **COMPLETE**

#### **2. Advanced Analytics (From migrations)**
- `cost_categories` - Expense categorization ✅ **COMPLETE**
- `model_costs` - Per-model cost tracking ✅ **COMPLETE**
- `account_costs` - Per-account expense tracking ✅ **COMPLETE**
- `revenue_events` - Income tracking ✅ **COMPLETE**
- `conversion_events` - Follow-to-subscription tracking ✅ **COMPLETE**
- `proxy_providers` - Proxy service management ✅ **COMPLETE**

#### **3. Content Management System**
- `model_content` - Image/media content ✅ **COMPLETE**
- `model_text_content` - Text content templates ✅ **NEEDS CATEGORIES**
- `content_text_assignments` - Image-text linking ✅ **COMPLETE**

#### **4. Bot System Infrastructure**
- `bot_sessions` - Bot activity tracking ✅ **COMPLETE**
- `warmup_content_assignments` - Content assignment logging ✅ **COMPLETE**

---

## ❌ **Current Problems - Wrong Implementation**

### **1. Warmup Phase System - COMPLETELY WRONG**
**Current State (WRONG)**:
```sql
-- From 005-warmup-phase-system.sql
CREATE TABLE account_warmup_phases (
  phase VARCHAR(20) NOT NULL CHECK (phase IN ('pfp', 'bio', 'post', 'highlight', 'story')), -- 5 phases
  -- Sequential progression logic
  -- No container management
  -- No randomization
);
```

**Required State**:
- **10 phases**: bio, gender, name, username, first_highlight, new_highlight, post_caption, post_no_caption, story_caption, story_no_caption
- **Random assignment** after Phase 0 (manual setup)
- **No sequential progression** (except new_highlight requires first_highlight)
- **Container assignment integration**

### **2. Container Management - MISSING**
**Current State**: 
- `accounts.container_number` field exists (from migration 012) ✅
- **NO container management table**
- **NO container assignment logic**
- **NO container availability tracking**

**Required State**:
```sql
-- MISSING TABLE
CREATE TABLE container_assignments (
  id SERIAL PRIMARY KEY,
  container_number INTEGER NOT NULL CHECK (container_number BETWEEN 1 AND 30),
  account_id INTEGER REFERENCES accounts(id),
  assigned_at TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('available', 'assigned', 'invalid'))
);
```

### **3. Content Categories - INCOMPLETE**
**Current State**:
- Text content categories exist but missing: `name`, `highlight_group_name`
- Image categories: `pfp`, `bio`, `post`, `highlight`, `story`, `any` ✅

**Required State**:
- **NEW Text Categories**: `name`, `highlight_group_name`
- **Phase Matching**: Content assignment based on specific phase requirements

### **4. Account Fields - PARTIAL**
**Current State**:
```sql
ALTER TABLE accounts ADD COLUMN container_number INTEGER; -- ✅ EXISTS
ALTER TABLE accounts ADD COLUMN email_password_encrypted TEXT; -- ✅ EXISTS
-- Missing lifecycle and warmup state tracking
```

**Required State**:
```sql
ALTER TABLE accounts ADD COLUMN lifecycle_state VARCHAR(20) DEFAULT 'imported';
ALTER TABLE accounts ADD COLUMN cooldown_until TIMESTAMP;
ALTER TABLE accounts ADD COLUMN warmup_completed_phases INTEGER DEFAULT 0;
```

---

## 🎯 **Target "Should Be" State**

### **1. Container Management System**
```sql
-- NEW TABLE: Container assignment tracking
CREATE TABLE container_assignments (
  id SERIAL PRIMARY KEY,
  container_number INTEGER NOT NULL CHECK (container_number BETWEEN 1 AND 30),
  account_id INTEGER UNIQUE REFERENCES accounts(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'assigned'))
);

-- Ensure all 30 containers exist
INSERT INTO container_assignments (container_number, status) 
SELECT generate_series(1, 30), 'available';
```

### **2. 10-Phase Warmup System**
```sql
-- REDESIGNED TABLE: 10-phase warmup tracking
DROP TABLE IF EXISTS account_warmup_phases CASCADE;
CREATE TABLE account_warmup_phases (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  phase VARCHAR(30) NOT NULL CHECK (phase IN (
    'manual_setup',        -- Phase 0
    'bio',                 -- Phase 1
    'gender',              -- Phase 2  
    'name',                -- Phase 3
    'username',            -- Phase 4
    'first_highlight',     -- Phase 5
    'new_highlight',       -- Phase 6 (requires first_highlight)
    'post_caption',        -- Phase 7
    'post_no_caption',     -- Phase 8
    'story_caption',       -- Phase 9
    'story_no_caption'     -- Phase 10
  )),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Not yet available
    'available',         -- Can be started (cooldown met)
    'in_progress',       -- Bot working on it
    'completed',         -- Successfully finished
    'failed',            -- Failed, can retry once
    'requires_review'    -- Human intervention needed
  )),
  
  -- Timing and cooldown
  available_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cooldown_until TIMESTAMP,
  
  -- Content assignment
  assigned_content_id INTEGER REFERENCES model_content(id),
  assigned_text_id INTEGER REFERENCES model_text_content(id),
  
  -- Bot tracking
  bot_id VARCHAR(50),
  bot_session_id VARCHAR(100),
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 1, -- Only 1 retry, then human review
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(account_id, phase)
);
```

### **3. Enhanced Content Categories**
```sql
-- ADD NEW TEXT CATEGORIES
INSERT INTO model_text_content (model_id, text_content, categories, template_name)
SELECT model_id, 'Sample Name', '["name"]', 'name_templates' FROM models;

INSERT INTO model_text_content (model_id, text_content, categories, template_name)  
SELECT model_id, 'Highlight Group', '["highlight_group_name"]', 'highlight_templates' FROM models;
```

### **4. Enhanced Account Management**
```sql
-- ADD LIFECYCLE AND WARMUP TRACKING
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS lifecycle_state VARCHAR(20) DEFAULT 'imported'
  CHECK (lifecycle_state IN ('imported', 'ready', 'warmup', 'active', 'invalid'));
  
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS state_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS state_changed_by VARCHAR(50);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMP;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS warmup_completed_phases INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS requires_human_review BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_error_message TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP;
```

### **5. Configuration and Settings**
```sql
-- WARMUP CONFIGURATION TABLE
CREATE TABLE warmup_settings (
  id SERIAL PRIMARY KEY,
  model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
  cooldown_min_hours INTEGER DEFAULT 15,
  cooldown_max_hours INTEGER DEFAULT 24,
  randomize_cooldown BOOLEAN DEFAULT true,
  max_retries_per_phase INTEGER DEFAULT 1,
  enable_human_review BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(model_id)
);
```

---

## 📋 **Migration Plan - Implementation Steps**

### **Step 1: Container Management (Priority 1)**
**File**: `013-container-management.sql`
- Create `container_assignments` table
- Initialize 30 containers  
- Add container assignment functions
- Update account triggers for container management

### **Step 2: Warmup System Redesign (Priority 2)**  
**File**: `014-redesign-warmup-system.sql`
- Drop old 5-phase `account_warmup_phases` table
- Create new 10-phase `account_warmup_phases` table
- Add phase management functions
- Add cooldown and dependency logic

### **Step 3: Content Categories (Priority 3)**
**File**: `015-add-content-categories.sql`
- Add `name` and `highlight_group_name` text content types
- Update content assignment functions
- Add phase-specific content matching

### **Step 4: Account Lifecycle Enhancement (Priority 4)**
**File**: `016-account-lifecycle-enhancement.sql`
- Add lifecycle state tracking fields
- Add cooldown and error tracking fields
- Update account management functions

### **Step 5: Configuration System (Priority 5)**
**File**: `017-warmup-configuration.sql`
- Create warmup settings table
- Add configuration management functions
- Set default configurations per model

---

## 🔍 **Key Differences Summary**

### **What We Have vs What We Need**

| Component | Current State | Required State | Action Needed |
|-----------|---------------|----------------|---------------|
| **Warmup Phases** | 5 sequential phases | 10 randomized phases | Complete redesign |
| **Container Management** | `container_number` field only | Full container assignment system | Build from scratch |
| **Content Categories** | Missing name, highlight_group_name | Complete category system | Add missing types |
| **Lifecycle Tracking** | Basic status field | Complete state management | Enhance existing |
| **Cooldown System** | 24-48 hour intervals | 15-24 hour per-account | Redesign timing |
| **Bot Integration** | 5-phase API | 10-phase with container info | Update all endpoints |
| **Human Review** | Basic error tracking | Complete review system | Build review workflow |

### **Database Changes Required**
- **NEW**: `container_assignments` table
- **REDESIGN**: `account_warmup_phases` table (complete overhaul)
- **ENHANCE**: `accounts` table (add lifecycle fields)
- **ADD**: New text content categories
- **NEW**: `warmup_settings` configuration table

### **Impact Assessment**
- **High Impact**: Complete warmup system redesign
- **Medium Impact**: Container management integration  
- **Low Impact**: Content category additions
- **Breaking Changes**: All existing warmup phase data will need migration
- **API Changes**: All bot endpoints need updates for 10-phase system

This analysis shows we have a solid foundation but need substantial changes to support the actual 10-phase warmup system requirements. 