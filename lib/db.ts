import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

const globalForDb = globalThis as unknown as {
  db: Database | null;
};

export async function getDb(): Promise<Database> {
  if (globalForDb.db) return globalForDb.db;

  const dbPath = path.resolve(process.cwd(), 'database.sqlite');
  
  globalForDb.db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Automatically initialize/migrate on first connection
  await initDb();

  return globalForDb.db;
}

export async function initDb() {
  const database = await getDb();
  
  // Core Tables
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'student')) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      questionText TEXT NOT NULL,
      category TEXT NOT NULL,
      topic TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      options TEXT NOT NULL, -- JSON array of options
      correctAnswer TEXT NOT NULL,
      explanation TEXT,
      createdBy INTEGER NOT NULL,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      duration INTEGER NOT NULL, -- in minutes
      num_questions INTEGER NOT NULL,
      category TEXT NOT NULL,
      randomize_questions INTEGER DEFAULT 0, -- boolean
      randomize_options INTEGER DEFAULT 0, -- boolean
      exam_code TEXT UNIQUE NOT NULL,
      createdBy INTEGER NOT NULL,
      is_published INTEGER DEFAULT 0, -- boolean
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assessment_questions (
      assessment_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      PRIMARY KEY (assessment_id, question_id),
      FOREIGN KEY (assessment_id) REFERENCES assessments(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      examId INTEGER NOT NULL,
      startTime DATETIME,
      sessionId TEXT,
      status TEXT CHECK(status IN ('started', 'completed', 'terminated')) NOT NULL,
      FOREIGN KEY (studentId) REFERENCES users(id),
      FOREIGN KEY (examId) REFERENCES assessments(id)
    );

    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      examId INTEGER NOT NULL,
      violation_type TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studentId) REFERENCES users(id),
      FOREIGN KEY (examId) REFERENCES assessments(id)
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      examId INTEGER NOT NULL,
      score INTEGER,
      total_questions INTEGER,
      correct_answers INTEGER,
      time_taken INTEGER, -- in seconds
      answers_payload TEXT, -- JSON mapping of questionId to answer
      submission_type TEXT CHECK(submission_type IN ('manual', 'timer_expired', 'violation_terminated')),
      submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studentId) REFERENCES users(id),
      FOREIGN KEY (examId) REFERENCES assessments(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      action TEXT NOT NULL,
      metadata TEXT, -- JSON
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_responses_user_exam ON responses(studentId, examId);
    CREATE INDEX IF NOT EXISTS idx_violations_user_exam ON violations(studentId, examId);
    CREATE INDEX IF NOT EXISTS idx_attendance_user_exam ON attendance(studentId, examId);
  `);

  // Migration logic for existing tables
  try {
    // Check for sessionId in attendance
    const attendanceColumns = await database.all("PRAGMA table_info(attendance)");
    if (!attendanceColumns.find(c => c.name === 'sessionId')) {
      await database.exec("ALTER TABLE attendance ADD COLUMN sessionId TEXT");
    }
    if (!attendanceColumns.find(c => c.name === 'startTime')) {
      await database.exec("ALTER TABLE attendance ADD COLUMN startTime DATETIME");
    }

    // Check for submission_type in responses
    const responsesColumns = await database.all("PRAGMA table_info(responses)");
    if (!responsesColumns.find(c => c.name === 'submission_type')) {
      await database.exec("ALTER TABLE responses ADD COLUMN submission_type TEXT");
    }

    // Migrate attendance table if it doesn't allow 'terminated' check constraint
    const schemaRow = await database.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance'");
    if (schemaRow && !schemaRow.sql.includes('terminated')) {
      console.log("Migrating attendance table to support 'terminated' status check constraint...");
      await database.exec(`
        PRAGMA foreign_keys=OFF;
        CREATE TABLE attendance_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          studentId INTEGER NOT NULL,
          examId INTEGER NOT NULL,
          startTime DATETIME,
          sessionId TEXT,
          status TEXT CHECK(status IN ('started', 'completed', 'terminated')) NOT NULL,
          FOREIGN KEY (studentId) REFERENCES users(id),
          FOREIGN KEY (examId) REFERENCES assessments(id)
        );
        INSERT INTO attendance_new (id, studentId, examId, startTime, sessionId, status)
        SELECT id, studentId, examId, startTime, sessionId, status FROM attendance;
        DROP TABLE attendance;
        ALTER TABLE attendance_new RENAME TO attendance;
        PRAGMA foreign_keys=ON;
      `);
      console.log("Attendance table migration completed.");
    }
  } catch (err) {
    console.error("Migration error (non-fatal):", err);
  }

  console.log("Database initialized with modern schemas");
}
