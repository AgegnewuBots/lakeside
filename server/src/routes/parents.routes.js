const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

// GET /api/parents (Admin & Directory with parents.view permission)
router.get('/', authenticate, requirePermission('parents.view'), (req, res) => {
  const { q } = req.query;
  let sql = 'SELECT * FROM parents';
  const params = [];

  if (q) {
    sql += ' WHERE full_name LIKE ? COLLATE NOCASE OR phone_number LIKE ?';
    params.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }
  sql += ' ORDER BY full_name ASC';

  const parents = db.query(sql, params);

  // Fetch children for each parent
  const links = db.query(`
    SELECT sp.parent_id, sp.relationship, sp.is_primary, sp.sms_enabled,
           s.id as student_id, s.student_id as student_code, s.full_name as student_name,
           sec.full_name as class_section
    FROM student_parents sp
    JOIN students s ON sp.student_id = s.id
    LEFT JOIN student_class_assignments csa ON s.id = csa.student_id AND csa.status = 'Active'
    LEFT JOIN sections sec ON csa.section_id = sec.id
  `);

  // Auto-detect sibling families based on shared phone or shared father name
  const results = parents.map(p => {
    const parentChildren = links.filter(l => l.parent_id === p.id);
    const isAutoFamily = parentChildren.length > 1;
    return {
      ...p,
      is_auto_family: isAutoFamily,
      family_label: isAutoFamily ? `One Family (${parentChildren.length} Siblings)` : 'Single Student',
      children: parentChildren
    };
  });

  res.json(results);
});

// POST /api/parents (Create or update parent)
router.post('/', authenticate, requirePermission('parents.create'), (req, res) => {
  const { full_name, phone_number, email, address, occupation } = req.body;
  if (!full_name || !phone_number) {
    return res.status(400).json({ error: 'Full name and phone number are required.' });
  }

  const result = db.run(
    'INSERT INTO parents (full_name, phone_number, email, address, occupation) VALUES (?, ?, ?, ?, ?)',
    [full_name.trim(), phone_number.trim(), email || null, address || null, occupation || null]
  );

  logAudit(req, {
    action: 'CREATE_PARENT',
    entityType: 'PARENT',
    entityId: result.lastInsertRowid,
    newValues: req.body
  });

  res.status(201).json({ id: Number(result.lastInsertRowid), ...req.body });
});

// POST /api/parents/:id/link-student
router.post('/:id/link-student', authenticate, requirePermission('parents.update'), (req, res) => {
  const { id } = req.params;
  const { student_id, relationship = 'Father', is_primary = 0, sms_enabled = 1 } = req.body;

  if (!student_id) return res.status(400).json({ error: 'Student ID is required.' });

  const parent = db.queryOne('SELECT * FROM parents WHERE id = ?', [id]);
  if (!parent) return res.status(404).json({ error: 'Parent not found.' });

  const student = db.queryOne('SELECT * FROM students WHERE id = ? OR student_id = ?', [student_id, student_id]);
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  // If setting this to primary, unset previous primary for this student
  if (is_primary) {
    db.run('UPDATE student_parents SET is_primary = 0 WHERE student_id = ?', [student.id]);
  }

  db.run(`
    INSERT INTO student_parents (student_id, parent_id, relationship, is_primary, sms_enabled)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(student_id, parent_id) DO UPDATE SET
      relationship = excluded.relationship,
      is_primary = excluded.is_primary,
      sms_enabled = excluded.sms_enabled
  `, [student.id, parent.id, relationship, is_primary ? 1 : 0, sms_enabled ? 1 : 0]);

  logAudit(req, {
    action: 'LINK_PARENT_STUDENT',
    entityType: 'STUDENT_PARENT',
    entityId: `${student.id}-${parent.id}`,
    newValues: { parent_name: parent.full_name, student_name: student.full_name, relationship }
  });

  res.json({ success: true, message: `Linked parent ${parent.full_name} to student ${student.full_name}.` });
});

// PUT /api/parents/:id
router.put('/:id', authenticate, requirePermission('parents.update'), (req, res) => {
  const { id } = req.params;
  const { full_name, phone_number, email, address, occupation } = req.body;

  const current = db.queryOne('SELECT * FROM parents WHERE id = ?', [id]);
  if (!current) return res.status(404).json({ error: 'Parent not found.' });

  db.run(`
    UPDATE parents SET full_name = ?, phone_number = ?, email = ?, address = ?, occupation = ?
    WHERE id = ?
  `, [
    full_name ? full_name.trim() : current.full_name,
    phone_number ? phone_number.trim() : current.phone_number,
    email !== undefined ? email : current.email,
    address !== undefined ? address : current.address,
    occupation !== undefined ? occupation : current.occupation,
    id
  ]);

  logAudit(req, {
    action: 'UPDATE_PARENT',
    entityType: 'PARENT',
    entityId: id,
    oldValues: current,
    newValues: req.body
  });

  res.json({ success: true, message: 'Parent details updated successfully.' });
});

module.exports = router;
