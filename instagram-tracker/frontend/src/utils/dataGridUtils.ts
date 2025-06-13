import { 
  CellPosition, 
  SelectionState, 
  SelectionRange, 
  DataGridColumn,
  KeyboardNavigation,
  getCellKey,
  parseCellKey
} from '../types/dataGrid';

// Constants for keyboard navigation
export const KEYBOARD_KEYS = {
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  ENTER: 'Enter',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  ESCAPE: 'Escape',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  F2: 'F2'
} as const;

// Row height constant
export const DEFAULT_ROW_HEIGHT = 40;
export const DEFAULT_HEADER_HEIGHT = 44;

// Create initial selection state
export const createEmptySelection = (): SelectionState => ({
  selectedCells: new Set(),
  selectedRows: new Set(),
  selectedColumns: new Set(),
  activeCell: null,
  ranges: [],
  mode: 'cell'
});

// Check if a cell is within a selection range
export const isCellInRange = (position: CellPosition, range: SelectionRange): boolean => {
  const { start, end } = range;
  const minRow = Math.min(start.rowIndex, end.rowIndex);
  const maxRow = Math.max(start.rowIndex, end.rowIndex);
  const minCol = Math.min(start.columnIndex, end.columnIndex);
  const maxCol = Math.max(start.columnIndex, end.columnIndex);
  
  return position.rowIndex >= minRow && 
         position.rowIndex <= maxRow && 
         position.columnIndex >= minCol && 
         position.columnIndex <= maxCol;
};

// Get all cells within a range
export const getCellsInRange = (range: SelectionRange): CellPosition[] => {
  const cells: CellPosition[] = [];
  const { start, end } = range;
  const minRow = Math.min(start.rowIndex, end.rowIndex);
  const maxRow = Math.max(start.rowIndex, end.rowIndex);
  const minCol = Math.min(start.columnIndex, end.columnIndex);
  const maxCol = Math.max(start.columnIndex, end.columnIndex);
  
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      cells.push({ rowIndex: row, columnIndex: col });
    }
  }
  
  return cells;
};

// Calculate navigation target from current position
export const calculateNavigationTarget = (
  currentPosition: CellPosition,
  direction: KeyboardNavigation['direction'],
  totalRows: number,
  totalColumns: number,
  visibleRowCount = 10
): CellPosition | null => {
  const { rowIndex, columnIndex } = currentPosition;
  
  switch (direction) {
    case 'up':
      return rowIndex > 0 ? { rowIndex: rowIndex - 1, columnIndex } : null;
      
    case 'down':
      return rowIndex < totalRows - 1 ? { rowIndex: rowIndex + 1, columnIndex } : null;
      
    case 'left':
      return columnIndex > 0 ? { rowIndex, columnIndex: columnIndex - 1 } : null;
      
    case 'right':
      return columnIndex < totalColumns - 1 ? { rowIndex, columnIndex: columnIndex + 1 } : null;
      
    case 'home':
      return { rowIndex, columnIndex: 0 };
      
    case 'end':
      return { rowIndex, columnIndex: totalColumns - 1 };
      
    case 'pageUp':
      return { rowIndex: Math.max(0, rowIndex - visibleRowCount), columnIndex };
      
    case 'pageDown':
      return { rowIndex: Math.min(totalRows - 1, rowIndex + visibleRowCount), columnIndex };
      
    default:
      return null;
  }
};

