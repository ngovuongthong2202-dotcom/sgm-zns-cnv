import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Automatically cleans, trims, and formats Vietnamese text to Proper/Title Case with correct spacing.
 * Handles spacing around brackets e.g. "Chị Hoa ( Hùng Hoa)" -> "Chị Hoa (Hùng Hoa)",
 * cleans up multiple spaces, and handles special enterprise types like TNHH, CP, MTV, GTVT, VNPT, etc.
 */

export const KEEP_UPPER = ['TNHH','CP','MTV','DNTN','HKD','B2B','ZNS','SGM','HD','BG','PT','KH','VAT','PO','PX','GH','CN','SS','DNB','KTTD','QH'];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function squeezeSpaces(s?: string | null): string {
  if (!s) return '';
  return s.trim().replace(/\s+/g, ' ');
}

export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[\s.()]/g, '').replace(/-/g, '');
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length > 9) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned.replace(/\D/g, '');
}

export function cleanCode(s?: string | null): string {
  if (!s) return '';
  // Remove zero-width hidden characters and control characters
  let cleaned = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Remove non-breaking spaces
  cleaned = cleaned.replace(/\xA0/g, ' ');
  // Trim and squeeze multiple spaces into one
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  return cleaned;
}

export function normalizeCode(s?: string | null): string {
  if (!s) return '';
  const cleaned = cleanCode(s);
  return cleaned.toUpperCase().replace(/\s+/g, '');
}

export function cleanProperVietnameseText(str: string | null | undefined): string {
  if (!str) return '';

  // 1. Unify and trim whitespace
  let cleaned = str.trim().replace(/\s+/g, ' ');

  // 2. Fix spacing around brackets, commas, colons, semi-colons
  cleaned = cleaned.replace(/\(\s+/g, '(');
  cleaned = cleaned.replace(/\s+\)/g, ')');
  
  // Fix spacing around punctuation
  cleaned = cleaned.replace(/\s*,\s*/g, ', ');
  cleaned = cleaned.replace(/\s*;\s*/g, '; ');
  cleaned = cleaned.replace(/\s*:\s*/g, ': ');
  cleaned = cleaned.replace(/\s*\.\s*/g, '. ');
  cleaned = cleaned.replace(/\s*-\s*/g, ' - '); // Nice dash spacing

  // Clean trailing spaces again
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 3. Apply capitalization
  const words = cleaned.split(' ');
  const titleCasedWords = words.map((word) => {
    if (!word) return '';
    
    // Check if the word starts/ends with punctuation
    let prefix = '';
    let suffix = '';
    let coreWord = word;
    
    const prefixMatch = coreWord.match(/^[^\p{L}\p{N}]+/u);
    if (prefixMatch) {
      prefix = prefixMatch[0];
      coreWord = coreWord.slice(prefix.length);
    }
    
    const suffixMatch = coreWord.match(/[^\p{L}\p{N}]+$/u);
    if (suffixMatch) {
      suffix = suffixMatch[0];
      coreWord = coreWord.slice(0, coreWord.length - suffix.length);
    }

    if (!coreWord) return prefix + suffix;

    const upperCore = coreWord.toUpperCase();
    const isAbbr = [
      ...KEEP_UPPER,
      'VN', 'HN', 'HCM', 'FDI', 'OS', 'ZALO', 'LTD', 'CO', 'CORP', 'INC', 'PLC', 'JSC', 'VSIP', 'KCN', 'KCX', 'SX', 'TM', 'DV', 'XD', 'XNK', 'HTX', 'MST'
    ].includes(upperCore);

    if (isAbbr) {
      return prefix + upperCore + suffix;
    }

    const firstChar = coreWord.charAt(0).toUpperCase();
    const rest = coreWord.slice(1).toLowerCase();
    
    return prefix + firstChar + rest + suffix;
  });

  let result = titleCasedWords.join(' ');
  result = result.replace(/\s+,/g, ',');
  result = result.replace(/\s+\./g, '.');
  result = result.replace(/\s+:/g, ':');
  result = result.replace(/\s+;/g, ';');
  
  return result.trim();
}

