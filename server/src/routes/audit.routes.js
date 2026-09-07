const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// GET /api/audit/logs (Admin only)
router.get('/logs', authenticate, requireRole('admin'), (req, res) => {
  const { action, entity_type, user_id, search, limit = 100 } = req.query;

  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (user_name LIKE ? OR action LIKE ? OR entity_type LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }

  if (entity_type) {
    sql += ' AND entity_type = ?';
    params.push(entity_type);
  }

  if (user_id) {
    sql += ' AND user_id = ?';
    params.push(user_id);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(parseInt(limit, 10) || 100);

  const logs = db.query(sql, params);

  // Parse JSON old_values and new_values safely
  const parsedLogs = logs.map(l => {
    let parsedOld = null;
    let parsedNew = null;
    try {
      if (l.old_values) parsedOld = JSON.parse(l.old_values);
    } catch {
      parsedOld = l.old_values;
    }
    try {
      if (l.new_values) parsedNew = JSON.parse(l.new_values);
    } catch {
      parsedNew = l.new_values;
    }
    return {
      ...l,
      old_values_parsed: parsedOld,
      new_values_parsed: parsedNew
    };
  });

  res.json(parsedLogs);
});

// GET /api/audit/stats (Admin dashboard metrics)
router.get('/stats', authenticate, requireRole('admin'), (req, res) => {
  const totalStudents = db.queryOne("SELECT COUNT(*) as count FROM students WHERE status = 'Active'");
  const totalTeachers = db.queryOne("SELECT COUNT(*) as count FROM teachers WHERE status = 'Active'");
  const totalParents = db.queryOne("SELECT COUNT(*) as count FROM parents");
  const totalClasses = db.queryOne("SELECT COUNT(*) as count FROM classes");
  const totalSections = db.queryOne("SELECT COUNT(*) as count FROM sections");
  const totalSmsSent = db.queryOne("SELECT COUNT(*) as count FROM sms_recipients WHERE status = 'Delivered' OR status = 'Sent'");
  const totalSmsFailed = db.queryOne("SELECT COUNT(*) as count FROM sms_recipients WHERE status = 'Failed'");
  const recentSecurityEvents = db.queryOne("SELECT COUNT(*) as count FROM audit_logs WHERE action IN ('FAILED_LOGIN', 'ADJUST_MARK', 'UPDATE_USER_PERMISSIONS')");

  res.json({
    total_students: totalStudents.count,
    total_teachers: totalTeachers.count,
    total_parents: totalParents.count,
    total_classes: totalClasses.count,
    total_sections: totalSections.count,
    sms_success_count: totalSmsSent.count,
    sms_failed_count: totalSmsFailed.count,
    recent_security_events: recentSecurityEvents.count
  });
});

module.exports = router;
