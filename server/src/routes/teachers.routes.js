const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

// GET /api/teachers (Admin & Directory with teachers.view permission)
router.get('/', authenticate, requirePermission('teachers.view'), (req, res) => {
  const teachers = db.query(`
    SELECT t.*, u.username, u.is_active
    FROM teachers t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.full_name ASC
  `);

  // Attach assignments summary to each teacher
  const allAssignments = db.query(`
    SELECT ta.id, ta.teacher_id, ta.academic_year_id, ta.class_id, ta.section_id, ta.subject_id,
           c.name as class_name, s.name as section_name, s.full_name as section_full_name,
           sub.name as subject_name, sub.code as subject_code, y.name as academic_year_name
    FROM teacher_assignments ta
    JOIN classes c ON ta.class_id = c.id
    JOIN sections s ON ta.section_id = s.id
    JOIN subjects sub ON ta.subject_id = sub.id
    JOIN academic_years y ON ta.academic_year_id = y.id
  `);

  const results = teachers.map(t => ({
    ...t,
    assignments: allAssignments.filter(a => a.teacher_id === t.id)
  }));

  res.json(results);
});

// GET /api/teachers/my-assignments and /me/assignments (For logged-in Teacher)
router.get(['/my-assignments', '/me/assignments'], authenticate, (req, res) => {

  if (req.user.role !== 'teacher') {
    return res.status(400).json({ error: 'This endpoint is for teachers.' });
  }

  const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
  if (!teacher) {
    return res.status(404).json({ error: 'Teacher profile not found.' });
  }

  const assignments = db.query(`
    SELECT ta.id, ta.teacher_id, ta.academic_year_id, ta.class_id, ta.section_id, ta.subject_id,
           c.name as class_name, s.name as section_name, s.full_name as section_full_name,
           sub.name as subject_name, sub.code as subject_code, y.name as academic_year_name
    FROM teacher_assignments ta
    JOIN classes c ON ta.class_id = c.id
    JOIN sections s ON ta.section_id = s.id
    JOIN subjects sub ON ta.subject_id = sub.id
    JOIN academic_years y ON ta.academic_year_id = y.id
    WHERE ta.teacher_id = ?
    ORDER BY c.grade_level ASC, s.name ASC
  `, [teacher.id]);

  res.json({
    teacher_id: teacher.id,
    assignments
  });
});

// POST /api/teachers (Admin creates teacher)
router.post('/', authenticate, requireRole('admin'), (req, res) => {
  const { username, password, full_name, email, phone, qualification, staff_id } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and full name are required.' });
  }

  const existing = db.queryOne('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username.trim()]);
  if (existing) {
    return res.status(400).json({ error: `Username '${username}' is already taken.` });
  }

  const generatedStaffId = staff_id || `T-${Math.floor(100 + Math.random() * 900)}`;

  db.transaction(() => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const userRes = db.run(
      'INSERT INTO users (username, password_hash, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [username.trim(), hash, full_name.trim(), 'teacher', email || null, phone || null]
    );
    const userId = Number(userRes.lastInsertRowid);

    const teacherRes = db.run(
      'INSERT INTO teachers (user_id, staff_id, full_name, email, phone, qualification, join_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, generatedStaffId, full_name.trim(), email || null, phone || null, qualification || null, new Date().toISOString().split('T')[0]]
    );
    const teacherId = Number(teacherRes.lastInsertRowid);

    logAudit(req, {
      action: 'CREATE_TEACHER',
      entityType: 'TEACHER',
      entityId: teacherId,
      newValues: { teacher_id: teacherId, user_id: userId, staff_id: generatedStaffId, full_name, username }
    });

    res.status(201).json({
      id: teacherId,
      user_id: userId,
      staff_id: generatedStaffId,
      full_name,
      username,
      email,
      phone,
      qualification
    });
  });
});

// POST /api/teachers/assignments (Admin assigns teacher to class, section, subject)
router.post('/assignments', authenticate, requireRole('admin'), (req, res) => {
  const { teacher_id, academic_year_id, class_id, section_id, subject_id } = req.body;
  if (!teacher_id || !academic_year_id || !class_id || !section_id || !subject_id) {
    return res.status(400).json({ error: 'All assignment fields are required.' });
  }

  const existing = db.queryOne(
    'SELECT id FROM teacher_assignments WHERE teacher_id = ? AND academic_year_id = ? AND class_id = ? AND section_id = ? AND subject_id = ?',
    [teacher_id, academic_year_id, class_id, section_id, subject_id]
  );
  if (existing) {
    return res.status(400).json({ error: 'This exact teacher assignment already exists.' });
  }

  const result = db.run(
    'INSERT INTO teacher_assignments (teacher_id, academic_year_id, class_id, section_id, subject_id) VALUES (?, ?, ?, ?, ?)',
    [teacher_id, academic_year_id, class_id, section_id, subject_id]
  );

  logAudit(req, {
    action: 'CREATE_TEACHER_ASSIGNMENT',
    entityType: 'TEACHER_ASSIGNMENT',
    entityId: result.lastInsertRowid,
    newValues: req.body
  });

  res.status(201).json({ id: Number(result.lastInsertRowid), ...req.body });
});

// DELETE /api/teachers/assignments/:id (Admin removes assignment)
router.delete('/assignments/:id', authenticate, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const oldAssignment = db.queryOne('SELECT * FROM teacher_assignments WHERE id = ?', [id]);
  if (!oldAssignment) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  db.run('DELETE FROM teacher_assignments WHERE id = ?', [id]);

  logAudit(req, {
    action: 'DELETE_TEACHER_ASSIGNMENT',
    entityType: 'TEACHER_ASSIGNMENT',
    entityId: id,
    oldValues: oldAssignment
  });

  res.json({ success: true, message: 'Teacher assignment deleted.' });
});

module.exports = router;
