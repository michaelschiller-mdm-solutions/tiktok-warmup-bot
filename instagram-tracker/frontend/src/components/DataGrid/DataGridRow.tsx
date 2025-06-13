import React, { memo, useMemo } from 'react';
import { CellPosition, DataGridColumn } from '../../types/dataGrid';
import DataGridCell from './DataGridCell';

interface DataGridRowProps<T = any> {
  row: T;
  rowIndex: number;
  columns: DataGridColumn<T>[];
  height: number;
  isSelected: boolean;
  isCellSelected: (position: CellPosition) => boolean;
  isCellActive: (position: CellPosition) => boolean;
  isCellEditing: (position: CellPosition) => boolean;
  onRowClick?: (rowIndex: number, row: T, event: React.MouseEvent) => void;
  onCellClick?: (position: CellPosition, row: T, column: DataGridColumn<T>, event: React.MouseEvent) => void;
  onCellDoubleClick?: (position: CellPosition, row: T, column: DataGridColumn<T>) => void;
  className?: string;
  style?: React.CSSProperties;
}

const DataGridRow = <T = any>({
  row,
  rowIndex,
  columns,
  height,
  isSelected,
  isCellSelected,
  isCellActive,
  isCellEditing,
  onRowClick,
  onCellClick,
  onCellDoubleClick,
  className = '',
  style
}: DataGridRowProps<T>) => {
  // Handle row click
  const handleRowClick = (event: React.MouseEvent) => {
    // Only trigger row click if clicking on row number, not cells
    if (event.target === event.currentTarget) {
      onRowClick?.(rowIndex, row, event);
    }
  };

  // Row classes
  const rowClasses = useMemo(() => {
    const baseClasses = `
      flex items-stretch hover:bg-gray-50
      ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}
      ${isSelected ? 'bg-blue-50 border-blue-300' : ''}
      ${className}
    `.trim();

    return baseClasses;
  }, [rowIndex, isSelected, className]);

  return (
    <div
      className={rowClasses}
      style={{
        height: `${height}px`,
        ...style
      }}
      role="row"
      aria-selected={isSelected}
      data-row-index={rowIndex}
    >
      {/* Row number */}
      <div
        className={`
          flex items-center justify-center px-2 border-r border-gray-200 
          font-medium text-xs text-gray-600 cursor-pointer hover:bg-gray-100
          ${isSelected ? 'bg-blue-100 border-blue-300' : 'bg-gray-50'}
        `}
        style={{ width: '50px', minWidth: '50px' }}
        onClick={handleRowClick}
        title={`Row ${rowIndex + 1}`}
      >
        {rowIndex + 1}
      </div>

      {/* Cells */}
      {columns.map((column, columnIndex) => {
        const position: CellPosition = { rowIndex, columnIndex };
        const value = row[column.field];

        return (
          <DataGridCell
            key={column.id}
            position={position}
            value={value}
            row={row}
            column={column}
            isSelected={isCellSelected(position)}
            isActive={isCellActive(position)}
            isEditing={isCellEditing(position)}
            width={column.width}
            height={height}
            onClick={onCellClick}
            onDoubleClick={onCellDoubleClick}
          />
        );
      })}
    </div>
  );
};

export default memo(DataGridRow) as typeof DataGridRow; 