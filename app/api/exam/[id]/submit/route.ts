import { getDb } from '@/lib/db';
import { getSession, getExamSession } from '@/lib/auth';
import { submitExamSchema } from '@/lib/validation';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { processExamSubmission } from '@/lib/exam-logic';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'student') return errorResponse('Unauthorized', 401);

  try {
    const params = await props.params;
    const assessmentId = params.id;
    const body = await request.json();

    // 1. Validate Input
    const validation = submitExamSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { answers, time_taken } = validation.data;
    const db = await getDb();

    // 2. Session Locking Check
    const cookieSessionId = await getExamSession();
    const attendance = await db.get('SELECT sessionId, status FROM attendance WHERE studentId = ? AND examId = ?', [session.userId, assessmentId]);

    if (!attendance || attendance.sessionId !== cookieSessionId) {
      return errorResponse('Session lock mismatch.', 403);
    }

    // 3. Idempotency Check
    const existing = await db.get('SELECT id, score, total_questions FROM responses WHERE studentId = ? AND examId = ?', [session.userId, assessmentId]);
    if (existing) {
      return successResponse({ message: 'Exam already submitted (Idempotent)', score: existing.score, total: existing.total_questions });
    }

    // 4. Force Termination Check (Backend Authority)
    const violationsRows = await db.get('SELECT COUNT(*) as count FROM violations WHERE studentId = ? AND examId = ?', [session.userId, assessmentId]);
    const violationCount = violationsRows.count;
    
    const submissionType = violationCount >= 3 ? 'violation_terminated' : 'manual';

    // 5. Process Submission (Grading + Saving)
    const result = await processExamSubmission(
      session.userId, 
      Number(assessmentId), 
      answers, 
      time_taken, 
      submissionType
    );

    if (result.alreadySubmitted) {
       return successResponse({ message: 'Already submitted' });
    }

    return successResponse({ 
      message: submissionType === 'violation_terminated' ? 'Exam terminated and submitted due to violations' : 'Exam submitted successfully',
      score: result.score,
      total: result.total_questions
    });

  } catch (error) {
    console.error('Submission error:', error);
    return errorResponse('Internal server error during submission', 500);
  }
}
