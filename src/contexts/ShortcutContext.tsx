import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

export interface Shortcut {
  key: string;
  description: string;
  context: string;
  action: () => void;
}

interface ShortcutContextType {
  registerShortcut: (shortcut: Shortcut) => () => void;
  shortcuts: Shortcut[];
}

const ShortcutContext = createContext<ShortcutContextType | null>(null);

export const ShortcutProvider = ({ children }: { children: React.ReactNode }) => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  const registerShortcut = useCallback((newShortcut: Shortcut) => {
    setShortcuts(prev => {
      if (prev.find(s => s.key === newShortcut.key && s.context === newShortcut.context)) {
        return prev;
      }
      return [...prev, newShortcut];
    });
    return () => {
      setShortcuts(prev => prev.filter(s => !(s.key === newShortcut.key && s.context === newShortcut.context)));
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu đang focus vào input/textarea hoặc contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        ('disabled' in target && (target as unknown as { disabled: boolean }).disabled)
      ) {
        return;
      }

      // Xây dựng chuỗi phím tắt
      const keys = [];
      if (e.metaKey) keys.push('Cmd');
      else if (e.ctrlKey) keys.push('Ctrl');
      
      if (e.shiftKey) keys.push('Shift');
      if (e.altKey) keys.push('Alt');
      
      const keyMap: Record<string, string> = {
        ' ': 'Space',
        '?': '?'
      };
      const rawKey = keyMap[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      if (!['Cmd', 'Ctrl', 'Shift', 'Alt', 'Meta'].includes(rawKey)) {
        keys.push(rawKey);
      }
      
      const keyString = keys.join('+');

      const match = shortcuts.find(s => s.key === keyString);
      if (match) {
        e.preventDefault();
        match.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const value = React.useMemo(() => ({ registerShortcut, shortcuts }), [registerShortcut, shortcuts]);

  return (
    <ShortcutContext.Provider value={value}>
      {children}
    </ShortcutContext.Provider>
  );
};

export const useKeyboardShortcut = (
  shortcutInfo: Shortcut & { active?: boolean }
) => {
  const context = useContext(ShortcutContext);
  if (!context) throw new Error('Must be used within ShortcutProvider');

  const actionRef = useRef(shortcutInfo.action);
  
  // Update ref when action changes so the latest function is used
  useEffect(() => {
    actionRef.current = shortcutInfo.action;
  }, [shortcutInfo.action]);

  useEffect(() => {
    if (shortcutInfo.active === false) return;
    
    const shortcut = {
      key: shortcutInfo.key,
      description: shortcutInfo.description,
      context: shortcutInfo.context,
      action: () => actionRef.current()
    };
    
    return context.registerShortcut(shortcut);
  }, [
    context.registerShortcut,
    shortcutInfo.key,
    shortcutInfo.description,
    shortcutInfo.context,
    shortcutInfo.active
  ]);
};

export const useAllShortcuts = () => {
  const context = useContext(ShortcutContext);
  if (!context) throw new Error('Must be used within ShortcutProvider');
  return context.shortcuts;
};
