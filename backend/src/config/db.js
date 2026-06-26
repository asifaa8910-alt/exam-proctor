import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../database/database.sqlite');

let dbConnection = null;

export async function getDb() {
  if (dbConnection) return dbConnection;

  dbConnection = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  return dbConnection;
}

export async function initDb() {
  const db = await getDb();

  // Create Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      examinerId TEXT -- For students: their examiner's ID. For examiners: their own examiner ID.
    )
  `);

  // Create Exams Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      duration INTEGER NOT NULL,
      totalMarks INTEGER NOT NULL,
      status TEXT NOT NULL,
      createdBy TEXT NOT NULL,
      scheduledDate TEXT NOT NULL,
      assignedStudents TEXT NOT NULL, -- JSON stringified array
      resultsPublished INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
      questions TEXT NOT NULL, -- JSON stringified array
      examinerId TEXT NOT NULL -- Isolated to examiner
    )
  `);

  // Create Submissions Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      examId TEXT NOT NULL,
      studentId TEXT NOT NULL,
      answers TEXT NOT NULL, -- JSON stringified object
      tabSwitches INTEGER NOT NULL DEFAULT 0,
      webcamSnapshots TEXT NOT NULL, -- JSON stringified array
      submittedAt TEXT NOT NULL,
      grades TEXT NOT NULL, -- JSON stringified object
      totalScore INTEGER NOT NULL DEFAULT 0,
      isGraded INTEGER NOT NULL DEFAULT 0 -- 0 for false, 1 for true
    )
  `);

  // Create Settings Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create Audit Logs Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      userEmail TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL
    )
  `);

  // Seed default settings if empty
  const settingsCount = await db.get('SELECT COUNT(*) as count FROM settings');
  if (settingsCount.count === 0) {
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['allow_student_registration', 'true']);
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['proctoring_enabled', 'true']);
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['max_tab_switches', '3']);
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['announcement_banner', 'Welcome to ExamProctor! Global midterms are active.']);
  }

  // Seed default data if users table is empty
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log('Seeding database with default mock data...');

    // Hash passwords
    const superadminHash = await bcrypt.hash('super123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);
    const studentHash = await bcrypt.hash('student123', 10);

    // Insert Users
    const mockUsers = [
      { id: 'super1', name: 'Super Admin', email: 'super@exam.com', password: superadminHash, role: 'superadmin', examinerId: null },
      { id: 'exm_sharma', name: 'Dr. Sharma', email: 'admin@exam.com', password: adminHash, role: 'examiner', examinerId: 'EXM-SHARMA' },
      { id: 'exm_kelly', name: 'Prof. Kelly', email: 'kelly@exam.com', password: studentHash, role: 'examiner', examinerId: 'EXM-KELLY' },
      { id: 'stu1', name: 'Asif Ahmed', email: 'asif@student.com', password: studentHash, role: 'student', examinerId: 'EXM-SHARMA' },
      { id: 'stu2', name: 'Priya Patel', email: 'priya@student.com', password: studentHash, role: 'student', examinerId: 'EXM-SHARMA' },
      { id: 'stu3', name: 'Rahul Kumar', email: 'rahul@student.com', password: studentHash, role: 'student', examinerId: 'EXM-KELLY' },
      { id: 'stu4', name: 'Sneha Reddy', email: 'sneha@student.com', password: studentHash, role: 'student', examinerId: 'EXM-KELLY' },
    ];

    for (const u of mockUsers) {
      await db.run(
        'INSERT INTO users (id, name, email, password, role, examinerId) VALUES (?, ?, ?, ?, ?, ?)',
        [u.id, u.name, u.email, u.password, u.role, u.examinerId]
      );
    }

    // Insert Exams
    const mockExams = [
      {
        id: 'exam1',
        title: 'Data Structures & Algorithms',
        subject: 'Computer Science',
        duration: 60,
        totalMarks: 50,
        status: 'published',
        createdBy: 'exm_sharma',
        scheduledDate: '2026-03-10T10:00:00',
        assignedStudents: JSON.stringify(['stu1', 'stu2']),
        resultsPublished: 0,
        questions: JSON.stringify([
          { id: 'q1', type: 'mcq', marks: 5, text: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctAnswer: 1 },
          { id: 'q2', type: 'mcq', marks: 5, text: 'Which data structure uses FIFO principle?', options: ['Stack', 'Queue', 'Tree', 'Graph'], correctAnswer: 1 },
          { id: 'q3', type: 'mcq', marks: 5, text: 'What is the worst-case time complexity of quicksort?', options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], correctAnswer: 2 },
          { id: 'q4', type: 'mcq', marks: 5, text: 'Which traversal visits the root node first?', options: ['Inorder', 'Preorder', 'Postorder', 'Level order'], correctAnswer: 1 },
          { id: 'q5', type: 'subjective', marks: 10, text: 'Explain the difference between a stack and a queue with real-world examples.' },
          { id: 'q6', type: 'mcq', marks: 5, text: 'Which sorting algorithm has the best average-case performance?', options: ['Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort'], correctAnswer: 2 },
          { id: 'q7', type: 'subjective', marks: 10, text: 'Write the algorithm for inserting a node at the end of a singly linked list. Explain each step.' },
          { id: 'q8', type: 'mcq', marks: 5, text: 'A complete binary tree with n nodes has height:', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(√n)'], correctAnswer: 1 }
        ]),
        examinerId: 'EXM-SHARMA'
      },
      {
        id: 'exam2',
        title: 'Database Management Systems',
        subject: 'Computer Science',
        duration: 45,
        totalMarks: 40,
        status: 'published',
        createdBy: 'exm_sharma',
        scheduledDate: '2026-03-15T14:00:00',
        assignedStudents: JSON.stringify(['stu1', 'stu2']),
        resultsPublished: 0,
        questions: JSON.stringify([
          { id: 'q1', type: 'mcq', marks: 5, text: 'Which normal form eliminates transitive dependency?', options: ['1NF', '2NF', '3NF', 'BCNF'], correctAnswer: 2 },
          { id: 'q2', type: 'mcq', marks: 5, text: 'SQL stands for:', options: ['Structured Query Language', 'Sequential Query Language', 'Standard Query Logic', 'Simple Query Language'], correctAnswer: 0 },
          { id: 'q3', type: 'mcq', marks: 5, text: 'Which command is used to remove a table from the database?', options: ['DELETE', 'REMOVE', 'DROP', 'TRUNCATE'], correctAnswer: 2 },
          { id: 'q4', type: 'subjective', marks: 10, text: 'Explain the ACID properties of a transaction with examples.' },
          { id: 'q5', type: 'mcq', marks: 5, text: 'Which join returns all rows from both tables?', options: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'], correctAnswer: 3 },
          { id: 'q6', type: 'subjective', marks: 10, text: 'What is normalization? Explain 1NF, 2NF, and 3NF with examples.' }
        ]),
        examinerId: 'EXM-SHARMA'
      },
      {
        id: 'exam3',
        title: 'Operating Systems',
        subject: 'Computer Science',
        duration: 30,
        totalMarks: 30,
        status: 'completed',
        createdBy: 'exm_kelly',
        scheduledDate: '2026-02-20T09:00:00',
        assignedStudents: JSON.stringify(['stu3', 'stu4']),
        resultsPublished: 1,
        questions: JSON.stringify([
          { id: 'q1', type: 'mcq', marks: 5, text: 'Which scheduling algorithm gives minimum average waiting time?', options: ['FCFS', 'SJF', 'Round Robin', 'Priority'], correctAnswer: 1 },
          { id: 'q2', type: 'mcq', marks: 5, text: 'Deadlock occurs when all four conditions hold. Which is NOT one of them?', options: ['Mutual Exclusion', 'Hold and Wait', 'Preemption', 'Circular Wait'], correctAnswer: 2 },
          { id: 'q3', type: 'subjective', marks: 10, text: 'Explain the concept of virtual memory and how paging works.' },
          { id: 'q4', type: 'mcq', marks: 5, text: 'Which memory allocation strategy results in external fragmentation?', options: ['Paging', 'Segmentation', 'Both', 'Neither'], correctAnswer: 1 },
          { id: 'q5', type: 'mcq', marks: 5, text: 'A semaphore is used for:', options: ['Memory allocation', 'Process synchronization', 'Disk scheduling', 'File management'], correctAnswer: 1 }
        ]),
        examinerId: 'EXM-KELLY'
      }
    ];

    for (const e of mockExams) {
      await db.run(
        'INSERT INTO exams (id, title, subject, duration, totalMarks, status, createdBy, scheduledDate, assignedStudents, resultsPublished, questions, examinerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [e.id, e.title, e.subject, e.duration, e.totalMarks, e.status, e.createdBy, e.scheduledDate, e.assignedStudents, e.resultsPublished, e.questions, e.examinerId]
      );
    }

    // Insert Submissions
    const mockSubmissions = [
      {
        id: 'sub1',
        examId: 'exam3',
        studentId: 'stu3',
        answers: JSON.stringify({ q1: 1, q2: 2, q3: 'Virtual memory is a memory management technique that creates an illusion of a large contiguous block of memory. Paging divides both physical and logical memory into fixed-size blocks called frames and pages respectively.', q4: 1, q5: 1 }),
        tabSwitches: 2,
        webcamSnapshots: JSON.stringify([]),
        submittedAt: '2026-02-20T09:28:00',
        grades: JSON.stringify({ q1: 5, q2: 5, q3: 8, q4: 5, q5: 5 }),
        totalScore: 28,
        isGraded: 1
      },
      {
        id: 'sub2',
        examId: 'exam3',
        studentId: 'stu4',
        answers: JSON.stringify({ q1: 1, q2: 0, q3: 'Virtual memory uses disk space to extend physical memory. Paging splits memory into pages.', q4: 0, q5: 1 }),
        tabSwitches: 5,
        webcamSnapshots: JSON.stringify([]),
        submittedAt: '2026-02-20T09:30:00',
        grades: JSON.stringify({ q1: 5, q2: 0, q3: 5, q4: 0, q5: 5 }),
        totalScore: 15,
        isGraded: 1
      }
    ];

    for (const s of mockSubmissions) {
      await db.run(
        'INSERT INTO submissions (id, examId, studentId, answers, tabSwitches, webcamSnapshots, submittedAt, grades, totalScore, isGraded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.examId, s.studentId, s.answers, s.tabSwitches, s.webcamSnapshots, s.submittedAt, s.grades, s.totalScore, s.isGraded]
      );
    }

    console.log('Seeding completed.');
  }
}

export async function addAuditLog(userEmail, action, details) {
  try {
    const db = await getDb();
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await db.run(
      'INSERT INTO audit_logs (id, timestamp, userEmail, action, details) VALUES (?, ?, ?, ?, ?)',
      [id, new Date().toISOString(), userEmail || 'unknown', action, details]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export async function resetDbToDefaults() {
  const db = await getDb();
  await db.exec('DROP TABLE IF EXISTS users');
  await db.exec('DROP TABLE IF EXISTS exams');
  await db.exec('DROP TABLE IF EXISTS submissions');
  await db.exec('DROP TABLE IF EXISTS settings');
  await db.exec('DROP TABLE IF EXISTS audit_logs');
  await initDb();
  await addAuditLog('SYSTEM', 'RESET_DATABASE', 'The system database has been reset to defaults by the Super Admin.');
}
