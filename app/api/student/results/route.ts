import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'student') return errorResponse('Unauthorized', 401);

  const db = await getDb();
  
  const results = await db.all(`
    SELECT
      r.id,
      ass.title,
      ass.exam_code,
      r.score,
      r.total_questions,
      r.correct_answers,
      r.time_taken,
      r.submittedAt
    FROM responses r
    JOIN assessments ass ON r.examId = ass.id
    WHERE r.studentId = ? AND ass.is_published = 1
    ORDER BY r.submittedAt DESC
  `, [session.userId]);

  return successResponse({ results });
}