export function normalizeBusinessName(s?: string | null): string {
  if (!s) return '';
  const cleaned = squeezeSpaces(s);
  
  const words = cleaned.split(' ');
  const processed = words.map((word) => {
    if (!word) return '';
    let prefix = '';
    let suffix = '';
    let coreWord = word;
    
    const prefixMatch = coreWord.match(/^[^\p{L}\p{N}]+/u);
    if (prefixMatch) {
      prefix = prefixMatch[0];
      coreWord = coreWord.slice(prefix.length);
    }
    
    const suffixMatch = coreWord.match(/[^\p{L}\p{N}]+$/u);
    if (suffixMatch) {
      suffix = suffixMatch[0];
      coreWord = coreWord.slice(0, coreWord.length - suffix.length);
    }

    if (!coreWord) return prefix + suffix;

    const upperCore = coreWord.toUpperCase();
    const isAbbr = [
      ...KEEP_UPPER,
      'VN', 'HN', 'HCM', 'FDI', 'OS', 'ZALO', 'LTD', 'CO', 'CORP', 'INC', 'PLC', 'JSC', 'VSIP', 'KCN', 'KCX',
      'SX', 'TM', 'DV', 'XD', 'XNK', 'HTX', 'MST', 'TM&DV', 'TMDV', 'SX-TM', 'ĐT&PT', 'ĐT-XD'
    ].includes(upperCore);

    if (isAbbr) {
      return prefix + upperCore + suffix;
    }

    const firstChar = coreWord.charAt(0).toUpperCase();
    const rest = coreWord.slice(1).toLowerCase();
    return prefix + firstChar + rest + suffix;
  });

  return processed.join(' ');
}

export function normalizePersonName(s?: string | null): string {
  if (!s) return '';
  const cleaned = squeezeSpaces(s);
  
  const words = cleaned.split(' ');
  const processed = words.map((word) => {
    if (!word) return '';
    let prefix = '';
    let suffix = '';
    let coreWord = word;
    
    const prefixMatch = coreWord.match(/^[^\p{L}\p{N}]+/u);
    if (prefixMatch) {
      prefix = prefixMatch[0];
      coreWord = coreWord.slice(prefix.length);
    }
    
    const suffixMatch = coreWord.match(/[^\p{L}\p{N}]+$/u);
    if (suffixMatch) {
      suffix = suffixMatch[0];
      coreWord = coreWord.slice(0, coreWord.length - suffix.length);
    }

    if (!coreWord) return prefix + suffix;

    const firstChar = coreWord.charAt(0).toUpperCase();
    const rest = coreWord.slice(1).toLowerCase();
    return prefix + firstChar + rest + suffix;
  });

  return processed.join(' ');
}

/**
 * Safely parses any currency string (VND, USD, etc.) or number into a standard floating number.
 * Handles thousands separators (. or ,), decimal separators (dot or comma), currency units, spaces, and negative values.
 */
export function parseCurrencyToNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  const str = String(val).trim();
  if (!str) return 0;

  // First, check if it's a simple clean float string
  const rawNum = Number(str);
  if (!isNaN(rawNum)) return rawNum;

  // Remove currency symbols, units, spaces, and any non-numerical delimiters
  let cleanStr = str.replace(/[^0-9.,-]/g, '');

  // Check prefix sign
  const isNegative = cleanStr.startsWith('-');
  if (isNegative) {
    cleanStr = cleanStr.replace(/-/g, ''); // strip all minus signs to build absolute part
  } else {
    cleanStr = cleanStr.replace(/-/g, ''); // strip any accidental minus signs
  }

  // Handle dots and commas
  const separators = cleanStr.replace(/[0-9]/g, '');
  if (separators.length === 0) {
    const num = Number(cleanStr);
    return isNegative ? -num : num;
  }

  // If there are both dots and commas (e.g., 1.500.000,50 or 1,500,000.50)
  if (cleanStr.includes('.') && cleanStr.includes(',')) {
    const firstDotPos = cleanStr.indexOf('.');
    const firstCommaPos = cleanStr.indexOf(',');
    if (firstDotPos < firstCommaPos) {
      // 1.500.000,50 -> dot is thousand, comma is decimal
      cleanStr = cleanStr.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // 1,500,000.50 -> comma is thousand, dot is decimal
      cleanStr = cleanStr.replace(/,/g, '');
    }
  } else if (cleanStr.includes(',')) {
    // Only commas (e.g., 1,500,000 or 1500000,50)
    const parts = cleanStr.split(',');
    const lastPart = parts[parts.length - 1];
    if (parts.length === 2 && lastPart.length <= 2) {
      // Decimal comma (e.g. 1500000,50 -> 1500000.50)
      cleanStr = cleanStr.replace(/,/g, '.');
    } else {
      // Thousands separator comma (e.g. 1,500,000 -> 1500000)
      cleanStr = cleanStr.replace(/,/g, '');
    }
  } else if (cleanStr.includes('.')) {
    // Only dots (e.g., 1.500.000 or 1500000.50)
    const parts = cleanStr.split('.');
    const lastPart = parts[parts.length - 1];
    if (parts.length === 2 && lastPart.length <= 2) {
      // Decimal dot
      // No replacement needed, cleanStr is ready
    } else {
      // Thousands separator dot (e.g. 1.500.000 -> 1500000)
      cleanStr = cleanStr.replace(/\./g, '');
    }
  }

  const num = Number(cleanStr);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}
