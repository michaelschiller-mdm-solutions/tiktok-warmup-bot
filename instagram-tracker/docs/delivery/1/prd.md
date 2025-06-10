# PBI-1: Model/Campaign Management System

[View in Backlog](../backlog.md#user-content-1)

## Overview

Create a comprehensive model/campaign management system that allows users to organize Instagram accounts into different strategies with configurable automation settings.

## Problem Statement

Currently, there's no way to organize Instagram accounts into logical groups (models/campaigns) with specific automation rules. Users need to manage thousands of accounts across different strategies (fitness influencers, fashion brands, tech startups) with different follow/unfollow behaviors and posting schedules.

## User Stories

- As a campaign manager, I want to create new models so I can organize accounts by strategy
- As a campaign manager, I want to configure unfollow ratios per model so different campaigns have different behaviors
- As a campaign manager, I want to set daily follow limits per model so I can control automation speed
- As a campaign manager, I want to configure posting schedules per model so content goes out at optimal times
- As a campaign manager, I want to view model statistics so I can monitor campaign health

## Technical Approach

- **Frontend**: React components for model CRUD operations
- **Backend**: REST API endpoints for model management
- **Database**: Already implemented models table with JSON settings support
- **UI Framework**: Modern card-based interface with forms

## UX/UI Considerations

- **Dashboard View**: Card-based layout showing model overview
- **Creation Flow**: Step-by-step wizard for new models
- **Settings Panel**: Intuitive controls for automation parameters
- **Quick Actions**: Edit, delete, clone model functionality
- **Visual Indicators**: Status badges, progress bars, account counts

## Acceptance Criteria

1. **Model CRUD Operations**:
   - Create new models with name, description, and basic settings
   - Read/list all models with summary statistics
   - Update model settings and configurations
   - Delete models (with confirmation and cascade handling)

2. **Configurable Settings**:
   - Unfollow ratio (0-100%) with input validation
   - Daily follow limits (positive integers) with reasonable bounds
   - Posting schedule (JSON format) with time validation
   - Additional settings stored as flexible JSON

3. **Model Statistics**:
   - Total account count per model
   - Active account count per model
   - Recent activity indicators
   - Status summaries

4. **Validation & Error Handling**:
   - Unique model names enforced
   - Input validation with user-friendly error messages
   - Graceful handling of network errors
   - Confirmation dialogs for destructive actions

## Dependencies

- Database schema (already implemented)
- Backend API framework (already implemented)
- Frontend routing and state management
- UI component library setup

## Open Questions

- Should models support templates/presets for common campaign types?
- Do we need model archiving vs permanent deletion?
- Should there be model access controls/permissions?

## Related Tasks

[View Task List](./tasks.md) 