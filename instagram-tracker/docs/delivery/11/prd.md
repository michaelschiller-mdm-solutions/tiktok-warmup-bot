# PBI-11: Central Content Registry and Bundle Management

## Overview
A comprehensive central content registry system that allows campaign managers to efficiently organize, manage, and reuse content across multiple models and campaigns through an advanced bundle management system with batch operations.

## Problem Statement
Campaign managers need a centralized system to manage content that can be shared across multiple models and campaigns. The existing model-specific content management lacks:
- Cross-model content sharing capabilities
- Efficient batch operations for content assignment
- Organized content bundling for different campaign types
- Centralized content library with advanced categorization
- Streamlined content upload with per-file customization

## User Stories

### Primary User Story
**As a campaign manager, I want a central content registry with bundle management so that I can efficiently organize, assign, and reuse content across multiple models and campaigns**

### Supporting User Stories
1. **As a campaign manager, I want to upload content to a central registry with per-file categorization so that I can organize content efficiently during upload**
2. **As a campaign manager, I want to create content bundles with mixed media so that I can group related content for specific campaign types**
3. **As a campaign manager, I want to batch assign content to multiple bundles so that I can efficiently organize large amounts of content**
4. **As a campaign manager, I want to view and edit bundle contents so that I can manage content assignments and remove items as needed**
5. **As a campaign manager, I want to select bundles for model content so that I can reuse organized content across different campaigns**

## Technical Approach

### Architecture Components

#### 1. Central Content Registry
- **Location**: `/content` route with dedicated interface
- **Components**: 
  - `CentralContentRegistry` - Main interface with tabbed navigation
  - `CentralContentUploadModal` - Enhanced upload with per-file settings
  - `BundleCreateModal` - Bundle creation and editing
  - `BundleContentsModal` - Bundle content management
  - `BatchAssignModal` - Batch assignment operations

#### 2. Database Schema Extensions
```sql
-- Central content storage
CREATE TABLE central_content (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(20) CHECK (content_type IN ('image', 'video')),
    file_size INTEGER,
    categories JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Central text content
CREATE TABLE central_text_content (
    id SERIAL PRIMARY KEY,
    text_content TEXT NOT NULL,
    categories JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    template_name VARCHAR(255),
    language VARCHAR(10) DEFAULT 'en',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content bundles
CREATE TABLE content_bundles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(50) DEFAULT 'mixed',
    categories JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bundle assignments (many-to-many)
CREATE TABLE bundle_content_assignments (
    id SERIAL PRIMARY KEY,
    bundle_id INTEGER REFERENCES content_bundles(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES central_content(id) ON DELETE CASCADE,
    text_content_id INTEGER REFERENCES central_text_content(id) ON DELETE CASCADE,
    assignment_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (content_id IS NOT NULL OR text_content_id IS NOT NULL)
);
```

#### 3. API Endpoints
```typescript
// Content Management
GET    /api/central/content                    // List all content
POST   /api/central/content/upload            // Upload new content
PUT    /api/central/content/:id               // Update content
DELETE /api/central/content/:id               // Delete content

// Text Content Management  
GET    /api/central/text-content              // List all text content
POST   /api/central/text-content              // Create text content
PUT    /api/central/text-content/:id          // Update text content
DELETE /api/central/text-content/:id          // Delete text content

// Bundle Management
GET    /api/central/bundles                   // List all bundles
POST   /api/central/bundles                   // Create bundle
PUT    /api/central/bundles/:id               // Update bundle
DELETE /api/central/bundles/:id               // Delete bundle
GET    /api/central/bundles/:id/contents      // Get bundle contents

// Bundle Assignment Operations
POST   /api/central/bundles/:id/add-content           // Add single item
POST   /api/central/bundles/:id/add-content/batch     // Batch add items
DELETE /api/central/bundles/:id/content/:assignmentId // Remove item

// Model Integration
GET    /api/central/models/:id/bundles        // Get bundles for model selection
```

## UX/UI Considerations

### Navigation Integration
- **Primary Access**: "Content Registry" link in main navigation sidebar
- **Secondary Access**: "Manage Bundles" button in model content management
- **Visual Identity**: Package icon (📦) for bundle-related features

### Interface Design Principles

#### 1. Tabbed Organization
```typescript
interface TabStructure {
  'content': 'Content Library',    // Individual content management
  'bundles': 'Content Bundles',    // Bundle management
  'texts': 'Text Library'          // Text content management
}
```

