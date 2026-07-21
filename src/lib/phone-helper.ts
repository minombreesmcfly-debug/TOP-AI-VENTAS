/**
 * Formats any input phone number as a standard Mexican phone number with +52 prefix.
 */
export function formatMexicanPhone(phone: string): string {
  const trimmed = (phone || '').trim();
  if (!trimmed) return '';
  
  const cleanDigits = trimmed.replace(/\D/g, '');
  if (!cleanDigits) return trimmed; // fallback if only symbols
  
  // If it's exactly 10 digits (e.g., "6621234567")
  if (cleanDigits.length === 10) {
    return `+52${cleanDigits}`;
  }
  
  // If it's exactly 12 digits and starts with "52" (e.g., "526621234567")
  if (cleanDigits.length === 12 && cleanDigits.startsWith('52')) {
    return `+${cleanDigits}`;
  }
  
  // If it starts with "+" in the original input, keep that +
  if (trimmed.startsWith('+')) {
    return `+${cleanDigits}`;
  }
  
  // Otherwise default to +52 prefix for standard numbers
  return `+52${cleanDigits}`;
}
