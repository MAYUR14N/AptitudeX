import { getDb } from '@/lib/db';
import { getSession, getExamSession } from '@/lib/auth';
import { violationSchema } from '@/lib/validation';
import { successResponse, errorResponse, isRateLimited } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit';
import { processExamSubmission } from '@/lib/exam-logic';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return errorResponse('Unauthorized', 401);
  }

  // Rate Limiting
  if (isRateLimited(session.userId)) {
    return errorResponse('Too many requests', 429);
  }

  try {
    const body = await request.json();
    const validation = violationSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { examId, violationType, timestamp } = validation.data;
    const db = await getDb();

    // 1. Session Lock Validation
    const currentSessionId = await getExamSession();
    const attendance = await db.get('SELECT sessionId, status FROM attendance WHERE studentId = ? AND examId = ?', [session.userId, examId]);
    
    if (!attendance || attendance.sessionId !== currentSessionId) {
       await logAuditEvent(session.userId, 'security_breach_attempt', { examId, reason: 'Session mismatch or missing' });
       return errorResponse('Session mismatch. Exam terminated.', 403);
    }

    if (attendance.status !== 'started') {
       return errorResponse('Exam is not in a valid state.', 403);
    }
    
    // 2. Prevent duplicate rapid violations (within 2 seconds)
    const lastViolation = await db.get(
      `SELECT timestamp FROM violations WHERE studentId = ? AND examId = ? AND violation_type = ? ORDER BY id DESC LIMIT 1`,
      [session.userId, examId, violationType]
    );

    if (lastViolation) {
      const lastTime = new Date(lastViolation.timestamp).getTime();
      const currentTime = new Date(timestamp || Date.now()).getTime();
      
      if (currentTime - lastTime <= 2000) {
        return successResponse({ message: 'Duplicate violation ignored', terminated: false });
      }
    }

    // 3. Store the violation
    await db.run(
      `INSERT INTO violations (studentId, examId, violation_type, timestamp) VALUES (?, ?, ?, ?)`,
      [session.userId, examId, violationType, new Date(timestamp || Date.now()).toISOString()]
    );

    // 4. Check Total Violations (Backend Auth)
    const violationCountRow = await db.get(
      'SELECT COUNT(*) as count FROM violations WHERE studentId = ? AND examId = ?',
      [session.userId, examId]
    );
    const count = violationCountRow.count;

    let terminated = false;
    if (count >= 3) {
      terminated = true;
      // Force Submit on 3rd violation
      // Note: We don't have the answers in the violation payload, so we submit with empty or existing (if we had a persistent draft)
      // Since we don't have persistent drafts yet, we'll submit what we can (empty) to fulfill the "termination" requirement.
      await processExamSubmission(session.userId, Number(examId), {}, 0, 'violation_terminated');
      await logAuditEvent(session.userId, 'exam_terminated', { examId, reason: 'violation_limit_reached' });
    } else {
      await logAuditEvent(session.userId, 'violation_recorded', { examId, violationType });
    }

    return successResponse({ 
      message: terminated ? 'Exam terminated due to multiple violations' : 'Violation recorded',
      violationCount: count,
      terminated
    }, 201);

  } catch (error) {
    console.error('Record violation error:', error);
    return errorResponse('Internal server error', 500);
  }
}
