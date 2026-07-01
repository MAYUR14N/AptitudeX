import { NextResponse } from 'next/server';

/**
 * Standard API Response Structure
 */
export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * In-Memory Rate Limiter (Map-based)
 * Reset on server restart (as per requirements)
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 10; // 10 requests
const WINDOW = 1000; // 1 second

export function isRateLimited(userId: string | number): boolean {
  const now = Date.now();
  const key = userId.toString();
  const userData = rateLimitMap.get(key);

  if (!userData || now - userData.lastReset > WINDOW) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return false;
  }

  userData.count += 1;
  if (userData.count > LIMIT) {
    return true;
  }

  return false;
}
