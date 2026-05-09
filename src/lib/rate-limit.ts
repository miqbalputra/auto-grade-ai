type Bucket = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, Bucket>();
const LIMIT = 10;
const WINDOW_MS = 15 * 60 * 1000;

export function checkLoginRateLimit(ip: string) {
  const now = Date.now();
  const bucket = attempts.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT };
  }

  return {
    allowed: bucket.count < LIMIT,
    remaining: Math.max(0, LIMIT - bucket.count),
    resetAt: bucket.resetAt
  };
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  const bucket = attempts.get(ip) ?? { count: 0, resetAt: now + WINDOW_MS };
  bucket.count += 1;
  attempts.set(ip, bucket);
}

export function clearFailedLogins(ip: string) {
  attempts.delete(ip);
}
