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
/**
 * Cleans and safely parses a single numeric token in Vietnamese Dong (VND).
 * Handles thousands separators (100.000, 15.000.000, 1.000, 50.000, 100,000),
 * currency suffixes (đ, vnd, đồng), and decimal fallbacks.
 */
function parseSingleNumericToken(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Strip currency suffixes
  s = s.replace(/(?:đ|vnd|đồng)$/i, '').trim();
  if (!s) return 0;

  // In Vietnam, amounts do not have decimals/cents.
  // Detect thousands separator patterns:
  // e.g. dot or comma followed by 3 digits (.000, ,000, .123, etc.) or multiple dots/commas
  const hasThousandDot = /\.\d{3}(?:\D|$)/.test(s);
  const hasThousandComma = /,\d{3}(?:\D|$)/.test(s);
  const multipleDots = (s.match(/\./g) || []).length > 1;
  const multipleCommas = (s.match(/,/g) || []).length > 1;

  if (hasThousandDot || hasThousandComma || multipleDots || multipleCommas) {
    const cleanDigits = s.replace(/[^\d]/g, '');
    return parseInt(cleanDigits, 10) || 0;
  }

  // If single dot or comma followed by non-3 digits (e.g. "1.5" or "2,5"):
  if (/[.,]\d+$/.test(s)) {
    const normalized = s.replace(',', '.').replace(/[^\d.]/g, '');
    const val = parseFloat(normalized);
    return isNaN(val) ? 0 : Math.round(val);
  }

  // Simple digits fallback
  const cleanDigits = s.replace(/[^\d]/g, '');
  return parseInt(cleanDigits, 10) || 0;
}

/**
 * Deterministic Zero-Eval Math Evaluator for financial expressions.
 * Tokenizes operands and operators (+, -, *, /), normalizes operand thousand separators,
 * and computes standard operator precedence without eval() or Function().
 */
function evaluateSafeMath(expr: string): number {
  const rawTokens = expr.match(/(?:\d+[.,\d]*|\+|-|\*|\/)/g);
  if (!rawTokens || rawTokens.length === 0) return 0;

  const tokens: (number | string)[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i];
    if (t === '+' || t === '-' || t === '*' || t === '/') {
      tokens.push(t);
    } else {
      tokens.push(parseSingleNumericToken(t));
    }
  }

  // Handle leading unary minus/plus
  if (tokens[0] === '-') {
    tokens.shift();
    if (typeof tokens[0] === 'number') {
      tokens[0] = -tokens[0];
    }
  } else if (tokens[0] === '+') {
    tokens.shift();
  }

  // Pass 1: Multiplication and Division
  const pass1: (number | string)[] = [];
  let i = 0;
  while (i < tokens.length) {
    const current = tokens[i];
    if ((current === '*' || current === '/') && pass1.length > 0 && i + 1 < tokens.length) {
      const prev = pass1.pop();
      const next = tokens[i + 1];
      if (typeof prev === 'number' && typeof next === 'number') {
        const res = current === '*' ? prev * next : (next !== 0 ? prev / next : 0);
        pass1.push(res);
        i += 2;
        continue;
      }
    }
    pass1.push(current);
    i++;
  }

  // Pass 2: Addition and Subtraction
  let result = typeof pass1[0] === 'number' ? pass1[0] : 0;
  let j = 1;
  while (j < pass1.length) {
    const op = pass1[j];
    const nextVal = pass1[j + 1];
    if (typeof nextVal === 'number') {
      if (op === '+') {
        result += nextVal;
      } else if (op === '-') {
        result -= nextVal;
      }
      j += 2;
    } else {
      j++;
    }
  }

  return Math.max(0, Math.round(result));
}

/**
 * Universal Financial Shortcut & Math Expression Parser
 * Supports:
 * - '100.000' / '100.000đ' -> 100,000 (Zero loss of zeros)
 * - '1.000' / '50.000' / '15.000.000' / '25,000,000' -> Exact integer VND
 * - '100k' -> 100,000
 * - '15m' / '15tr' -> 15,000,000
 * - '1.5ty' / '1.5b' / '1.5tỷ' -> 1,500,000,000
 * - In-place math: '100.000*2' -> 200,000, '15m*3' -> 45,000,000, '500k+250k' -> 750,000
 */
export function parseFinancialInput(input: string | number): number {
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : Math.max(0, Math.round(input));
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

  // 2. If expression has operators (+, -, *, /), evaluate with Zero-Eval Safe Math Engine
  const hasOperator = /[+\-*/]/.test(cleaned);
  if (hasOperator) {
    return evaluateSafeMath(cleaned);
  }

  // 3. Otherwise, parse as a single numeric token
  return parseSingleNumericToken(cleaned);
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
