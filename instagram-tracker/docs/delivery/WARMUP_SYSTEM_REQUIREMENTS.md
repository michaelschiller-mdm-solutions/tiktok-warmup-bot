# Warmup System Requirements - Comprehensive Specification

## Overview

The Instagram Account Warmup System is a 10-phase process that prepares imported accounts for active use through randomized, bot-automated tasks with container management and content assignment.

## Phase Architecture

### Phase 0: Manual Setup (Human Task)
- **Purpose**: Human container setup and Instagram login
- **User Actions**: 
  - Manually configure account in assigned container on iPhone
  - Perform initial login to Instagram
  - Mark account ready for warmup when setup complete
- **System Actions**:
  - Assign first-available container (1-30)
  - Track container assignment
  - Enable transition to random warmup phase

### Phase 1-9: Warmup Phases (Bot Automated)

#### 1. Bio Change Phase
- **Content Required**: Text (bio category)
- **Scripts**: ios16_photo_cleaner.js → clipboard.js → lua_executor.js → open_container{N}.lua → change_bio_to_clipboard.lua
- **Action**: Update Instagram bio with assigned text

#### 2. Gender Change Phase  
- **Content Required**: None
- **Scripts**: ios16_photo_cleaner.js → lua_executor.js → open_container{N}.lua → change_gender_to_female.lua
- **Action**: Set Instagram gender to female

#### 3. Name Change Phase
- **Content Required**: Text (name category - NEW)
- **Scripts**: ios16_photo_cleaner.js → clipboard.js → lua_executor.js → open_container{N}.lua → change_name_to_clipboard.lua
- **Action**: Update Instagram display name with assigned text

#### 4. Username Change Phase
- **Content Required**: Text (username category)
- **Scripts**: ios16_photo_cleaner.js → clipboard.js → lua_executor.js → open_container{N}.lua → change_username_to_clipboard.lua
- **Action**: Change Instagram username
- **Post-Success**: Update account username in database to match new Instagram username

#### 5. First Highlight Upload Phase
- **Content Required**: 
  - Image (highlight category, fallback to any)
  - Text (highlight_group_name category - NEW)
- **Scripts**: ios16_photo_cleaner.js → gallery.js → clipboard.js → lua_executor.js → open_container{N}.lua → upload_first_highlight_group_with_clipboard_name_newest_media_no_caption.lua
- **Action**: Create first highlight group with assigned image and name

#### 6. New Highlight Upload Phase
- **Dependency**: Requires Phase 5 (First Highlight) completed
- **Content Required**:
  - Image (highlight category, fallback to any)  
  - Text (highlight_group_name category)
- **Scripts**: ios16_photo_cleaner.js → gallery.js → clipboard.js → lua_executor.js → open_container{N}.lua → upload_new_highlightgroup_clipboard_name_newest_media_no_caption.lua
- **Action**: Create additional highlight group

#### 7. Post with Caption Phase
- **Content Required**:
  - Image (post category, fallback to any)
  - Text (post category, fallback to any)
- **Scripts**: ios16_photo_cleaner.js → gallery.js → clipboard.js → lua_executor.js → open_container{N}.lua → upload_post_newest_media_clipboard_caption.lua
- **Action**: Upload Instagram post with caption

#### 8. Post without Caption Phase
- **Content Required**: Image (post category, fallback to any)
- **Scripts**: ios16_photo_cleaner.js → gallery.js → lua_executor.js → open_container{N}.lua → upload_post_newest_media_no_caption.lua
- **Action**: Upload Instagram post without caption

#### 9. Story with Caption Phase
- **Content Required**:
  - Image (story category, fallback to any)
  - Text (story category, fallback to any)
- **Scripts**: ios16_photo_cleaner.js → gallery.js → lua_executor.js → open_container{N}.lua → upload_story_newest_media_clipboard_caption.lua
- **Action**: Upload Instagram story with caption

#### 10. Story without Caption Phase
- **Content Required**: Image (story category, fallback to any)
- **Scripts**: ios16_photo_cleaner.js → gallery.js → lua_executor.js → open_container{N}.lua → upload_story_newest_media_no_caption.lua
- **Action**: Upload Instagram story without caption

## Container Management System

### Container Pool
- **Total Containers**: 30 (numbered 1-30)
- **Exclusivity**: Only one account per container at any time
- **Assignment**: First-available container assigned to account
- **Release**: Container immediately available when account marked invalid
- **Bot Integration**: Container number provided to bot for script execution

### Container States
- **Available**: Container not assigned to any account
- **Assigned**: Container assigned to active account
- **Invalid**: Container released due to account invalidation

## Phase Assignment and Progression

### Random Assignment System
- **After Phase 0**: Account randomly assigned to any of 9 warmup phases
- **No Sequence**: Phases can be completed in any order (except dependency)
- **Dependency Rule**: New Highlight phase requires First Highlight completed
- **Completion Logic**: Account graduates to "active" when ALL 9 phases completed

### Cooldown System
- **Duration**: 15-24 hours between phases per account
- **Randomization**: Cooldown time randomized within range (configurable)
- **Per-Account**: Each account has individual cooldown timer
- **Availability**: Phase becomes available after cooldown expires

## Bot Execution Constraints

### Single Bot Operation
- **Constraint**: Only ONE account can be processed by bot at any time
- **Enforcement**: System prevents multiple accounts in "in_progress" status
- **Queue**: Accounts wait for bot availability

