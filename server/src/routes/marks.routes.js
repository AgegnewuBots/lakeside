const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/marks (Get marks for an assessment, including all enrolled students)
router.get('/', authenticate, (req, res) => {
  const { assessment_id } = req.query;
  if (!assessment_id) {
    return res.status(400).json({ error: 'Assessment ID is required.' });
  }

  const assessment = db.queryOne(`
    SELECT a.*, c.name as class_name, sec.full_name as section_full_name,
           sub.name as subject_name, sub.code as subject_code,
           y.name as academic_year_name, t.name as term_name
    FROM assessments a
    JOIN classes c ON a.class_id = c.id
    JOIN sections sec ON a.section_id = sec.id
    JOIN subjects sub ON a.subject_id = sub.id
    JOIN academic_years y ON a.academic_year_id = y.id
    JOIN terms t ON a.term_id = t.id
    WHERE a.id = ?
  `, [assessment_id]);

  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found.' });
  }

  // Teacher check: If teacher, must be assigned to this assessment's class/section/subject
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    const isAssigned = db.queryOne(`
      SELECT 1 FROM teacher_assignments 
      WHERE teacher_id = ? AND class_id = ? AND section_id = ? AND subject_id = ?
    `, [teacher.id, assessment.class_id, assessment.section_id, assessment.subject_id]);

    if (!isAssigned) {
      return res.status(403).json({ error: 'Access denied. You are not assigned to teach this assessment\'s class and subject.' });
    }
  }

  // Get all active students enrolled in this class and section for this academic year
  const students = db.query(`
    SELECT s.id as student_id, s.student_id as student_code, s.full_name, s.gender,
           csa.roll_number,
           m.id as mark_id, m.marks_obtained, m.is_absent, m.remarks, m.updated_at,
           u.full_name as last_updated_by
    FROM student_class_assignments csa
    JOIN students s ON csa.student_id = s.id
    LEFT JOIN marks m ON m.assessment_id = ? AND m.student_id = s.id
    LEFT JOIN users u ON m.entered_by_user_id = u.id
    WHERE csa.class_id = ? AND csa.section_id = ? AND csa.academic_year_id = ? AND csa.status = 'Active'
    ORDER BY csa.roll_number ASC, s.full_name ASC
  `, [assessment.id, assessment.class_id, assessment.section_id, assessment.academic_year_id]);

  res.json({
    assessment,
    students
  });
});

// POST /api/marks/batch (Enter/save marks for multiple students in an assessment)
router.post('/batch', authenticate, (req, res) => {
  const { assessment_id, entries, marks } = req.body;
  const entriesList = entries || marks;
  if (!assessment_id || !Array.isArray(entriesList)) {
    return res.status(400).json({ error: 'Assessment ID and entries array are required.' });
  }

  const assessment = db.queryOne('SELECT * FROM assessments WHERE id = ?', [assessment_id]);
  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found.' });
  }

  // Teacher check
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    const isAssigned = db.queryOne(`
      SELECT 1 FROM teacher_assignments 
      WHERE teacher_id = ? AND class_id = ? AND section_id = ? AND subject_id = ?
    `, [teacher.id, assessment.class_id, assessment.section_id, assessment.subject_id]);

    if (!isAssigned) {
      return res.status(403).json({ error: 'Access denied. You are not assigned to this class and subject.' });
    }
  }

  db.transaction(() => {
    for (const entry of entriesList) {
      const student_id = entry.student_id;
      const marks_obtained = entry.marks_obtained !== undefined ? entry.marks_obtained : entry.score;
      const { is_absent = 0, remarks = '' } = entry;
      if (!student_id) continue;

      // Validate max marks
      if (!is_absent && marks_obtained !== null && marks_obtained !== undefined) {
        const numericMark = parseFloat(marks_obtained);
        if (numericMark < 0 || numericMark > assessment.max_marks) {
          throw new Error(`Mark ${numericMark} exceeds maximum allowed mark of ${assessment.max_marks}.`);
        }
      }

      // Check existing mark
      const existing = db.queryOne('SELECT * FROM marks WHERE assessment_id = ? AND student_id = ?', [assessment_id, student_id]);

      if (existing) {
        db.run(`
          UPDATE marks 
          SET marks_obtained = ?, is_absent = ?, remarks = ?, entered_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [is_absent ? null : marks_obtained, is_absent ? 1 : 0, remarks, req.user.id, existing.id]);
      } else {
        db.run(`
          INSERT INTO marks (assessment_id, student_id, marks_obtained, is_absent, remarks, entered_by_user_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [assessment_id, student_id, is_absent ? null : marks_obtained, is_absent ? 1 : 0, remarks, req.user.id]);
      }
    }

    logAudit(req, {
      action: 'BATCH_ENTER_MARKS',
      entityType: 'ASSESSMENT_MARKS',
      entityId: assessment_id,
      newValues: { count: entries.length, assessment_name: assessment.name }
    });

    res.json({ success: true, message: `Successfully recorded marks for ${entries.length} students.` });
  });
});

