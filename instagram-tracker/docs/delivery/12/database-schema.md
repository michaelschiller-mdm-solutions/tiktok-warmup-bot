# Advanced Content Sprint Management System - Database Schema

## Overview

This document provides comprehensive documentation for the database schema supporting the Advanced Content Sprint Management System for **post-warmup Instagram accounts**. The design enables sophisticated content workflow management, realistic posting patterns, and intelligent conflict resolution for Instagram accounts at scale.

**System Integration**: This schema works alongside the existing 10-phase warmup system without modification. The content sprint system activates only after accounts complete their warmup phases (`is_warmup_complete(account_id) = true`). Both systems coexist and serve different phases of the account lifecycle.

## Entity Relationship Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Models        │────▶│    Accounts      │────▶│ Account Content │
│                 │     │                  │     │     State       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                 │                         │
                                 ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Account Sprint   │     │  Content Queue  │
                        │  Assignments     │────▶│                 │
                        └──────────────────┘     └─────────────────┘
                                 │                         │
                                 ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Content Sprints  │────▶│ Sprint Content  │
                        │                  │     │     Items       │
                        └──────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Campaign Pools   │
                        │                  │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Account Highlight│
                        │     Groups       │
                        └──────────────────┘
```

## Core Tables

### content_sprints

**Purpose**: Central table for both content sprints and highlight groups, containing workflow definitions and rules.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique identifier for sprint/highlight group |
| `name` | VARCHAR(255) | NOT NULL | User-friendly name for the content workflow |
| `description` | TEXT | | Detailed description of the sprint purpose |
| `sprint_type` | VARCHAR(100) | NOT NULL | Theme category (vacation, university, home, work, fitness) |
| `location` | VARCHAR(255) | | Geographic or conceptual location (jamaica, germany, home) |
| `is_highlight_group` | BOOLEAN | DEFAULT false | Distinguishes highlights (true) from sprints (false) |
| `max_content_items` | INTEGER | DEFAULT 20 | Maximum content items (20 for sprints, 100 for highlights) |
| `available_months` | INTEGER[] | DEFAULT [1-12] | Months when this content can be used |
| `cooldown_hours` | INTEGER | DEFAULT 336 | Hours before sprint can be used again (2 weeks) |
| `blocks_sprints` | INTEGER[] | DEFAULT [] | Array of sprint IDs that this sprint blocks |
| `blocks_highlight_groups` | INTEGER[] | DEFAULT [] | Array of highlight group IDs that this sprint blocks |
| `idle_hours_min` | INTEGER | DEFAULT 24 | Minimum idle time after sprint completion (user configurable) |
| `idle_hours_max` | INTEGER | DEFAULT 48 | Maximum idle time after sprint completion (user configurable) |
| `calculated_duration_hours` | INTEGER | | Auto-calculated total duration from cumulative content delays |
| `maintenance_images_min` | INTEGER | DEFAULT 1 | For highlights: minimum images per maintenance cycle |
| `maintenance_images_max` | INTEGER | DEFAULT 2 | For highlights: maximum images per maintenance cycle |
| `maintenance_frequency_weeks_min` | INTEGER | DEFAULT 2 | For highlights: minimum weeks between maintenance |
| `maintenance_frequency_weeks_max` | INTEGER | DEFAULT 4 | For highlights: maximum weeks between maintenance |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- `idx_content_sprints_type_location` - Query by type and location
- `idx_content_sprints_months` (GIN) - Array search for seasonal availability
- `idx_content_sprints_blocks` (GIN) - Array search for blocking relationships

**Design Rationale**: 
- Single table for sprints and highlights reduces complexity while maintaining clear distinction
- Array fields enable flexible blocking relationships without junction tables
- Seasonal restrictions support realistic content timing (beach content in summer)

### sprint_content_items

**Purpose**: Individual content items (images/videos) within sprints, with categorization and scheduling metadata.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique identifier for content item |
| `sprint_id` | INTEGER | FK → content_sprints | Parent sprint/highlight group |
| `file_path` | TEXT | NOT NULL | Storage path for content file |
| `file_name` | VARCHAR(255) | NOT NULL | Original filename for user reference |
| `caption` | TEXT | | User-provided caption text |
| `content_order` | INTEGER | NOT NULL | Sequence order within sprint |
| `content_categories` | TEXT[] | NOT NULL, CHECK | Instagram formats: story, post, highlight |
| `story_to_highlight` | BOOLEAN | DEFAULT true | Whether stories auto-move to highlights |
| `post_group_id` | INTEGER | | Groups multiple images into single post (1-8 images) |
| `delay_hours_min` | INTEGER | DEFAULT 24 | Minimum delay before posting this item |
| `delay_hours_max` | INTEGER | DEFAULT 72 | Maximum delay before posting this item |
| `is_after_sprint_content` | BOOLEAN | DEFAULT false | Content that posts after main sprint ends |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Constraints**:
- `valid_content_categories` - Ensures only valid Instagram formats
- `CASCADE DELETE` - Content items deleted when parent sprint is deleted

**Indexes**:
- `idx_sprint_content_items_sprint_order` - Quick access to ordered content
- `idx_sprint_content_items_categories` (GIN) - Array search for content types
- `idx_sprint_content_items_post_group` - Grouping multi-image posts

**Design Rationale**:
- Flexible categorization allows content to be stories AND posts simultaneously
- Post grouping supports Instagram's multi-image post feature
- Delay ranges enable realistic randomization of posting times

### account_sprint_assignments

**Purpose**: Links accounts to specific sprint instances, tracking progress and scheduling.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique identifier for assignment |
| `account_id` | INTEGER | FK → accounts | Target Instagram account |
| `sprint_id` | INTEGER | FK → content_sprints | Assigned sprint/highlight group |
| `assignment_date` | TIMESTAMP | DEFAULT NOW() | When assignment was created |
| `start_date` | TIMESTAMP | | When sprint execution begins |
| `end_date` | TIMESTAMP | | When sprint execution ends |
| `status` | VARCHAR(50) | CHECK | scheduled, active, completed, paused, cancelled |
| `current_content_index` | INTEGER | DEFAULT 0 | Progress tracker for current content item |
| `next_content_due` | TIMESTAMP | | When next content should be posted |
| `sprint_instance_id` | UUID | DEFAULT gen_random_uuid() | Unique instance identifier |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification timestamp |

**Constraints**:
- `valid_assignment_status` - Ensures only valid status values
- `logical_dates` - Start date must be before or equal to end date
- `UNIQUE(account_id, sprint_id, sprint_instance_id)` - Prevents duplicate assignments

**Indexes**:
- `idx_account_sprint_assignments_account_status` - Account status queries
- `idx_account_sprint_assignments_dates` - Date range queries

**Design Rationale**:
- UUID instances allow same sprint to be assigned multiple times to same account
- Progress tracking enables pausing and resuming of sprints
- Status management supports complex workflow states

### content_queue

**Purpose**: Scheduled content items with precise timestamps, status tracking, and emergency handling.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique identifier for queued item |
| `account_id` | INTEGER | FK → accounts | Target Instagram account |
| `sprint_assignment_id` | INTEGER | FK → account_sprint_assignments | Parent assignment |
| `content_item_id` | INTEGER | FK → sprint_content_items | Content to be posted |
| `scheduled_time` | TIMESTAMP | NOT NULL | Exact posting timestamp |
| `content_type` | VARCHAR(50) | CHECK | story, post, highlight |
| `status` | VARCHAR(50) | CHECK | queued, posted, failed, cancelled, retrying |
| `posted_at` | TIMESTAMP | | Actual posting timestamp when completed |
| `emergency_content` | BOOLEAN | DEFAULT false | Flags emergency interrupt content |
| `queue_priority` | INTEGER | DEFAULT 100 | Priority for queue processing (lower = higher) |
| `error_message` | TEXT | | Error details for failed posts |
| `retry_count` | INTEGER | DEFAULT 0 | Number of retry attempts |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Constraints**:
- `valid_queue_status` - Ensures only valid status values
- `valid_content_type` - Ensures only valid Instagram content types

**Indexes**:
- `idx_content_queue_scheduled` - Time-based queue processing
- `idx_content_queue_account_pending` - Account-specific pending items
- `idx_content_queue_emergency` - Emergency content prioritization

**Design Rationale**:
- Priority system enables emergency content to jump queue
- Retry mechanism handles temporary posting failures
- Precise timestamping enables realistic posting patterns

## Account Management Tables

### account_content_state

**Purpose**: Tracks current state of each account including location, active sprints, and timing.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique identifier |
| `account_id` | INTEGER | FK → accounts, UNIQUE | Associated Instagram account |
| `current_location` | VARCHAR(255) | DEFAULT 'home' | Account's current conceptual location |
| `active_sprint_ids` | INTEGER[] | DEFAULT [] | Array of currently active sprint IDs |
| `idle_since` | TIMESTAMP | | When account entered idle state |
| `idle_duration_hours` | INTEGER | | Planned duration of current idle period |
| `last_emergency_content` | TIMESTAMP | | Timestamp of last emergency content injection |
| `cooldown_until` | TIMESTAMP | | When account becomes available for new sprints |
| `next_maintenance_due` | TIMESTAMP | | When next highlight maintenance is due |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last state update timestamp |

**Indexes**:
- `idx_account_content_state_location` - Location-based queries
- `idx_account_content_state_active_sprints` (GIN) - Array search for active sprints
- `idx_account_content_state_cooldown` - Cooldown period queries

**Design Rationale**:
- Centralized state management prevents conflicting assignments
- Location tracking enforces realistic content restrictions
- Cooldown system prevents unrealistic sprint frequency

### account_highlight_groups

**Purpose**: Manages highlight groups assigned to accounts with position tracking and maintenance scheduling, including warmup highlights.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique identifier |
| `account_id` | INTEGER | FK → accounts | Associated Instagram account |
| `highlight_group_id` | INTEGER | FK → content_sprints | Associated highlight group (NULL for warmup highlights) |
| `highlight_name` | VARCHAR(255) | NOT NULL | Name of the highlight as displayed on Instagram |
| `position` | INTEGER | CHECK > 0 | Position on profile (1 = newest) |
| `is_warmup_highlight` | BOOLEAN | DEFAULT false | Whether this is the original warmup highlight |
| `maintenance_last_run` | TIMESTAMP | | Last maintenance execution |
| `maintenance_next_due` | TIMESTAMP | | Next scheduled maintenance |
| `maintenance_frequency_hours` | INTEGER | DEFAULT 504 | Hours between maintenance (3 weeks) |
| `is_active` | BOOLEAN | DEFAULT true | Whether highlight is currently active |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification timestamp |

**Constraints**:
- `positive_position` - Position must be greater than 0
- `UNIQUE(account_id, highlight_group_id)` - One instance per account
- `UNIQUE(account_id, position)` - No duplicate positions per account

**Indexes**:
- `idx_account_highlight_groups_position` - Position-based queries
- `idx_account_highlight_groups_maintenance` - Maintenance scheduling

**Design Rationale**:
- Position management mimics Instagram's highlight ordering
- Maintenance scheduling enables long-term highlight building
- Account-specific instances allow customized timing per account

## Campaign Management Tables

### campaign_pools

**Purpose**: Collections of compatible sprints that can be assigned together to accounts.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | User-friendly campaign name |
| `description` | TEXT | | Detailed campaign description |
| `sprint_ids` | INTEGER[] | NOT NULL, CHECK | Array of sprint IDs in this campaign |
| `total_duration_hours` | INTEGER | | Calculated total duration of all sprints |
| `compatible_accounts` | INTEGER | DEFAULT 0 | Number of accounts that can use this campaign |
| `assignment_strategy` | VARCHAR(50) | CHECK | random, balanced, manual |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last modification timestamp |

**Constraints**:
- `valid_assignment_strategy` - Ensures only valid strategies
- `non_empty_sprints` - Must contain at least one sprint

**Design Rationale**:
- Campaign pools enable complex multi-sprint assignments
- Compatibility tracking prevents impossible assignments
- Strategy options provide flexibility in assignment logic

### highlight_content_batches

**Purpose**: Seasonal content groupings within highlight groups for month-specific availability.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Unique identifier |
| `highlight_group_id` | INTEGER | FK → content_sprints | Parent highlight group |
| `batch_name` | VARCHAR(255) | NOT NULL | User-friendly batch name |
| `available_months` | INTEGER[] | NOT NULL, CHECK | Months when this batch is available |
| `content_item_ids` | INTEGER[] | NOT NULL | Array of content item IDs in this batch |
| `is_active` | BOOLEAN | DEFAULT true | Whether batch is currently active |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |

**Constraints**:
- `valid_months` - Ensures months are between 1-12

**Design Rationale**:
- Seasonal batching enables realistic content timing
- Flexible month assignment supports complex seasonal rules
- Batch grouping simplifies content management

## Database Functions

### update_highlight_positions()

**Purpose**: Automatically manages highlight position ordering when new highlights are added.

**Trigger**: BEFORE INSERT on `account_highlight_groups`

**Logic**:
1. Increments all existing highlight positions for the account by 1
2. Sets the new highlight to position 1 (newest)
3. Maintains Instagram-like ordering behavior

### calculate_sprint_duration(sprint_id)

**Purpose**: Calculates total sprint duration from cumulative content delays.

**Parameters**: `sprint_id INTEGER`
**Returns**: `INTEGER` (total hours)

**Logic**:
1. Sums average delays for all content items in sprint
2. Uses (min_delay + max_delay) / 2 for realistic estimation
3. Accounts for content ordering and realistic timing

### check_sprint_compatibility(sprint_ids)

**Purpose**: Validates that sprints can be assigned together without conflicts.

**Parameters**: `sprint_ids INTEGER[]`
**Returns**: `BOOLEAN`

**Logic**:
1. Checks blocking relationships between sprints
2. Validates no sprint blocks another in the array
3. Returns false if any conflicts detected

## Performance Optimizations

### Index Strategy

1. **GIN Indexes for Arrays**:
   - `available_months`, `blocks_sprints`, `blocks_highlight_groups`
   - Enables efficient array operations and overlap queries

2. **Composite Indexes**:
   - Sprint type + location for themed queries
   - Account + status for assignment queries
   - Scheduled time + status for queue processing

3. **Partial Indexes**:
   - Only active maintenance records
   - Only pending queue items
   - Only accounts with cooldowns

### Query Optimization

1. **Prepared Statements**: All API queries use parameterized statements
2. **Connection Pooling**: Optimized pool settings for complex queries
3. **Query Planning**: Regular EXPLAIN ANALYZE for performance monitoring
4. **Batch Operations**: Bulk insert/update operations for assignments

## Data Integrity

### Referential Integrity

- All foreign keys use CASCADE DELETE for clean data removal
- Circular reference prevention in blocking relationships
- Logical date constraints prevent impossible timelines

### Business Rule Enforcement

- Check constraints prevent invalid status values
- Array constraints ensure valid month ranges
- Position constraints maintain positive values
- Content category validation ensures Instagram compatibility

### Concurrency Control

- Unique constraints prevent duplicate assignments
- Trigger-based position management handles concurrent updates
- Transaction isolation for assignment operations
- Deadlock prevention in bulk operations

## Migration Strategy

### Migration File: `025-content-sprint-system.sql`

**Size**: ~500 lines including:
- Table definitions with constraints
- Index creation statements
- Function and trigger definitions
- Sample data for testing
- Comprehensive documentation

**Safety Features**:
- IF NOT EXISTS clauses for safe re-execution
- Transaction wrapping for rollback capability
- Constraint validation before data insertion
- Performance impact assessment

### Rollback Plan

1. **Function/Trigger Removal**: DROP statements for all created functions
2. **Index Removal**: DROP INDEX statements for performance indexes
3. **Table Removal**: DROP TABLE with CASCADE for clean removal
4. **Data Preservation**: Export scripts for data recovery if needed

## Testing Strategy

### Unit Testing

1. **Constraint Testing**: Validate all check constraints with invalid data
2. **Function Testing**: Test all custom functions with edge cases
3. **Trigger Testing**: Verify trigger behavior under various conditions
4. **Index Testing**: Confirm index usage with EXPLAIN ANALYZE

### Integration Testing

1. **Assignment Logic**: Test complete sprint assignment workflows
2. **Queue Generation**: Validate content queue creation and ordering
3. **Conflict Resolution**: Test blocking rule enforcement
4. **State Management**: Verify account state transitions

### Performance Testing

1. **Load Testing**: Test with 1000+ accounts and sprints
2. **Concurrent Access**: Validate behavior under multiple users
3. **Query Performance**: Benchmark complex reporting queries
4. **Memory Usage**: Monitor database resource consumption

### Data Integrity Testing

1. **Referential Integrity**: Test foreign key constraints
2. **Business Logic**: Validate complex business rules
3. **Concurrent Updates**: Test race condition handling
4. **Error Recovery**: Verify rollback and recovery procedures

---

**Related Documentation**:
- [PBI-12 Product Requirements](./prd.md)
- [Task 12-1 Implementation Plan](./12-1.md)
- [Content Sprint API Specification](../API_SPECIFICATION.md)