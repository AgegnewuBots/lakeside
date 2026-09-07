const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

// GET /api/assessments (List assessments with filters)
router.get('/', authenticate, (req, res) => {
  const { class_id, section_id, subject_id, academic_year_id, term_id } = req.query;

  let baseSql = `
    SELECT a.*, 
           c.name as class_name, 
           sec.name as section_name, sec.full_name as section_full_name,
           sub.name as subject_name, sub.code as subject_code,
           y.name as academic_year_name,
           t.name as term_name,
           (SELECT COUNT(*) FROM marks m WHERE m.assessment_id = a.id) as marks_entered_count,
           (SELECT COUNT(*) FROM student_class_assignments csa WHERE csa.class_id = a.class_id AND csa.section_id = a.section_id AND csa.academic_year_id = a.academic_year_id AND csa.status = 'Active') as total_students_count
    FROM assessments a
    JOIN classes c ON a.class_id = c.id
    JOIN sections sec ON a.section_id = sec.id
    JOIN subjects sub ON a.subject_id = sub.id
    JOIN academic_years y ON a.academic_year_id = y.id
    JOIN terms t ON a.term_id = t.id
    WHERE 1=1
  `;
  const params = [];

  // Teacher scoping rule: Teacher only sees assessments for assigned classes and subjects
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher) return res.status(403).json({ error: 'Teacher profile not found.' });

    baseSql += `
      AND EXISTS (
        SELECT 1 FROM teacher_assignments ta
        WHERE ta.teacher_id = ? 
          AND ta.class_id = a.class_id 
          AND ta.section_id = a.section_id 
          AND ta.subject_id = a.subject_id
      )
    `;
    params.push(teacher.id);
  }

  if (academic_year_id) {
    baseSql += ' AND a.academic_year_id = ?';
    params.push(academic_year_id);
  } else {
    baseSql += ' AND y.is_current = 1';
  }

  if (term_id) {
    baseSql += ' AND a.term_id = ?';
    params.push(term_id);
  }

  if (class_id) {
    baseSql += ' AND a.class_id = ?';
    params.push(class_id);
  }

  if (section_id) {
    baseSql += ' AND a.section_id = ?';
    params.push(section_id);
  }

  if (subject_id) {
    baseSql += ' AND a.subject_id = ?';
    params.push(subject_id);
  }

  baseSql += ' ORDER BY a.id DESC';

  const rows = db.query(baseSql, params);
  res.json(rows);
});

// GET /api/assessments/subject-summary (Get configured benchmarks and remaining points for a subject)
router.get('/subject-summary', authenticate, (req, res) => {
  const { class_id, section_id, subject_id, academic_year_id, term_id } = req.query;
  if (!class_id || !section_id || !subject_id) {
    return res.status(400).json({ error: 'class_id, section_id, and subject_id are required.' });
  }

  let yearId = academic_year_id;
  if (!yearId) {
    const curYear = db.queryOne('SELECT id FROM academic_years WHERE is_current = 1');
    yearId = curYear ? curYear.id : 1;
  }

  let termId = term_id;
  if (!termId) {
    const curTerm = db.queryOne('SELECT id FROM terms WHERE academic_year_id = ? AND is_current = 1', [yearId]);
    termId = curTerm ? curTerm.id : 1;
  }

  const list = db.query(`
    SELECT a.*,
           (SELECT COUNT(*) FROM marks m WHERE m.assessment_id = a.id) as marks_entered_count
    FROM assessments a
    WHERE a.academic_year_id = ? AND a.term_id = ? AND a.class_id = ? AND a.section_id = ? AND a.subject_id = ?
    ORDER BY a.id ASC
  `, [yearId, termId, class_id, section_id, subject_id]);

  const totalMax = list.reduce((sum, item) => sum + Number(item.max_marks || 0), 0);
  const remainingPoints = Math.max(0, 100 - totalMax);

  res.json({
    academic_year_id: Number(yearId),
    term_id: Number(termId),
    class_id: Number(class_id),
    section_id: Number(section_id),
    subject_id: Number(subject_id),
    total_max_marks: totalMax,
    max_limit: 100,
    remaining_points: remainingPoints,
    assessments: list
  });
});