#### 2. Selection and Batch Operations
- **Selection Mode**: Toggle-able selection interface with checkboxes
- **Visual Feedback**: Selected items highlighted with blue ring and background
- **Batch Actions**: Contextual action bar appears when items selected
- **Progress Feedback**: Real-time assignment results with success/error indicators

#### 3. Upload Experience
- **Split Panel Layout**: Global settings (left) + individual file management (right)
- **Per-File Customization**: Each file can have unique categories, tags, and bundle assignments
- **Visual Preview**: Thumbnail previews with status indicators
- **Drag & Drop**: Enhanced drag and drop with visual feedback

#### 4. Bundle Management
- **Bundle Cards**: Visual cards showing bundle type, content counts, and categories
- **Content Preview**: Modal showing all bundle contents with management options
- **Quick Actions**: Edit, view contents, and delete actions on each bundle card

## Acceptance Criteria

### ✅ Core Functionality
1. **Central Content Upload**
   - [x] Upload multiple files with drag & drop interface
   - [x] Per-file category and tag assignment
   - [x] Per-file bundle assignment during upload
   - [x] Visual file preview with status indicators
   - [x] Global settings applied to all files with per-file overrides

2. **Bundle Management**
   - [x] Create bundles with name, description, type, and categories
   - [x] Edit existing bundles with full CRUD operations
   - [x] View bundle contents with search and filtering
   - [x] Remove individual items from bundles
   - [x] Delete bundles with confirmation

3. **Batch Operations**
   - [x] Selection mode for content and text libraries
   - [x] Multi-select with visual feedback
   - [x] Batch assignment to multiple bundles simultaneously
   - [x] Real-time assignment results with error handling
   - [x] Progress feedback and success/error reporting

4. **Model Integration**
   - [x] Bundle selection in model content management
   - [x] Switch between model content and bundle content sources
   - [x] Bundle content display in model interface
   - [x] Seamless integration with existing content workflows

### ✅ Technical Requirements
1. **API Consistency**
   - [x] RESTful API design with consistent response formats
   - [x] Proper error handling and validation
   - [x] Batch operations with detailed result reporting
   - [x] Conflict detection for duplicate assignments

2. **Database Integrity**
   - [x] Foreign key constraints and cascading deletes
   - [x] JSONB storage for flexible categorization
   - [x] Proper indexing for performance
   - [x] Data validation at database level

3. **Frontend Architecture**
   - [x] Reusable modal components
   - [x] Consistent state management
   - [x] TypeScript type safety throughout
   - [x] Responsive design with mobile considerations

### ✅ User Experience
1. **Performance**
   - [x] Fast content loading with efficient queries
   - [x] Responsive UI during batch operations
   - [x] Optimized image loading and caching
   - [x] Smooth transitions and animations

2. **Usability**
   - [x] Intuitive navigation between content types
   - [x] Clear visual hierarchy and information architecture
   - [x] Contextual help and error messages
   - [x] Keyboard shortcuts and accessibility features

3. **Error Handling**
   - [x] Graceful error recovery
   - [x] Clear error messages with actionable guidance
   - [x] Validation feedback during form interactions
   - [x] Network error handling with retry options

## Dependencies
- **Database**: PostgreSQL with JSONB support
- **File Storage**: Local file system with proper permissions
- **Frontend**: React 18+ with TypeScript
- **Backend**: Node.js/Express with proper CORS configuration
- **UI Components**: Tailwind CSS with Lucide React icons

## Open Questions
- **Performance**: How will the system handle thousands of content items? (Addressed with pagination and efficient queries)
- **Storage**: What are the long-term storage requirements? (Currently using local storage, can be extended to cloud storage)
- **Permissions**: Should there be role-based access control? (Future enhancement, currently single-user system)

## Related Tasks
This PBI was implemented through the following key development tasks:

### Backend Development
1. **API Endpoint Creation** - Added comprehensive REST API for content and bundle management
2. **Database Schema Implementation** - Created tables for central content, bundles, and assignments
3. **Batch Operations** - Implemented efficient batch assignment with detailed result reporting

### Frontend Development  
1. **Central Content Registry Interface** - Main tabbed interface with content library management
2. **Enhanced Upload Modal** - Per-file customization with split-panel design
3. **Bundle Management Components** - Creation, editing, and content management modals
4. **Batch Assignment System** - Selection mode and batch operations interface
5. **Model Integration** - Bundle selection in existing model content management

### Integration & Testing
1. **API Integration** - Connected frontend components to backend endpoints
2. **Error Handling** - Comprehensive error handling and user feedback
3. **Performance Optimization** - Efficient queries and responsive UI design

**Parent PBI**: [PBI 11: Central Content Registry and Bundle Management](../backlog.md#user-content-11) 