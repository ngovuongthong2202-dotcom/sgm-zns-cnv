import React, { useState, useCallback, useEffect } from 'react';

export function useContextMenu<T = unknown>() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; data: T } | null>(null); 

  const handleContextMenu = useCallback((e: React.MouseEvent, data: T) => { 
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, data });
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return { contextMenu, handleContextMenu, closeContextMenu: () => setContextMenu(null) };
}
