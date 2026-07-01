import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { successResponse, errorResponse, isRateLimited } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Validate Input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { username, password } = validation.data;

    const db = await getDb();
    const user = await db.get('SELECT id, username, password_hash, role FROM users WHERE username = ?', [username]);

    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    // 2. Check Rate Limit (Generic per user/attempt)
    if (isRateLimited(username)) {
      return errorResponse('Too many requests. Please try again later.', 429);
    }

    // 3. Verify Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse('Invalid credentials', 401);
    }

    // 4. Create Session
    await createSession({ userId: user.id, username: user.username, role: user.role });

    // 5. Audit Log
    await logAuditEvent(user.id, 'user_login', { username: user.username });

    return successResponse({ message: 'Logged in successfully', role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Internal server error', 500);
  }
}
