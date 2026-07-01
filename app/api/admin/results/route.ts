import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return errorResponse('Unauthorized', 401);

  try {
    const db = await getDb();
    
    const assessments = await db.all(`
      SELECT
        a.id,
        a.title,
        a.exam_code,
        a.is_published,
        (SELECT COUNT(*) FROM attendance att WHERE att.examId = a.id) as total_attendance,
        (SELECT COUNT(*) FROM responses r WHERE r.examId = a.id) as total_completed,
        (SELECT AVG(score) FROM responses r WHERE r.examId = a.id) as avg_score,
        (SELECT MAX(score) FROM responses r WHERE r.examId = a.id) as max_score
      FROM assessments a
      ORDER BY a.id DESC
    `);

    return successResponse(assessments);
  } catch (error) {
    console.error('Fetch results error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return errorResponse('Unauthorized', 401);

  try {
    const { assessmentId, is_published } = await request.json();
    const db = await getDb();
    
    await db.run('UPDATE assessments SET is_published = ? WHERE id = ?', [is_published ? 1 : 0, assessmentId]);

    await logAuditEvent(session.userId, 'result_publication_toggle', { assessmentId, is_published });

    return successResponse({ message: 'Result publication status updated' });
  } catch (error) {
    console.error('Publish toggle error:', error);
    return errorResponse('Failed to update publication status', 500);
  }
}
