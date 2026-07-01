import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}
const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

export interface SessionPayload {
  userId: number;
  role: 'admin' | 'student';
  username: string;
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  return await decrypt(sessionToken);
}

export async function createSession(payload: SessionPayload) {
  const sessionToken = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 // 1 day
  });
}

export async function createExamSession(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set('exam_session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 4 // 4 hours
  });
}

export async function clearExamSession() {
  const cookieStore = await cookies();
  cookieStore.delete('exam_session_id');
}

export async function getExamSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('exam_session_id')?.value || null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  cookieStore.delete('exam_session_id');
}
