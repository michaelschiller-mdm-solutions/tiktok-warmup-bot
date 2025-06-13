import React, { memo, useMemo } from 'react';
import { CellPosition, DataGridColumn } from '../../types/dataGrid';
import { formatCellValue, getCellClasses } from '../../utils/dataGridUtils';

interface DataGridCellProps<T = any> {
  position: CellPosition;
  value: any;
  row: T;
  column: DataGridColumn<T>;
  isSelected: boolean;
  isActive: boolean;
  isEditing: boolean;
  width: number;
  height: number;
  onClick?: (position: CellPosition, row: T, column: DataGridColumn<T>, event: React.MouseEvent) => void;
  onDoubleClick?: (position: CellPosition, row: T, column: DataGridColumn<T>) => void;
  className?: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const badgeClasses = useMemo(() => {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    
    switch (status?.toLowerCase()) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'banned':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'suspended':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'inactive':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'unknown':
        return `${baseClasses} bg-gray-100 text-gray-600`;
      default:
        return `${baseClasses} bg-blue-100 text-blue-800`;
    }
  }, [status]);

  return (
    <span className={badgeClasses}>
      {status || 'Unknown'}
    </span>
  );
};

const DataGridCell = <T = any>({
  position,
  value,
  row,
  column,
  isSelected,
  isActive,
  isEditing,
  width,
  height,
  onClick,
  onDoubleClick,
  className = ''
}: DataGridCellProps<T>) => {
  // Handle cell click
  const handleClick = (event: React.MouseEvent) => {
    onClick?.(position, row, column, event);
  };

  // Handle cell double click
  const handleDoubleClick = () => {
    onDoubleClick?.(position, row, column);
  };

  // Render cell content based on column type
  const renderCellContent = useMemo(() => {
    if (value == null) {
      return <span className="text-gray-400">—</span>;
    }

    if (column.render) {
      return column.render(value, row, column);
    }

    switch (column.type) {
      case 'boolean':
        return (
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {value ? '✓' : '✗'}
          </span>
        );

      case 'select':
        // Special handling for status fields
        if (column.field === 'status' || column.field === 'proxy_status') {
          return <StatusBadge status={value} />;
        }
        // Regular select rendering
        const option = column.options?.find(opt => opt.value === value);
        return <span>{option ? option.label : formatCellValue(value, column)}</span>;

      case 'number':
        return (
          <span className="font-mono text-right">
            {formatCellValue(value, column)}
          </span>
        );

      case 'date':
        return (
          <span className="text-sm">
            {formatCellValue(value, column)}
          </span>
        );

      default:
        return (
          <span className="truncate">
            {formatCellValue(value, column)}
          </span>
        );
    }
  }, [value, row, column]);

  // Calculate cell classes
  const cellClasses = useMemo(() => {
    const baseClasses = `
      flex items-center px-3 py-2 border-r border-b border-gray-200 
      cursor-pointer hover:bg-gray-50 focus:outline-none
      ${column.align === 'center' ? 'justify-center' : ''}
      ${column.align === 'right' ? 'justify-end' : ''}
      ${className}
    `.trim();

    return getCellClasses(
      isSelected,
      isActive,
      false, // isHighlighted - could be used for search highlights
      false, // hasError - could be used for validation errors
      baseClasses
    );
  }, [isSelected, isActive, column.align, className]);

  return (
    <div
      className={cellClasses}
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        height: `${height}px`,
        minHeight: `${height}px`
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="gridcell"
      tabIndex={isActive ? 0 : -1}
      aria-selected={isSelected}
      data-row-index={position.rowIndex}
      data-column-index={position.columnIndex}
    >
      {isEditing ? (
        // Editing state - could be enhanced with inline editing in future tasks
        <input
          type="text"
          value={formatCellValue(value, column)}
          className="w-full bg-transparent border-none outline-none"
          autoFocus
          readOnly // For now, just show the value
        />
      ) : (
        renderCellContent
      )}
    </div>
  );
};

export default memo(DataGridCell) as typeof DataGridCell; 