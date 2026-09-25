import { z } from 'zod';
import { cleanProperVietnameseText, normalizePhoneNumber } from '../../shared/utils/textFormatter';

/**
 * Transforms string inputs to prevent copy-paste errors:
 * - Trims whitespace
 * - Applies Proper Case for names/addresses
 * - Removes hidden characters
 */
export const zProperString = z.string().transform((val) => cleanProperVietnameseText(val || ''));

/**
 * Transforms a string to a normalized phone number.
 */
export const zPhoneString = z.string().transform((val) => normalizePhoneNumber(val || ''));

/**
 * Safe string just trims and removes weird characters but doesn't change case.
 * Suitable for emails, codes, notes.
 */
export const zSafeString = z.string().transform((val) => val.trim().replace(/[\u200B-\u200D\uFEFF]/g, ''));
