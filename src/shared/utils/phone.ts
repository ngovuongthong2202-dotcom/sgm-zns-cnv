export function normalizePhoneVN(input: string | null | undefined): string | null {
  if (!input) return null;
  // Remove non-digits
  let cleaned = input.replace(/\D/g, '');
  
  // Convert 84 prefix to 0
  if (cleaned.startsWith('84')) {
    cleaned = '0' + cleaned.substring(2);
  }
  
  // If it's 9 digits and missing a leading 0, prepend it (assuming it's a valid local number format someone skipped)
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  // Check if it's a valid 10-digit Vietnamese phone number starting with 0
  const phoneRegex = /^0\d{9}$/;
  if (phoneRegex.test(cleaned)) {
    return cleaned;
  }
  
  return null;
}
