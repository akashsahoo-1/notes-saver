const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function checkRateLimit(userId: string): boolean {
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;
  
  const now = Date.now();
  const userData = rateLimitMap.get(userId);

  if (!userData) {
    rateLimitMap.set(userId, { count: 1, timestamp: now });
    return true;
  }

  if (now - userData.timestamp > windowMs) {
    rateLimitMap.set(userId, { count: 1, timestamp: now });
    return true;
  }

  if (userData.count >= maxRequests) {
    return false;
  }

  userData.count += 1;
  return true;
}
