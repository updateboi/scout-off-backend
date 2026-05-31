// Sanitizer utility
/**
 * Simple sanitization helper to trim whitespace and remove potentially dangerous characters.
 * For now we perform basic trimming; extend as needed.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  // Trim surrounding whitespace
  let sanitized = input.trim();
  // Remove null bytes and control chars
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  return sanitized;
}
