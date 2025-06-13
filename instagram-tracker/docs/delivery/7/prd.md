# PBI-7: Proxy Management System

## Overview

This PBI implements a comprehensive proxy management system that allows campaign managers to upload/import proxies and automatically assign them to Instagram accounts. The system ensures optimal proxy distribution with a maximum of 3 accounts per proxy AND only one model per proxy to avoid IP blocks, maintain account safety, and prevent cross-model contamination.

## Problem Statement

Instagram accounts require proxy rotation to avoid detection and IP blocks during automation. Manual proxy assignment is time-consuming and error-prone, especially when managing thousands of accounts. The system needs to:

- Handle proxy imports efficiently
- Automatically assign proxies with proper limits
- Track proxy usage and health
- Document VPS-proxy relationships for future scaling
- Provide visibility into proxy distribution

## User Stories

**Primary Story**: As a campaign manager, I want to manage proxies and assign them to accounts so that I can ensure proper proxy distribution and avoid IP blocks.

**Supporting Stories**:
- As a campaign manager, I want to bulk import proxies so that I can quickly add proxy pools to the system
- As a campaign manager, I want automatic proxy assignment so that accounts get proxies without manual intervention
- As a campaign manager, I want to see proxy usage so that I can monitor distribution and health
- As a campaign manager, I want to track which VPS uses which proxies so that I can document infrastructure relationships

## Technical Approach

### Database Schema
- **proxies table**: Store proxy details (host, port, username, password, type, status)
- **account_proxy_assignments table**: Track which accounts use which proxies
- **vps_proxy_mappings table**: Document VPS-proxy relationships (future)

### Backend Services
- **ProxyService**: Core proxy management logic
- **ProxyAssignmentService**: Automatic assignment algorithms
- **ProxyImportService**: Bulk import functionality

### Frontend Components
- **ProxyManagement view**: Upload, list, and manage proxies
- **ProxyAssignment view**: View and modify proxy assignments
- **ProxyStats component**: Usage statistics and health metrics

### API Endpoints
- `POST /api/proxies/import` - Bulk proxy import
- `GET /api/proxies` - List proxies with usage stats
- `POST /api/proxies/assign` - Manual proxy assignment
- `GET /api/accounts/:id/proxy` - Get account's assigned proxy
- `DELETE /api/proxies/:id` - Remove proxy

## UX/UI Considerations

### Proxy Upload Interface
- Drag-and-drop CSV/text file upload
- Real-time validation with preview
- Support for common proxy formats (IP:Port:User:Pass)
- Bulk edit capabilities for proxy metadata

### Assignment Overview
- Visual representation of proxy distribution
- Clear indicators for overloaded proxies (>3 accounts)
- Model-based grouping to enforce one-model-per-proxy rule
- Quick assignment/reassignment actions within model constraints
- Search and filter capabilities by model and usage

### Status Indicators
- Proxy health status (active, inactive, blocked)
- Usage indicators (0/3, 1/3, 2/3, 3/3 accounts)
- Last used timestamp
- Connection test results

## Acceptance Criteria

### Proxy Import
- ✅ Support CSV and text file uploads
- ✅ Validate proxy format during import
- ✅ Preview imported proxies before confirmation
- ✅ Handle duplicate proxy detection
- ✅ Batch import of 100+ proxies

### Automatic Assignment
- ✅ Assign proxies to accounts automatically during import
- ✅ Respect 3-account limit per proxy
- ✅ Enforce one-model-per-proxy constraint to prevent cross-contamination
- ✅ Prioritize unused proxies for new assignments
- ✅ Handle proxy exhaustion gracefully
- ✅ Support manual reassignment within model constraints

### Proxy Management
- ✅ View all proxies with usage statistics
- ✅ Edit proxy metadata (labels, notes)
- ✅ Deactivate/reactivate proxies
- ✅ Remove proxies (with account reassignment)
- ✅ Test proxy connectivity

### VPS Documentation
- ✅ Record which VPS manages which accounts
- ✅ Link VPS-proxy relationships
- ✅ Export VPS-proxy-account mappings
- ✅ Support multiple VPS environments

## Dependencies

- Database migration system (from PBI 2)
- Account management system (from PBI 2)
- File upload infrastructure
- CSV parsing library

## Open Questions

1. Should we support proxy rotation for individual accounts?
2. How should we handle proxy failures during bot operations?
3. What proxy health checks should we implement?
4. Should we integrate with proxy provider APIs for automatic provisioning?

## Related Tasks

This PBI will be broken down into the following tasks:
- [View Tasks](./tasks.md)

[View in Backlog](../backlog.md#user-content-7) 