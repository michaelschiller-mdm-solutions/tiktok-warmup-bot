import { useState, useCallback, useMemo } from 'react';
import { 
  SelectionState, 
  CellPosition, 
  getCellKey,
  parseCellKey
} from '../types/dataGrid';
import { 
  createEmptySelection,
  updateSelectionWithCell,
  updateSelectionWithRow
} from '../utils/dataGridUtils';

interface UseSelectionProps {
  totalRows: number;
  totalColumns: number;
  multiSelect?: boolean;
  rowSelection?: boolean;
  columnSelection?: boolean;
  onSelectionChange?: (selection: SelectionState) => void;
}

export const useSelection = ({
  totalRows,
  totalColumns,
  multiSelect = true,
  rowSelection = true,
  columnSelection = true,
  onSelectionChange
}: UseSelectionProps) => {
  const [selection, setSelection] = useState<SelectionState>(createEmptySelection);

  // Update selection and notify parent
  const updateSelection = useCallback((newSelection: SelectionState) => {
    setSelection(newSelection);
    onSelectionChange?.(newSelection);
  }, [onSelectionChange]);

  // Select a single cell
  const selectCell = useCallback((
    position: CellPosition, 
    extend = false,
    isMultiSelect = false
  ) => {
    const newSelection = updateSelectionWithCell(
      selection,
      position,
      extend,
      isMultiSelect && multiSelect
    );
    updateSelection(newSelection);
  }, [selection, multiSelect, updateSelection]);

  // Select an entire row
  const selectRow = useCallback((
    rowIndex: number,
    extend = false,
    isMultiSelect = false
  ) => {
    if (!rowSelection) return;
    
    const newSelection = updateSelectionWithRow(
      selection,
      rowIndex,
      totalColumns,
      extend,
      isMultiSelect && multiSelect
    );
    updateSelection(newSelection);
  }, [selection, rowSelection, totalColumns, multiSelect, updateSelection]);

  // Select an entire column
  const selectColumn = useCallback((
    columnIndex: number,
    extend = false,
    isMultiSelect = false
  ) => {
    if (!columnSelection) return;
    
    const newSelectedColumns = new Set<number>();
    const newSelectedCells = new Set<string>();
    
    if (extend && selection.activeCell) {
      // Range selection for columns
      const startCol = Math.min(selection.activeCell.columnIndex, columnIndex);
      const endCol = Math.max(selection.activeCell.columnIndex, columnIndex);
      
      for (let col = startCol; col <= endCol; col++) {
        newSelectedColumns.add(col);
        for (let row = 0; row < totalRows; row++) {
          newSelectedCells.add(getCellKey(row, col));
        }
      }
      
      if (isMultiSelect && multiSelect) {
        selection.selectedColumns.forEach(col => newSelectedColumns.add(col));
        selection.selectedCells.forEach(key => newSelectedCells.add(key));
      }
    } else {
      // Single column selection
      if (isMultiSelect && multiSelect && selection.selectedColumns.has(columnIndex)) {
        // Toggle off if already selected
        const newSelection = {
          ...selection,
          selectedColumns: new Set(Array.from(selection.selectedColumns).filter(c => c !== columnIndex)),
          selectedCells: new Set(Array.from(selection.selectedCells).filter(key => {
            const pos = parseCellKey(key);
            return pos.columnIndex !== columnIndex;
          })),
          activeCell: { rowIndex: 0, columnIndex }
        };
        updateSelection(newSelection);
        return;
      }
      
      newSelectedColumns.add(columnIndex);
      for (let row = 0; row < totalRows; row++) {
        newSelectedCells.add(getCellKey(row, columnIndex));
      }
      
      if (isMultiSelect && multiSelect) {
        selection.selectedColumns.forEach(col => newSelectedColumns.add(col));
        selection.selectedCells.forEach(key => newSelectedCells.add(key));
      }
    }
    
    const newSelection: SelectionState = {
      ...createEmptySelection(),
      selectedColumns: newSelectedColumns,
      selectedCells: newSelectedCells,
      activeCell: { rowIndex: 0, columnIndex },
      mode: 'column'
    };
    
    updateSelection(newSelection);
  }, [selection, columnSelection, totalRows, multiSelect, updateSelection]);

  // Select a range of cells
  const selectRange = useCallback((start: CellPosition, end: CellPosition) => {
    const newSelectedCells = new Set<string>();
    
    const minRow = Math.min(start.rowIndex, end.rowIndex);
    const maxRow = Math.max(start.rowIndex, end.rowIndex);
    const minCol = Math.min(start.columnIndex, end.columnIndex);
    const maxCol = Math.max(start.columnIndex, end.columnIndex);
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        newSelectedCells.add(getCellKey(row, col));
      }
    }
    
    const newSelection: SelectionState = {
      ...createEmptySelection(),
      selectedCells: newSelectedCells,
      activeCell: end,
      ranges: [{ start, end }],
      mode: 'range'
    };
    
    updateSelection(newSelection);
  }, [updateSelection]);

  // Select all cells
  const selectAll = useCallback(() => {
    const newSelectedCells = new Set<string>();
    const newSelectedRows = new Set<number>();
    const newSelectedColumns = new Set<number>();
    
    for (let row = 0; row < totalRows; row++) {
      newSelectedRows.add(row);
      for (let col = 0; col < totalColumns; col++) {
        if (row === 0) newSelectedColumns.add(col);
        newSelectedCells.add(getCellKey(row, col));
      }
    }
    
    const newSelection: SelectionState = {
      selectedCells: newSelectedCells,
      selectedRows: newSelectedRows,
      selectedColumns: newSelectedColumns,
      activeCell: { rowIndex: 0, columnIndex: 0 },
      ranges: [{
        start: { rowIndex: 0, columnIndex: 0 },
        end: { rowIndex: totalRows - 1, columnIndex: totalColumns - 1 }
      }],
      mode: 'range'
    };
    
    updateSelection(newSelection);
  }, [totalRows, totalColumns, updateSelection]);

  // Clear all selection
  const clearSelection = useCallback(() => {
    updateSelection(createEmptySelection());
  }, [updateSelection]);

  // Set active cell without changing selection
  const setActiveCell = useCallback((position: CellPosition | null) => {
    updateSelection({
      ...selection,
      activeCell: position
    });
  }, [selection, updateSelection]);

  // Check if a cell is selected
  const isCellSelected = useCallback((position: CellPosition): boolean => {
    return selection.selectedCells.has(getCellKey(position.rowIndex, position.columnIndex));
  }, [selection.selectedCells]);

  // Check if a row is selected
  const isRowSelected = useCallback((rowIndex: number): boolean => {
    return selection.selectedRows.has(rowIndex);
  }, [selection.selectedRows]);

  // Check if a column is selected
  const isColumnSelected = useCallback((columnIndex: number): boolean => {
    return selection.selectedColumns.has(columnIndex);
  }, [selection.selectedColumns]);

  // Check if a cell is the active cell
  const isActiveCell = useCallback((position: CellPosition): boolean => {
    return selection.activeCell?.rowIndex === position.rowIndex &&
           selection.activeCell?.columnIndex === position.columnIndex;
  }, [selection.activeCell]);

  // Get selection stats
  const selectionStats = useMemo(() => ({
    totalSelectedCells: selection.selectedCells.size,
    totalSelectedRows: selection.selectedRows.size,
    totalSelectedColumns: selection.selectedColumns.size,
    hasSelection: selection.selectedCells.size > 0,
    isAllSelected: selection.selectedCells.size === totalRows * totalColumns,
    mode: selection.mode
  }), [selection, totalRows, totalColumns]);

  // Get selected cell positions
  const selectedPositions = useMemo(() => {
    return Array.from(selection.selectedCells).map(parseCellKey);
  }, [selection.selectedCells]);

  return {
    // State
    selection,
    activeCell: selection.activeCell,
    
    // Actions
    selectCell,
    selectRow,
    selectColumn,
    selectRange,
    selectAll,
    clearSelection,
    setActiveCell,
    setSelection: updateSelection,
    
    // Utilities
    isCellSelected,
    isRowSelected,
    isColumnSelected,
    isActiveCell,
    
    // Computed values
    selectionStats,
    selectedPositions
  };
}; 