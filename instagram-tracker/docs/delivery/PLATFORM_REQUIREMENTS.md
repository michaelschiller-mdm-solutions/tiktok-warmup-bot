# Instagram Account Management Platform - Complete Requirements

## Overview
Comprehensive platform for managing Instagram accounts through automated warm-up processes, proxy management, and content orchestration for multiple models/campaigns.

## Core Workflow
1. **Import accounts** from txt files
2. **Auto-assign proxies** (3 accounts max per proxy)
3. **Warm-up accounts** through 5-day process
4. **Assign warmed accounts** to models
5. **Bot automation** executes all Instagram actions
6. **Analytics tracking** for all operations

## Account Lifecycle States

### 1. **Imported** 
- Just imported from txt file
- No proxy assigned yet
- Awaiting proxy assignment

### 2. **Proxy Assigned**
- Has proxy assigned (auto or manual)
- Ready to start warm-up process
- Not yet in warm-up

### 3. **Warm-up Process** (5 calendar days)
- **Day 1**: Change profile picture
- **Day 2**: Change bio  
- **Day 3**: Post a highlight
- **Day 4**: Post a story
- **Day 5**: Post a post

### 4. **Human Review Needed**
- Step failed during warm-up
- Requires manual intervention
- Detailed error logs available
- Can be retried or fixed manually

### 5. **Ready/Available**
- Completed all warm-up steps successfully
- Available for assignment to models
- Can be batch assigned to models

### 6. **Active in Model**
- Currently assigned to a specific model
- Following model's strategy and content
- Actively managed by bot

### 7. **Cleanup Required**
- Model was deleted or account reassigned
- Needs profile reset (bio, pfp)
- Needs posts deleted
- After cleanup → returns to "Ready" state

## Navigation & User Interface

### Model Management
- **Models Dashboard**: Grid of model cards
- **Click Model Card** → Navigate to `/models/:id/accounts`
- **Model Accounts Page**: Multiple views of accounts for this model

### Account Views Required

#### A. **Model Accounts Overview**
- All accounts assigned to this model
- Current step/status for each account
- Performance metrics per account

#### B. **Available Accounts**
- Accounts in "Ready" state
- Batch selection for assignment to current model
- Filtering by criteria (proxy location, performance, etc.)

#### C. **Warm-up Pipeline**
- Accounts currently in warm-up process (steps 1-5)
- Progress tracking per step
- Error handling for failed steps

#### D. **Proxy Management**
- Free proxy IPs available
- Which proxy is used by which model
- Proxy assignment interface
- 3-account limit enforcement

#### E. **Needs Attention**
- Accounts requiring human review
- Accounts without proxies
- Failed operations requiring intervention

## Data Models

### Account Extended Properties
```typescript
interface Account {
  // Existing fields...
  
  // Lifecycle
  lifecycle_state: 'imported' | 'proxy_assigned' | 'warming_up' | 'human_review' | 'ready' | 'active' | 'cleanup';
  warmup_step: 1 | 2 | 3 | 4 | 5 | null;
  warmup_started_at?: Date;
  warmup_completed_at?: Date;
  assigned_to_model_at?: Date;
  
  // Proxy relationship
  proxy_id?: number;
  proxy_assigned_at?: Date;
  
  // Bot tracking
  last_bot_action_by?: string; // Bot ID
  last_bot_action_at?: Date;
  
  // Error handling
  requires_human_review: boolean;
  last_error_message?: string;
  last_error_at?: Date;
  retry_count: number;
}
```

### Proxy Management
```typescript
interface Proxy {
  id: number;
  ip: string;
  port: number;
  username: string;
  password: string; // encrypted
  provider: string;
  location: string;
  monthly_cost: number;
  status: 'active' | 'inactive' | 'error';
  
  // Assignment tracking
  assigned_model_id?: number;
  account_count: number; // max 3
  max_accounts: 3;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  last_tested_at?: Date;
}
```

### Content Management
```typescript
interface ModelContent {
  id: number;
  model_id: number;
  content_type: 'pfp' | 'post' | 'highlight' | 'story' | 'any';
  image_url: string;
  text_content?: string;
  is_template: boolean;
  order_priority: number;
  created_at: Date;
}

interface TextPool {
  id: number;
  model_id: number;
  content_type: 'bio' | 'post' | 'story' | 'highlight';
  text_content: string;
  usage_count: number;
  is_template: boolean;
  created_at: Date;
}
```

