# Component Library Specification

## Overview
Comprehensive design system and component library specification for the Instagram automation platform, ensuring consistent UI/UX across all views and maintaining scalability for the complex multi-view interface.

## **Design System Principles**

### **1. Consistency**
- Unified visual language across all views
- Consistent component behavior and interactions
- Standardized spacing, typography, and color usage

### **2. Scalability** 
- Components designed for 10,000+ record datasets
- Performance-optimized for large data operations
- Modular architecture supporting feature expansion

### **3. Accessibility**
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

### **4. Excel-like Familiarity**
- Familiar interaction patterns from Excel/Google Sheets
- Consistent keyboard shortcuts across components
- Similar visual feedback and selection models

## **Color System**

### **Primary Colors**
```css
:root {
  /* Brand Colors */
  --primary-blue: #3B82F6;
  --primary-blue-dark: #1D4ED8;
  --primary-blue-light: #93C5FD;
  
  /* Secondary Colors */
  --secondary-gray: #6B7280;
  --secondary-gray-dark: #374151;
  --secondary-gray-light: #F3F4F6;
}
```

### **Status Colors**
```css
:root {
  /* Account Status */
  --status-active: #10B981;      /* Green */
  --status-banned: #EF4444;      /* Red */
  --status-suspended: #F59E0B;   /* Orange */
  --status-inactive: #6B7280;    /* Gray */
  
  /* Lifecycle States */
  --lifecycle-imported: #8B5CF6;     /* Purple */
  --lifecycle-warming-up: #F59E0B;   /* Orange */
  --lifecycle-ready: #10B981;        /* Green */
  --lifecycle-active: #3B82F6;       /* Blue */
  --lifecycle-review: #EF4444;       /* Red */
  --lifecycle-cleanup: #6B7280;      /* Gray */
  
  /* Warm-up Steps */
  --step-pending: #E5E7EB;       /* Light Gray */
  --step-progress: #3B82F6;      /* Blue */
  --step-completed: #10B981;     /* Green */
  --step-failed: #EF4444;        /* Red */
}
```

### **Background Colors**
```css
:root {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --bg-tertiary: #F3F4F6;
  --bg-selected: #EBF8FF;
  --bg-hover: #F8FAFC;
  --bg-error: #FEF2F2;
  --bg-warning: #FFFBEB;
  --bg-success: #F0FDF4;
}
```

## **Typography System**

### **Font Families**
```css
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Fira Code', 'Monaco', 'Cascadia Code', monospace;
}
```

### **Font Scales**
```css
:root {
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
}
```

### **Font Weights**
```css
:root {
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

## **Spacing System**

### **Base Scale** (4px base unit)
```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

### **Component Spacing**
```css
:root {
  --cell-padding: var(--space-3);
  --row-height: 2.5rem;              /* 40px */
  --header-height: 3rem;             /* 48px */
  --sidebar-width: 16rem;            /* 256px */
  --tab-height: 2.75rem;             /* 44px */
}
```

## **Core Components**

### **1. DataGrid Component**

#### **DataGrid Structure**
```typescript
interface DataGridProps<T> {
  data: T[];
  columns: DataGridColumn<T>[];
  loading?: boolean;
  error?: string;
  onSelectionChange?: (selection: SelectionState) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: FilterState) => void;
  virtualScrolling?: boolean;
  rowHeight?: number;
  headerHeight?: number;
  multiSelect?: boolean;
  showRowNumbers?: boolean;
}
```

#### **Visual Specifications**
```css
.data-grid {
  /* Container */
  border: 1px solid var(--secondary-gray-light);
  border-radius: 8px;
  background: var(--bg-primary);
  overflow: hidden;
  
  /* Header */
  .data-grid__header {
    background: var(--bg-secondary);
    border-bottom: 2px solid var(--secondary-gray-light);
    height: var(--header-height);
    font-weight: var(--font-semibold);
  }
  
  /* Cells */
  .data-grid__cell {
    padding: var(--cell-padding);
    border-right: 1px solid var(--secondary-gray-light);
    height: var(--row-height);
    display: flex;
    align-items: center;
  }
  
  /* Row States */
  .data-grid__row {
    &:hover {
      background: var(--bg-hover);
    }
    
    &--selected {
      background: var(--bg-selected);
    }
    
    &:nth-child(even) {
      background: var(--bg-tertiary);
    }
  }
}
```

