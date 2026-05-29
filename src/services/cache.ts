// Cache TTL semantics:
// - set() should accept an optional ttl parameter (in milliseconds)
// - get() should return null if the key has expired
// - invalidate() should immediately remove a key from the cache regardless of TTL

const cache = new Map<string, { value: any; expiresAt: number | null }>();

export function get<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function set(key: string, value: any, ttl?: number): void {
  const expiresAt = ttl ? Date.now() + ttl : null;
  cache.set(key, { value, expiresAt });
}

export function invalidate(key: string): void {
  cache.delete(key);
}
