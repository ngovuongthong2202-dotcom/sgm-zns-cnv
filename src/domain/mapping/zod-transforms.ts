import { z } from 'zod';
import { cleanProperVietnameseText, normalizePhoneNumber } from '../../shared/utils/textFormatter';

/**
 * Transforms string inputs to prevent copy-paste errors:
 * - Trims whitespace
 * - Applies Proper Case for names/addresses
 * - Removes hidden characters
 * - Safely tolerates null and undefined from database rows
 */
export const zProperString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => cleanProperVietnameseText(val || ''));

/**
 * Transforms a string to a normalized phone number.
 * Safely tolerates null and undefined from database rows.
 */
export const zPhoneString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => normalizePhoneNumber(val || ''));

/**
 * Safe string just trims and removes weird characters but doesn't change case.
 * Suitable for emails, codes, notes. Safely tolerates null and undefined.
 */
export const zSafeString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => (val || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, ''));