#### **Cell Type Components**

**Status Badge Cell**
```typescript
interface StatusBadgeProps {
  status: 'active' | 'banned' | 'suspended' | 'inactive';
  size?: 'sm' | 'md' | 'lg';
}
```
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: 9999px;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  
  &--active {
    background: var(--status-active);
    color: white;
  }
  
  &--banned {
    background: var(--status-banned);
    color: white;
  }
  
  /* ... other status variations */
}
```

**Lifecycle State Cell**
```typescript
interface LifecycleStateProps {
  state: LifecycleState;
  step?: number;
  withProgress?: boolean;
}
```

**Progress Step Cell**
```typescript
interface ProgressStepProps {
  currentStep: number;
  totalSteps: number;
  stepStatus: StepStatus[];
  compact?: boolean;
}
```

### **2. Navigation Components**

#### **Tab Navigation**
```typescript
interface TabNavigationProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  loading?: boolean;
  badges?: Record<string, number>;
}
```

```css
.tab-navigation {
  display: flex;
  border-bottom: 1px solid var(--secondary-gray-light);
  background: var(--bg-primary);
  
  .tab-navigation__tab {
    padding: var(--space-4) var(--space-6);
    border-bottom: 2px solid transparent;
    font-weight: var(--font-medium);
    color: var(--secondary-gray);
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      color: var(--primary-blue);
      background: var(--bg-hover);
    }
    
    &--active {
      color: var(--primary-blue);
      border-bottom-color: var(--primary-blue);
    }
    
    .tab-navigation__badge {
      margin-left: var(--space-2);
      background: var(--secondary-gray-light);
      color: var(--secondary-gray-dark);
      border-radius: 9999px;
      padding: var(--space-1) var(--space-2);
      font-size: var(--text-xs);
    }
  }
}
```

#### **Breadcrumb Navigation**
```typescript
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  maxItems?: number;
  separator?: React.ReactNode;
}
```

### **3. Input Components**

#### **Filter Input**
```typescript
interface FilterInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  debounceMs?: number;
}
```

#### **Multi-Select Dropdown**
```typescript
interface MultiSelectProps<T> {
  options: SelectOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  placeholder?: string;
  searchable?: boolean;
  maxDisplayed?: number;
}
```

### **4. Action Components**

#### **Bulk Action Bar**
```typescript
interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onAction: (action: string, selectedIds: string[]) => void;
  onClearSelection: () => void;
}
```

```css
.bulk-action-bar {
  position: fixed;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%);
  background: var(--primary-blue-dark);
  color: white;
  border-radius: 8px;
  padding: var(--space-4);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  z-index: 1000;
  
  .bulk-action-bar__count {
    font-weight: var(--font-semibold);
  }
  
  .bulk-action-bar__actions {
    display: flex;
    gap: var(--space-2);
  }
}
```

## **Layout Components**

### **1. Page Layout**
```typescript
interface PageLayoutProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
}
```

### **2. Card Layout**
```css
.card {
  background: var(--bg-primary);
  border: 1px solid var(--secondary-gray-light);
  border-radius: 8px;
  padding: var(--space-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  .card__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
    
    .card__title {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--primary-blue-dark);
    }
  }
  
  .card__content {
    /* Content styles */
  }
}
```

### **3. Stats Card Grid**
```typescript
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    period: string;
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red';
}
```

## **Interaction Patterns**

### **1. Excel-like Keyboard Navigation**
```typescript
// Key binding configuration
const keyBindings = {
  // Navigation
  'ArrowUp': 'move_up',
  'ArrowDown': 'move_down', 
  'ArrowLeft': 'move_left',
  'ArrowRight': 'move_right',
  'Tab': 'move_next_cell',
  'Shift+Tab': 'move_prev_cell',
  'Enter': 'move_down_same_column',
  'Home': 'move_row_start',
  'End': 'move_row_end',
  'Ctrl+Home': 'move_grid_start',
  'Ctrl+End': 'move_grid_end',
  'PageUp': 'move_page_up',
  'PageDown': 'move_page_down',
  
  // Selection
  'Ctrl+A': 'select_all',
  'Shift+ArrowUp': 'extend_selection_up',
  'Shift+ArrowDown': 'extend_selection_down',
  'Ctrl+Click': 'toggle_selection',
  'Shift+Click': 'range_selection',
  
  // Actions
  'Delete': 'delete_selected',
  'Ctrl+C': 'copy_selected',
  'Ctrl+V': 'paste_content',
  'F2': 'edit_cell',
  'Escape': 'cancel_edit'
};
```

### **2. Selection Model**
```typescript
interface SelectionState {
  type: 'none' | 'cell' | 'row' | 'column' | 'range';
  anchorCell?: CellPosition;
  focusCell?: CellPosition;
  selectedRows?: Set<string>;
  selectedColumns?: Set<string>;
  selectedCells?: Set<string>;
}
```

### **3. Context Menus**
```typescript
interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  target: 'cell' | 'row' | 'column' | 'header';
}
```

## **Performance Specifications**

### **Virtual Scrolling Requirements**
- **Minimum Performance**: Smooth scrolling with 10,000 rows
- **Maximum Performance**: Handle 100,000 rows without degradation
- **Row Height**: Fixed 40px for consistent performance
- **Buffer Size**: 50 rows above/below viewport

### **Loading States**
```typescript
interface LoadingStates {
  // Data grid loading
  dataLoading: boolean;        // Show skeleton rows
  dataError: boolean;          // Show error state
  
