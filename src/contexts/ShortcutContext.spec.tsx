import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ShortcutProvider, useKeyboardShortcut, useAllShortcuts } from './ShortcutContext';
import { describe, it, expect, vi } from 'vitest';

const TestComponent = ({ action }: { action: () => void }) => {
  useKeyboardShortcut({
    key: 'Cmd+K',
    description: 'Test Cmd K',
    context: 'Test',
    action
  });
  const shortcuts = useAllShortcuts();
  return <div data-testid="count">{shortcuts.length}</div>;
};

describe('ShortcutContext', () => {
  it('registers and triggers shortcut correctly', () => {
    const actionMock = vi.fn();
    const { getByTestId } = render(
      <ShortcutProvider>
        <TestComponent action={actionMock} />
      </ShortcutProvider>
    );
    
    expect(getByTestId('count').textContent).toBe('1');
    
    fireEvent.keyDown(window, { metaKey: true, key: 'k' });
    expect(actionMock).toHaveBeenCalledTimes(1);
    
    // Should ignore if target is input
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { metaKey: true, key: 'k' });
    expect(actionMock).toHaveBeenCalledTimes(1); // No new call
  });
});
