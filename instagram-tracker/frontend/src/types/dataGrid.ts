import { Account } from './accounts';

// Column definition interface
export interface DataGridColumn<T = any> {
  id: string;
  field: keyof T;
  header: string;
  width: number;
  minWidth: number;
  maxWidth?: number;
  resizable: boolean;
  sortable: boolean;
  filterable: boolean;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'custom';
  align: 'left' | 'center' | 'right';
  
  // Rendering functions
  render?: (value: any, row: T, column: DataGridColumn<T>) => React.ReactNode;
  headerRender?: (column: DataGridColumn<T>) => React.ReactNode;
  
  // Validation and formatting
  validator?: (value: any) => string | null;
  formatter?: (value: any) => string;
  
  // For select type columns
  options?: Array<{ value: any; label: string }>;
  
  // For custom columns
  editable: boolean;
  required: boolean;
  
  // Visibility and order
  visible: boolean;
  order: number;
  frozen: boolean; // For sticky columns
}

// Cell position and state
export interface CellPosition {
  rowIndex: number;
  columnIndex: number;
}

export interface CellState {
  position: CellPosition;
  value: any;
  isEditing: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  hasError: boolean;
  errorMessage?: string;
}

// Selection types
export interface SelectionRange {
  start: CellPosition;
  end: CellPosition;
}

export interface SelectionState {
  selectedCells: Set<string>; // "rowIndex:columnIndex"
  selectedRows: Set<number>;
  selectedColumns: Set<number>;
  activeCell: CellPosition | null;
  ranges: SelectionRange[];
  mode: 'cell' | 'row' | 'column' | 'range';
}

// Keyboard navigation
export interface KeyboardNavigation {
  direction: 'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'pageUp' | 'pageDown';
  withShift: boolean;
  withCtrl: boolean;
  withAlt: boolean;
}

// Virtual scrolling state
export interface VirtualScrollState {
  scrollTop: number;
  scrollLeft: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
  rowHeight: number;
  containerHeight: number;
  containerWidth: number;
}

// DataGrid props interface
export interface DataGridProps<T = Account> {
  // Data
  data: T[];
  columns: DataGridColumn<T>[];
  loading?: boolean;
  error?: string | null;
  
  // Dimensions
  height: number;
  width?: number;
  rowHeight?: number;
  headerHeight?: number;
  
  // Features
  virtualScrolling?: boolean;
  multiSelect?: boolean;
  rowSelection?: boolean;
  columnSelection?: boolean;
  keyboardNavigation?: boolean;
  
  // Callbacks
  onCellClick?: (position: CellPosition, row: T, column: DataGridColumn<T>) => void;
  onCellDoubleClick?: (position: CellPosition, row: T, column: DataGridColumn<T>) => void;
  onRowClick?: (rowIndex: number, row: T) => void;
  onColumnClick?: (columnIndex: number, column: DataGridColumn<T>) => void;
  onSelectionChange?: (selection: SelectionState) => void;
  onScroll?: (scrollState: VirtualScrollState) => void;
  onColumnResize?: (columnId: string, newWidth: number) => void;
  onColumnReorder?: (fromIndex: number, toIndex: number) => void;
  
  // Styling
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  cellClassName?: string | ((value: any, row: T, column: DataGridColumn<T>) => string);
  
  // State control (for controlled components)
  selection?: SelectionState;
  activeCell?: CellPosition | null;
}

// Hook return types
export interface UseDataGridReturn<T = Account> {
  // State
  selection: SelectionState;
  activeCell: CellPosition | null;
  virtualScroll: VirtualScrollState;
  columns: DataGridColumn<T>[];
  
  // Actions
  setActiveCell: (position: CellPosition | null) => void;
  setSelection: (selection: SelectionState) => void;
  selectCell: (position: CellPosition, extend?: boolean, isMultiSelect?: boolean) => void;
  selectRow: (rowIndex: number, extend?: boolean, isMultiSelect?: boolean) => void;
  selectColumn: (columnIndex: number, extend?: boolean, isMultiSelect?: boolean) => void;
  selectRange: (start: CellPosition, end: CellPosition) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // Navigation
  navigateCell: (direction: KeyboardNavigation['direction'], extend?: boolean) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  
  // Utilities
  getCellKey: (position: CellPosition) => string;
  isCellSelected: (position: CellPosition) => boolean;
  isRowSelected: (rowIndex: number) => boolean;
  isColumnSelected: (columnIndex: number) => boolean;
  getVisibleRowRange: () => { startRowIndex: number; endRowIndex: number; visibleRowCount: number };
  getVisibleColumnRange: () => { startColumnIndex: number; endColumnIndex: number; visibleColumns: DataGridColumn<T>[] };
  
  // Data access
  getCellData: (rowIndex: number, columnIndex: number) => { row: T; column: DataGridColumn<T>; value: any; position: CellPosition } | null;
  getVisibleData: () => T[];
  getRowOffset: (rowIndex: number) => number;
  getColumnOffset: (columnIndex: number) => number;
  
  // Column management
  updateColumns: (newColumns: DataGridColumn<T>[]) => void;
  toggleColumnVisibility: (columnId: string) => void;
  
