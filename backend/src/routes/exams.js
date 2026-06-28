import { Router } from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken, isStaff, isSuperAdmin } from '../middleware/authMiddleware.js';
import { createAuditLog } from '../utils/auditLogger.js';

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

    await createAuditLog({
      req,
      action: 'CREATE_EXAM',
      entityType: 'Exam',
      entityId: examId,
      description: `Created exam "${title}" (ID: ${examId})`,
      status: 'success',
      metadata: { title, subject, duration, totalMarks, scheduledDate }
    });
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

    await createAuditLog({
      req,
      action: 'DELETE_EXAM',
      entityType: 'Exam',
      entityId: id,
      description: `Deleted exam ID: ${id} and all related submissions`,
      status: 'success'
    });
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
      submissions = await db.all(`
        SELECT s.*, e.title as examTitle, e.totalMarks as examTotalMarks, u.name as studentName 
        FROM submissions s 
        LEFT JOIN exams e ON s.examId = e.id 
        LEFT JOIN users u ON s.studentId = u.id
      `);
    } else if (req.user.role === 'examiner') {
      submissions = await db.all(`
        SELECT s.*, e.title as examTitle, e.totalMarks as examTotalMarks, u.name as studentName 
        FROM submissions s 
        INNER JOIN exams e ON s.examId = e.id 
        LEFT JOIN users u ON s.studentId = u.id
        WHERE e.examinerId = ?
      `, [req.user.examinerId]);
    } else {
      submissions = await db.all(`
        SELECT s.*, e.title as examTitle, e.totalMarks as examTotalMarks, u.name as studentName 
        FROM submissions s 
        LEFT JOIN exams e ON s.examId = e.id 
        LEFT JOIN users u ON s.studentId = u.id
        WHERE s.studentId = ?
      `, [req.user.id]);
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

    await createAuditLog({
      req,
      action: 'SUBMIT_EXAM',
      entityType: 'Exam',
      entityId: examId,
      description: `Submitted exam ID: ${examId} with ${tabSwitches || 0} tab switches`,
      status: 'success',
      metadata: { examId, tabSwitches, snapshotCount: webcamSnapshots ? webcamSnapshots.length : 0 }
    });
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

    await createAuditLog({
      req,
      action: 'GRADE_EXAM',
      entityType: 'Submission',
      entityId: submissionId,
      description: `Graded student submission ID: ${submissionId} (Score: ${totalScore})`,
      status: 'success',
      metadata: { submissionId, totalScore, isGraded: allGraded }
    });
    res.json({ success: true, submission: updatedSubmission });
  } catch (error) {
    console.error('Failed to grade submission:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

// Get pending results (Staff only)
router.get('/pending', authenticateToken, isStaff, async (req, res) => {
  const db = await getDb();
  try {
    let pendingExams;
    if (req.user.role === 'superadmin') {
      pendingExams = await db.all("SELECT * FROM exams WHERE resultsPublished = 0 OR resultsStatus = 'pending'");
    } else {
      pendingExams = await db.all(
        "SELECT * FROM exams WHERE (resultsPublished = 0 OR resultsStatus = 'pending') AND examinerId = ?", 
        [req.user.examinerId]
      );
    }

    const enhancedExams = [];
    for (const exam of pendingExams) {
      // Get all submissions for this exam
      const subs = await db.all(`
        SELECT s.*, u.name as studentName, u.email as studentEmail 
        FROM submissions s 
        JOIN users u ON s.studentId = u.id 
        WHERE s.examId = ?
      `, [exam.id]);
      
      const formattedSubs = subs.map(s => ({
        ...s,
        answers: JSON.parse(s.answers),
        webcamSnapshots: JSON.parse(s.webcamSnapshots),
        grades: JSON.parse(s.grades),
        isGraded: !!s.isGraded
      }));

      enhancedExams.push({
        ...exam,
        resultsPublished: false,
        resultsStatus: 'pending',
        assignedStudents: JSON.parse(exam.assignedStudents),
        questions: JSON.parse(exam.questions),
        submissions: formattedSubs
      });
    }

    res.json({ exams: enhancedExams });
  } catch (error) {
    console.error('Failed to get pending exams:', error);
    res.status(500).json({ error: 'Failed to retrieve pending exams' });
  }
});

// Publish exam results (Staff only)
router.put('/publish/:examId', authenticateToken, isStaff, async (req, res) => {
  const { examId } = req.params;
  const db = await getDb();
  try {
    const exam = await db.get('SELECT resultsPublished, examinerId, title FROM exams WHERE id = ?', [examId]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user.role !== 'superadmin' && exam.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Unauthorized to publish results for this exam' });
    }

    const publishedAt = new Date().toISOString();
    const publishedBy = req.user.email || req.user.name || 'Examiner';

    await db.run(
      "UPDATE exams SET resultsPublished = 1, resultsStatus = 'published', publishedAt = ?, publishedBy = ? WHERE id = ?",
      [publishedAt, publishedBy, examId]
    );

    await createAuditLog({
      req,
      action: 'PUBLISH_RESULTS',
      entityType: 'Exam',
      entityId: examId,
      description: `Published results for exam "${exam.title}" (ID: ${examId})`,
      status: 'success',
      metadata: { examId }
    });

    // Broadcast results published real-time activity event
    if (req.io) {
      req.io.emit('results-published', { examId, examTitle: exam.title, publishedAt, publishedBy });
      req.io.emit('activity', {
        type: 'publish',
        text: `Results published for "${exam.title}"`,
        time: publishedAt,
        detail: `Published by: ${publishedBy}`,
        color: 'var(--success)'
      });
    }

    res.json({ success: true, resultsPublished: true, publishedAt, publishedBy });
  } catch (error) {
    console.error('Failed to publish results:', error);
    res.status(500).json({ error: 'Failed to publish results' });
  }
});

// Toggle publish results (Staff only)
router.post('/:examId/toggle-publish', authenticateToken, isStaff, async (req, res) => {
  const { examId } = req.params;
  const db = await getDb();

  try {
    const exam = await db.get('SELECT resultsPublished, examinerId, title FROM exams WHERE id = ?', [examId]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    if (req.user.role !== 'superadmin' && exam.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Unauthorized to publish results for this exam' });
    }

    const newPublishState = exam.resultsPublished === 1 ? 0 : 1;
    const publishedAt = newPublishState === 1 ? new Date().toISOString() : null;
    const publishedBy = newPublishState === 1 ? (req.user.email || req.user.name) : null;
    const resultsStatus = newPublishState === 1 ? 'published' : 'pending';

    await db.run(
      'UPDATE exams SET resultsPublished = ?, resultsStatus = ?, publishedAt = ?, publishedBy = ? WHERE id = ?',
      [newPublishState, resultsStatus, publishedAt, publishedBy, examId]
    );

    await createAuditLog({
      req,
      action: 'PUBLISH_RESULTS',
      entityType: 'Exam',
      entityId: examId,
      description: `${newPublishState === 1 ? 'Published' : 'Unpublished'} results for exam ID: ${examId}`,
      status: 'success',
      metadata: { examId, publishState: newPublishState }
    });

    if (req.io && newPublishState === 1) {
      req.io.emit('results-published', { examId, examTitle: exam.title, publishedAt, publishedBy });
      req.io.emit('activity', {
        type: 'publish',
        text: `Results published for "${exam.title}"`,
        time: publishedAt || new Date().toISOString(),
        detail: `Published by: ${publishedBy || 'System'}`,
        color: 'var(--success)'
      });
    }

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

// Generate exam from document (Staff only)
router.post('/generate-from-document', authenticateToken, isStaff, async (req, res) => {
  const { filename, fileContent } = req.body;

  if (!filename || !fileContent) {
    return res.status(400).json({ error: 'Filename and base64 file content are required' });
  }

  try {
    // Decode base64 file content
    const base64Data = fileContent.split(';base64,').pop();
    const rawText = Buffer.from(base64Data, 'base64').toString('utf-8');

    // Split by lines and clean empty/short strings
    let lines = rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 10);

    // PDF/DOCX binary cleaning to pull text strings if loaded
    if (rawText.includes('%PDF') || rawText.includes('PK\x03\x04')) {
      const asciiText = rawText.replace(/[^\x20-\x7E\n\r]/g, ' ');
      lines = asciiText
        .split(/\s{3,}/)
        .map(line => line.trim())
        .filter(line => {
          return line.length > 15 && 
                 line.length < 350 && 
                 !line.startsWith('PDF') && 
                 !line.includes('xml') &&
                 !/^[0-9\s]+$/.test(line);
        });
    }

    // Default fallback if no clean lines could be parsed
    if (lines.length === 0) {
      lines = [`Analyze the topics and general principles outlined within "${filename.replace(/\.[^/.]+$/, '')}".`];
    }

    const generatedQuestions = [];
    const makeId = () => 'ai_' + Math.random().toString(36).substr(2, 9);

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      
      // Determine if it already looks like a question
      const isPreExistingQuestion = line.includes('?') || 
                                    /^(what|why|how|explain|describe|who|where|when|which|is|define)/i.test(line);

      if (isPreExistingQuestion) {
        const hasOptions = /([a-d]\)|[1-4]\)|A\.|B\.|C\.|D\.)/.test(line);
        if (hasOptions || lowerLine.includes('select') || lowerLine.includes('choose')) {
          generatedQuestions.push({
            id: makeId(),
            text: line,
            type: 'mcq',
            options: [
              'Option A (Extracted context)',
              'Option B (Alternative context)',
              'Option C (Secondary detail)',
              'Option D (Distractor option)'
            ],
            correctAnswer: 0,
            marks: 5
          });
        } else {
          generatedQuestions.push({
            id: makeId(),
            text: line,
            type: 'subjective',
            marks: 10
          });
        }
      } else {
        // Parse statements/facts and convert into questions
        if (lowerLine.includes('is a') || lowerLine.includes('whereas') || lowerLine.includes('include') || lowerLine.includes('requires')) {
          if (index % 2 === 0) {
            // Generate MCQ
            let prompt = `Based on the document, what is the meaning or function of: "${line.substring(0, 75)}..."?`;
            if (lowerLine.includes('is a')) {
              const parts = line.split(/is a/i);
              prompt = `According to the text, what is "${parts[0].trim()}"?`;
            } else if (lowerLine.includes('include')) {
              const parts = line.split(/include/i);
              prompt = `Which of the following are included in "${parts[0].trim()}"?`;
            }

            generatedQuestions.push({
              id: makeId(),
              text: prompt,
              type: 'mcq',
              options: [
                line, // Correct answer
                'An unrelated system configuration parameter.',
                'A legacy driver framework with low resource allocation.',
                'A temporary virtual storage process.'
              ],
              correctAnswer: 0,
              marks: 5
            });
          } else {
            // Generate Subjective
            let prompt = `Explain the following statement from the text: "${line}"`;
            if (lowerLine.includes('requires')) {
              const parts = line.split(/requires/i);
              prompt = `Detail the requirements and execution steps related to: "${parts[0].trim()}"`;
            }

            generatedQuestions.push({
              id: makeId(),
              text: prompt,
              type: 'subjective',
              marks: 10
            });
          }
        } else {
          // Standard general fallback mapping
          if (index % 2 === 0) {
            generatedQuestions.push({
              id: makeId(),
              text: `Analyze the following point from the text: "${line}"`,
              type: 'subjective',
              marks: 5
            });
          } else {
            generatedQuestions.push({
              id: makeId(),
              text: `Identify the true statement regarding the document discussion about: "${line.substring(0, 50)}..."`,
              type: 'mcq',
              options: [
                line,
                'It has been omitted due to system constraints.',
                'It conflicts with standard execution routines.',
                'It requires manual intervention from the supervisor.'
              ],
              correctAnswer: 0,
              marks: 5
            });
          }
        }
      }
    });

    res.json({ success: true, questions: generatedQuestions });
  } catch (error) {
    console.error('Failed to generate questions from document:', error);
    res.status(500).json({ error: 'Failed to process document and generate questions' });
  }
});

// POST /:examId/start - Student starts taking an exam
router.post('/:examId/start', authenticateToken, async (req, res) => {
  const { examId } = req.params;
  const db = await getDb();
  try {
    const exam = await db.get('SELECT * FROM exams WHERE id = ?', [examId]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    await createAuditLog({
      req,
      action: 'START_EXAM',
      entityType: 'Exam',
      entityId: examId,
      description: `Student "${req.user.name}" (${req.user.email}) started taking exam "${exam.title}" (ID: ${examId})`,
      status: 'success',
      metadata: { examId, examTitle: exam.title }
    });

    res.json({ success: true, message: 'Exam start logged successfully' });
  } catch (err) {
    console.error('Failed to log exam start:', err);
    res.status(500).json({ error: 'Failed to record exam start' });
  }
});

// PUT /:id - Update an exam (Staff only)
router.put('/:id', authenticateToken, isStaff, async (req, res) => {
  const { id } = req.params;
  const { title, subject, duration, totalMarks, scheduledDate, assignedStudents, questions } = req.body;

  const db = await getDb();
  try {
    const exam = await db.get('SELECT * FROM exams WHERE id = ?', [id]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Verify ownership
    if (req.user.role !== 'superadmin' && exam.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Access denied: not your exam' });
    }

    const updatedTitle = title !== undefined ? title : exam.title;
    const updatedSubject = subject !== undefined ? subject : exam.subject;
    const updatedDuration = duration !== undefined ? parseInt(duration) : exam.duration;
    const updatedTotalMarks = totalMarks !== undefined ? parseInt(totalMarks) : exam.totalMarks;
    const updatedScheduledDate = scheduledDate !== undefined ? scheduledDate : exam.scheduledDate;
    const updatedAssigned = assignedStudents !== undefined ? JSON.stringify(assignedStudents) : exam.assignedStudents;
    const updatedQuestions = questions !== undefined ? JSON.stringify(questions) : exam.questions;

    await db.run(
      `UPDATE exams 
       SET title = ?, subject = ?, duration = ?, totalMarks = ?, scheduledDate = ?, assignedStudents = ?, questions = ? 
       WHERE id = ?`,
      [updatedTitle, updatedSubject, updatedDuration, updatedTotalMarks, updatedScheduledDate, updatedAssigned, updatedQuestions, id]
    );

    await createAuditLog({
      req,
      action: 'UPDATE_EXAM',
      entityType: 'Exam',
      entityId: id,
      description: `Updated details for exam "${updatedTitle}" (ID: ${id})`,
      status: 'success',
      metadata: { id, title: updatedTitle, subject: updatedSubject, duration: updatedDuration }
    });

    res.json({ success: true, message: 'Exam updated successfully' });
  } catch (err) {
    console.error('Failed to update exam:', err);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// POST /:id/questions - Create/Add a question to an exam (Staff only)
router.post('/:id/questions', authenticateToken, isStaff, async (req, res) => {
  const { id } = req.params;
  const { question } = req.body;

  if (!question || !question.text || !question.type || !question.marks) {
    return res.status(400).json({ error: 'Invalid question details' });
  }

  const db = await getDb();
  try {
    const exam = await db.get('SELECT * FROM exams WHERE id = ?', [id]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Verify ownership
    if (req.user.role !== 'superadmin' && exam.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Access denied: not your exam' });
    }

    const currentQuestions = JSON.parse(exam.questions);
    const qId = question.id || `q_${Date.now()}`;
    const newQuestion = { ...question, id: qId };
    currentQuestions.push(newQuestion);

    await db.run('UPDATE exams SET questions = ? WHERE id = ?', [JSON.stringify(currentQuestions), id]);

    await createAuditLog({
      req,
      action: 'CREATE_QUESTION',
      entityType: 'Question',
      entityId: qId,
      description: `Added question (ID: ${qId}) to exam "${exam.title}"`,
      status: 'success',
      metadata: { examId: id, question: newQuestion }
    });

    res.json({ success: true, question: newQuestion });
  } catch (err) {
    console.error('Failed to add question:', err);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// PUT /:id/questions/:qId - Update a question in an exam (Staff only)
router.put('/:id/questions/:qId', authenticateToken, isStaff, async (req, res) => {
  const { id, qId } = req.params;
  const { questionUpdates } = req.body;

  const db = await getDb();
  try {
    const exam = await db.get('SELECT * FROM exams WHERE id = ?', [id]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Verify ownership
    if (req.user.role !== 'superadmin' && exam.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Access denied: not your exam' });
    }

    const currentQuestions = JSON.parse(exam.questions);
    const qIdx = currentQuestions.findIndex(q => q.id === qId);
    if (qIdx === -1) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const updatedQuestion = { ...currentQuestions[qIdx], ...questionUpdates, id: qId };
    currentQuestions[qIdx] = updatedQuestion;

    await db.run('UPDATE exams SET questions = ? WHERE id = ?', [JSON.stringify(currentQuestions), id]);

    await createAuditLog({
      req,
      action: 'UPDATE_QUESTION',
      entityType: 'Question',
      entityId: qId,
      description: `Updated question (ID: ${qId}) in exam "${exam.title}"`,
      status: 'success',
      metadata: { examId: id, question: updatedQuestion }
    });

    res.json({ success: true, question: updatedQuestion });
  } catch (err) {
    console.error('Failed to update question:', err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /:id/questions/:qId - Delete a question from an exam (Staff only)
router.delete('/:id/questions/:qId', authenticateToken, isStaff, async (req, res) => {
  const { id, qId } = req.params;

  const db = await getDb();
  try {
    const exam = await db.get('SELECT * FROM exams WHERE id = ?', [id]);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Verify ownership
    if (req.user.role !== 'superadmin' && exam.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Access denied: not your exam' });
    }

    const currentQuestions = JSON.parse(exam.questions);
    const filteredQuestions = currentQuestions.filter(q => q.id !== qId);

    if (currentQuestions.length === filteredQuestions.length) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await db.run('UPDATE exams SET questions = ? WHERE id = ?', [JSON.stringify(filteredQuestions), id]);

    await createAuditLog({
      req,
      action: 'DELETE_QUESTION',
      entityType: 'Question',
      entityId: qId,
      description: `Deleted question (ID: ${qId}) from exam "${exam.title}"`,
      status: 'success',
      metadata: { examId: id, deletedQuestionId: qId }
    });

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (err) {
    console.error('Failed to delete question:', err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
