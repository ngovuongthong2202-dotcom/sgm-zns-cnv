export function normalizePhoneVN(input: string | null | undefined): string | null {
  if (!input) return null;
  // Remove non-digits
  let cleaned = input.replace(/\D/g, '');
  
  // Convert 0084 or 84 prefix to 0
  if (cleaned.startsWith('0084')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('84')) {
    cleaned = '0' + cleaned.substring(2);
  }
  
  // Strip accidental repeated leading zeros (e.g. '000299380939' -> '0299380939')
  cleaned = cleaned.replace(/^0+/, '0');
  
  // If it's 9 digits and missing a leading 0, prepend it
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