  // Operation loading
  actionLoading: boolean;      // Show action spinner
  bulkLoading: boolean;        // Show bulk operation progress
  
  // Navigation loading
  tabLoading: boolean;         // Show tab loading state
  pageLoading: boolean;        // Show page transition
}
```

### **Error States**
```typescript
interface ErrorHandling {
  // Error display
  showInlineErrors: boolean;   // Show errors in grid cells
  showToastErrors: boolean;    // Show errors as notifications
  showModalErrors: boolean;    // Show errors in modal dialogs
  
  // Recovery actions
  retryActions: boolean;       // Allow retry buttons
  clearErrorsAction: boolean;  // Allow clearing error states
}
```

## **Responsive Design**

### **Breakpoints**
```css
:root {
  --breakpoint-sm: 640px;   /* Small tablets */
  --breakpoint-md: 768px;   /* Large tablets */
  --breakpoint-lg: 1024px;  /* Small desktops */
  --breakpoint-xl: 1280px;  /* Large desktops */
  --breakpoint-2xl: 1536px; /* Extra large */
}
```

### **Mobile Adaptations**
- **Tabs**: Convert to dropdown on mobile
- **DataGrid**: Horizontal scroll with fixed left column
- **Actions**: Move to bottom sheet on mobile
- **Filters**: Collapse to accordion on small screens

## **Animation Guidelines**

### **Transition Timing**
```css
:root {
  --transition-fast: 0.15s ease-out;
  --transition-normal: 0.2s ease-out;
  --transition-slow: 0.3s ease-out;
}
```

### **Animation Patterns**
- **Hover States**: Fast transitions (0.15s)
- **Selection Changes**: Normal transitions (0.2s)
- **Page Transitions**: Slow transitions (0.3s)
- **Data Loading**: Skeleton animations with shimmer effect
- **Error States**: Gentle shake animation for validation errors

## **Component Testing Standards**

### **Unit Test Requirements**
```typescript
// Example test structure for DataGrid
describe('DataGrid Component', () => {
  test('renders data correctly', () => {});
  test('handles selection changes', () => {});
  test('supports keyboard navigation', () => {});
  test('handles loading states', () => {});
  test('displays error states', () => {});
  test('performs bulk operations', () => {});
});
```

### **Accessibility Testing**
- **Screen Reader**: Test with NVDA/JAWS
- **Keyboard Navigation**: Tab order and shortcuts
- **Color Contrast**: All text meets WCAG AA standards
- **Focus Management**: Visible focus indicators

### **Performance Testing**
- **Large Dataset**: Test with 10,000+ records
- **Memory Usage**: Monitor for memory leaks
- **Scroll Performance**: 60fps scrolling requirement
- **Load Time**: Components render within 100ms 