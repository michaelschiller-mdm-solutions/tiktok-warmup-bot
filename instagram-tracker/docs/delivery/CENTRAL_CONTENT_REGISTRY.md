# Central Content Registry and Bundle Management System

## Overview
The Central Content Registry is a comprehensive content management system that provides centralized storage, organization, and distribution of content across multiple Instagram automation campaigns. It features advanced bundle management, batch operations, and seamless integration with existing model content workflows.

## System Architecture

### Core Components

#### 1. Database Schema
```sql
-- Central content storage for images/videos
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

-- Central text content storage
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

#### 2. API Layer
The system exposes RESTful APIs organized into three main categories:

**Content Management APIs**
- `GET /api/central/content` - List and filter content
- `POST /api/central/content/upload` - Upload new content
- `PUT /api/central/content/:id` - Update content metadata
- `DELETE /api/central/content/:id` - Delete content

**Text Content APIs**
- `GET /api/central/text-content` - List text content
- `POST /api/central/text-content` - Create text content
- `PUT /api/central/text-content/:id` - Update text content
- `DELETE /api/central/text-content/:id` - Delete text content

**Bundle Management APIs**
- `GET /api/central/bundles` - List bundles
- `POST /api/central/bundles` - Create bundle
- `PUT /api/central/bundles/:id` - Update bundle
- `DELETE /api/central/bundles/:id` - Delete bundle
- `GET /api/central/bundles/:id/contents` - Get bundle contents
- `POST /api/central/bundles/:id/add-content` - Add single item
- `POST /api/central/bundles/:id/add-content/batch` - Batch add items
- `DELETE /api/central/bundles/:id/content/:assignmentId` - Remove item

#### 3. Frontend Components

**Main Interface Components**
- `CentralContentRegistry` - Tabbed main interface
- `CentralContentUploadModal` - Enhanced upload with per-file settings
- `BundleCreateModal` - Bundle creation and editing
- `BundleContentsModal` - Bundle content management
- `BatchAssignModal` - Batch assignment operations

**Integration Components**
- `ContentManagementTab` - Model content management integration
- Navigation updates for "Content Registry" access

## Key Features

### 1. Centralized Content Management

#### Content Upload with Per-File Customization
The upload system provides:
- **Split-Panel Interface**: Global settings on left, individual file management on right
- **Per-File Override**: Each file can have unique categories, tags, and bundle assignments
- **Visual Preview**: Thumbnail previews with status indicators
- **Drag & Drop**: Enhanced drag and drop with visual feedback

#### Flexible Categorization System
- **JSONB Storage**: Categories and tags stored as JSONB arrays for flexibility
- **Multi-Category Support**: Content can belong to multiple categories
- **Tag-Based Organization**: Free-form tagging system for detailed organization
- **Search and Filtering**: Real-time search across categories and tags

### 2. Content Bundle Management

#### Bundle Operations
- **Mixed Media Bundles**: Support for images, videos, and text in single bundle
- **Bundle Contents Management**: View, search, and manage all bundle contents
- **Assignment Order**: Control the order of content within bundles
- **Bulk Operations**: Add/remove multiple items efficiently

### 3. Batch Operations System

Features:
- **Toggle Selection Mode**: Enter/exit selection mode with visual feedback
- **Multi-Select Interface**: Checkboxes with visual selection indicators
- **Batch Assignment**: Assign multiple items to multiple bundles simultaneously
- **Progress Feedback**: Real-time results with success/error reporting
- **Conflict Detection**: Prevent duplicate assignments with clear messaging

### 4. Model Integration

#### Bundle Selection in Models
Models can now select content from two sources:
1. **Model-Specific Content**: Traditional model-only content
2. **Central Content Bundles**: Shared bundles from central registry

#### Content Assignment Priority
1. **Bundle Content**: Content from assigned bundles (highest priority)
2. **Model Content**: Model-specific content (medium priority)
3. **Template Content**: Default template content (fallback)

## Technical Implementation Details

### Database Optimizations

#### Indexes for Performance
```sql
-- Performance indexes
CREATE INDEX idx_central_content_categories ON central_content USING GIN (categories);
CREATE INDEX idx_central_content_status ON central_content (status);
CREATE INDEX idx_text_content_categories ON central_text_content USING GIN (categories);
CREATE INDEX idx_bundles_categories ON content_bundles USING GIN (categories);
CREATE INDEX idx_bundle_assignments_bundle ON bundle_content_assignments (bundle_id);

-- Unique constraints to prevent duplicates
CREATE UNIQUE INDEX idx_bundle_content_unique ON bundle_content_assignments (bundle_id, content_id) WHERE content_id IS NOT NULL;
CREATE UNIQUE INDEX idx_bundle_text_unique ON bundle_content_assignments (bundle_id, text_content_id) WHERE text_content_id IS NOT NULL;
```

### Frontend Architecture

#### Component Hierarchy
```
CentralContentRegistry
├── ContentLibraryTab
│   ├── ContentGrid
│   ├── SelectionControls
│   └── FilterControls
├── BundleManagementTab
│   ├── BundleGrid
│   ├── BundleCreateModal
│   └── BundleContentsModal
└── TextLibraryTab
    ├── TextList
    ├── TextCreateModal
    └── SelectionControls
```

### Error Handling and Validation

#### Frontend Error Handling
- **Network Errors**: Retry mechanisms with exponential backoff
- **Validation Errors**: Real-time form validation with clear messaging
- **Conflict Errors**: Clear feedback when duplicate assignments attempted
- **File Upload Errors**: Per-file error reporting with retry options

### Security Considerations

#### File Upload Security
- **File Type Validation**: Strict validation of uploaded file types
- **File Size Limits**: Configurable limits to prevent abuse
- **Filename Sanitization**: Secure filename handling to prevent path traversal

#### API Security
- **Input Validation**: Comprehensive validation of all API inputs
- **SQL Injection Prevention**: Parameterized queries throughout
- **CORS Configuration**: Proper CORS setup for frontend integration

## Performance Considerations

### Database Performance
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized queries with proper indexing
- **Batch Operations**: Efficient batch processing to reduce database load

### Frontend Performance
- **Lazy Loading**: Content loaded on demand to reduce initial load time
- **Virtual Scrolling**: Efficient rendering of large content lists
- **Image Optimization**: Thumbnail generation and caching
- **Debounced Search**: Optimized search with debouncing to reduce API calls

## Conclusion

The Central Content Registry and Bundle Management system provides a comprehensive solution for managing content across multiple Instagram automation campaigns. With its advanced features, robust architecture, and seamless integration capabilities, it significantly enhances the efficiency and effectiveness of content management workflows.

The system's modular design ensures scalability and maintainability, while its user-friendly interface makes it accessible to users of all technical levels. 