// POST /api/assessments (Create assessment)
// Admin or assigned Teacher can create an assessment for their assigned class
router.post('/', authenticate, (req, res) => {
  const {
    academic_year_id,
    term_id,
    class_id,
    section_id,
    subject_id,
    name,
    assessment_type = 'Test',
    max_marks,
    weight_percentage = 0,
    assessment_date
  } = req.body;

  // Normalize assessment_type for database schema compatibility
  let normalizedType = assessment_type;
  if (assessment_type === 'NonAttended' || assessment_type === 'Non-attended Test' || assessment_type === 'Non-attended') {
    normalizedType = 'Test';
  } else if (!['Test', 'Mid', 'Final', 'Bonus', 'Custom'].includes(assessment_type)) {
    normalizedType = 'Test';
  }

  let yearId = academic_year_id;
  if (!yearId) {
    const curYear = db.queryOne('SELECT id FROM academic_years WHERE is_current = 1');
    yearId = curYear ? curYear.id : 1;
  }

  let termId = term_id;
  if (!termId) {
    const curTerm = db.queryOne('SELECT id FROM terms WHERE academic_year_id = ? AND is_current = 1', [yearId]);
    termId = curTerm ? curTerm.id : 1;
  }

  if (!class_id || !section_id || !subject_id || !name || max_marks === undefined || max_marks === null) {
    return res.status(400).json({ error: 'Class, section, subject, assessment name, and max marks are required.' });
  }

  const numericMaxMarks = parseFloat(max_marks);
  if (isNaN(numericMaxMarks) || numericMaxMarks <= 0) {
    return res.status(400).json({ error: 'Maximum marks must be a positive number greater than 0.' });
  }

  // Teacher check: If teacher, verify assignment
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    const isAssigned = db.queryOne(
      'SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND section_id = ? AND subject_id = ?',
      [teacher.id, class_id, section_id, subject_id]
    );
    if (!isAssigned) {
      return res.status(403).json({ error: 'You are not assigned to this class, section, and subject.' });
    }
  }

  // Enforce total subject maximum marks rule: Combined assessments for this subject cannot exceed 100
  const existingSum = db.queryOne(`
    SELECT COALESCE(SUM(max_marks), 0) as current_total
    FROM assessments
    WHERE academic_year_id = ? AND term_id = ? AND class_id = ? AND section_id = ? AND subject_id = ?
  `, [yearId, termId, class_id, section_id, subject_id]);

  const currentTotal = Number(existingSum ? existingSum.current_total : 0);
  if (currentTotal + numericMaxMarks > 100) {
    return res.status(400).json({
      error: `Total assessment marks for this subject cannot exceed 100. Currently configured: ${currentTotal} points. Adding ${numericMaxMarks} points would make total ${currentTotal + numericMaxMarks} points (Exceeds 100). Remaining allowance: ${Math.max(0, 100 - currentTotal)} points.`
    });
  }

  const result = db.run(`
    INSERT INTO assessments (academic_year_id, term_id, class_id, section_id, subject_id, name, assessment_type, max_marks, weight_percentage, assessment_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')
  `, [yearId, termId, class_id, section_id, subject_id, name.trim(), normalizedType, numericMaxMarks, weight_percentage, assessment_date || new Date().toISOString().split('T')[0]]);

  logAudit(req, {
    action: 'CREATE_ASSESSMENT',
    entityType: 'ASSESSMENT',
    entityId: result.lastInsertRowid,
    newValues: { ...req.body, max_marks: numericMaxMarks, assessment_type: normalizedType }
  });

  res.status(201).json({
    id: Number(result.lastInsertRowid),
    ...req.body,
    max_marks: numericMaxMarks,
    assessment_type: normalizedType,
    status: 'Open'
  });
});

module.exports = router;
