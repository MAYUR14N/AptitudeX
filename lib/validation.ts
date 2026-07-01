import { z } from 'zod';

/**
 * Authentication Schemas
 */
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(['admin', 'student'])
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

/**
 * Exam Schemas
 */
export const validateCodeSchema = z.object({
  examCode: z.string().min(1, "Exam code is required")
});

export const violationSchema = z.object({
  examId: z.union([z.string(), z.number()]),
  violationType: z.string().min(1, "Violation type is required"),
  timestamp: z.string().optional()
});

export const submitExamSchema = z.object({
  answers: z.record(z.string(), z.string()),
  time_taken: z.number().int().nonnegative()
});

/**
 * Admin Schemas
 */
export const questionSchema = z.object({
  questionText: z.string().min(5),
  category: z.string().min(2),
  topic: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard']),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string().min(1),
  explanation: z.string().optional()
});

export const assessmentSchema = z.object({
  title: z.string().min(3),
  duration: z.number().int().positive(),
  num_questions: z.number().int().positive(),
  category: z.string().min(2),
  randomize_questions: z.boolean().optional().default(false),
  randomize_options: z.boolean().optional().default(false),
  questionIds: z.array(z.number()).min(1)
});
