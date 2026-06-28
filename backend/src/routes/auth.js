import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, resetDbToDefaults } from '../config/db.js';
import { JWT_SECRET, authenticateToken, isSuperAdmin, isExaminer, isStaff } from '../middleware/authMiddleware.js';
import { getActiveUsersList } from '../services/socketService.js';
import { createAuditLog } from '../utils/auditLogger.js';

const router = Router();

// Public: Get all registered examiners (for register/login dropdowns)
router.get('/examiners', async (req, res) => {
  const db = await getDb();
  try {
    const examiners = await db.all('SELECT name, examinerId FROM users WHERE role = ?', ['examiner']);
    res.json({ examiners });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve examiners list' });
  }
});

// Register user
router.post('/register', async (req, res) => {
  const { name, email, password, role, examinerId } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = await getDb();

  try {
    // Enforce student registration toggle
    if (role === 'student') {
      const regSetting = await db.get("SELECT value FROM settings WHERE key = 'allow_student_registration'");
      if (regSetting && regSetting.value === 'false') {
        return res.status(403).json({ error: 'Student registration is currently disabled by the Super Admin' });
      }
    }

    // Check if user already exists
    const exists = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (exists) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let assignedExaminerId = null;

    if (role === 'student') {
      if (!examinerId) {
        return res.status(400).json({ error: 'Examiner selection is required for students' });
      }
      // Check if examiner exists
      const examiner = await db.get('SELECT * FROM users WHERE role = ? AND examinerId = ?', ['examiner', examinerId]);
      if (!examiner) {
        return res.status(400).json({ error: 'Selected Examiner ID is invalid' });
      }
      assignedExaminerId = examinerId;
    } else if (role === 'examiner') {
      if (!examinerId || examinerId.trim() === '') {
        return res.status(400).json({ error: 'Examiner ID is required' });
      }
      // Verify unique examinerId
      const idExists = await db.get('SELECT * FROM users WHERE examinerId = ?', [examinerId]);
      if (idExists) {
        return res.status(400).json({ error: 'Examiner ID is already taken' });
      }
      assignedExaminerId = examinerId;
    } else if (role === 'superadmin') {
      return res.status(403).json({ error: 'Public Super Admin registration is disabled' });
    } else {
      return res.status(400).json({ error: 'Invalid user role' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = role === 'examiner' ? `exm${Date.now()}` : `stu${Date.now()}`;

    await db.run(
      'INSERT INTO users (id, name, email, password, role, examinerId) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, role, assignedExaminerId]
    );

    await createAuditLog({
      req,
      user: { id: userId, name, email, role },
      action: 'REGISTER',
      entityType: 'User',
      entityId: userId,
      description: `Registered new user "${name}" as "${role}"` + (assignedExaminerId ? ` assigned to Examiner "${assignedExaminerId}"` : ''),
      status: 'success',
      metadata: { name, email, role, examinerId: assignedExaminerId }
    });

    const token = jwt.sign(
      { id: userId, name, email, role, examinerId: assignedExaminerId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: userId, name, email, role, examinerId: assignedExaminerId }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password, role, examinerId } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = await getDb();

  try {
    let user;
    if (role === 'student') {
      if (!examinerId) {
        return res.status(400).json({ error: 'Student login requires selecting an Examiner' });
      }
      user = await db.get(
        'SELECT * FROM users WHERE email = ? AND role = ? AND examinerId = ?',
        [email, role, examinerId]
      );
    } else {
      user = await db.get(
        'SELECT * FROM users WHERE email = ? AND role = ?',
        [email, role]
      );
    }

    if (!user) {
      await createAuditLog({
        req,
        user: { email, role },
        action: 'FAILED_LOGIN',
        description: `Failed login attempt: user not found or role/examiner mismatch for email "${email}"`,
        status: 'failed',
        metadata: { email, role, examinerId }
      });
      return res.status(401).json({ error: 'Invalid credentials or role/examiner mismatch' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await createAuditLog({
        req,
        user,
        action: 'FAILED_LOGIN',
        description: `Failed login attempt: incorrect password for user "${user.name}" (${email})`,
        status: 'failed',
        metadata: { email }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, examinerId: user.examinerId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await createAuditLog({
      req,
      user,
      action: 'LOGIN',
      description: `Successful login as ${user.role}`,
      status: 'success',
      metadata: { email }
    });

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, examinerId: user.examinerId }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current profile
router.get('/me', authenticateToken, async (req, res) => {
  const db = await getDb();
  try {
    const user = await db.get('SELECT id, name, email, role, examinerId FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// Get students roster (Staff: Examiner sees their own; Super Admin sees all)
router.get('/students', authenticateToken, isStaff, async (req, res) => {
  const db = await getDb();
  try {
    let students;
    if (req.user.role === 'superadmin') {
      students = await db.all('SELECT id, name, email, role, examinerId FROM users WHERE role = ?', ['student']);
    } else {
      students = await db.all(
        'SELECT id, name, email, role, examinerId FROM users WHERE role = ? AND examinerId = ?',
        ['student', req.user.examinerId]
      );
    }
    res.json({ students });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get students list' });
  }
});

// Add a student (Staff: Examiner adds to their ID; Super Admin adds and assigns)
router.post('/students', authenticateToken, isStaff, async (req, res) => {
  const { name, email, studentExaminerId } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const db = await getDb();

  try {
    const exists = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (exists) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    let targetExaminerId = null;

    if (req.user.role === 'superadmin') {
      if (!studentExaminerId) {
        return res.status(400).json({ error: 'Super Admin must specify an Examiner ID for the student' });
      }
      const examiner = await db.get('SELECT * FROM users WHERE role = ? AND examinerId = ?', ['examiner', studentExaminerId]);
      if (!examiner) {
        return res.status(400).json({ error: 'Specified Examiner ID does not exist' });
      }
      targetExaminerId = studentExaminerId;
    } else {
      targetExaminerId = req.user.examinerId;
    }

    const defaultPasswordHash = await bcrypt.hash('student123', 10);
    const studentId = `stu${Date.now()}`;

    await db.run(
      'INSERT INTO users (id, name, email, password, role, examinerId) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, name, email, defaultPasswordHash, 'student', targetExaminerId]
    );

    await createAuditLog({
      req,
      action: 'REGISTER',
      entityType: 'User',
      entityId: studentId,
      description: `Created student profile for: ${email} assigned to ${targetExaminerId}`,
      status: 'success',
      metadata: { name, email, examinerId: targetExaminerId }
    });

    res.status(201).json({
      success: true,
      student: { id: studentId, name, email, role: 'student', examinerId: targetExaminerId }
    });
  } catch (error) {
    console.error('Failed to add student:', error);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

// Delete student (Staff: Examiner can only delete their own; Super Admin can delete any)
router.delete('/students/:id', authenticateToken, isStaff, async (req, res) => {
  const { id } = req.params;
  const db = await getDb();

  try {
    const student = await db.get('SELECT * FROM users WHERE id = ? AND role = ?', [id, 'student']);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify ownership if examiner
    if (req.user.role !== 'superadmin' && student.examinerId !== req.user.examinerId) {
      return res.status(403).json({ error: 'Unauthorized to delete this student' });
    }

    // Cascading deletion
    // 1. Delete submissions
    await db.run('DELETE FROM submissions WHERE studentId = ?', [id]);
    // 2. Delete violation logs
    await db.run('DELETE FROM violation_logs WHERE studentId = ?', [id]);
    // 3. Delete snapshots
    await db.run('DELETE FROM snapshots WHERE studentId = ?', [id]);
    // 4. Remove reference from exam assignments
    const allExams = await db.all('SELECT id, assignedStudents FROM exams');
    for (const exam of allExams) {
      try {
        let assigned = JSON.parse(exam.assignedStudents);
        if (assigned.includes(id)) {
          assigned = assigned.filter(sid => sid !== id);
          await db.run('UPDATE exams SET assignedStudents = ? WHERE id = ?', [JSON.stringify(assigned), exam.id]);
        }
      } catch (e) {
        console.error('Failed to parse assignedStudents during student deletion cascading: ', e);
      }
    }

    // 5. Delete actual student user row
    await db.run('DELETE FROM users WHERE id = ?', [id]);

    await createAuditLog({
      req,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      description: `Cascaded deletion of student: ${student.email} (${student.name})`,
      status: 'success'
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Student deletion error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Super Admin only: Get all examiners with stats
router.get('/examiners-list', authenticateToken, isSuperAdmin, async (req, res) => {
  const db = await getDb();
  try {
    const examiners = await db.all('SELECT id, name, email, role, examinerId FROM users WHERE role = ?', ['examiner']);
    
    // Add student and exam counts for each examiner
    const enhancedExaminers = [];
    for (const exm of examiners) {
      const studentCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ? AND examinerId = ?', ['student', exm.examinerId]);
      const examCount = await db.get('SELECT COUNT(*) as count FROM exams WHERE examinerId = ?', [exm.examinerId]);
      
      enhancedExaminers.push({
        ...exm,
        studentsCount: studentCount.count,
        examsCount: examCount.count
      });
    }

    res.json({ examiners: enhancedExaminers });
  } catch (error) {
    console.error('Failed to get examiners list:', error);
    res.status(500).json({ error: 'Failed to fetch examiners data' });
  }
});

// Super Admin only: Delete any user (student or examiner)
router.delete('/users/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const db = await getDb();

  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'superadmin') {
      return res.status(400).json({ error: 'Cannot delete the Super Admin' });
    }

    // Delete user
    await db.run('DELETE FROM users WHERE id = ?', [id]);

    // If deleting an examiner, what happens to their students? Set examinerId to NULL
    if (user.role === 'examiner') {
      await db.run('UPDATE users SET examinerId = NULL WHERE examinerId = ?', [user.examinerId]);
    }

    await createAuditLog({
      req,
      action: user.role === 'examiner' ? 'DELETE_EXAMINER' : 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      description: `Removed user: ${user.email} (Role: ${user.role})`,
      status: 'success'
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Public: Get system settings
router.get('/settings', async (req, res) => {
  const db = await getDb();
  try {
    const settingsRows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ settings });
  } catch (error) {
    console.error('Failed to get settings:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// Super Admin only: Update settings
router.post('/settings', authenticateToken, isSuperAdmin, async (req, res) => {
  const { allow_student_registration, proctoring_enabled, max_tab_switches, announcement_banner } = req.body;
  const db = await getDb();
  try {
    if (allow_student_registration !== undefined) {
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['allow_student_registration', String(allow_student_registration)]);
    }
    if (proctoring_enabled !== undefined) {
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['proctoring_enabled', String(proctoring_enabled)]);
    }
    if (max_tab_switches !== undefined) {
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['max_tab_switches', String(max_tab_switches)]);
    }
    if (announcement_banner !== undefined) {
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['announcement_banner', String(announcement_banner)]);
    }
    
    await createAuditLog({
      req,
      action: 'UPDATE_SETTINGS',
      description: 'Updated system configurations',
      status: 'success',
      metadata: { allow_student_registration, proctoring_enabled, max_tab_switches, announcement_banner }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Staff & Admin: Get live logged-in users
router.get('/live-users', authenticateToken, isStaff, (req, res) => {
  try {
    const list = getActiveUsersList();
    res.json({ activeUsers: list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve live users' });
  }
});

// Super Admin only: Get audit logs
router.get('/audit-logs', authenticateToken, isSuperAdmin, async (req, res) => {
  const db = await getDb();
  try {
    const logs = await db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    res.json({ logs });
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

// Super Admin only: Reset system
router.post('/system/reset', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    await resetDbToDefaults();
    res.json({ success: true, message: 'Database reset to defaults successfully' });
  } catch (error) {
    console.error('Failed to reset system database:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// Super Admin only: Clear proctoring submissions logs
router.post('/system/clear-logs', authenticateToken, isSuperAdmin, async (req, res) => {
  const db = await getDb();
  try {
    await db.run('DELETE FROM submissions');
    await createAuditLog({
      req,
      action: 'CLEAR_SUBMISSIONS_LOGS',
      description: 'Wiped all exam submissions and proctoring metrics',
      status: 'success'
    });
    res.json({ success: true, message: 'All submissions and proctoring logs deleted' });
  } catch (error) {
    console.error('Failed to clear submissions logs:', error);
    res.status(500).json({ error: 'Failed to clear submissions' });
  }
});

// Super Admin only: Generate mock submissions
router.post('/system/generate-mock', authenticateToken, isSuperAdmin, async (req, res) => {
  const db = await getDb();
  try {
    // Fetch exams and students
    const exams = await db.all('SELECT id, title, questions FROM exams');
    const students = await db.all('SELECT id, name FROM users WHERE role = ?', ['student']);
    
    if (exams.length === 0 || students.length === 0) {
      return res.status(400).json({ error: 'Exams and students must exist to generate mock submissions' });
    }
    
    // Clear old submissions first
    await db.run('DELETE FROM submissions');
    
    let count = 0;
    // Generate for each student
    for (const student of students) {
      for (const exam of exams) {
        const subId = `sub_mock_${Date.now()}_${student.id.substr(3)}_${exam.id.substr(4)}`;
        const tabSwitches = Math.floor(Math.random() * 6); // 0 to 5 switches
        
        let questions = [];
        try {
          questions = JSON.parse(exam.questions);
        } catch {
          continue;
        }
        
        const answers = {};
        const grades = {};
        let totalScore = 0;
        
        questions.forEach(q => {
          if (q.type === 'mcq') {
            const randAnswer = Math.floor(Math.random() * 4);
            answers[q.id] = randAnswer;
            if (randAnswer === q.correctAnswer) {
              grades[q.id] = q.marks;
              totalScore += q.marks;
            } else {
              grades[q.id] = 0;
            }
          } else {
            answers[q.id] = 'This is a mock subjective answer generated automatically for administrative testing.';
            const randGrade = Math.floor(Math.random() * (q.marks + 1));
            grades[q.id] = randGrade;
            totalScore += randGrade;
          }
        });
        
        // Generate mock snapshots if switches > 2
        const snapshots = [];
        if (tabSwitches > 2) {
          snapshots.push({
            time: new Date(Date.now() - 5 * 60000).toISOString(),
            image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="red"/><text x="10" y="50" fill="white">Flagged Action</text></svg>'
          });
        }
        
        await db.run(
          `INSERT INTO submissions (id, examId, studentId, answers, tabSwitches, webcamSnapshots, submittedAt, grades, totalScore, isGraded)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            subId,
            exam.id,
            student.id,
            JSON.stringify(answers),
            tabSwitches,
            JSON.stringify(snapshots),
            new Date(Date.now() - count * 3600000).toISOString(),
            JSON.stringify(grades),
            totalScore,
            1 // Graded
          ]
        );
        count++;
      }
    }
    
    await createAuditLog({
      req,
      action: 'GENERATE_MOCK_DATA',
      description: `Generated ${count} mock exam submissions for system validation`,
      status: 'success'
    });
    res.json({ success: true, message: `Successfully generated ${count} mock submissions` });
  } catch (error) {
    console.error('Failed to generate mock data:', error);
    res.status(500).json({ error: 'Failed to generate mock submissions' });
  }
});

// POST /logout - Logout user
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await createAuditLog({
      req,
      action: 'LOGOUT',
      description: `Successful logout for user "${req.user.name}" (${req.user.email})`,
      status: 'success'
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /change-password - Change user password
router.post('/change-password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const db = await getDb();
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      await createAuditLog({
        req,
        action: 'CHANGE_PASSWORD',
        description: `Failed password change for user "${user.name}": incorrect old password`,
        status: 'failed',
        metadata: { oldPassword, newPassword }
      });
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    await createAuditLog({
      req,
      action: 'CHANGE_PASSWORD',
      description: `Successfully changed password for user "${user.name}"`,
      status: 'success',
      metadata: { oldPassword, newPassword }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Super Admin only: Change any user's role
router.put('/users/:id/role', authenticateToken, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, examinerId } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'Role is required' });
  }

  const db = await getDb();
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'superadmin') {
      return res.status(400).json({ error: 'Cannot change the Super Admin role' });
    }

    let assignedExaminerId = user.examinerId;
    if (role === 'student') {
      if (!examinerId) {
        return res.status(400).json({ error: 'Examiner ID selection is required for student role' });
      }
      assignedExaminerId = examinerId;
    } else if (role === 'examiner') {
      if (!examinerId) {
        return res.status(400).json({ error: 'Examiner ID designation is required for examiner role' });
      }
      assignedExaminerId = examinerId;
    } else {
      assignedExaminerId = null;
    }

    await db.run(
      'UPDATE users SET role = ?, examinerId = ? WHERE id = ?',
      [role, assignedExaminerId, id]
    );

    await createAuditLog({
      req,
      action: 'CHANGE_ROLE',
      entityType: 'User',
      entityId: id,
      description: `Changed role of user "${user.name}" (${user.email}) from "${user.role}" to "${role}"`,
      status: 'success',
      metadata: { previousRole: user.role, newRole: role, examinerId: assignedExaminerId }
    });

    res.json({ success: true, message: 'User role updated successfully' });
  } catch (err) {
    console.error('Failed to change user role:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

export default router;
