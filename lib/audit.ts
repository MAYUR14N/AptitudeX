import { getDb } from './db';
import { headers } from 'next/headers';

/**
 * Audit Logging Utility
 */
export async function logAuditEvent(userId: number | null, action: string, metadata: Record<string, unknown> = {}) {
  try {
    const db = await getDb();
    
    // Extract metadata from headers if available
    const headerList = await headers();
    const userAgent = headerList.get('user-agent') || 'unknown';
    const ip = headerList.get('x-forwarded-for') || 'unknown';

    const fullMetadata = {
      ...metadata,
      userAgent,
      ip
    };

    await db.run(
      'INSERT INTO audit_logs (userId, action, metadata, timestamp) VALUES (?, ?, ?, ?)',
      [userId, action, JSON.stringify(fullMetadata), new Date().toISOString()]
    );
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}
