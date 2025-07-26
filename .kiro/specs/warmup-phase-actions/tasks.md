# Implementation Plan

- [x] 1. Add Actions column to all warmup phase tables
  - Create consistent Actions column configuration across all phase tables
  - Ensure proper column ordering (Actions column always last)
  - Implement responsive design for Actions column
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement Invalid button functionality
  - Add Invalid button to Actions column with proper styling
  - Implement handleMarkInvalid function with loading states
  - Add confirmation dialog for invalid action
  - Implement optimistic UI updates after successful invalid action
  - Add error handling and user feedback for invalid operations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 3. Implement Get Token button functionality
  - Add Get Token button to Actions column with proper styling
  - Implement handleFetchEmailToken function with validation
  - Create token display modal with copy-to-clipboard functionality
  - Add loading states and error handling for token retrieval
  - Implement token state management and cleanup
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Apply consistent styling and responsive design
  - Implement design system colors and hover states for buttons
  - Add proper disabled states for buttons during loading
  - Ensure Actions column works on different screen sizes
  - Test button accessibility and keyboard navigation
  - Verify consistent styling across all warmup phase tables
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5. Implement permissions and error handling
  - Add permission checks for Actions column operations
  - Implement comprehensive error handling for all button actions
  - Add loading states and progress indicators
  - Implement retry mechanisms for failed operations
  - Add proper logging for debugging purposes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 6. Test Actions column functionality end-to-end
  - Test Invalid button across all warmup phase tables
  - Test Get Token button with various account states
  - Verify proper error handling and user feedback
  - Test responsive design and accessibility features
  - Validate that Actions column integrates with existing table functionality
  - _Requirements: All requirements validation_
