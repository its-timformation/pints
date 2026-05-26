/**
 * In-memory admin session store.
 * Kept in its own file to avoid circular imports between trpc.ts and auth.ts.
 */
const activeSessions = new Set<string>();

export function addAdminSession(token: string, ttlMs = 30 * 60 * 1000) {
  activeSessions.add(token);
  setTimeout(() => activeSessions.delete(token), ttlMs);
}

export function isAdminToken(token: string): boolean {
  return activeSessions.has(token);
}
