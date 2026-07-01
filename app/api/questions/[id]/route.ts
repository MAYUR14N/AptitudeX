import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return errorResponse('Unauthorized', 401);
  }

  const params = await props.params;
  const { id } = params;

  try {
    const body = await request.json();
    const { questionText, category, topic, difficulty, options, correctAnswer, explanation } = body;

    if (!questionText || !category || !options || !correctAnswer) {
      return errorResponse('Missing required fields', 400);
    }

    const db = await getDb();
    const result = await db.run(
      `UPDATE questions 
       SET questionText = ?, category = ?, topic = ?, difficulty = ?, options = ?, correctAnswer = ?, explanation = ?
       WHERE id = ?`,
      [questionText, category, topic || 'General', difficulty || 'Medium', JSON.stringify(options), correctAnswer, explanation || '', id]
    );
    
    if (result.changes === 0) {
      return errorResponse('Question not found', 404);
    }

    return successResponse({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Update question error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return errorResponse('Unauthorized', 401);
  }

  const params = await props.params;
  const { id } = params;

  try {
    const db = await getDb();
    
    // First remove references in assessment_questions to avoid constraint errors
    await db.run('DELETE FROM assessment_questions WHERE question_id = ?', [id]);
    
    const result = await db.run('DELETE FROM questions WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return errorResponse('Question not found', 404);
    }

    return successResponse({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    return errorResponse('Internal server error', 500);
  }
}

