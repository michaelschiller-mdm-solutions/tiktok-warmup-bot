import { useCallback, useRef } from 'react';
import { CellPosition, KeyboardNavigation } from '../types/dataGrid';
import { 
  getNavigationFromKeyEvent,
  calculateNavigationTarget,
  isValidPosition,
  KEYBOARD_KEYS
} from '../utils/dataGridUtils';

interface UseKeyboardNavigationProps {
  totalRows: number;
  totalColumns: number;
  activeCell: CellPosition | null;
  onNavigate: (position: CellPosition, extend?: boolean) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onStartEditing?: (position: CellPosition) => void;
  onStopEditing?: () => void;
  isEditing?: boolean;
  disabled?: boolean;
}

export const useKeyboardNavigation = ({
  totalRows,
  totalColumns,
  activeCell,
  onNavigate,
  onSelectAll,
  onClearSelection,
  onStartEditing,
  onStopEditing,
  isEditing = false,
  disabled = false
}: UseKeyboardNavigationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Navigate to a specific cell
  const navigateToCell = useCallback((
    direction: KeyboardNavigation['direction'],
    extend = false
  ) => {
    if (!activeCell || disabled) return;

    const visibleRowCount = Math.floor((containerRef.current?.clientHeight || 400) / 40);
    
    const targetPosition = calculateNavigationTarget(
      activeCell,
      direction,
      totalRows,
      totalColumns,
      visibleRowCount
    );

    if (targetPosition && isValidPosition(targetPosition, totalRows, totalColumns)) {
      onNavigate(targetPosition, extend);
    }
  }, [activeCell, totalRows, totalColumns, disabled, onNavigate]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    // Don't handle navigation if currently editing (except for Escape and Enter)
    if (isEditing) {
      switch (event.key) {
        case KEYBOARD_KEYS.ESCAPE:
          event.preventDefault();
          onStopEditing?.();
          break;
        case KEYBOARD_KEYS.ENTER:
          if (!event.shiftKey) {
            event.preventDefault();
            onStopEditing?.();
            navigateToCell('down');
          } else {
            event.preventDefault();
            onStopEditing?.();
            navigateToCell('up');
          }
          break;
        case KEYBOARD_KEYS.TAB:
          event.preventDefault();
          onStopEditing?.();
          navigateToCell(event.shiftKey ? 'left' : 'right');
          break;
      }
      return;
    }

    const navigation = getNavigationFromKeyEvent(event);
    
    if (navigation) {
      event.preventDefault();
      navigateToCell(navigation.direction, navigation.withShift);
      return;
    }

    // Handle other special keys
    switch (event.key) {
      case 'a':
      case 'A':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onSelectAll?.();
        }
        break;
        
      case KEYBOARD_KEYS.ESCAPE:
        event.preventDefault();
        onClearSelection?.();
        break;
        
      case KEYBOARD_KEYS.F2:
        if (activeCell && onStartEditing) {
          event.preventDefault();
          onStartEditing(activeCell);
        }
        break;
        
      case KEYBOARD_KEYS.DELETE:
      case KEYBOARD_KEYS.BACKSPACE:
        // Could trigger cell deletion/clearing in future
        // For now, just prevent default to avoid page navigation
        event.preventDefault();
        break;
        
      case ' ':
        // Space bar could trigger row selection
        if (activeCell) {
          event.preventDefault();
          // This could trigger row selection toggle
        }
        break;
        
      default:
        // Handle printable characters for quick editing
        if (activeCell && onStartEditing && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          onStartEditing(activeCell);
        }
        break;
    }
  }, [
    disabled,
    isEditing,
    navigateToCell,
    onSelectAll,
    onClearSelection,
    onStartEditing,
    onStopEditing,
    activeCell
  ]);

  // Handle specific navigation actions
  const navigateUp = useCallback((extend = false) => {
    navigateToCell('up', extend);
  }, [navigateToCell]);

  const navigateDown = useCallback((extend = false) => {
    navigateToCell('down', extend);
  }, [navigateToCell]);

  const navigateLeft = useCallback((extend = false) => {
    navigateToCell('left', extend);
  }, [navigateToCell]);

  const navigateRight = useCallback((extend = false) => {
    navigateToCell('right', extend);
  }, [navigateToCell]);

  const navigateHome = useCallback((extend = false) => {
    navigateToCell('home', extend);
  }, [navigateToCell]);

  const navigateEnd = useCallback((extend = false) => {
    navigateToCell('end', extend);
  }, [navigateToCell]);

  const navigatePageUp = useCallback((extend = false) => {
    navigateToCell('pageUp', extend);
  }, [navigateToCell]);

  const navigatePageDown = useCallback((extend = false) => {
    navigateToCell('pageDown', extend);
  }, [navigateToCell]);

  // Focus the container
  const focus = useCallback(() => {
    containerRef.current?.focus();
  }, []);

  // Check if container is focused
  const isFocused = useCallback(() => {
    return document.activeElement === containerRef.current;
  }, []);

  return {
    // Refs
    containerRef,
    
    // Event handlers
    handleKeyDown,
    
    // Navigation functions
    navigateUp,
    navigateDown,
    navigateLeft,
    navigateRight,
    navigateHome,
    navigateEnd,
    navigatePageUp,
    navigatePageDown,
    navigateToCell,
    
    // Utility functions
    focus,
    isFocused
  };
}; 