  // Event handlers
  handleCellClick: (position: CellPosition, row: T, column: DataGridColumn<T>, event?: React.MouseEvent) => void;
  handleCellDoubleClick: (position: CellPosition, row: T, column: DataGridColumn<T>) => void;
  handleRowClick: (rowIndex: number, row: T, event?: React.MouseEvent) => void;
  handleColumnClick: (columnIndex: number, column: DataGridColumn<T>, event?: React.MouseEvent) => void;
  handleColumnResize: (columnId: string, newWidth: number) => void;
  handleColumnReorder: (fromIndex: number, toIndex: number) => void;
  
  // Refs and DOM
  containerRef: React.RefObject<HTMLDivElement>;
  scrollElementRef: React.RefObject<HTMLDivElement>;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  
  // Editing
  isEditing: boolean;
  editingCell: CellPosition | null;
  handleStartEditing: (position: CellPosition) => void;
  handleStopEditing: () => void;
  
  // Virtual scrolling
  scrollToCell: (position: CellPosition, alignRow?: 'start' | 'center' | 'end', alignColumn?: 'start' | 'center' | 'end') => void;
  scrollToRow: (rowIndex: number, align?: 'start' | 'center' | 'end') => void;
  scrollToColumn: (columnIndex: number, align?: 'start' | 'center' | 'end') => void;
  totalHeight: number;
  totalWidth: number;
}

// Default column configurations for Account data
export const DEFAULT_ACCOUNT_COLUMNS: DataGridColumn<Account>[] = [
  {
    id: 'id',
    field: 'id',
    header: 'ID',
    width: 80,
    minWidth: 60,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'number',
    align: 'right',
    editable: false,
    required: false,
    visible: true,
    order: 0,
    frozen: true
  },
  {
    id: 'username',
    field: 'username',
    header: 'Username',
    width: 150,
    minWidth: 120,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'text',
    align: 'left',
    editable: true,
    required: true,
    visible: true,
    order: 1,
    frozen: false
  },
  {
    id: 'email',
    field: 'email',
    header: 'Email',
    width: 200,
    minWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'text',
    align: 'left',
    editable: true,
    required: true,
    visible: true,
    order: 2,
    frozen: false
  },
  {
    id: 'status',
    field: 'status',
    header: 'Status',
    width: 100,
    minWidth: 80,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'select',
    align: 'center',
    editable: true,
    required: true,
    visible: true,
    order: 3,
    frozen: false,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'banned', label: 'Banned' },
      { value: 'suspended', label: 'Suspended' },
      { value: 'inactive', label: 'Inactive' }
    ]
  },
  {
    id: 'display_name',
    field: 'display_name',
    header: 'Display Name',
    width: 150,
    minWidth: 120,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'text',
    align: 'left',
    editable: true,
    required: false,
    visible: true,
    order: 4,
    frozen: false
  },
  {
    id: 'content_type',
    field: 'content_type',
    header: 'Content Type',
    width: 120,
    minWidth: 100,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'text',
    align: 'left',
    editable: true,
    required: false,
    visible: true,
    order: 5,
    frozen: false
  },
  {
    id: 'campus',
    field: 'campus',
    header: 'Campus',
    width: 120,
    minWidth: 100,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'text',
    align: 'left',
    editable: true,
    required: false,
    visible: true,
    order: 6,
    frozen: false
  },
  {
    id: 'niche',
    field: 'niche',
    header: 'Niche',
    width: 120,
    minWidth: 100,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'text',
    align: 'left',
    editable: true,
    required: false,
    visible: true,
    order: 7,
    frozen: false
  },
  {
    id: 'proxy_status',
    field: 'proxy_status',
    header: 'Proxy Status',
    width: 110,
    minWidth: 90,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'select',
    align: 'center',
    editable: false,
    required: false,
    visible: true,
    order: 8,
    frozen: false,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'error', label: 'Error' },
      { value: 'unknown', label: 'Unknown' }
    ]
  },
  {
    id: 'follow_back_rate',
    field: 'follow_back_rate',
    header: 'Follow Rate %',
    width: 110,
    minWidth: 90,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'number',
    align: 'right',
    editable: false,
    required: false,
    visible: true,
    order: 9,
    frozen: false,
    formatter: (value: number) => `${(value * 100).toFixed(1)}%`
  },
  {
    id: 'monthly_cost',
    field: 'monthly_cost',
    header: 'Monthly Cost',
    width: 110,
    minWidth: 90,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'number',
    align: 'right',
    editable: true,
    required: false,
    visible: true,
    order: 10,
    frozen: false,
    formatter: (value: number) => `$${value.toFixed(2)}`
  },
  {
    id: 'created_at',
    field: 'created_at',
    header: 'Created',
    width: 120,
    minWidth: 100,
    resizable: true,
    sortable: true,
    filterable: true,
    type: 'date',
    align: 'center',
    editable: false,
    required: false,
    visible: true,
    order: 11,
    frozen: false,
    formatter: (value: string) => new Date(value).toLocaleDateString()
  }
];

// Constants
export const DEFAULT_ROW_HEIGHT = 40;
export const DEFAULT_HEADER_HEIGHT = 44;

// Utility type for generating cell keys
export const getCellKey = (rowIndex: number, columnIndex: number): string => 
  `${rowIndex}:${columnIndex}`;

// Utility type for parsing cell keys
export const parseCellKey = (key: string): CellPosition => {
  const [rowIndex, columnIndex] = key.split(':').map(Number);
  return { rowIndex, columnIndex };
}; 