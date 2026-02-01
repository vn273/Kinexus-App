import { useState, useCallback, useRef } from 'react';

/**
 * Hook for handling shift+click range selection
 * @param {Array} items - Array of items with 'id' property
 * @param {Set} selectedIds - Current set of selected IDs
 * @param {Function} setSelectedIds - Function to update selected IDs
 */
export const useShiftSelect = (items, selectedIds, setSelectedIds) => {
  const lastClickedIndex = useRef(null);

  const handleItemClick = useCallback((itemId, event) => {
    const currentIndex = items.findIndex(item => item.id === itemId);
    
    if (currentIndex === -1) return;

    if (event?.shiftKey && lastClickedIndex.current !== null) {
      // Shift+click: select range
      const start = Math.min(lastClickedIndex.current, currentIndex);
      const end = Math.max(lastClickedIndex.current, currentIndex);
      
      const newSelected = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        if (items[i]?.id) {
          newSelected.add(items[i].id);
        }
      }
      setSelectedIds(newSelected);
    } else {
      // Regular click: toggle single item
      const newSelected = new Set(selectedIds);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      setSelectedIds(newSelected);
      lastClickedIndex.current = currentIndex;
    }
  }, [items, selectedIds, setSelectedIds]);

  const resetLastClicked = useCallback(() => {
    lastClickedIndex.current = null;
  }, []);

  return { handleItemClick, resetLastClicked };
};

export default useShiftSelect;
