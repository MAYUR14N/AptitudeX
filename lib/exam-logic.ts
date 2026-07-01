import { getDb } from './db';
import { logAuditEvent } from './audit';

/**
 * Shared logic to process and store an exam response.
 * Handles grading and database persistence.
 */
export async function processExamSubmission(
  studentId: number,
  examId: number,
  answers: Record<string, string>,
  timeTaken: number,
  submissionType: 'manual' | 'timer_expired' | 'violation_terminated'
) {
  const db = await getDb();

  // 1. Check if already submitted (Idempotency)
  const existing = await db.get('SELECT id FROM responses WHERE studentId = ? AND examId = ?', [studentId, examId]);
  if (existing) return { alreadySubmitted: true };

  // 2. Grade Exam
  const questionsAndTruth = await db.all(`
    SELECT q.id, q.correctAnswer
    FROM questions q
    JOIN assessment_questions aq ON q.id = aq.question_id
    WHERE aq.assessment_id = ?
  `, [examId]);

  let correct_answers = 0;
  const total_questions = questionsAndTruth.length;

  for (const qa of questionsAndTruth) {
    if (answers[qa.id.toString()] === qa.correctAnswer) {
      correct_answers++;
    }
  }

  const score = correct_answers;

  // 3. Store Response
  await db.run(
    'INSERT INTO responses (studentId, examId, score, total_questions, correct_answers, time_taken, answers_payload, submission_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [studentId, examId, score, total_questions, correct_answers, timeTaken, JSON.stringify(answers), submissionType]
  );

  // 4. Update Attendance
  const newStatus = submissionType === 'violation_terminated' ? 'terminated' : 'completed';
  await db.run('UPDATE attendance SET status = ? WHERE studentId = ? AND examId = ?', [newStatus, studentId, examId]);

  // 5. Audit Log
  await logAuditEvent(studentId, 'exam_submission', { examId, score, total_questions, submissionType });

  return { success: true, score, total_questions };
}
