import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { VirtualScrollState, CellPosition, DataGridColumn } from '../types/dataGrid';
import { 
  calculateVisibleRange,
  calculateTotalHeight,
  calculateTotalWidth,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_HEADER_HEIGHT
} from '../utils/dataGridUtils';

interface UseVirtualScrollProps<T = any> {
  totalRows: number;
  columns: DataGridColumn<T>[];
  containerHeight: number;
  containerWidth?: number;
  rowHeight?: number;
  headerHeight?: number;
  overscan?: number;
  onScroll?: (scrollState: VirtualScrollState) => void;
}

export const useVirtualScroll = <T = any>({
  totalRows,
  columns,
  containerHeight,
  containerWidth = 0,
  rowHeight = DEFAULT_ROW_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  overscan = 5,
  onScroll
}: UseVirtualScrollProps<T>) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  const [scrollState, setScrollState] = useState<VirtualScrollState>({
    scrollTop: 0,
    scrollLeft: 0,
    startRowIndex: 0,
    endRowIndex: Math.min(totalRows - 1, Math.ceil(containerHeight / rowHeight) + overscan),
    startColumnIndex: 0,
    endColumnIndex: columns.length - 1,
    rowHeight,
    containerHeight,
    containerWidth
  });

  // Calculate total dimensions
  const totalHeight = useMemo(() => 
    calculateTotalHeight(totalRows, rowHeight, headerHeight),
    [totalRows, rowHeight, headerHeight]
  );

  const totalWidth = useMemo(() => 
    calculateTotalWidth(columns),
    [columns]
  );

  // Calculate visible columns based on scroll position
  const visibleColumns = useMemo(() => {
    let accumulatedWidth = 0;
    let startColumnIndex = 0;
    let endColumnIndex = columns.length - 1;

    // Find start column
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].visible && accumulatedWidth + columns[i].width > scrollState.scrollLeft) {
        startColumnIndex = i;
        break;
      }
      if (columns[i].visible) {
        accumulatedWidth += columns[i].width;
      }
    }

    // Find end column
    accumulatedWidth = 0;
    for (let i = startColumnIndex; i < columns.length; i++) {
      if (columns[i].visible) {
        accumulatedWidth += columns[i].width;
        if (accumulatedWidth > containerWidth + scrollState.scrollLeft) {
          endColumnIndex = i;
          break;
        }
      }
    }

    return {
      startColumnIndex,
      endColumnIndex,
      visibleColumns: columns.slice(startColumnIndex, endColumnIndex + 1).filter(col => col.visible)
    };
  }, [columns, scrollState.scrollLeft, containerWidth]);

  // Calculate visible rows
  const visibleRows = useMemo(() => {
    const range = calculateVisibleRange(
      scrollState.scrollTop,
      containerHeight,
      rowHeight,
      totalRows,
      overscan
    );
    
    return {
      startRowIndex: range.start,
      endRowIndex: range.end,
      visibleRowCount: range.end - range.start + 1
    };
  }, [scrollState.scrollTop, containerHeight, rowHeight, totalRows, overscan]);

  // Update scroll state
  const updateScrollState = useCallback((updates: Partial<VirtualScrollState>) => {
    setScrollState(prevState => {
      const newState = { ...prevState, ...updates };
      onScroll?.(newState);
      return newState;
    });
  }, [onScroll]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollLeft = element.scrollLeft;

    const rowRange = calculateVisibleRange(
      scrollTop,
      containerHeight,
      rowHeight,
      totalRows,
      overscan
    );

    updateScrollState({
      scrollTop,
      scrollLeft,
      startRowIndex: rowRange.start,
      endRowIndex: rowRange.end,
      startColumnIndex: visibleColumns.startColumnIndex,
      endColumnIndex: visibleColumns.endColumnIndex
    });
  }, [containerHeight, rowHeight, totalRows, overscan, visibleColumns, updateScrollState]);

  // Scroll to specific position
  const scrollToPosition = useCallback((scrollTop: number, scrollLeft?: number) => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = scrollTop;
      if (scrollLeft !== undefined) {
        scrollElementRef.current.scrollLeft = scrollLeft;
      }
    }
  }, []);

  // Scroll to specific row
  const scrollToRow = useCallback((rowIndex: number, align: 'start' | 'center' | 'end' = 'start') => {
    const maxScrollTop = totalHeight - containerHeight;
    let scrollTop: number;
    
    switch (align) {
      case 'center':
        scrollTop = Math.max(0, Math.min(maxScrollTop, 
          (rowIndex * rowHeight) - (containerHeight / 2) + headerHeight
        ));
        break;
      case 'end':
        scrollTop = Math.max(0, Math.min(maxScrollTop, 
          (rowIndex * rowHeight) - containerHeight + rowHeight + headerHeight
        ));
        break;
      default: // 'start'
        scrollTop = Math.max(0, Math.min(maxScrollTop, 
          (rowIndex * rowHeight) + headerHeight
        ));
        break;
    }
    
    scrollToPosition(scrollTop);
  }, [totalHeight, containerHeight, rowHeight, headerHeight, scrollToPosition]);

  // Scroll to specific column
  const scrollToColumn = useCallback((columnIndex: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (columnIndex < 0 || columnIndex >= columns.length) return;
    
    let columnOffset = 0;
    for (let i = 0; i < columnIndex; i++) {
      if (columns[i].visible) {
        columnOffset += columns[i].width;
      }
    }
    
    const columnWidth = columns[columnIndex].width;
    const maxScrollLeft = totalWidth - containerWidth;
    let scrollLeft: number;
    
    switch (align) {
      case 'center':
        scrollLeft = Math.max(0, Math.min(maxScrollLeft, 
          columnOffset - (containerWidth / 2) + (columnWidth / 2)
        ));
        break;
      case 'end':
        scrollLeft = Math.max(0, Math.min(maxScrollLeft, 
          columnOffset - containerWidth + columnWidth
        ));
        break;
      default: // 'start'
        scrollLeft = Math.max(0, Math.min(maxScrollLeft, columnOffset));
        break;
    }
    
    scrollToPosition(scrollState.scrollTop, scrollLeft);
  }, [columns, totalWidth, containerWidth, scrollState.scrollTop, scrollToPosition]);

  // Scroll to specific cell
  const scrollToCell = useCallback((
    position: CellPosition, 
    alignRow: 'start' | 'center' | 'end' = 'start',
    alignColumn: 'start' | 'center' | 'end' = 'start'
  ) => {
    scrollToRow(position.rowIndex, alignRow);
    scrollToColumn(position.columnIndex, alignColumn);
  }, [scrollToRow, scrollToColumn]);

  // Check if a row is visible
  const isRowVisible = useCallback((rowIndex: number): boolean => {
    return rowIndex >= visibleRows.startRowIndex && rowIndex <= visibleRows.endRowIndex;
  }, [visibleRows]);

  // Check if a column is visible
  const isColumnVisible = useCallback((columnIndex: number): boolean => {
    return columnIndex >= visibleColumns.startColumnIndex && columnIndex <= visibleColumns.endColumnIndex;
  }, [visibleColumns]);

  // Check if a cell is visible
  const isCellVisible = useCallback((position: CellPosition): boolean => {
    return isRowVisible(position.rowIndex) && isColumnVisible(position.columnIndex);
  }, [isRowVisible, isColumnVisible]);

  // Get the scroll position for a specific row
  const getRowScrollPosition = useCallback((rowIndex: number): number => {
    return Math.max(0, (rowIndex * rowHeight) + headerHeight);
  }, [rowHeight, headerHeight]);

  // Get the scroll position for a specific column
  const getColumnScrollPosition = useCallback((columnIndex: number): number => {
    let offset = 0;
    for (let i = 0; i < columnIndex && i < columns.length; i++) {
      if (columns[i].visible) {
        offset += columns[i].width;
      }
    }
    return offset;
  }, [columns]);

  // Update container dimensions
  useEffect(() => {
    updateScrollState({
      containerHeight,
      containerWidth,
      rowHeight,
      startColumnIndex: visibleColumns.startColumnIndex,
      endColumnIndex: visibleColumns.endColumnIndex
    });
  }, [containerHeight, containerWidth, rowHeight, visibleColumns, updateScrollState]);

  return {
    // Refs
    scrollElementRef,
    
    // State
    scrollState,
    totalHeight,
    totalWidth,
    
    // Visible ranges
    visibleRows,
    visibleColumns,
    
    // Event handlers
    handleScroll,
    
    // Scroll control
    scrollToPosition,
    scrollToRow,
    scrollToColumn,
    scrollToCell,
    
    // Utilities
    isRowVisible,
    isColumnVisible,  
    isCellVisible,
    getRowScrollPosition,
    getColumnScrollPosition
  };
}; 