### Step Tracking
```typescript
interface WarmupStepLog {
  id: number;
  account_id: number;
  step_number: 1 | 2 | 3 | 4 | 5;
  step_name: 'change_pfp' | 'change_bio' | 'post_highlight' | 'post_story' | 'post_post';
  
  // Execution details
  started_at: Date;
  completed_at?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'requires_review';
  
  // Bot information
  bot_id?: string;
  bot_session_id?: string;
  
  // Content used
  content_used?: any; // JSON of what content was used
  
  // Error handling
  error_message?: string;
  error_details?: any; // JSON
  retry_count: number;
  
  // Analytics
  execution_time_ms?: number;
  instagram_response?: any; // JSON
}
```

## Import Systems

### Account Import
- **Format**: `username,password,email,additional_fields`
- **Validation**: Check for duplicates only
- **Process**: 
  1. Parse txt file
  2. Validate format
  3. Check duplicates against existing accounts
  4. Insert new accounts in 'imported' state
  5. Auto-assign available proxies
  6. Move to warm-up queue

### Proxy Import (Future)
- **Status**: "Coming Soon" placeholder
- **Format**: TBD
- **Validation**: TBD

## Bot Integration Requirements

### Bot Architecture
- **Platform**: PC connected to iPhone
- **Method**: Screen automation/autoclicker on iPhone screen
- **Concurrency**: Multiple bots can work simultaneously
- **Data Access**: REST API endpoints for all operations

### Bot API Requirements
```typescript
// Bot needs to:
GET /api/bot/next-task/:bot_id          // Get next account to process
GET /api/bot/account/:id/content        // Get content for specific step
POST /api/bot/step-complete             // Mark step as completed
POST /api/bot/step-failed               // Mark step as failed with error
GET /api/bot/images/:content_id         // Download images for posting
PUT /api/bot/heartbeat/:bot_id          // Bot status updates
```

### Bot Data Needs
- Account credentials (username, password)
- Proxy information (IP, port, credentials)
- Step-specific content (images, text)
- Current step to execute
- Error reporting mechanism
- Progress tracking

## Analytics & Tracking

### Required Metrics
- Accounts per lifecycle state
- Warm-up success rates per step
- Proxy utilization rates
- Bot performance metrics
- Model account performance
- Error frequency and types
- Time per warm-up step
- Overall conversion rates

### Logging Requirements
- All bot actions with timestamps
- Error details with stack traces
- Performance metrics per operation
- User actions and changes
- Proxy status changes
- Account state transitions

## User Workflows

### Daily Operations
1. **Check warm-up pipeline** - see accounts progressing through steps
2. **Review failed accounts** - handle human review items
3. **Assign ready accounts** - batch assign to models
4. **Monitor proxy utilization** - ensure optimal proxy usage
5. **Import new accounts** - bulk import when needed
6. **Review analytics** - track overall performance

### Content Management
1. **Upload model content** - images for each category
2. **Create text pools** - bio, post, story texts
3. **Create templates** - reusable content sets
4. **Assign content to models** - specific content strategies

### Model Management
1. **Create models** with content strategy
2. **Assign warmed accounts** to models
3. **Monitor model performance**
4. **Handle model deletion** (cleanup process)

## Future Bot Development Context

### Technical Requirements for Bot
- **REST API client** for data communication
- **Image download/upload** capabilities
- **Error handling** and retry logic
- **Session management** per account
- **Proxy connection** management
- **Instagram action simulation** (human-like behavior)
- **Status reporting** and heartbeat system

### Bot Development Priority
- Bot development starts AFTER platform completion
- Platform must provide complete API interface
- All bot workflows must be testable through platform UI
- Bot should handle all Instagram automation tasks
- Platform focuses on data management and workflow orchestration

## Next Steps
1. Update current PBI and task structure for expanded scope
2. Implement navigation from model to accounts page
3. Build account lifecycle management system
4. Create proxy management system
5. Implement import functionality
6. Build content management system
7. Create bot API endpoints
8. Develop analytics dashboard 