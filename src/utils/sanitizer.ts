export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  // Trim surrounding whitespace
  let sanitized = input.trim();
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  return sanitized;
}
