import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Validate Input (Strict complexity rules via Zod)
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { name, username, password, role } = validation.data;

    const db = await getDb();
    
    // 2. Check Existence
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return errorResponse('Username already exists', 409);
    }

    // 3. Hash and Store
    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, username, password_hash, role]
    );

    const userId = result.lastID!;
    
    // 4. Audit Log
    await logAuditEvent(userId, 'user_registration', { username, role });

    // 5. Automatically log them in
    await createSession({ userId, username, role });

    return successResponse({ message: 'User registered successfully', role }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Internal server error', 500);
  }
}
