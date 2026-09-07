const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/announcements (Public / authenticated list)
router.get('/', optionalAuth, (req, res) => {
  const { audience, class_id } = req.query;

  let sql = `
    SELECT a.*, u.full_name as author_name, u.role as author_role,
           c.name as class_name, sec.full_name as section_full_name
    FROM announcements a
    JOIN users u ON a.author_user_id = u.id
    LEFT JOIN classes c ON a.target_class_id = c.id
    LEFT JOIN sections sec ON a.target_section_id = sec.id
    WHERE 1=1
  `;
  const params = [];

  if (audience) {
    sql += ' AND (a.target_audience = ? OR a.target_audience = "ALL")';
    params.push(audience);
  }

  if (class_id) {
    sql += ' AND (a.target_class_id = ? OR a.target_class_id IS NULL)';
    params.push(class_id);
  }

  sql += ' ORDER BY a.is_pinned DESC, a.created_at DESC';

  const rows = db.query(sql, params);
  res.json(rows);
});

// POST /api/announcements (Create announcement)
router.post('/', authenticate, (req, res) => {
  const { title, content, target_audience = 'ALL', target_class_id, target_section_id, is_pinned = 0 } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and announcement content are required.' });
  }

  // Teacher scoping rule
  if (req.user.role === 'teacher') {
    if (target_audience === 'ALL') {
      return res.status(403).json({ error: 'Teachers can only post announcements to their assigned sections.' });
    }
  }

  const result = db.run(`
    INSERT INTO announcements (title, content, author_user_id, target_audience, target_class_id, target_section_id, is_pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [title.trim(), content.trim(), req.user.id, target_audience, target_class_id || null, target_section_id || null, is_pinned ? 1 : 0]);

  logAudit(req, {
    action: 'CREATE_ANNOUNCEMENT',
    entityType: 'ANNOUNCEMENT',
    entityId: result.lastInsertRowid,
    newValues: { title, target_audience, target_class_id, target_section_id }
  });

  res.status(201).json({ id: Number(result.lastInsertRowid), ...req.body });
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const current = db.queryOne('SELECT * FROM announcements WHERE id = ?', [id]);
  if (!current) return res.status(404).json({ error: 'Announcement not found.' });

  // Only author or admin can delete
  if (req.user.role !== 'admin' && current.author_user_id !== req.user.id) {
    return res.status(403).json({ error: 'You are not authorized to delete this announcement.' });
  }

  db.run('DELETE FROM announcements WHERE id = ?', [id]);

  logAudit(req, {
    action: 'DELETE_ANNOUNCEMENT',
    entityType: 'ANNOUNCEMENT',
    entityId: id,
    oldValues: current
  });

  res.json({ success: true, message: 'Announcement deleted.' });
});

module.exports = router;
