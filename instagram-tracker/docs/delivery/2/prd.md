# PBI-2: Excel-like Account Management Interface

[View in Backlog](../backlog.md#user-content-2)

## Overview

Create a comprehensive Excel-like interface for viewing, editing, and managing Instagram account data with dynamic column support, inline editing, and bulk operations to efficiently handle thousands of accounts across multiple models.

## Problem Statement

Campaign managers need to efficiently manage thousands of Instagram accounts with complex data requirements including account details, target user relationships, follow-back tracking, and mother-slave account hierarchies. The current system lacks a spreadsheet-like interface that would allow for:
- Quick data entry and editing
- Dynamic column management
- Advanced filtering and sorting
- Bulk operations across multiple accounts
- Real-time relationship tracking

## User Stories

- As a campaign manager, I want an Excel-like data grid so I can view account data in a familiar spreadsheet format
- As a campaign manager, I want to edit account data inline so I can quickly update information without switching screens
- As a campaign manager, I want to add custom columns so I can track additional data points specific to my campaigns
- As a campaign manager, I want to bulk edit multiple accounts so I can efficiently update common properties
- As a campaign manager, I want to sort and filter accounts so I can find specific subsets of data
- As a campaign manager, I want to import/export account data so I can work with external tools
- As a campaign manager, I want to track follow-back relationships so I can monitor engagement success
- As a campaign manager, I want to manage mother-slave account relationships so I can coordinate account hierarchies

## Technical Approach

### Database Schema Extensions
- Extend `accounts` table with missing fields (content_type, campus, niche, etc.)
- Add `dynamic_columns` table for user-defined columns
- Enhance `model_target_follows` with follow-back duration tracking
- Add `account_relationships` table for mother-slave hierarchies

### Frontend Architecture
- **DataGrid Component**: Excel-like table with virtual scrolling for performance
- **Inline Editing**: Cell-level editing with validation and auto-save
- **Column Management**: Dynamic show/hide, reordering, and custom column creation
- **Bulk Operations**: Multi-select with batch edit capabilities
- **Import/Export**: CSV/Excel file handling with preview and validation

### Backend API Design
- RESTful endpoints for account CRUD operations
- Bulk operation endpoints for efficient batch processing
- Dynamic column management API
- Real-time updates via WebSocket for collaborative editing

## UX/UI Considerations

### Excel-like Features
- **Keyboard Navigation**: Arrow keys, Tab, Enter for cell navigation
- **Column Resizing**: Draggable column borders
- **Row Selection**: Click row numbers for full row selection
- **Multi-Select**: Ctrl+Click and Shift+Click for multiple selection
- **Context Menus**: Right-click for quick actions
- **Freeze Panes**: Lock important columns during horizontal scrolling

### Data Entry Efficiency
- **Auto-complete**: Dropdown suggestions for common values
- **Data Validation**: Real-time validation with error highlighting
- **Batch Edit**: Select multiple cells and edit all at once
- **Quick Actions**: Keyboard shortcuts for common operations

### Visual Design
- **Status Indicators**: Color-coded status badges (Active=Green, Banned=Red, etc.)
- **Progress Tracking**: Visual indicators for follow-back status and duration
- **Relationship Mapping**: Visual connections between mother-slave accounts
- **Data Health**: Warning indicators for missing or invalid data

## Acceptance Criteria

### Core Data Grid Functionality
- [x] Display account data in Excel-like table format with virtual scrolling
- [x] Support for all required data fields with appropriate input types
- [x] Column sorting (ascending/descending) on all fields
- [x] Advanced filtering with multiple criteria
- [x] Real-time search across all visible columns
- [x] Keyboard navigation matching Excel behavior
- [x] Row and column selection with visual feedback

### Field Requirements Implementation
**Account Container (Account 1)**
- [x] Status field with dropdown (Aktiv, Banned, Suspended, Inactive)
- [x] Creation Date with date picker
- [x] Device information display and editing
- [x] Content Type selection (dropdown with common types)
- [x] Profile Picture display with upload capability
- [x] Name field with validation
- [x] Email field with format validation
- [x] Password field with security masking
- [x] Location fields (Stadt, Kampus, Nieche) with auto-complete
- [x] Bio field with character count
- [x] Birthday field with date picker

**Post Management**
- [x] Post list with Date and Due date tracking
- [x] Integration with Cupid content system
- [x] Post status tracking and notifications

**Target User Relationships**
- [x] Target User assignment with search/selection
- [x] Follow-back status (True/False) with visual indicators
- [x] Follow duration tracking with automatic unfollow alerts (1 week threshold)
- [x] Random unfollow ratio implementation (90/10 split)

**Account Hierarchy**
- [x] Mother Account assignment and display
- [x] Slave Account relationships with visual hierarchy
- [x] CTA to Mother Account functionality

### Advanced Features
- [x] Dynamic column addition with database schema updates
- [x] Column show/hide with user preference storage
- [x] Bulk edit operations with confirmation dialogs
- [x] Import from CSV/Excel with validation and preview
- [x] Export to multiple formats (CSV, Excel, JSON)
- [x] Real-time collaborative editing with conflict resolution
- [x] Undo/Redo functionality for data changes
- [x] Data backup and version history

### Performance Requirements
- [x] Handle 10,000+ accounts without performance degradation
- [x] Virtual scrolling for efficient DOM management
- [x] Debounced search and filtering
- [x] Lazy loading for related data (target users, posts)
- [x] Optimistic updates with rollback on failure

### Data Integrity
- [x] Real-time validation with error highlighting
- [x] Conflict detection and resolution for concurrent edits
- [x] Data consistency checks across related tables
- [x] Audit trail for all data changes
- [x] Automatic backup before bulk operations

## Dependencies

- PBI 1 (Model Management) must be completed
- Chart.js/D3.js for data visualization components
- React Virtual or similar for performance optimization
- WebSocket implementation for real-time features
- File upload/download API for import/export

## Open Questions

1. Should we implement Excel-like formulas for calculated fields?
2. What level of real-time collaboration is needed (Google Sheets vs simpler updates)?
3. How should we handle very large datasets (100k+ accounts) - pagination vs infinite scroll?
4. Should we support custom scripting/automation within the interface?
5. What export formats are most important (prioritize CSV/Excel vs JSON/PDF)?

## Related Tasks

[View Task List](./tasks.md) 