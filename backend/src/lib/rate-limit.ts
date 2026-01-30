/**
 * In-memory rate limiter
 * For production with multiple instances, use Redis
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateLimitEntry>();

// Configuration
const WINDOW_MS = 30_000; // 30 seconds
const MAX_REQUESTS = 2; // 2 requests per window

/**
 * Check if a viewer can make a request
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(viewerId: string): boolean {
  const now = Date.now();
  const entry = limits.get(viewerId);

  // No entry or expired window
  if (!entry || now > entry.resetAt) {
    limits.set(viewerId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  // Within window, check count
  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of limits) {
    if (now > entry.resetAt) {
      limits.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