// Get keyboard navigation from key event
export const getNavigationFromKeyEvent = (event: React.KeyboardEvent): KeyboardNavigation | null => {
  const { key, shiftKey, ctrlKey, altKey } = event;
  
  let direction: KeyboardNavigation['direction'] | null = null;
  
  switch (key) {
    case KEYBOARD_KEYS.ARROW_UP:
      direction = 'up';
      break;
    case KEYBOARD_KEYS.ARROW_DOWN:
      direction = 'down';
      break;
    case KEYBOARD_KEYS.ARROW_LEFT:
      direction = 'left';
      break;
    case KEYBOARD_KEYS.ARROW_RIGHT:
      direction = 'right';
      break;
    case KEYBOARD_KEYS.HOME:
      direction = 'home';
      break;
    case KEYBOARD_KEYS.END:
      direction = 'end';
      break;
    case KEYBOARD_KEYS.PAGE_UP:
      direction = 'pageUp';
      break;
    case KEYBOARD_KEYS.PAGE_DOWN:
      direction = 'pageDown';
      break;
    case KEYBOARD_KEYS.TAB:
      direction = shiftKey ? 'left' : 'right';
      break;
    case KEYBOARD_KEYS.ENTER:
      direction = shiftKey ? 'up' : 'down';
      break;
    default:
      return null;
  }
  
  if (!direction) return null;
  
  return {
    direction,
    withShift: shiftKey,
    withCtrl: ctrlKey,
    withAlt: altKey
  };
};

// Calculate visible row range for virtual scrolling
export const calculateVisibleRange = (
  scrollTop: number,
  containerHeight: number,
  rowHeight: number,
  totalRows: number,
  overscan = 5
): { start: number; end: number } => {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visible = Math.ceil(containerHeight / rowHeight);
  const end = Math.min(totalRows - 1, start + visible + overscan * 2);
  
  return { start, end };
};

// Get column offset for horizontal scrolling
export const calculateColumnOffset = (
  columnIndex: number,
  columns: DataGridColumn[],
  scrollLeft = 0
): number => {
  let offset = 0;
  for (let i = 0; i < columnIndex; i++) {
    if (columns[i] && columns[i].visible) {
      offset += columns[i].width;
    }
  }
  return offset - scrollLeft;
};

// Get total grid width
export const calculateTotalWidth = (columns: DataGridColumn[]): number => {
  return columns
    .filter(col => col.visible)
    .reduce((total, col) => total + col.width, 0);
};

// Get total grid height
export const calculateTotalHeight = (
  rowCount: number,
  rowHeight: number,
  headerHeight: number
): number => {
  return headerHeight + (rowCount * rowHeight);
};

// Update selection state with new cell selection
export const updateSelectionWithCell = (
  currentSelection: SelectionState,
  position: CellPosition,
  extend = false,
  isMultiSelect = false
): SelectionState => {
  const cellKey = getCellKey(position.rowIndex, position.columnIndex);
  
  if (extend && currentSelection.activeCell) {
    // Range selection
    const range: SelectionRange = {
      start: currentSelection.activeCell,
      end: position
    };
    
    const cellsInRange = getCellsInRange(range);
    const newSelectedCells = new Set<string>();
    
    // Keep existing selection if multi-select
    if (isMultiSelect) {
      currentSelection.selectedCells.forEach(key => newSelectedCells.add(key));
    }
    
    // Add cells in range
    cellsInRange.forEach(cellPos => {
      newSelectedCells.add(getCellKey(cellPos.rowIndex, cellPos.columnIndex));
    });
    
    return {
      ...currentSelection,
      selectedCells: newSelectedCells,
      activeCell: position,
      ranges: isMultiSelect ? [...currentSelection.ranges, range] : [range],
      mode: 'range'
    };
  } else {
    // Single cell selection
    const newSelectedCells = new Set([cellKey]);
    
    // Add to selection if multi-select
    if (isMultiSelect && currentSelection.selectedCells.has(cellKey)) {
      // Toggle off if already selected
      currentSelection.selectedCells.delete(cellKey);
      return {
        ...currentSelection,
        selectedCells: new Set(currentSelection.selectedCells),
        activeCell: position
      };
    } else if (isMultiSelect) {
      // Add to existing selection
      currentSelection.selectedCells.add(cellKey);
      return {
        ...currentSelection,
        selectedCells: new Set(currentSelection.selectedCells),
        activeCell: position
      };
    }
    
    return {
      ...createEmptySelection(),
      selectedCells: newSelectedCells,
      activeCell: position,
      mode: 'cell'
    };
  }
};

