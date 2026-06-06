// src/lib/rateLimit.ts

type RateLimitEntry = {
  count: number
  resetAt: number
}

// In-memory store (use Redis/Upstash in production)
const store = new Map<string, RateLimitEntry>()

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  // First request or expired window
  if (!entry || now >= entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
    }
  }

  // Limit reached
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
    }
  }

  // Increment count
  const updated: RateLimitEntry = {
    ...entry,
    count: entry.count + 1,
  }

  store.set(key, updated)

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - updated.count),
  }
}

// Cleanup expired entries every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now()

  store.forEach((entry, key) => {
    if (now >= entry.resetAt) {
      store.delete(key)
    }
  })
}, 5 * 60 * 1000)

// Prevent interval from keeping Node alive
if (typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref()
}