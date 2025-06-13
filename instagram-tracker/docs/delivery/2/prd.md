# PBI-2: Complete Instagram Account Management Platform

[View in Backlog](../backlog.md#user-content-2)

## Overview

Create a comprehensive Instagram account management platform with automated warm-up processes, proxy management, content orchestration, and bot integration. This includes Excel-like interfaces for all data management, lifecycle tracking from import to model assignment, and complete preparation for bot automation.

## Problem Statement

Campaign managers need a complete platform to manage Instagram accounts through their entire lifecycle - from import to warm-up to active campaign execution. The current system lacks:

- **Account Lifecycle Management**: Automated warm-up processes, state tracking, error handling
- **Proxy Management**: Automatic assignment, utilization tracking, cost management
- **Content Management**: Picture/text pools, templates, category-based assignment
- **Navigation & Views**: Multiple specialized views for different workflows
- **Bot Integration**: Complete API preparation for future bot development
- **Import/Export Systems**: Bulk account and proxy management
- **Analytics & Tracking**: Comprehensive logging and performance monitoring

## User Stories

### Navigation & Core Views
- As a campaign manager, I want to click a model card and navigate to dedicated account management views
- As a campaign manager, I want multiple specialized views (warm-up pipeline, available accounts, proxy management, etc.)
- As a campaign manager, I want Excel-like interfaces for all data management tasks

### Account Lifecycle Management
- As a campaign manager, I want accounts to progress through automated warm-up steps (pfp → bio → highlight → story → post)
- As a campaign manager, I want accounts that fail warm-up steps to be flagged for human review
- As a campaign manager, I want to track which bot performed each action and when
- As a campaign manager, I want to reassign accounts between models with automatic cleanup

### Proxy Management
- As a campaign manager, I want proxies automatically assigned to imported accounts (3 accounts max per proxy)
- As a campaign manager, I want to manually reassign proxies when needed
- As a campaign manager, I want to track proxy costs, locations, and utilization

### Content Management
- As a campaign manager, I want to upload pictures for each category (pfp, post, highlight, story)
- As a campaign manager, I want to create text pools for each content type
- As a campaign manager, I want to create reusable content templates between models
- As a campaign manager, I want automatic text assignment when pictures don't have specific text

### Import/Export Systems
- As a campaign manager, I want to bulk import accounts from txt files
- As a campaign manager, I want duplicate detection during import
- As a campaign manager, I want a "coming soon" proxy import system

### Bot Integration Preparation
- As a campaign manager, I want the platform to provide complete REST APIs for bot communication
- As a campaign manager, I want comprehensive logging for all bot actions
- As a campaign manager, I want error handling and retry mechanisms for bot failures

## Technical Approach

### Database Schema (Major Extensions)

**Enhanced Account Model**
```sql
ALTER TABLE accounts ADD COLUMN lifecycle_state VARCHAR(20) DEFAULT 'imported';
ALTER TABLE accounts ADD COLUMN warmup_step INTEGER DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN warmup_started_at TIMESTAMP DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN warmup_completed_at TIMESTAMP DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN proxy_id INTEGER REFERENCES proxies(id);
ALTER TABLE accounts ADD COLUMN proxy_assigned_at TIMESTAMP DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN last_bot_action_by VARCHAR(50) DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN last_bot_action_at TIMESTAMP DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN requires_human_review BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN last_error_message TEXT DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN last_error_at TIMESTAMP DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN assigned_to_model_at TIMESTAMP DEFAULT NULL;
```

**New Tables**
```sql
-- Proxy Management
CREATE TABLE proxies (
  id SERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  port INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  password_encrypted TEXT NOT NULL,
  provider VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  monthly_cost DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  assigned_model_id INTEGER REFERENCES models(id),
  account_count INTEGER DEFAULT 0,
  max_accounts INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_tested_at TIMESTAMP DEFAULT NULL
);

-- Content Management
CREATE TABLE model_content (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id),
  content_type VARCHAR(20) NOT NULL, -- 'pfp', 'post', 'highlight', 'story', 'any'
  image_url VARCHAR(500) NOT NULL,
  text_content TEXT,
  is_template BOOLEAN DEFAULT FALSE,
  order_priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE text_pools (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id),
  content_type VARCHAR(20) NOT NULL, -- 'bio', 'post', 'story', 'highlight'
  text_content TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  is_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step Tracking
CREATE TABLE warmup_step_logs (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  step_number INTEGER NOT NULL, -- 1-5
  step_name VARCHAR(50) NOT NULL, -- 'change_pfp', 'change_bio', etc.
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'requires_review'
  bot_id VARCHAR(50) DEFAULT NULL,
  bot_session_id VARCHAR(100) DEFAULT NULL,
  content_used JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  error_details JSONB DEFAULT NULL,
  retry_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT NULL,
  instagram_response JSONB DEFAULT NULL
);
```

### Frontend Architecture

**Navigation Structure**
```
/models → Models Dashboard (existing)
/models/:id/accounts → Model Account Management Hub
  ├── Overview Tab: Assigned accounts performance
  ├── Available Tab: Ready accounts for assignment
  ├── Warm-up Tab: Accounts in warm-up process
  ├── Proxy Tab: Proxy management and assignment
  ├── Content Tab: Content management for this model
  └── Analytics Tab: Performance tracking
```

**Component Hierarchy**
```
ModelAccountsPage/
├── AccountsNavigation (tabs)
├── AccountsOverview/ (current model accounts)
│   ├── AccountDataGrid (Excel-like interface)
│   ├── AccountStatusCards (quick stats)
│   └── BulkAssignActions
├── AvailableAccounts/ (ready for assignment)
│   ├── AccountDataGrid (different columns)
│   ├── AccountFilters
│   └── BulkAssignDialog
├── WarmupPipeline/ (accounts in warm-up)
│   ├── WarmupStepsGrid
│   ├── StepProgressCards
│   └── FailedStepsTable
├── ProxyManagement/
│   ├── ProxyDataGrid
│   ├── ProxyAssignmentInterface
│   └── ProxyStatsCards
├── ContentManagement/
│   ├── ImageUploadGrid
│   ├── TextPoolEditor
│   └── TemplateManager
└── Analytics/
    ├── LifecycleChart
    ├── ProxyUtilizationChart
    └── WarmupSuccessChart
```

### Backend API Expansion

**Account Lifecycle APIs**
```typescript
POST /api/accounts/import          // Bulk import with validation
PUT /api/accounts/:id/lifecycle    // Update lifecycle state
GET /api/accounts/warmup-queue     // Get accounts ready for warm-up
POST /api/accounts/assign-proxies  // Auto-assign available proxies
PUT /api/accounts/:id/reassign     // Reassign to different model
POST /api/accounts/:id/cleanup     // Initiate cleanup process
```

**Proxy Management APIs**
```typescript
GET /api/proxies                   // List all proxies with stats
POST /api/proxies                  // Add new proxy
PUT /api/proxies/:id               // Update proxy details
DELETE /api/proxies/:id            // Remove proxy
GET /api/proxies/available         // Get proxies with available slots
POST /api/proxies/assign           // Manual proxy assignment
GET /api/proxies/utilization       // Proxy utilization statistics
```

**Content Management APIs**
```typescript
POST /api/models/:id/content       // Upload content for model
GET /api/models/:id/content        // Get all content for model
PUT /api/models/:id/content/:id    // Update content item
DELETE /api/models/:id/content/:id // Delete content item
POST /api/models/:id/text-pools    // Add text to pools
GET /api/models/:id/templates      // Get reusable templates
POST /api/templates/clone          // Clone template to another model
```

**Bot Integration APIs** (Future)
```typescript
GET /api/bot/next-task/:bot_id     // Get next account to process
GET /api/bot/account/:id/content   // Get content for specific step
POST /api/bot/step-complete        // Mark step as completed
POST /api/bot/step-failed          // Mark step as failed with error
GET /api/bot/images/:content_id    // Download images for posting
PUT /api/bot/heartbeat/:bot_id     // Bot status updates
```

## UX/UI Considerations

### Multi-View Design
- **Tab Navigation**: Clear switching between different account views
- **Context Persistence**: Remember filters and selections when switching tabs
- **Quick Actions**: Common operations accessible from all views
- **Status Indicators**: Clear visual feedback for all states

### Excel-like Interfaces
- **Consistent Behavior**: Same DataGrid component across all views with different column configurations
- **View-Specific Columns**: Customized column sets for each view (warm-up shows steps, proxy shows IP/location)
- **Batch Operations**: Multi-select actions appropriate for each view
- **Real-time Updates**: Live status updates without page refresh

### Account Lifecycle Visualization
- **Progress Indicators**: Visual progress bars for warm-up steps
- **State Badges**: Color-coded status badges for immediate recognition
- **Timeline View**: History of account progression through states
- **Error Highlighting**: Clear indicators for accounts needing attention

### Proxy Management UX
- **Capacity Indicators**: Visual representation of proxy slot usage (2/3 accounts)
- **Assignment Interface**: Drag-and-drop or click-to-assign proxy management
- **Location Mapping**: Geographic visualization of proxy locations
- **Cost Tracking**: Monthly cost summaries and projections

### Content Management UX
- **Image Galleries**: Grid view of uploaded content with category filtering
- **Text Editors**: Rich text editing for content creation
- **Template System**: Easy duplication and modification of content sets
- **Usage Analytics**: Track which content performs best

## Acceptance Criteria

### Navigation & Core Infrastructure
- [ ] Click model card navigates to `/models/:id/accounts`
- [ ] Model accounts page shows tabbed interface with 5 main views
- [ ] All views use consistent Excel-like DataGrid component
- [ ] Real-time updates work across all views
- [ ] User preferences (column widths, filters) persist across sessions

### Account Lifecycle Management
- [ ] Import system processes txt files in format: `username,password,email,additional_fields`
- [ ] Duplicate detection prevents re-importing existing accounts
- [ ] Imported accounts automatically get assigned to available proxies
- [ ] Warm-up process tracks 5 steps: pfp → bio → highlight → story → post
- [ ] Failed warm-up steps mark accounts for human review with error details
- [ ] Account reassignment triggers cleanup process for old model

### Proxy Management System
- [ ] Proxy assignment limited to 3 accounts maximum per proxy
- [ ] Auto-assignment uses first available proxy for new accounts
- [ ] Manual reassignment interface for troubleshooting
- [ ] Proxy utilization tracking shows capacity usage
- [ ] Proxy cost tracking and monthly summaries
- [ ] "Coming soon" placeholder for proxy import

### Content Management System
- [ ] Image upload for categories: pfp, post, highlight, story, any
- [ ] Text pool creation for bio, post, story, highlight content
- [ ] Template system for reusing content between models
- [ ] Automatic text assignment when images lack specific text
- [ ] CSV import for bulk text creation
- [ ] Content usage analytics and recommendations

### Multiple View Implementation
- [ ] **Overview View**: Accounts assigned to current model with performance metrics
- [ ] **Available View**: Accounts in "ready" state available for assignment
- [ ] **Warm-up View**: Accounts progressing through warm-up steps with progress indicators
- [ ] **Proxy View**: Proxy management interface with assignment capabilities
- [ ] **Content View**: Content management for current model

### Bot Integration Preparation
- [ ] Complete REST API endpoints for all bot operations
- [ ] Comprehensive logging system for all account actions
- [ ] Error handling and retry mechanisms
- [ ] Bot heartbeat and status tracking system
- [ ] Content delivery system for bot image/text retrieval

### Data Management & Performance
- [ ] Handle 10,000+ accounts across all views without performance issues
- [ ] Virtual scrolling in all DataGrid implementations
- [ ] Optimistic updates with rollback on failure
- [ ] Advanced filtering and search across all views
- [ ] Bulk operations (assignment, reassignment, cleanup) for selected accounts

### Analytics & Monitoring
- [ ] Account lifecycle state distribution charts
- [ ] Warm-up success rate tracking per step
- [ ] Proxy utilization and cost analytics
- [ ] Content performance metrics
- [ ] Error frequency and resolution tracking

## Dependencies

- **PBI 1**: Model Management System (completed)
- **Database Migrations**: New tables and schema extensions
- **File Upload System**: Image and text file handling
- **Chart Libraries**: Analytics visualization components
- **Virtual Scrolling**: Performance optimization for large datasets
- **Real-time Updates**: WebSocket or polling for live data

## Open Questions

1. **Content Storage**: Should images be stored locally or in cloud storage (AWS S3)?
2. **Template Sharing**: Should templates be shared across all models or per-user?
3. **Analytics Depth**: How detailed should step-by-step analytics be?
4. **Error Handling**: What level of automatic retry should be implemented?
5. **Proxy Testing**: Should proxy health checks be automated?

## Related Tasks

[View Task List](./tasks.md)

---

**⚠️ IMPORTANT**: This PBI represents a complete platform rather than just a data grid. The scope has expanded significantly to include the full Instagram automation workflow preparation. Bot development will begin AFTER this platform is complete. 