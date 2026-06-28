import { Router } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { getDb } from '../config/db.js';
import { authenticateToken, isSuperAdmin } from '../middleware/authMiddleware.js';
import { createAuditLog } from '../utils/auditLogger.js';

const router = Router();

// Secure all endpoints to Super Admin only
router.use(authenticateToken, isSuperAdmin);

// GET /api/audit-logs/stats - Dashboard analytics cards data
router.get('/stats', async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Total Logs
    const totalLogs = await AuditLog.countDocuments({});

    // 2. Failed Logins
    const failedLogins = await AuditLog.countDocuments({ action: 'FAILED_LOGIN' });

    // 3. Exams Created Today
    const examsCreatedToday = await AuditLog.countDocuments({
      action: 'CREATE_EXAM',
      createdAt: { $gte: startOfToday }
    });

    // 4. Proctoring Violations (Count from SQLite violation_logs table)
    const db = await getDb();
    const violationCountResult = await db.get('SELECT COUNT(*) as count FROM violation_logs');
    const proctoringViolations = violationCountResult ? violationCountResult.count : 0;

    // 5. Active Users Today (Unique userIds in audit logs today)
    const activeUsersTodayResult = await AuditLog.distinct('userId', {
      createdAt: { $gte: startOfToday }
    });
    const activeUsersToday = activeUsersTodayResult.filter(Boolean).length;

    res.json({
      success: true,
      stats: {
        totalLogs,
        failedLogins,
        examsCreatedToday,
        proctoringViolations,
        activeUsersToday
      }
    });
  } catch (err) {
    console.error('Failed to calculate audit stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// GET /api/audit-logs - Query audit logs with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, action, role, status, startDate, endDate } = req.query;

    const query = {};

    // Search by username
    if (search) {
      query.userName = { $regex: search, $options: 'i' };
    }

    // Filter by action
    if (action) {
      query.action = action;
    }

    // Filter by userRole
    if (role) {
      query.userRole = role;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skipNum = (pageNum - 1) * limitNum;

    const logs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Failed to get audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

// GET /api/audit-logs/:id - Get detail log entry
router.get('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('userId', 'name email role');
    if (!log) {
      return res.status(404).json({ error: 'Audit log entry not found' });
    }
    res.json({ success: true, log });
  } catch (err) {
    console.error('Failed to get log detail:', err);
    res.status(500).json({ error: 'Failed to retrieve audit log details' });
  }
});

// DELETE /api/audit-logs/cleanup - Batch clean up audit logs older than X days
router.delete('/cleanup', async (req, res) => {
  try {
    const days = parseInt(req.query.days || 90);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoffDate } });

    await createAuditLog({
      req,
      action: 'CLEANUP_AUDIT_LOGS',
      entityType: 'AuditLog',
      description: `Wiped audit logs older than ${days} days. Deleted ${result.deletedCount} entries.`
    });

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} audit logs older than ${days} days`
    });
  } catch (err) {
    console.error('Failed to clean audit logs:', err);
    res.status(500).json({ error: 'Failed to perform cleanup action' });
  }
});

// DELETE /api/audit-logs/:id - Delete a specific log entry
router.delete('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Audit log entry not found' });
    }

    await createAuditLog({
      req,
      action: 'DELETE_AUDIT_LOG',
      entityType: 'AuditLog',
      entityId: req.params.id,
      description: `Deleted audit log entry with ID: ${req.params.id}`
    });

    res.json({ success: true, message: 'Audit log deleted successfully' });
  } catch (err) {
    console.error('Failed to delete log entry:', err);
    res.status(500).json({ error: 'Failed to delete audit log' });
  }
});

export default router;