// Update selection state with row selection
export const updateSelectionWithRow = (
  currentSelection: SelectionState,
  rowIndex: number,
  totalColumns: number,
  extend = false,
  isMultiSelect = false
): SelectionState => {
  const newSelectedRows = new Set<number>();
  const newSelectedCells = new Set<string>();
  
  if (extend && currentSelection.activeCell) {
    // Range selection for rows
    const startRow = Math.min(currentSelection.activeCell.rowIndex, rowIndex);
    const endRow = Math.max(currentSelection.activeCell.rowIndex, rowIndex);
    
    for (let row = startRow; row <= endRow; row++) {
      newSelectedRows.add(row);
      for (let col = 0; col < totalColumns; col++) {
        newSelectedCells.add(getCellKey(row, col));
      }
    }
    
    if (isMultiSelect) {
      currentSelection.selectedRows.forEach(row => newSelectedRows.add(row));
      currentSelection.selectedCells.forEach(key => newSelectedCells.add(key));
    }
  } else {
    // Single row selection
    if (isMultiSelect && currentSelection.selectedRows.has(rowIndex)) {
      // Toggle off if already selected
      return {
        ...currentSelection,
        selectedRows: new Set(Array.from(currentSelection.selectedRows).filter(r => r !== rowIndex)),
        selectedCells: new Set(Array.from(currentSelection.selectedCells).filter(key => {
          const pos = parseCellKey(key);
          return pos.rowIndex !== rowIndex;
        })),
        activeCell: { rowIndex, columnIndex: 0 }
      };
    }
    
    newSelectedRows.add(rowIndex);
    for (let col = 0; col < totalColumns; col++) {
      newSelectedCells.add(getCellKey(rowIndex, col));
    }
    
    if (isMultiSelect) {
      currentSelection.selectedRows.forEach(row => newSelectedRows.add(row));
      currentSelection.selectedCells.forEach(key => newSelectedCells.add(key));
    }
  }
  
  return {
    ...createEmptySelection(),
    selectedRows: newSelectedRows,
    selectedCells: newSelectedCells,
    activeCell: { rowIndex, columnIndex: 0 },
    mode: 'row'
  };
};

// Format cell value based on column type
export const formatCellValue = <T>(
  value: any,
  column: DataGridColumn<T>
): string => {
  if (value == null) return '';
  
  if (column.formatter) {
    return column.formatter(value);
  }
  
  switch (column.type) {
    case 'number':
      return typeof value === 'number' ? value.toString() : String(value);
    case 'date':
      return value instanceof Date 
        ? value.toLocaleDateString() 
        : new Date(value).toLocaleDateString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'select':
      const option = column.options?.find(opt => opt.value === value);
      return option ? option.label : String(value);
    default:
      return String(value);
  }
};

// Check if position is valid within grid bounds
export const isValidPosition = (
  position: CellPosition,
  totalRows: number,
  totalColumns: number
): boolean => {
  return position.rowIndex >= 0 && 
         position.rowIndex < totalRows && 
         position.columnIndex >= 0 && 
         position.columnIndex < totalColumns;
};

// Get cell style classes based on state
export const getCellClasses = (
  isSelected: boolean,
  isActive: boolean,
  isHighlighted: boolean,
  hasError: boolean,
  baseClasses = ''
): string => {
  const classes = [baseClasses];
  
  if (isSelected) classes.push('bg-blue-100 border-blue-300');
  if (isActive) classes.push('ring-2 ring-blue-500 ring-inset');
  if (isHighlighted) classes.push('bg-yellow-50');
  if (hasError) classes.push('bg-red-50 border-red-300');
  
  return classes.filter(Boolean).join(' ');
}; 