// PUT /api/marks/:id/adjust (Mark Adjustment with mandatory reason and history)
router.put('/:id/adjust', authenticate, (req, res) => {
  const { id } = req.params;
  const { reason, is_absent = 0, remarks } = req.body;
  const new_mark = req.body.new_mark !== undefined ? req.body.new_mark : req.body.new_score;

  if (new_mark === undefined && !is_absent) {
    return res.status(400).json({ error: 'New mark is required.' });
  }

  if (reason !== undefined && (!reason || !reason.trim())) {
    return res.status(400).json({ error: 'A valid reason for mark adjustment is mandatory.' });
  }

  const noteReason = (reason && typeof reason === 'string' && reason.trim()) 
    ? reason.trim() 
    : (remarks && typeof remarks === 'string' && remarks.trim()) 
    ? remarks.trim() 
    : 'Score adjusted by teacher';

  const currentMark = db.queryOne(`
    SELECT m.*, a.max_marks, a.name as assessment_name, a.class_id, a.section_id, a.subject_id,
           s.full_name as student_name, s.student_id as student_code, sub.name as subject_name
    FROM marks m
    JOIN assessments a ON m.assessment_id = a.id
    JOIN students s ON m.student_id = s.id
    JOIN subjects sub ON a.subject_id = sub.id
    WHERE m.id = ?
  `, [id]);

  if (!currentMark) {
    return res.status(404).json({ error: 'Mark record not found.' });
  }

  // Teacher check
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    const isAssigned = db.queryOne(`
      SELECT 1 FROM teacher_assignments 
      WHERE teacher_id = ? AND class_id = ? AND section_id = ? AND subject_id = ?
    `, [teacher.id, currentMark.class_id, currentMark.section_id, currentMark.subject_id]);

    if (!isAssigned) {
      return res.status(403).json({ error: 'Access denied. You are not assigned to edit marks for this student.' });
    }
  }

  const parsedMark = is_absent ? null : parseFloat(new_mark);
  if (!is_absent && (parsedMark < 0 || parsedMark > currentMark.max_marks)) {
    return res.status(400).json({ error: `Mark ${parsedMark} exceeds maximum allowed mark of ${currentMark.max_marks}.` });
  }

  db.transaction(() => {
    // 1. Update mark record
    db.run(`
      UPDATE marks 
      SET marks_obtained = ?, is_absent = ?, remarks = ?, entered_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [parsedMark, is_absent ? 1 : 0, remarks || currentMark.remarks, req.user.id, currentMark.id]);

    // 2. Insert into immutable mark_history
    db.run(`
      INSERT INTO mark_history (mark_id, assessment_id, student_id, previous_mark, new_mark, reason, changed_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [currentMark.id, currentMark.assessment_id, currentMark.student_id, currentMark.marks_obtained, parsedMark, noteReason, req.user.id]);

    // 3. Security Audit Log with detailed diff
    logAudit(req, {
      action: 'ADJUST_MARK',
      entityType: 'MARK',
      entityId: currentMark.id,
      oldValues: {
        mark: currentMark.marks_obtained,
        student: currentMark.student_name,
        student_id: currentMark.student_code,
        assessment: currentMark.assessment_name,
        subject: currentMark.subject_name
      },
      newValues: {
        mark: parsedMark,
        reason: reason.trim(),
        student: currentMark.student_name,
        student_id: currentMark.student_code,
        assessment: currentMark.assessment_name,
        subject: currentMark.subject_name
      }
    });

    res.json({
      success: true,
      message: `Mark adjusted successfully from ${currentMark.marks_obtained} to ${parsedMark}. History recorded.`,
      adjusted_mark: parsedMark
    });
  });
});

// GET /api/marks/history/:mark_id (View adjustment history for a specific mark)
router.get('/history/:mark_id', authenticate, (req, res) => {
  const { mark_id } = req.params;
  const history = db.query(`
    SELECT mh.*, u.full_name as changed_by_name, u.role as changed_by_role
    FROM mark_history mh
    JOIN users u ON mh.changed_by_user_id = u.id
    WHERE mh.mark_id = ?
    ORDER BY mh.changed_at DESC
  `, [mark_id]);

  res.json(history);
});

module.exports = router;
