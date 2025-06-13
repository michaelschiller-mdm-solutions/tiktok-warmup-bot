import React, { memo, useState, useRef, useCallback, useMemo } from 'react';
import { DataGridColumn } from '../../types/dataGrid';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';

interface DataGridHeaderProps<T = any> {
  columns: DataGridColumn<T>[];
  height: number;
  isRowSelected?: (rowIndex: number) => boolean;
  isColumnSelected?: (columnIndex: number) => boolean;
  onColumnClick?: (columnIndex: number, column: DataGridColumn<T>, event: React.MouseEvent) => void;
  onColumnResize?: (columnId: string, newWidth: number) => void;
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

interface ColumnHeaderCellProps<T = any> {
  column: DataGridColumn<T>;
  columnIndex: number;
  isSelected: boolean;
  onColumnClick?: (columnIndex: number, column: DataGridColumn<T>, event: React.MouseEvent) => void;
  onColumnResize?: (columnId: string, newWidth: number) => void;
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  height: number;
}

const ColumnHeaderCell = <T = any>({
  column,
  columnIndex,
  isSelected,
  onColumnClick,
  onColumnResize,
  onSort,
  height
}: ColumnHeaderCellProps<T>) => {
  const [isResizing, setIsResizing] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Handle column click
  const handleClick = useCallback((event: React.MouseEvent) => {
    // Don't trigger column selection when clicking resize handle
    if (isResizing) return;
    
    onColumnClick?.(columnIndex, column, event);
  }, [columnIndex, column, isResizing, onColumnClick]);

  // Handle sort click
  const handleSortClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (!column.sortable) return;

    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    onSort?.(column.id, newDirection);
  }, [column.id, column.sortable, sortDirection, onSort]);

  // Handle resize start
  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setIsResizing(true);
    startXRef.current = event.clientX;
    startWidthRef.current = column.width;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(column.minWidth, startWidthRef.current + diff);
      
      if (column.maxWidth) {
        onColumnResize?.(column.id, Math.min(column.maxWidth, newWidth));
      } else {
        onColumnResize?.(column.id, newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.id, column.width, column.minWidth, column.maxWidth, onColumnResize]);

  // Render sort indicator
  const renderSortIndicator = useMemo(() => {
    if (!column.sortable) return null;

    return (
      <button
        onClick={handleSortClick}
        className="ml-1 p-1 hover:bg-gray-200 rounded"
        title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
      >
        {sortDirection === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : sortDirection === 'desc' ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <div className="h-3 w-3 flex flex-col justify-center items-center">
            <ChevronUp className="h-2 w-2 -mb-1 opacity-40" />
            <ChevronDown className="h-2 w-2 opacity-40" />
          </div>
        )}
      </button>
    );
  }, [column.sortable, sortDirection, handleSortClick]);

  // Header cell classes
  const cellClasses = useMemo(() => {
    const baseClasses = `
      relative flex items-center px-3 py-2 bg-gray-50 border-r border-b border-gray-200
      font-medium text-sm text-gray-900 cursor-pointer hover:bg-gray-100
      ${column.align === 'center' ? 'justify-center' : ''}
      ${column.align === 'right' ? 'justify-end' : ''}
      ${isSelected ? 'bg-blue-100 border-blue-300' : ''}
    `.trim();

    return baseClasses;
  }, [column.align, isSelected]);

  return (
    <div
      className={cellClasses}
      style={{
        width: `${column.width}px`,
        minWidth: `${column.width}px`,
        height: `${height}px`
      }}
      onClick={handleClick}
      role="columnheader"
      aria-sort={
        sortDirection === 'asc' ? 'ascending' : 
        sortDirection === 'desc' ? 'descending' : 
        'none'
      }
      data-column-index={columnIndex}
    >
      {/* Column header content */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center min-w-0">
          {column.headerRender ? (
            column.headerRender(column)
          ) : (
            <span className="truncate" title={column.header}>
              {column.header}
            </span>
          )}
          {renderSortIndicator}
        </div>
        
        {/* Column menu (future enhancement) */}
        <button
          className="ml-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded"
          title="Column options"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </div>

      {/* Resize handle */}
      {column.resizable && (
        <div
          ref={resizeRef}
          className={`
            absolute right-0 top-0 bottom-0 w-1 cursor-col-resize 
            hover:bg-blue-300 active:bg-blue-400
            ${isResizing ? 'bg-blue-400' : ''}
          `}
          onMouseDown={handleResizeStart}
          title="Resize column"
        />
      )}
    </div>
  );
};

const DataGridHeader = <T = any>({
  columns,
  height,
  isColumnSelected,
  onColumnClick,
  onColumnResize,
  onSort,
  className = ''
}: DataGridHeaderProps<T>) => {
  const headerClasses = useMemo(() => {
    return `
      flex items-stretch bg-gray-50 border-b border-gray-300 sticky top-0 z-10
      ${className}
    `.trim();
  }, [className]);

  return (
    <div
      className={headerClasses}
      style={{ height: `${height}px` }}
      role="row"
    >
      {/* Row number header */}
      <div
        className="flex items-center justify-center px-2 bg-gray-100 border-r border-gray-300 font-medium text-xs text-gray-600"
        style={{ width: '50px', minWidth: '50px' }}
      >
        #
      </div>

      {/* Column headers */}
      {columns.map((column, index) => (
        <ColumnHeaderCell
          key={column.id}
          column={column}
          columnIndex={index}
          isSelected={isColumnSelected?.(index) || false}
          onColumnClick={onColumnClick}
          onColumnResize={onColumnResize}
          onSort={onSort}
          height={height}
        />
      ))}
    </div>
  );
};

export default memo(DataGridHeader) as typeof DataGridHeader; 