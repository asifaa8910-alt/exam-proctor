import { Router } from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createAuditLog } from '../utils/auditLogger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.post('/log', authenticateToken, async (req, res) => {
  const { studentId, examId, eventType, type, timestamp } = req.body;
  const actualType = eventType || type;

  if (!studentId || !examId || !actualType) {
    return res.status(400).json({ error: 'studentId, examId, and eventType are required' });
  }

  const db = await getDb();
  try {
    const id = `vlog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const eventTimestamp = timestamp || new Date().toISOString();

    const student = await db.get('SELECT name, email, role FROM users WHERE id = ?', [studentId]);
    const studentName = student ? student.name : 'Unknown Student';
    const studentEmail = student ? student.email : 'unknown';

    await db.run(
      'INSERT INTO violation_logs (id, studentId, examId, eventType, timestamp) VALUES (?, ?, ?, ?, ?)',
      [id, studentId, examId, actualType, eventTimestamp]
    );

    await createAuditLog({
      req,
      user: student ? { id: studentId, name: studentName, email: studentEmail, role: student.role } : null,
      action: 'PROCTORING_VIOLATION',
      entityType: 'Exam',
      entityId: examId,
      description: `Student "${studentName}" triggered violation: ${actualType.replace(/_/g, ' ')}`,
      status: 'success',
      metadata: { studentId, studentName, examId, eventType: actualType }
    });

    const payload = {
      id,
      studentId,
      studentName,
      examId,
      eventType: actualType,
      timestamp: eventTimestamp
    };

    if (req.io) {
      req.io.emit('violation', payload);
      req.io.emit('activity', {
        type: 'violation',
        text: `Student "${studentName}" triggered violation: ${actualType.replace('_', ' ')}`,
        time: eventTimestamp,
        detail: `Exam ID: ${examId}`,
        color: 'var(--danger)'
      });
    }

    res.status(201).json({ success: true, log: payload });
  } catch (error) {
    console.error('Failed to save violation log:', error);
    res.status(500).json({ error: 'Failed to record violation' });
  }
});

router.post('/snapshot', authenticateToken, async (req, res) => {
  const { studentId, examId, image } = req.body;

  if (!studentId || !examId || !image) {
    return res.status(400).json({ error: 'studentId, examId, and base64 image string are required' });
  }

  const db = await getDb();
  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const filename = `snap_${studentId}_${examId}_${Date.now()}.jpg`;
    const uploadDir = path.join(__dirname, '../../uploads/snapshots');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    const relativePath = `/uploads/snapshots/${filename}`;
    const id = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const capturedAt = new Date().toISOString();

    await db.run(
      'INSERT INTO snapshots (id, studentId, examId, image, capturedAt) VALUES (?, ?, ?, ?, ?)',
      [id, studentId, examId, relativePath, capturedAt]
    );

    const student = await db.get('SELECT name FROM users WHERE id = ?', [studentId]);
    const studentName = student ? student.name : 'Unknown Student';

    const payload = {
      id,
      studentId,
      studentName,
      examId,
      image: relativePath,
      capturedAt
    };

    if (req.io) {
      req.io.emit('snapshot', payload);
    }

    res.status(201).json({ success: true, snapshot: payload });
  } catch (error) {
    console.error('Failed to save webcam snapshot:', error);
    res.status(500).json({ error: 'Failed to save snapshot image' });
  }
});

// GET /proctor/logs/:examId - Get all logs for an exam
router.get('/logs/:examId', authenticateToken, async (req, res) => {
  const { examId } = req.params;
  const db = await getDb();
  try {
    const logs = await db.all(
      `SELECT v.*, u.name as studentName, u.email as studentEmail 
       FROM violation_logs v 
       LEFT JOIN users u ON v.studentId = u.id 
       WHERE v.examId = ? 
       ORDER BY v.timestamp DESC`,
      [examId]
    );
    res.json({ logs });
  } catch (error) {
    console.error('Failed to retrieve proctor logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// GET /proctor/snapshots/:examId - Get all snapshots for an exam
router.get('/snapshots/:examId', authenticateToken, async (req, res) => {
  const { examId } = req.params;
  const db = await getDb();
  try {
    const snapshots = await db.all(
      `SELECT s.*, u.name as studentName 
       FROM snapshots s 
       LEFT JOIN users u ON s.studentId = u.id 
       WHERE s.examId = ? 
       ORDER BY s.capturedAt DESC`,
      [examId]
    );
    res.json({ snapshots });
  } catch (error) {
    console.error('Failed to retrieve snapshots:', error);
    res.status(500).json({ error: 'Failed to retrieve snapshots' });
  }
});

export default router;
