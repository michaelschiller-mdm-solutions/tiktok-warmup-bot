# PBI-9: Content Management System

## Overview

This PBI implements a comprehensive content management system that allows campaign managers to create content pools, upload images and videos, assign content pools to accounts, and automatically distribute content during the warmup process. This system is crucial for ensuring accounts have diverse, high-quality content for their warmup phases.

## Problem Statement

The warmup process requires accounts to post diverse content (profile pictures, bio updates, posts, highlights, stories) to appear natural and avoid detection. Without a systematic content management approach:

- Accounts use repetitive or low-quality content
- Manual content assignment is time-consuming for large account volumes
- No tracking of content usage across accounts
- Difficult to maintain content diversity and quality
- No systematic approach to content scheduling
- Content cannot be shared between models, requiring separate libraries per model
- No warmup can start without proper content assignment for all phases

## User Stories

**Primary Story**: As a campaign manager, I want to create and manage content pools so that I can assign diverse content to accounts for the warmup process.

**Supporting Stories**:
- As a campaign manager, I want an amazing upload experience so that I can easily manage large content libraries for each model
- As a campaign manager, I want to organize content with multi-select categories (pfp, bio, post, highlight, story, any) so that versatile content can be used for multiple warmup phases
- As a campaign manager, I want model-specific content isolation so that each model has its own dedicated content library
- As a campaign manager, I want to copy content as templates between models so that I can reuse successful content strategies
- As a campaign manager, I want accounts to only start warmup when all required content is assigned so that no warmup fails due to missing content
- As a campaign manager, I want to track content usage so that I can ensure good distribution and avoid overuse

## Technical Approach

### Warmup Phase Content Categories

The content management system is built around the 5-phase warmup process plus a universal category:

1. **PFP (Profile Picture)**: High-quality account images for profile setup
2. **BIO**: Descriptive text content for account bios and descriptions  
3. **POST**: Images and captions for first feed posts to establish activity
4. **HIGHLIGHT**: Story highlight covers and associated content
5. **STORY**: Story content including images and text overlays
6. **ANY**: Universal content that can be used for any warmup phase

**Multi-Category Support**: Content items can be assigned to multiple categories (e.g., an image could be marked as both "post" and "story" if suitable for both phases).

**Model Isolation**: All content is strictly model-specific. Content uploaded to Model A cannot be used by Model B, ensuring complete campaign separation.

**Template Copying**: While content is model-specific during use, successful content can be copied as templates to other models, allowing campaign managers to replicate winning strategies.

**Required Content Validation**: Accounts cannot begin warmup unless ALL required content categories have available content assigned to their model.

### Database Schema
- **content_pools table**: Store model-specific content pool metadata (name, description, model_id)
- **model_content table**: Visual content items (images/videos) with multi-category support
- **content_categories table**: Junction table for multi-select category assignments
- **text_pools table**: Text content (bios, captions, story text) with multi-category support
- **text_categories table**: Junction table for text content category assignments
- **pool_content_assignments table**: Link content items to pools
- **account_content_assignments table**: Link accounts to content pools
- **content_templates table**: Track content copied between models as templates

### Backend Services
- **ContentPoolService**: Manage model-specific content pool CRUD operations
- **ContentUploadService**: Handle file uploads with amazing UX and multi-category assignment
- **ContentTemplateService**: Handle copying content between models as templates
- **ContentAssignmentService**: Assign pools to accounts and validate content availability
- **ContentDistributionService**: Provide content to bot during warmup

### File Storage
- **Local storage**: Store uploaded images/videos with organized folder structure
- **File processing**: Image resizing, format validation, metadata extraction
- **CDN integration**: Optional for serving content to bots

### Frontend Components
- **ContentPools view**: Create and manage content pools
- **ContentUpload component**: Bulk file upload with preview
- **PoolAssignment view**: Assign pools to accounts
- **ContentStats component**: Usage analytics and content health

## UX/UI Considerations

### Content Pool Management
- Visual content pool cards with thumbnails
- Drag-and-drop content upload interface
- Warmup phase categorization (pfp, bio, post, highlight, story, any)
- Bulk content organization and tagging
- Preview gallery for content review

### Content Upload Interface (Amazing UX Focus)
- **Modern drag-and-drop**: Seamless multi-file upload with visual feedback
- **Smart categorization**: Multi-select checkboxes for warmup phase categories
- **Real-time preview**: Instant thumbnails and preview gallery
- **Bulk operations**: Select multiple files and apply categories in batch
- **Progress indicators**: Beautiful upload progress with individual file status
- **Validation feedback**: Clear error messages and format checking
- **Metadata editing**: Intuitive tags, descriptions, and category management

### Assignment Interface
- Visual mapping of pools to accounts
- Bulk assignment operations
- Content pool statistics (items count, usage rate)
- Account warmup initiation after assignment

### Content Distribution
- Usage tracking to prevent overuse
- Quality scoring for optimal content selection
- Content rotation algorithms
- Account-specific content filtering

## Acceptance Criteria

### Content Pool Management
- ✅ Create, edit, and delete model-specific content pools
- ✅ Organize pools by campaign or theme within each model
- ✅ Set pool metadata (name, description, tags)
- ✅ View pool statistics and content count
- ✅ Copy content pools between models as templates
- ✅ Multi-category content assignment and filtering

### Content Upload System
- ✅ Amazing drag-and-drop upload experience (50+ files at once)
- ✅ Support common formats (JPEG, PNG, MP4, MOV)
- ✅ Multi-select category assignment (pfp, bio, post, highlight, story, any)
- ✅ Real-time preview gallery with instant thumbnails
- ✅ Bulk category assignment for multiple files
- ✅ Beautiful progress indicators and validation feedback
- ✅ Extract and store content metadata
- ✅ Model-specific content isolation

### Pool Assignment
- ✅ Assign content pools to individual accounts
- ✅ Bulk assign pools to multiple accounts within same model
- ✅ Validate all required content categories are available before assignment
- ✅ Prevent warmup start until all content requirements are met
- ✅ Template copying: Copy successful content setups between models

### Content Distribution
- ✅ Serve content to bot API during warmup
- ✅ Track content usage across accounts
- ✅ Prevent content overuse with usage limits
- ✅ Provide diverse content selection algorithms
- ✅ Support all warmup phase content types:
  - **pfp**: Profile pictures for account setup
  - **bio**: Bio text for profile descriptions
  - **post**: First posts for feed content
  - **highlight**: Story highlight covers and content
  - **story**: Story posts with images and text
  - **any**: Multi-purpose content usable for any phase

### Integration with Warmup Process
- ✅ Accounts can only enter warmup when all required content is available
- ✅ Bot receives appropriate content for each warmup phase
- ✅ Content usage is logged and tracked per model
- ✅ Failed content operations trigger review status
- ✅ Content validation prevents incomplete warmup processes

## Dependencies

- File upload infrastructure and storage
- Warmup process system (from Task 2-7)
- Account management system (from PBI 2)
- Image/video processing libraries
- Database migration system

## Open Questions

1. Should we implement content approval workflows before assignment?
2. What content formats should we prioritize (aspect ratios, file sizes)?
3. How detailed should the template copying system be (metadata, categories, usage stats)?
4. Should there be a maximum number of categories per content item?
5. What file size limits should we enforce for the amazing upload experience?
6. Should we implement automatic content optimization (compression, resizing) during upload?

## Related Tasks

This PBI will be broken down into the following tasks:
- [View Tasks](./tasks.md)

[View in Backlog](../backlog.md#user-content-9) 