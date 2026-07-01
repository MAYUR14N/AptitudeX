import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit';
import { generateExamCode } from '@/lib/utils';
import { assessmentSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    
    // Note: The original logic auto-selects questions based on category, 
    // but the new schema expects questionIds. We'll support both for flexibility.
    const validation = assessmentSchema.partial({ questionIds: true }).safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { title, duration, num_questions, category, randomize_questions, randomize_options, questionIds } = validation.data;

    const db = await getDb();

    // 1. Determine questions to link
    let selectedIds: number[] = [];
    
    if (questionIds && questionIds.length > 0) {
      selectedIds = questionIds.slice(0, num_questions);
    } else {
      const availableQuestions = await db.all('SELECT id FROM questions WHERE category = ?', [category]);
      if (availableQuestions.length < num_questions) {
        return errorResponse(`Not enough questions in bank for ${category}. Available: ${availableQuestions.length}`, 400);
      }
      const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
      selectedIds = shuffled.slice(0, num_questions).map(q => q.id);
    }

    // 2. Generate and Insert Assessment
    const exam_code = generateExamCode();
    const result = await db.run(
      `INSERT INTO assessments (title, duration, num_questions, category, randomize_questions, randomize_options, exam_code, createdBy, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [title, duration, num_questions, category, randomize_questions ? 1 : 0, randomize_options ? 1 : 0, exam_code, session.userId]
    );

    const assessmentId = result.lastID;

    // 3. Link Questions
    for (const qId of selectedIds) {
      await db.run('INSERT INTO assessment_questions (assessment_id, question_id) VALUES (?, ?)', [assessmentId, qId]);
    }

    await logAuditEvent(session.userId, 'assessment_created', { assessmentId, exam_code });

    return successResponse({ message: 'Assessment created successfully', exam_code, id: assessmentId }, 201);
  } catch (error) {
    console.error('Create assessment error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const db = await getDb();
    const assessments = await db.all('SELECT * FROM assessments ORDER BY id DESC');
    return successResponse(assessments);
  } catch (error) {
    console.error('Fetch assessments error:', error);
    return errorResponse('Internal server error', 500);
  }
}
