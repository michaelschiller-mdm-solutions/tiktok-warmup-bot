# Design Document

## Overview

This design document outlines the implementation of an "Actions" column in all warmup phase tables within the Instagram tracker frontend. The Actions column provides manual intervention capabilities for account management during the warmup process, allowing administrators to mark accounts as invalid or retrieve authentication tokens directly from the interface.

## Architecture

### Component Structure

The implementation follows a consistent pattern across all warmup phase tables:

```
WarmupPipelineTab
├── Phase Tables (Manual Setup, Ready for Assignment, Invalid, Warmup Phases)
│   ├── DataGrid Component
│   │   ├── Base Columns (Select, Container, Username, etc.)
│   │   └── Actions Column
│   │       ├── Invalid Button
│   │       ├── Get Token Button
│   │       └── Phase-specific Actions
│   └── Action Handlers
│       ├── handleMarkInvalid()
│       ├── handleFetchEmailToken()
│       └── Phase-specific handlers
```

### State Management

The component manages several state variables for Actions column functionality:

- `markingInvalid: Record<number, boolean>` - Tracks loading state for invalid operations
- `fetchingTokens: Record<number, boolean>` - Tracks loading state for token retrieval
- `accountTokens: Record<number, string>` - Stores retrieved tokens
- `showTokenPopup: { accountId: number; token: string; username: string } | null` - Controls token display modal

## Components and Interfaces

### Actions Column Configuration

Each phase table includes an Actions column with the following configuration:

```typescript
{
  id: 'actions',
  field: 'id',
  header: 'Actions',
  width: 200,
  minWidth: 180,
  resizable: false,
  sortable: false,
  filterable: false,
  type: 'custom',
  align: 'center',
  visible: true,
  order: 999, // Always last column
  frozen: false,
  editable: false,
  required: false,
  render: (value, row) => <ActionsButtons />
}
```

### Button Components

#### Invalid Button
- **Purpose**: Mark account as invalid and free up resources
- **API Endpoint**: `apiClient.markAccountInvalid(accountId, reason)`
- **Loading State**: Shows spinner and "Marking..." text
- **Success**: Removes account from current phase table
- **Error Handling**: Shows error toast with details

#### Get Token Button
- **Purpose**: Retrieve Instagram verification token from email
- **API Endpoint**: `/api/automation/fetch-manual-token`
- **Requirements**: Account must have email and email_password
- **Success**: Shows token in popup modal
- **Error Handling**: Shows error toast with validation messages

### API Integration

#### Mark Invalid Endpoint
```typescript
POST /api/accounts/lifecycle/{accountId}/mark-invalid
Body: {
  reason: string,
  changed_by: string
}
Response: {
  success: boolean,
  message?: string
}
```

#### Fetch Token Endpoint
```typescript
POST /api/automation/fetch-manual-token
Body: {
  email: string,
  email_password: string
}
Response: {
  token: string,
  success: boolean,
  error?: string
}
```

## Data Models

### Account Interface Extensions

The Actions column works with the existing `WarmupAccountWithPhases` interface:

```typescript
interface WarmupAccountWithPhases extends Account {
  phases: WarmupPhase[];
  current_phase?: string;
  phase_status?: WarmupPhaseStatus;
  warmup_progress: number;
  account_details?: {
    email?: string;
    email_password?: string;
  };
}
```

### Action State Models

```typescript
interface ActionStates {
  markingInvalid: Record<number, boolean>;
  fetchingTokens: Record<number, boolean>;
  accountTokens: Record<number, string>;
}

interface TokenPopupState {
  accountId: number;
  token: string;
  username: string;
}
```

## Error Handling

### Invalid Action Errors
- **Network Failures**: Show retry option with error details
- **Permission Errors**: Show appropriate permission denied message
- **Validation Errors**: Show specific validation requirements

### Token Retrieval Errors
- **Missing Credentials**: Validate email and email_password presence
- **Authentication Failures**: Show email/password validation errors
- **Network Timeouts**: Show retry option with timeout details
- **Email Service Errors**: Show specific email service error messages

### Loading State Management
- **Button Disabled States**: Prevent multiple simultaneous actions
- **Visual Feedback**: Show spinners and loading text
- **Optimistic Updates**: Remove accounts from tables immediately on success
- **Rollback Capability**: Handle failed operations gracefully

## Testing Strategy

### Unit Tests
- Button rendering with correct props
- Loading state management
- Error state handling
- Action handler function calls

### Integration Tests
- API endpoint integration
- State updates after successful actions
- Error handling with real API responses
- Table updates after account state changes

### End-to-End Tests
- Complete invalid account workflow
- Complete token retrieval workflow
- Multi-account batch operations
- Cross-phase consistency verification

## Performance Considerations

### Optimistic Updates
- Remove accounts from tables immediately on successful actions
- Avoid full table refreshes when possible
- Use local state updates for better responsiveness

### API Efficiency
- Batch operations where possible
- Debounce rapid button clicks
- Cache token results temporarily

### Memory Management
- Clean up token state after use
- Remove loading states on component unmount
- Prevent memory leaks in async operations

## Security Considerations

### Token Handling
- Display tokens in secure modal only
- Clear token state after viewing
- No token persistence in localStorage
- Copy-to-clipboard functionality with security warnings

### Action Authorization
- Validate user permissions before showing buttons
- Server-side authorization for all actions
- Audit logging for invalid account actions
- Rate limiting for token retrieval

## Accessibility

### Keyboard Navigation
- All buttons accessible via keyboard
- Proper tab order within Actions column
- Focus management in token popup modal

### Screen Reader Support
- Descriptive button labels and titles
- Loading state announcements
- Error message accessibility
- Modal dialog accessibility

### Visual Indicators
- High contrast button states
- Clear loading indicators
- Consistent color coding across phases
- Responsive design for different screen sizes