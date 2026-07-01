import { getDb } from '@/lib/db';
import { getSession, getExamSession } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit';
import { processExamSubmission } from '@/lib/exam-logic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'student') return errorResponse('Unauthorized', 401);

  const params = await props.params;
  const assessmentId = params.id;

  try {
    const db = await getDb();
    
    // 1. Fetch Session and Assessment Data
    const assessment = await db.get(`
      SELECT id, title, duration, randomize_questions, randomize_options, is_published 
      FROM assessments WHERE id = ?
    `, [assessmentId]);
    
    if (!assessment) return errorResponse('Assessment not found', 404);

    if (assessment.is_published !== 1) {
      return errorResponse('This assessment is not published yet.', 403);
    }

    if (assessment.duration <= 0) {
      return errorResponse('Invalid exam duration configuration.', 400);
    }

    const attendance = await db.get(`
      SELECT status, startTime, sessionId 
      FROM attendance WHERE studentId = ? AND examId = ?
    `, [session.userId, assessmentId]);

    if (!attendance) return errorResponse('Exam session not initialized correctly', 403);

    // 2. Session Locking Check
    const cookieSessionId = await getExamSession();
    if (attendance.sessionId !== cookieSessionId) {
      return errorResponse('Session lock mismatch. Please re-authenticate.', 403);
    }

    // 3. Termination / Completion Check
    if (attendance.status === 'completed' || attendance.status === 'terminated') {
      return errorResponse(`Exam session already finalized. Status: ${attendance.status}`, 403);
    }

    // 4. Timer Enforcement (Server-Side)
    const startTimeDate = new Date(attendance.startTime);
    const endTimeDate = new Date(startTimeDate.getTime() + assessment.duration * 60 * 1000);
    const now = new Date();

    if (now > endTimeDate) {
      // Auto-Submit on Expiry
      await processExamSubmission(session.userId, Number(assessmentId), {}, 0, 'timer_expired');
      await logAuditEvent(session.userId, 'exam_auto_submit', { examId: assessmentId, reason: 'timer_expired' });
      return errorResponse('Time limit reached. Exam auto-submitted.', 403);
    }

    // 5. Fetch Questions (Securely)
    const questions = await db.all(`
      SELECT q.id, q.questionText, q.options 
      FROM questions q
      JOIN assessment_questions aq ON q.id = aq.question_id
      WHERE aq.assessment_id = ?
    `, [assessmentId]);

    if (!questions || questions.length === 0) {
      return errorResponse('No questions have been linked to this assessment yet.', 400);
    }

    // Parse options and randomize if required
    questions.forEach(q => {
      try {
        q.options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      } catch (e) {
        console.error(`Error parsing options for question ${q.id}:`, e);
        q.options = [];
      }
      
      if (assessment.randomize_options && Array.isArray(q.options)) {
        q.options.sort(() => Math.random() - 0.5);
      }
    });

    if (assessment.randomize_questions) {
      questions.sort(() => Math.random() - 0.5);
    }

    await logAuditEvent(session.userId, 'questions_fetch', { examId: assessmentId });

    const remainingSeconds = Math.max(0, Math.floor((endTimeDate.getTime() - now.getTime()) / 1000));

    return successResponse({ 
      assessment: { ...assessment, durationSeconds: remainingSeconds }, 
      questions,
      status: attendance.status 
    });

  } catch (err) {
    console.error('Fetch exam data error:', err);
    return errorResponse('Internal server error', 500);
  }
}
