import { useState, useCallback, useMemo, useRef } from 'react';
import { DataGridProps, UseDataGridReturn, CellPosition, DataGridColumn } from '../types/dataGrid';
import { useSelection } from './useSelection';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { useVirtualScroll } from './useVirtualScroll';
import { getCellKey } from '../types/dataGrid';

export const useDataGrid = <T = any>({
  data,
  columns: initialColumns,
  height,
  width = 0,
  rowHeight,
  headerHeight,
  virtualScrolling = true,
  multiSelect = true,
  rowSelection = true,
  columnSelection = true,
  keyboardNavigation = true,
  onCellClick,
  onCellDoubleClick,
  onRowClick,
  onColumnClick,
  onSelectionChange,
  onScroll,
  onColumnResize,
  onColumnReorder,
  selection: controlledSelection,
  activeCell: controlledActiveCell
}: DataGridProps<T>): UseDataGridReturn<T> => {
  const [columns, setColumns] = useState<DataGridColumn<T>[]>(initialColumns);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  
  // Refs for managing focus and container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Memoize visible columns and their total count
  const visibleColumns = useMemo(() => 
    columns.filter(col => col.visible).sort((a, b) => a.order - b.order),
    [columns]
  );
  
  const totalColumns = visibleColumns.length;
  const totalRows = data.length;

  // Selection hook
  const selectionHook = useSelection({
    totalRows,
    totalColumns,
    multiSelect,
    rowSelection,
    columnSelection,
    onSelectionChange
  });

  // Use controlled selection if provided
  const selection = controlledSelection || selectionHook.selection;
  const activeCell = controlledActiveCell || selectionHook.activeCell;
  const setActiveCell = controlledSelection ? () => {} : selectionHook.setActiveCell;
  const setSelection = controlledSelection ? () => {} : selectionHook.setSelection;

  // Virtual scrolling hook
  const virtualScroll = useVirtualScroll({
    totalRows,
    columns: visibleColumns,
    containerHeight: height,
    containerWidth: width,
    rowHeight,
    headerHeight,
    onScroll
  });

  // Handle cell navigation
  const handleCellNavigation = useCallback((position: CellPosition, extend = false) => {
    if (extend) {
      selectionHook.selectCell(position, true, false);
    } else {
      selectionHook.selectCell(position, false, false);
    }
    
    // Scroll to cell if not visible
    if (!virtualScroll.isCellVisible(position)) {
      virtualScroll.scrollToCell(position, 'center', 'center');
    }
  }, [selectionHook, virtualScroll]);

  // Handle editing
  const handleStartEditing = useCallback((position: CellPosition) => {
    if (!keyboardNavigation) return;
    
    const column = visibleColumns[position.columnIndex];
    if (!column?.editable) return;
    
    setEditingCell(position);
    setIsEditing(true);
    setActiveCell(position);
  }, [keyboardNavigation, visibleColumns, setActiveCell]);

  const handleStopEditing = useCallback(() => {
    setIsEditing(false);
    setEditingCell(null);
    // Focus back to container
    containerRef.current?.focus();
  }, []);

  // Keyboard navigation hook
  const keyboardNav = useKeyboardNavigation({
    totalRows,
    totalColumns,
    activeCell,
    onNavigate: handleCellNavigation,
    onSelectAll: selectionHook.selectAll,
    onClearSelection: selectionHook.clearSelection,
    onStartEditing: handleStartEditing,
    onStopEditing: handleStopEditing,
    isEditing,
    disabled: !keyboardNavigation
  });

  // Handle cell clicks
  const handleCellClick = useCallback((
    position: CellPosition,
    row: T,
    column: DataGridColumn<T>,
    event?: React.MouseEvent
  ) => {
    const extendSelection = event?.shiftKey || false;
    const multiSelectMode = event?.ctrlKey || event?.metaKey || false;
    
    if (multiSelectMode) {
      selectionHook.selectCell(position, false, true);
    } else if (extendSelection) {
      selectionHook.selectCell(position, true, false);
    } else {
      selectionHook.selectCell(position, false, false);
    }
    
    // Focus the container for keyboard navigation
    keyboardNav.focus();
    
    // Call external handler
    onCellClick?.(position, row, column);
  }, [selectionHook, keyboardNav, onCellClick]);

  // Handle cell double clicks
  const handleCellDoubleClick = useCallback((
    position: CellPosition,
    row: T,
    column: DataGridColumn<T>
  ) => {
    // Start editing on double click
    handleStartEditing(position);
    
    // Call external handler
    onCellDoubleClick?.(position, row, column);
  }, [handleStartEditing, onCellDoubleClick]);

  // Handle row clicks
  const handleRowClick = useCallback((
    rowIndex: number,
    row: T,
    event?: React.MouseEvent
  ) => {
    const extendSelection = event?.shiftKey || false;
    const multiSelectMode = event?.ctrlKey || event?.metaKey || false;
    
    selectionHook.selectRow(rowIndex, extendSelection, multiSelectMode);
    
    // Call external handler
    onRowClick?.(rowIndex, row);
  }, [selectionHook, onRowClick]);

  // Handle column clicks
  const handleColumnClick = useCallback((
    columnIndex: number,
    column: DataGridColumn<T>,
    event?: React.MouseEvent
  ) => {
    const extendSelection = event?.shiftKey || false;
    const multiSelectMode = event?.ctrlKey || event?.metaKey || false;
    
    selectionHook.selectColumn(columnIndex, extendSelection, multiSelectMode);
    
    // Call external handler
    onColumnClick?.(columnIndex, column);
  }, [selectionHook, onColumnClick]);

  // Handle column resizing
  const handleColumnResize = useCallback((columnId: string, newWidth: number) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId 
        ? { ...col, width: Math.max(col.minWidth, newWidth) }
        : col
    ));
    
    onColumnResize?.(columnId, newWidth);
  }, [onColumnResize]);

  // Handle column reordering
  const handleColumnReorder = useCallback((fromIndex: number, toIndex: number) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const [movedColumn] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, movedColumn);
      
      // Update order property
      newColumns.forEach((col, index) => {
        col.order = index;
      });
      
      return newColumns;
    });
    
    onColumnReorder?.(fromIndex, toIndex);
  }, [onColumnReorder]);

  // Get cell data
  const getCellData = useCallback((rowIndex: number, columnIndex: number) => {
    const row = data[rowIndex];
    const column = visibleColumns[columnIndex];
    
    if (!row || !column) return null;
    
    return {
      row,
      column,
      value: row[column.field],
      position: { rowIndex, columnIndex }
    };
  }, [data, visibleColumns]);

  // Get visible data for rendering
  const getVisibleData = useCallback(() => {
    const { startRowIndex, endRowIndex } = virtualScroll.visibleRows;
    return data.slice(startRowIndex, endRowIndex + 1);
  }, [data, virtualScroll.visibleRows]);

  // Get row offset for virtual scrolling
  const getRowOffset = useCallback((rowIndex: number) => {
    return virtualScroll.getRowScrollPosition(rowIndex);
  }, [virtualScroll]);

  // Get column offset for virtual scrolling
  const getColumnOffset = useCallback((columnIndex: number) => {
    return virtualScroll.getColumnScrollPosition(columnIndex);
  }, [virtualScroll]);

  // Update columns
  const updateColumns = useCallback((newColumns: DataGridColumn<T>[]) => {
    setColumns(newColumns);
  }, []);

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId 
        ? { ...col, visible: !col.visible }
        : col
    ));
  }, []);

  return {
    // State
    selection,
    activeCell,
    virtualScroll: virtualScroll.scrollState,
    columns: visibleColumns,
    
    // Actions
    setActiveCell,
    setSelection,
    selectCell: selectionHook.selectCell,
    selectRow: selectionHook.selectRow,
    selectColumn: selectionHook.selectColumn,
    selectRange: selectionHook.selectRange,
    selectAll: selectionHook.selectAll,
    clearSelection: selectionHook.clearSelection,
    
    // Navigation
    navigateCell: keyboardNav.navigateToCell,
    handleKeyDown: keyboardNav.handleKeyDown,
    
    // Utilities
    getCellKey: (position: CellPosition) => getCellKey(position.rowIndex, position.columnIndex),
    isCellSelected: selectionHook.isCellSelected,
    isRowSelected: selectionHook.isRowSelected,
    isColumnSelected: selectionHook.isColumnSelected,
    getVisibleRowRange: () => virtualScroll.visibleRows,
    getVisibleColumnRange: () => virtualScroll.visibleColumns,
    
    // Data access
    getCellData,
    getVisibleData,
    getRowOffset,
    getColumnOffset,
    
    // Column management
    updateColumns,
    toggleColumnVisibility,
    
    // Event handlers
    handleCellClick,
    handleCellDoubleClick,
    handleRowClick,
    handleColumnClick,
    handleColumnResize,
    handleColumnReorder,
    
    // Refs and DOM
    containerRef: keyboardNav.containerRef,
    scrollElementRef: virtualScroll.scrollElementRef,
    handleScroll: virtualScroll.handleScroll,
    
    // Editing
    isEditing,
    editingCell,
    handleStartEditing,
    handleStopEditing,
    
    // Virtual scrolling
    scrollToCell: virtualScroll.scrollToCell,
    scrollToRow: virtualScroll.scrollToRow,
    scrollToColumn: virtualScroll.scrollToColumn,
    totalHeight: virtualScroll.totalHeight,
    totalWidth: virtualScroll.totalWidth
  };
}; 