import { Router } from 'express';
import { getDb, addAuditLog } from '../config/db.js';
import { authenticateToken, isStaff, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Get exams
router.get('/', authenticateToken, async (req, res) => {
  const db = await getDb();
  try {
    let exams;
    if (req.user.role === 'superadmin') {
      exams = await db.all('SELECT * FROM exams');
    } else if (req.user.role === 'examiner') {
      // Return exams created by this examiner
      exams = await db.all('SELECT * FROM exams WHERE examinerId = ?', [req.user.examinerId]);
    } else {
      // Return exams assigned to this student (and matching their examiner)
      const allExams = await db.all('SELECT * FROM exams WHERE examinerId = ?', [req.user.examinerId]);
      exams = allExams.filter(e => {
        try {
          const assigned = JSON.parse(e.assignedStudents);
          return assigned.includes(req.user.id);
        } catch {
          return false;
        }
      });
    }

    // Format fields back to JSON objects/arrays
    const formattedExams = exams.map(e => ({
      ...e,
      resultsPublished: !!e.resultsPublished,
      assignedStudents: JSON.parse(e.assignedStudents),
      questions: JSON.parse(e.questions)
    }));

    res.json({ exams: formattedExams });
  } catch (error) {
    console.error('Failed to fetch exams:', error);
    res.status(500).json({ error: 'Failed to retrieve exams' });
  }
});

// Create exam (Staff only)
router.post('/', authenticateToken, isStaff, async (req, res) => {
  const { title, subject, duration, totalMarks, scheduledDate, assignedStudents, questions, customExaminerId } = req.body;

  if (!title || !subject || !duration || !totalMarks || !scheduledDate || !assignedStudents || !questions) {
    return res.status(400).json({ error: 'All exam fields are required' });
  }

  const db = await getDb();
  const examId = `exam${Date.now()}`;

  let targetExaminerId = null;

  if (req.user.role === 'superadmin') {
    if (!customExaminerId) {
      return res.status(400).json({ error: 'Super Admin must specify an Examiner ID for the exam' });
    }
    targetExaminerId = customExaminerId;
  } else {
    targetExaminerId = req.user.examinerId;
  }

  try {
    await db.run(
      `INSERT INTO exams (id, title, subject, duration, totalMarks, status, createdBy, scheduledDate, assignedStudents, resultsPublished, questions, examinerId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        examId,
        title,
        subject,
        parseInt(duration),
        parseInt(totalMarks),
        'published',
        req.user.id,
        scheduledDate,
        JSON.stringify(assignedStudents),
        0, // resultsPublished = false
        JSON.stringify(questions),
        targetExaminerId
      ]
    );

    const newExam = {
      id: examId,
      title,
      subject,
      duration: parseInt(duration),
      totalMarks: parseInt(totalMarks),
      status: 'published',
      createdBy: req.user.id,
      scheduledDate,
      assignedStudents,
      resultsPublished: false,
      questions,
      examinerId: targetExaminerId
    };

    await addAuditLog(req.user.email, 'CREATE_EXAM', `Created exam "${title}" (ID: ${examId})`);
    res.status(201).json({ success: true, exam: newExam });
  } catch (error) {
    console.error('Failed to create exam:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

// Delete exam (Staff only)
router.delete('/:id', authenticateToken, isStaff, async (req, res) => {
  const { id } = req.params;
  const db = await getDb();

  try {
    const exam = await db.get('SELECT * FROM exams WHERE id = ?', [id]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Verify owner if not Super Admin
    if (req.user.role !== 'superadmin' && exam.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Unauthorized to delete this exam' });
    }

    await db.run('DELETE FROM exams WHERE id = ?', [id]);
    await db.run('DELETE FROM submissions WHERE examId = ?', [id]); // clean up submissions

    await addAuditLog(req.user.email, 'DELETE_EXAM', `Deleted exam ID: ${id} and all related submissions`);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete exam:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

// Get submissions (Student sees own; Examiner sees their exams' submissions; Super Admin sees all)
router.get('/submissions', authenticateToken, async (req, res) => {
  const db = await getDb();
  try {
    let submissions;
    if (req.user.role === 'superadmin') {
      submissions = await db.all('SELECT * FROM submissions');
    } else if (req.user.role === 'examiner') {
      submissions = await db.all(
        `SELECT s.* FROM submissions s 
         INNER JOIN exams e ON s.examId = e.id 
         WHERE e.examinerId = ?`,
        [req.user.examinerId]
      );
    } else {
      submissions = await db.all('SELECT * FROM submissions WHERE studentId = ?', [req.user.id]);
    }

    const formatted = submissions.map(s => ({
      ...s,
      answers: JSON.parse(s.answers),
      webcamSnapshots: JSON.parse(s.webcamSnapshots),
      grades: JSON.parse(s.grades),
      isGraded: !!s.isGraded
    }));

    res.json({ submissions: formatted });
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    res.status(500).json({ error: 'Failed to retrieve submissions' });
  }
});

// Submit exam (Student only)
router.post('/:examId/submit', authenticateToken, async (req, res) => {
  const { examId } = req.params;
  const { answers, tabSwitches, webcamSnapshots } = req.body;

  if (!answers) {
    return res.status(400).json({ error: 'Answers are required' });
  }

  const db = await getDb();

  try {
    // Get exam
    const examRaw = await db.get('SELECT * FROM exams WHERE id = ?', [examId]);
    if (!examRaw) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const examQuestions = JSON.parse(examRaw.questions);
    
    // Auto-grade MCQs
    const grades = {};
    let totalScore = 0;
    let allGraded = true;

    examQuestions.forEach(q => {
      if (q.type === 'mcq') {
        const isCorrect = answers[q.id] === q.correctAnswer;
        grades[q.id] = isCorrect ? q.marks : 0;
        totalScore += grades[q.id];
      } else {
        // Subjective requires manual grading
        grades[q.id] = null;
        allGraded = false;
      }
    });

    const submissionId = `sub${Date.now()}`;
    const submittedAt = new Date().toISOString();

    await db.run(
      `INSERT INTO submissions (id, examId, studentId, answers, tabSwitches, webcamSnapshots, submittedAt, grades, totalScore, isGraded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        submissionId,
        examId,
        req.user.id,
        JSON.stringify(answers),
        tabSwitches || 0,
        JSON.stringify(webcamSnapshots || []),
        submittedAt,
        JSON.stringify(grades),
        totalScore,
        allGraded ? 1 : 0
      ]
    );

    const newSubmission = {
      id: submissionId,
      examId,
      studentId: req.user.id,
      answers,
      tabSwitches: tabSwitches || 0,
      webcamSnapshots: webcamSnapshots || [],
      submittedAt,
      grades,
      totalScore,
      isGraded: allGraded
    };

    await addAuditLog(req.user.email, 'SUBMIT_EXAM', `Submitted exam ID: ${examId} with ${tabSwitches || 0} tab switches`);
    res.status(201).json({ success: true, submission: newSubmission });
  } catch (error) {
    console.error('Failed to submit exam:', error);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

// Grade subjective answer (Staff only)
router.post('/submissions/:submissionId/grade', authenticateToken, isStaff, async (req, res) => {
  const { submissionId } = req.params;
  const { gradesMap } = req.body;

  if (!gradesMap) {
    return res.status(400).json({ error: 'Grades map is required' });
  }

  const db = await getDb();

  try {
    const subRaw = await db.get('SELECT * FROM submissions WHERE id = ?', [submissionId]);
    if (!subRaw) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const examRaw = await db.get('SELECT * FROM exams WHERE id = ?', [subRaw.examId]);
    if (!examRaw) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Verify ownership if examiner
    if (req.user.role !== 'superadmin' && examRaw.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Unauthorized to grade this exam' });
    }

    const examQuestions = JSON.parse(examRaw.questions);
    const updatedGrades = JSON.parse(subRaw.grades);

    // Apply grades Map
    Object.entries(gradesMap).forEach(([qId, marks]) => {
      updatedGrades[qId] = parseInt(marks);
    });

    // Recalculate totalScore and verify if completely graded
    const totalScore = Object.values(updatedGrades).reduce((sum, g) => sum + (g || 0), 0);
    const allGraded = examQuestions.every(q => updatedGrades[q.id] !== null && updatedGrades[q.id] !== undefined);

    await db.run(
      'UPDATE submissions SET grades = ?, totalScore = ?, isGraded = ? WHERE id = ?',
      [JSON.stringify(updatedGrades), totalScore, allGraded ? 1 : 0, submissionId]
    );

    const updatedSubmission = {
      id: subRaw.id,
      examId: subRaw.examId,
      studentId: subRaw.studentId,
      answers: JSON.parse(subRaw.answers),
      tabSwitches: subRaw.tabSwitches,
      webcamSnapshots: JSON.parse(subRaw.webcamSnapshots),
      submittedAt: subRaw.submittedAt,
      grades: updatedGrades,
      totalScore,
      isGraded: allGraded
    };

    await addAuditLog(req.user.email, 'GRADE_EXAM', `Graded student submission ID: ${submissionId} (Score: ${totalScore})`);
    res.json({ success: true, submission: updatedSubmission });
  } catch (error) {
    console.error('Failed to grade submission:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

// Toggle publish results (Staff only)
router.post('/:examId/toggle-publish', authenticateToken, isStaff, async (req, res) => {
  const { examId } = req.params;
  const db = await getDb();

  try {
    const exam = await db.get('SELECT resultsPublished, examinerId FROM exams WHERE id = ?', [examId]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user.role !== 'superadmin' && exam.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Unauthorized to publish results for this exam' });
    }

    const newPublishState = exam.resultsPublished === 1 ? 0 : 1;
    await db.run('UPDATE exams SET resultsPublished = ? WHERE id = ?', [newPublishState, examId]);

    await addAuditLog(req.user.email, 'PUBLISH_RESULTS', `${newPublishState === 1 ? 'Published' : 'Unpublished'} results for exam ID: ${examId}`);
    res.json({ success: true, resultsPublished: newPublishState === 1 });
  } catch (error) {
    console.error('Failed to toggle publish status:', error);
    res.status(500).json({ error: 'Failed to toggle publication status' });
  }
});

// Assign student to exam (Staff only)
router.post('/:examId/assign', authenticateToken, isStaff, async (req, res) => {
  const { examId } = req.params;
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ error: 'studentIds array is required' });
  }

  const db = await getDb();

  try {
    const exam = await db.get('SELECT assignedStudents, examinerId FROM exams WHERE id = ?', [examId]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user.role !== 'superadmin' && exam.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Unauthorized to assign students to this exam' });
    }

    // Verify that students belong to this examiner if not superadmin
    if (req.user.role !== 'superadmin') {
      for (const sid of studentIds) {
        const student = await db.get('SELECT examinerId FROM users WHERE id = ? AND role = ?', [sid, 'student']);
        if (!student || student.examinerId !== req.user.examinerId) {
          return res.status(403).json({ error: `Cannot assign student ${sid} as they belong to a different examiner` });
        }
      }
    }

    const currentAssigned = JSON.parse(exam.assignedStudents);
    const updatedAssigned = [...new Set([...currentAssigned, ...studentIds])];

    await db.run('UPDATE exams SET assignedStudents = ? WHERE id = ?', [JSON.stringify(updatedAssigned), examId]);

    res.json({ success: true, assignedStudents: updatedAssigned });
  } catch (error) {
    console.error('Failed to assign students:', error);
    res.status(500).json({ error: 'Failed to assign students to exam' });
  }
});

export default router;