### Script Execution Sequence
1. **Gallery Cleanup**: ios16_photo_cleaner.js (always first)
2. **Content Preparation**: clipboard.js and/or gallery.js (as needed)
3. **Lua Executor**: lua_executor.js (script execution engine)
4. **Container Script**: open_container{N}.lua (where N = assigned container)
5. **Phase Action**: Specific phase action script

## Content Assignment Rules

### Text Content Categories
- **bio**: Bio change phase content
- **name**: Name change phase content (NEW CATEGORY)
- **username**: Username change phase content
- **highlight_group_name**: Highlight group naming (NEW CATEGORY)
- **post**: Post caption content (fallback to any)
- **story**: Story caption content (fallback to any)

### Image Content Categories  
- **highlight**: Highlight image content (fallback to any)
- **post**: Post image content (fallback to any)
- **story**: Story image content (fallback to any)
- **any**: Universal fallback for all image requirements

### Assignment Logic
- **Phase Matching**: Content assigned based on phase-specific category requirements
- **Fallback System**: "any" category used when specific category unavailable
- **Quality Scoring**: Higher quality, less-used content preferred
- **Usage Tracking**: Prevent content overuse across accounts

## Error Handling and Recovery

### Script Failure Handling
- **Immediate Response**: Phase marked as "failed" status
- **Retry Logic**: One automatic retry attempt
- **Human Review**: After retry failure, moved to "requires_review" status
- **Container Release**: Failed accounts release container for reassignment

### Human Review System
- **Manual Controls**: Humans can mark accounts invalid or manually complete phases
- **Status Override**: Humans can change phase status and retry failed phases
- **Container Management**: Invalid accounts immediately release assigned container
- **Progress Tracking**: Detailed phase completion history with timestamps

## User Interface Requirements

### Warmup Pipeline Display
- **10 Phase Sections**: Separate visual sections for each phase
- **Account Grouping**: Accounts grouped by current phase
- **Essential Information**: username, password, email, email_password, container, proxy
- **Phase Progress**: Visual indicators with hover details for completed phases
- **Image Previews**: Hover preview for assigned content images

### Manual Controls
- **Status Change**: Buttons to mark accounts invalid or complete phases
- **Container Info**: Display assigned container number
- **Progress Details**: Hover details showing completion timestamps
- **Error Display**: Show error messages and retry counts

## Database Schema Requirements

### New Tables Needed
- **container_assignments**: Track container assignments to accounts
- **warmup_phase_progress**: Track individual phase completion (10 phases)
- **warmup_cooldowns**: Per-account cooldown tracking

### Updated Tables  
- **text_pools**: Add name, highlight_group_name content types
- **accounts**: Add container_number field
- **account_warmup_phases**: Redesign for 10-phase system

### Key Fields
- **container_number**: Account's assigned container (1-30)
- **phase_type**: 10 possible phase values instead of 5
- **cooldown_until**: Per-account next available time
- **dependency_completed**: Track first highlight completion for new highlight dependency

## Bot API Requirements

### Script Sequence Endpoint
- **Path**: GET /api/bot/accounts/:id/script-sequence
- **Response**: Complete script execution order for current phase
- **Includes**: Container number, content file paths, execution order

### Content Delivery Endpoint  
- **Path**: GET /api/bot/accounts/:id/content/:phase
- **Response**: Images and text content with correct file paths
- **Format**: File paths relative to bot execution directory

### Status Update Endpoints
- **Phase Start**: POST /api/bot/accounts/:id/start-phase/:phase
- **Phase Complete**: POST /api/bot/accounts/:id/complete-phase/:phase  
- **Phase Failed**: POST /api/bot/accounts/:id/fail-phase/:phase
- **Username Update**: PATCH /api/accounts/:id/username (after username phase success)

### Single Bot Enforcement
- **Constraint Check**: Verify no other account in "in_progress" before starting
- **Lock Mechanism**: Prevent concurrent phase execution
- **Queue Management**: Return next available account when bot requests work

## Configuration Options

### Cooldown Settings
- **Minimum**: 15 hours (configurable)
- **Maximum**: 24 hours (configurable)  
- **Randomization**: Enable/disable random timing within range
- **Per-Model**: Different cooldown settings per model

### Content Assignment Settings
- **Quality Threshold**: Minimum content quality score
- **Usage Limits**: Maximum times content can be reused
- **Fallback Rules**: When to use "any" category content

### Container Settings
- **Pool Size**: Number of available containers (default 30)
- **Assignment Strategy**: First-available (current) or round-robin
- **Release Timeout**: Auto-release containers after inactivity

## Success Metrics

### Phase Completion Tracking
- **Individual Progress**: Track each phase completion with timestamp
- **Overall Progress**: Track accounts completing all 9 phases
- **Time to Completion**: Average time from import to active status
- **Failure Rates**: Track phase failure rates and common error types

### Container Utilization
- **Assignment Rate**: How quickly containers are assigned
- **Utilization Percentage**: Percentage of containers in use
- **Turnover Rate**: How quickly containers are released and reassigned

### Content Performance
- **Assignment Success**: How often content is successfully assigned
- **Usage Distribution**: Even distribution of content usage
- **Quality Impact**: Correlation between content quality and phase success

## Implementation Priority

1. **Database Schema**: Complete redesign for 10-phase system and containers
2. **Container Management**: Core container assignment and release logic
3. **Content Categories**: Add name and highlight_group_name text types
4. **Phase Assignment**: Random assignment with cooldown enforcement
5. **Bot API**: Script sequences and content delivery with file paths
6. **UI Redesign**: 10-phase sections with proper account grouping
7. **Error Handling**: Human review system and manual controls
8. **Testing**: End-to-end validation of complete warmup flow

This specification serves as the definitive requirements for the warmup system implementation. 