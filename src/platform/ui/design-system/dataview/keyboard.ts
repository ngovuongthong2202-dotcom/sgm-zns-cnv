import { useEffect, useCallback } from 'react';

interface KeyboardOptions {
  onNextRow?: () => void;
  onPrevRow?: () => void;
  onNew?: () => void;
  onEdit?: () => void;
  onSearchFocus?: () => void;
  onClose?: () => void;
  enabled?: boolean;
}

export function useDataViewKeyboard({
  onNextRow,
  onPrevRow,
  onNew,
  onEdit,
  onSearchFocus,
  onClose,
  enabled = true
}: KeyboardOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
      return;
    }

    switch (e.key) {
      case 'j':
        e.preventDefault();
        onNextRow?.();
        break;
      case 'k':
        e.preventDefault();
        onPrevRow?.();
        break;
      case 'n':
        e.preventDefault();
        onNew?.();
        break;
      case 'e':
        e.preventDefault();
        onEdit?.();
        break;
      case '/':
        e.preventDefault();
        onSearchFocus?.();
        break;
      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;
    }
  }, [enabled, onNextRow, onPrevRow, onNew, onEdit, onSearchFocus, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
