import React, { useMemo, useRef, useEffect } from 'react';
import { DataGridProps, DEFAULT_ROW_HEIGHT, DEFAULT_HEADER_HEIGHT } from '../../types/dataGrid';
import { useDataGrid } from '../../hooks/useDataGrid';
import DataGridHeader from './DataGridHeader';
import DataGridRow from './DataGridRow';
import LoadingSpinner from '../LoadingSpinner';

const DataGrid = <T = any>({
  data,
  columns,
  height,
  width,
  rowHeight = DEFAULT_ROW_HEIGHT,
  headerHeight = DEFAULT_HEADER_HEIGHT,
  virtualScrolling = true,
  loading = false,
  error = null,
  className = '',
  headerClassName = '',
  rowClassName,
  cellClassName,
  ...props
}: DataGridProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Main DataGrid hook
  const grid = useDataGrid({
    data,
    columns,
    height,
    width,
    rowHeight,
    headerHeight,
    virtualScrolling,
    ...props
  });

  // Calculate container dimensions
  const containerWidth = width || containerRef.current?.clientWidth || 800;
  const contentHeight = height - headerHeight;

  // Get visible data for rendering
  const visibleData = grid.getVisibleData();
  const { startRowIndex } = grid.getVisibleRowRange();

  // Calculate virtual scroll offset
  const scrollOffset = useMemo(() => {
    if (!virtualScrolling) return 0;
    return startRowIndex * rowHeight;
  }, [virtualScrolling, startRowIndex, rowHeight]);

  // Effect to handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Force a re-render when container size changes
      grid.containerRef.current?.focus();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [grid.containerRef]);

  // Main container classes
  const containerClasses = useMemo(() => {
    return `
      relative border border-gray-300 bg-white rounded-lg overflow-hidden
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      ${className}
    `.trim();
  }, [className]);

  // Loading state
  if (loading) {
    return (
      <div 
        className={containerClasses}
        style={{ height: `${height}px`, width: width ? `${width}px` : '100%' }}
      >
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
          <span className="ml-3 text-gray-600">Loading data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        className={containerClasses}
        style={{ height: `${height}px`, width: width ? `${width}px` : '100%' }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-600 font-medium">Error loading data</div>
            <div className="text-red-500 text-sm mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div 
        className={containerClasses}
        style={{ height: `${height}px`, width: width ? `${width}px` : '100%' }}
      >
        <DataGridHeader
          columns={grid.columns}
          height={headerHeight}
          isColumnSelected={grid.isColumnSelected}
          onColumnClick={grid.handleColumnClick}
          onColumnResize={grid.handleColumnResize}
          className={headerClassName}
        />
        <div className="flex items-center justify-center" style={{ height: `${contentHeight}px` }}>
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium">No data available</div>
            <div className="text-sm mt-1">There are no accounts to display</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{ 
        height: `${height}px`, 
        width: width ? `${width}px` : '100%'
      }}
    >
      {/* Header */}
      <DataGridHeader
        columns={grid.columns}
        height={headerHeight}
        isColumnSelected={grid.isColumnSelected}
        onColumnClick={grid.handleColumnClick}
        onColumnResize={grid.handleColumnResize}
        className={headerClassName}
      />

      {/* Scrollable content area */}
      <div
        ref={grid.scrollElementRef}
        className="relative overflow-auto"
        style={{ height: `${contentHeight}px` }}
        onScroll={grid.handleScroll}
        tabIndex={0}
        onKeyDown={grid.handleKeyDown}
        role="grid"
        aria-label="Data grid"
        aria-rowcount={data.length}
        aria-colcount={grid.columns.length}
      >
        {/* Virtual scroll container */}
        {virtualScrolling ? (
          <div
            style={{
              height: `${grid.totalHeight - headerHeight}px`,
              position: 'relative'
            }}
          >
            {/* Visible rows */}
            <div
              style={{
                transform: `translateY(${scrollOffset}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0
              }}
            >
              {visibleData.map((row, index) => {
                const actualRowIndex = startRowIndex + index;
                
                return (
                  <DataGridRow
                    key={`row-${actualRowIndex}`}
                    row={row}
                    rowIndex={actualRowIndex}
                    columns={grid.columns}
                    height={rowHeight}
                    isSelected={grid.isRowSelected(actualRowIndex)}
                    isCellSelected={grid.isCellSelected}
                    isCellActive={(position) => 
                      grid.activeCell?.rowIndex === position.rowIndex &&
                      grid.activeCell?.columnIndex === position.columnIndex
                    }
                    isCellEditing={(position) => 
                      grid.editingCell?.rowIndex === position.rowIndex &&
                      grid.editingCell?.columnIndex === position.columnIndex
                    }
                    onRowClick={grid.handleRowClick}
                    onCellClick={grid.handleCellClick}
                    onCellDoubleClick={grid.handleCellDoubleClick}
                    className={
                      typeof rowClassName === 'function' 
                        ? rowClassName(row, actualRowIndex)
                        : rowClassName
                    }
                  />
                );
              })}
            </div>
          </div>
        ) : (
          // Non-virtual scrolling
          <div>
            {data.map((row, rowIndex) => (
              <DataGridRow
                key={`row-${rowIndex}`}
                row={row}
                rowIndex={rowIndex}
                columns={grid.columns}
                height={rowHeight}
                isSelected={grid.isRowSelected(rowIndex)}
                isCellSelected={grid.isCellSelected}
                isCellActive={(position) => 
                  grid.activeCell?.rowIndex === position.rowIndex &&
                  grid.activeCell?.columnIndex === position.columnIndex
                }
                isCellEditing={(position) => 
                  grid.editingCell?.rowIndex === position.rowIndex &&
                  grid.editingCell?.columnIndex === position.columnIndex
                }
                onRowClick={grid.handleRowClick}
                onCellClick={grid.handleCellClick}
                onCellDoubleClick={grid.handleCellDoubleClick}
                className={
                  typeof rowClassName === 'function' 
                    ? rowClassName(row, rowIndex)
                    : rowClassName
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Selection info (optional overlay) */}
      {grid.selection.selectedCells.size > 1 && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm">
          {grid.selection.selectedCells.size} cells selected
          {grid.selection.selectedRows.size > 0 && ` (${grid.selection.selectedRows.size} rows)`}
          {grid.selection.selectedColumns.size > 0 && ` (${grid.selection.selectedColumns.size} columns)`}
        </div>
      )}
    </div>
  );
};

export default DataGrid; 