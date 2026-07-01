import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { questionSchema } from '@/lib/validation';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const db = await getDb();
    const questions = await db.all('SELECT * FROM questions ORDER BY id DESC');
    
    // Parse JSON options for frontend convenience
    const formatted = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    return successResponse(formatted);
  } catch (error) {
    console.error('Fetch questions error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const validation = questionSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse(validation.error.issues[0]?.message || 'Validation failed', 400);
    }

    const { questionText, category, topic, options, correctAnswer, explanation } = validation.data;
    let { difficulty } = validation.data;
    difficulty = (difficulty.toLowerCase() as 'easy' | 'medium' | 'hard');

    const db = await getDb();
    const result = await db.run(
      `INSERT INTO questions (questionText, category, topic, difficulty, options, correctAnswer, explanation, createdBy) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [questionText, category, topic, difficulty, JSON.stringify(options), correctAnswer, explanation || '', session.userId]
    );

    await logAuditEvent(session.userId, 'question_created', { questionId: result.lastID });

    return successResponse({ message: 'Question created successfully', id: result.lastID }, 201);
  } catch (error) {
    console.error('Create question error:', error);
    return errorResponse('Internal server error', 500);
  }
}
