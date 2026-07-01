import { getDb } from '@/lib/db';
import { getSession, createExamSession } from '@/lib/auth';
import { validateCodeSchema } from '@/lib/validation';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit';
import crypto from 'crypto';

export async function POST(request: Request) {
  const session = await getSession();
  
  if (!session || session.role !== 'student') {
    return errorResponse('Unauthorized access. Only students can take exams.', 401);
  }

  try {
    const body = await request.json();
    const validation = validateCodeSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { examCode } = validation.data;

    const db = await getDb();
    const assessment = await db.get('SELECT id, duration, is_published FROM assessments WHERE exam_code = ?', [examCode]);

    if (!assessment) {
      return errorResponse('Invalid exam code. Please check and try again.', 404);
    }

    if (assessment.is_published !== 1) {
      return errorResponse('This assessment is not published yet.', 403);
    }

    if (assessment.duration <= 0) {
      return errorResponse('Invalid exam duration configuration.', 400);
    }

    const questionCount = await db.get('SELECT COUNT(*) as count FROM assessment_questions WHERE assessment_id = ?', [assessment.id]);
    if (!questionCount || questionCount.count === 0) {
      return errorResponse('No questions have been linked to this assessment yet.', 400);
    }

    // Check existing attendance / responses
    const existingAttendance = await db.get(
      'SELECT id, status, sessionId FROM attendance WHERE studentId = ? AND examId = ?', 
      [session.userId, assessment.id]
    );

    if (existingAttendance && (existingAttendance.status === 'completed' || existingAttendance.status === 'terminated')) {
      return errorResponse(`You cannot enter this exam. Status: ${existingAttendance.status}`, 403);
    }

    // Generate or fetch Session ID
    let sessionId = existingAttendance?.sessionId;
    
    if (!existingAttendance) {
      sessionId = crypto.randomUUID();
      const startTime = new Date().toISOString();
      
      // Mark attendance as starting with session lock and start time
      await db.run(
        'INSERT INTO attendance (studentId, examId, status, sessionId, startTime) VALUES (?, ?, ?, ?, ?)', 
        [session.userId, assessment.id, 'started', sessionId, startTime]
      );
      
      await logAuditEvent(session.userId, 'exam_start', { examId: assessment.id, examCode });
    } else if (!sessionId) {
      // Recovery for legacy data if any
      sessionId = crypto.randomUUID();
      await db.run('UPDATE attendance SET sessionId = ? WHERE id = ?', [sessionId, existingAttendance.id]);
    }

    // Set HttpOnly Cookie for Session Locking
    await createExamSession(sessionId);

    return successResponse({ message: 'Exam validated successfully', assessmentId: assessment.id });

  } catch (error) {
    console.error('Exam validation error:', error);
    return errorResponse('Internal server error while validating exam code', 500);
  }
}
