import { useCallback, useEffect, useRef } from 'react';
import { useConfirm } from '@/src/design-system/Confirm';

/**
 * Universal Financial Shortcut & Math Expression Parser
 * Supports:
 * - '100k' -> 100,000
 * - '15m' / '15tr' -> 15,000,000
 * - '1.5ty' / '1.5b' / '1.5tỷ' -> 1,500,000,000
 * - In-place math: '15m*3' -> 45,000,000, '500k+250k' -> 750,000, '10m/2' -> 5,000,000
 */
export function parseFinancialInput(input: string | number): number {
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : Math.max(0, input);
  }

  if (!input || typeof input !== 'string') return 0;

  let cleaned = input.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (!cleaned) return 0;

  // 1. Substitute financial units with numeric multipliers
  // Order: ty/b first, then tr/m, then k
  const unitReplacer = (text: string): string => {
    return text
      .replace(/(\d+(?:[.,]\d+)?)\s*(?:tỷ|ty|b)(?![a-z\u00C0-\u1EF9])/gi, (_, num) => {
        const val = parseFloat(num.replace(',', '.'));
        return String(Math.round(val * 1_000_000_000));
      })
      .replace(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|m)(?![a-z\u00C0-\u1EF9])/gi, (_, num) => {
        const val = parseFloat(num.replace(',', '.'));
        return String(Math.round(val * 1_000_000));
      })
      .replace(/(\d+(?:[.,]\d+)?)\s*(?:k|nghìn|ngàn)(?![a-z\u00C0-\u1EF9])/gi, (_, num) => {
        const val = parseFloat(num.replace(',', '.'));
        return String(Math.round(val * 1_000));
      });
  };

  cleaned = unitReplacer(cleaned);

  // 2. Remove standard currency separators if NOT math operations
  // If string contains math operator (+, -, *, /), clean up individual tokens
  const hasOperator = /[+\-*/]/.test(cleaned);
  if (!hasOperator) {
    // Normal numeric string like "15.000.000" or "15,000,000" or "15000000"
    const standardNumeric = cleaned.replace(/[^\d.]/g, '');
    // If multiple dots, it's thousands separator: remove dots
    if ((standardNumeric.match(/\./g) || []).length > 1) {
      return parseInt(standardNumeric.replace(/\./g, ''), 10) || 0;
    }
    // Single dot or no dot
    return Math.round(parseFloat(standardNumeric) || 0);
  }

  // 3. In-place math safe evaluator (handles +, -, *, /)
  try {
    // Sanitize: only allow digits, dots, and operators +, -, *, /, spaces
    const safeExpr = cleaned.replace(/[^\d.+\-*/]/g, '');
    // Basic tokens calculation
    const evaluated = Function(`"use strict"; return (${safeExpr})`)();
    if (typeof evaluated === 'number' && !isNaN(evaluated) && isFinite(evaluated)) {
      return Math.max(0, Math.round(evaluated));
    }
  } catch {
    // Fallback if math parsing fails: extract first valid number
    const fallbackMatch = cleaned.match(/\d+/);
    return fallbackMatch ? parseInt(fallbackMatch[0], 10) : 0;
  }

  return 0;
}

/**
 * Universal Zero-Friction Form Engine Hook
 */
export function useSmartFormInput() {
  const { confirm } = useConfirm();

  /**
   * Auto-trim whitespace and invisible zero-width chars on blur
   */
  const handleBlurTrim = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, setter?: (val: string) => void) => {
      const original = e.target.value;
      const trimmed = original.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
      if (original !== trimmed) {
        if (setter) {
          setter(trimmed);
        } else {
          e.target.value = trimmed;
        }
      }
    },
    []
  );

  /**
   * Auto-uppercase document code, tax code, machine serial or SKU on blur
   */
  const handleBlurUppercase = useCallback(
    (e: React.FocusEvent<HTMLInputElement>, setter?: (val: string) => void) => {
      const original = e.target.value;
      const uppercased = original.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').toUpperCase();
      if (original !== uppercased) {
        if (setter) {
          setter(uppercased);
        } else {
          e.target.value = uppercased;
        }
      }
    },
    []
  );

  /**
   * Handle financial input shortcut and in-place math evaluation on blur or enter
   */
  const handleFinancialInput = useCallback(
    (
      rawInput: string | number,
      onResolved: (numericVal: number) => void
    ) => {
      const resolved = parseFinancialInput(rawInput);
      onResolved(resolved);
      return resolved;
    },
    []
  );

  /**
   * Universal keyboard shortcut: Ctrl+Enter or Cmd+Enter to submit form from any input field
   */
  const handleKeyboardSubmit = useCallback(
    (onSubmit: () => void | Promise<void>) => {
      return (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          onSubmit();
        }
      };
    },
    []
  );

  /**
   * Dirty state guard prompt: Warns user if form has unsaved modifications before closing
   */
  const confirmDiscardChanges = useCallback(
    async (isDirty: boolean, customMessage?: string): Promise<boolean> => {
      if (!isDirty) return true;
      return await confirm({
        title: 'Xác nhận hủy thay đổi?',
        message:
          customMessage ||
          'Bạn đang có dữ liệu đã thay đổi nhưng chưa lưu. Nếu đóng bây giờ, các thay đổi sẽ bị mất.',
        confirmText: 'Đóng và hủy thay đổi',
        cancelText: 'Tiếp tục chỉnh sửa',
        variant: 'danger',
      });
    },
    [confirm]
  );

  return {
    handleBlurTrim,
    handleBlurUppercase,
    handleFinancialInput,
    handleKeyboardSubmit,
    confirmDiscardChanges,
    parseFinancialInput,
  };
}
