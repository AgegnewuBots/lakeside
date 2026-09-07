const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

// GET /api/academic/years
router.get('/years', authenticate, (req, res) => {
  const years = db.query('SELECT * FROM academic_years ORDER BY id DESC');
  res.json(years);
});

// POST /api/academic/years (Admin)
router.post('/years', authenticate, requireRole('admin'), (req, res) => {
  const { name, start_date, end_date, is_current } = req.body;
  if (!name) return res.status(400).json({ error: 'Academic year name is required.' });

  if (is_current) {
    db.run('UPDATE academic_years SET is_current = 0');
  }

  const result = db.run(
    'INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES (?, ?, ?, ?)',
    [name, start_date || null, end_date || null, is_current ? 1 : 0]
  );

  logAudit(req, {
    action: 'CREATE_ACADEMIC_YEAR',
    entityType: 'ACADEMIC_YEAR',
    entityId: result.lastInsertRowid,
    newValues: req.body
  });

  res.status(201).json({ id: Number(result.lastInsertRowid), ...req.body });
});

// GET /api/academic/terms
router.get('/terms', authenticate, (req, res) => {
  const { academic_year_id } = req.query;
  let sql = 'SELECT t.*, y.name as academic_year_name FROM terms t JOIN academic_years y ON t.academic_year_id = y.id';
  const params = [];
  if (academic_year_id) {
    sql += ' WHERE t.academic_year_id = ?';
    params.push(academic_year_id);
  }
  sql += ' ORDER BY t.id ASC';
  const terms = db.query(sql, params);
  res.json(terms);
});

// POST /api/academic/terms (Admin)
router.post('/terms', authenticate, requireRole('admin'), (req, res) => {
  const { academic_year_id, name, is_current } = req.body;
  if (!academic_year_id || !name) return res.status(400).json({ error: 'Academic year and term name required.' });

  if (is_current) {
    db.run('UPDATE terms SET is_current = 0 WHERE academic_year_id = ?', [academic_year_id]);
  }

  const result = db.run(
    'INSERT INTO terms (academic_year_id, name, is_current) VALUES (?, ?, ?)',
    [academic_year_id, name, is_current ? 1 : 0]
  );

  logAudit(req, {
    action: 'CREATE_TERM',
    entityType: 'TERM',
    entityId: result.lastInsertRowid,
    newValues: req.body
  });

  res.status(201).json({ id: Number(result.lastInsertRowid), ...req.body });
});

// GET /api/academic/classes
router.get('/classes', authenticate, (req, res) => {
  const classes = db.query('SELECT * FROM classes ORDER BY grade_level ASC');
  const sections = db.query(`
    SELECT s.*,
           (SELECT COUNT(*) FROM student_class_assignments sca WHERE sca.section_id = s.id AND sca.status = 'Active') as student_count
    FROM sections s
    ORDER BY s.name ASC
  `);
  const classSubjects = db.query(`
    SELECT cs.id as class_subject_id, cs.class_id, s.id, s.name, s.code
    FROM class_subjects cs
    JOIN subjects s ON cs.subject_id = s.id
    ORDER BY s.name ASC
  `);

  // Nest sections and subjects under respective class
  const data = classes.map(c => ({
    ...c,
    sections: sections.filter(s => s.class_id === c.id),
    subjects: classSubjects.filter(cs => cs.class_id === c.id)
  }));

  res.json(data);
});

// POST /api/academic/classes (Admin & Directory)
router.post('/classes', authenticate, requireRole('admin', 'directory', 'director', 'records'), (req, res) => {
  const { name, grade_level, section_names } = req.body;
  if (!name || grade_level === undefined) {
    return res.status(400).json({ error: 'Class name and numeric grade level are required.' });
  }

  db.transaction(() => {
    const classRes = db.run('INSERT INTO classes (name, grade_level) VALUES (?, ?)', [name, grade_level]);
    const classId = Number(classRes.lastInsertRowid);

    const sectionsCreated = [];
    const secList = Array.isArray(section_names) && section_names.length ? section_names : ['A', 'B'];
    for (const secName of secList) {
      const fullName = `${name}${secName}`;
      const secRes = db.run('INSERT INTO sections (class_id, name, full_name) VALUES (?, ?, ?)', [classId, secName, fullName]);
      sectionsCreated.push({ id: Number(secRes.lastInsertRowid), class_id: classId, name: secName, full_name: fullName });
    }

    logAudit(req, {
      action: 'CREATE_CLASS',
      entityType: 'CLASS',
      entityId: classId,
      newValues: { name, grade_level, sections: sectionsCreated }
    });

    res.status(201).json({ id: classId, name, grade_level, sections: sectionsCreated, subjects: [] });
  });
});

// POST /api/academic/sections (Admin & Directory)
router.post('/sections', authenticate, requireRole('admin', 'directory', 'director', 'records'), (req, res) => {
  const { class_id, name } = req.body;
  if (!class_id || !name) return res.status(400).json({ error: 'Class ID and section name required.' });

  const parentClass = db.queryOne('SELECT name FROM classes WHERE id = ?', [class_id]);
  if (!parentClass) return res.status(404).json({ error: 'Parent class not found.' });

  const fullName = `${parentClass.name}${name.trim().toUpperCase()}`;
  const result = db.run('INSERT INTO sections (class_id, name, full_name) VALUES (?, ?, ?)', [class_id, name.trim().toUpperCase(), fullName]);

  logAudit(req, {
    action: 'CREATE_SECTION',
    entityType: 'SECTION',
    entityId: result.lastInsertRowid,
    newValues: { class_id, name, full_name: fullName }
  });

  res.status(201).json({ id: Number(result.lastInsertRowid), class_id, name, full_name: fullName });
});

// DELETE /api/academic/sections/:id (Admin & Directory)
router.delete('/sections/:id', authenticate, requireRole('admin', 'directory', 'director', 'records'), (req, res) => {
  const sectionId = parseInt(req.params.id, 10);
  const section = db.queryOne('SELECT * FROM sections WHERE id = ?', [sectionId]);
  if (!section) return res.status(404).json({ error: 'Section not found.' });

  // Guard against deleting section with active student enrollments
  const studentCount = db.queryOne(
    "SELECT COUNT(*) as count FROM student_class_assignments WHERE section_id = ? AND status = 'Active'",
    [sectionId]
  );
  if (studentCount && studentCount.count > 0) {
    return res.status(400).json({
      error: `Cannot delete section ${section.full_name} because it has ${studentCount.count} active student enrollment(s).`
    });
  }

  db.transaction(() => {
    // Delete any teacher assignments for this section
    db.run('DELETE FROM teacher_assignments WHERE section_id = ?', [sectionId]);
    // Delete section
    db.run('DELETE FROM sections WHERE id = ?', [sectionId]);

    logAudit(req, {
      action: 'DELETE_SECTION',
      entityType: 'SECTION',
      entityId: sectionId,
      oldValues: section
    });

    res.json({ success: true, message: `Section ${section.full_name} removed successfully.` });
  });
});

// POST /api/academic/classes/:classId/subjects (Add Subject to Class - Admin & Directory)
router.post('/classes/:classId/subjects', authenticate, requireRole('admin', 'directory', 'director', 'records'), (req, res) => {
  const classId = parseInt(req.params.classId, 10);
  const { subject_id, name, code } = req.body;

  const targetClass = db.queryOne('SELECT id, name FROM classes WHERE id = ?', [classId]);
  if (!targetClass) return res.status(404).json({ error: 'Class not found.' });

  let targetSubjectId = subject_id;

  // If name and code provided without subject_id, find or create subject
  if (!targetSubjectId && name && code) {
    const existing = db.queryOne('SELECT id FROM subjects WHERE code = ? OR name = ?', [code.trim().toUpperCase(), name.trim()]);
    if (existing) {
      targetSubjectId = existing.id;
    } else {
      const subRes = db.run('INSERT INTO subjects (name, code) VALUES (?, ?)', [name.trim(), code.trim().toUpperCase()]);
      targetSubjectId = Number(subRes.lastInsertRowid);
    }
  }

  if (!targetSubjectId) {
    return res.status(400).json({ error: 'Subject ID or Name & Code required.' });
  }

  const subject = db.queryOne('SELECT * FROM subjects WHERE id = ?', [targetSubjectId]);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });

  // Add to class_subjects
  try {
    const result = db.run(
      'INSERT OR IGNORE INTO class_subjects (class_id, subject_id) VALUES (?, ?)',
      [classId, targetSubjectId]
    );

    logAudit(req, {
      action: 'ADD_CLASS_SUBJECT',
      entityType: 'CLASS_SUBJECT',
      entityId: result.lastInsertRowid || targetSubjectId,
      newValues: { class_id: classId, class_name: targetClass.name, subject_id: targetSubjectId, subject_name: subject.name, subject_code: subject.code }
    });

    res.status(201).json({
      class_id: classId,
      id: subject.id,
      name: subject.name,
      code: subject.code,
      message: `Subject ${subject.name} successfully assigned to ${targetClass.name}.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign subject to class: ' + err.message });
  }
});

// DELETE /api/academic/classes/:classId/subjects/:subjectId (Remove Subject from Class - Admin & Directory)
router.delete('/classes/:classId/subjects/:subjectId', authenticate, requireRole('admin', 'directory', 'director', 'records'), (req, res) => {
  const classId = parseInt(req.params.classId, 10);
  const subjectId = parseInt(req.params.subjectId, 10);

  const targetClass = db.queryOne('SELECT name FROM classes WHERE id = ?', [classId]);
  const targetSubject = db.queryOne('SELECT name, code FROM subjects WHERE id = ?', [subjectId]);

  db.run('DELETE FROM class_subjects WHERE class_id = ? AND subject_id = ?', [classId, subjectId]);

  logAudit(req, {
    action: 'REMOVE_CLASS_SUBJECT',
    entityType: 'CLASS_SUBJECT',
    entityId: subjectId,
    newValues: { class_id: classId, class_name: targetClass?.name, subject_id: subjectId, subject_name: targetSubject?.name }
  });

  res.json({ success: true, message: 'Subject removed from class.' });
});

// GET /api/academic/subjects
router.get('/subjects', authenticate, (req, res) => {
  const subjects = db.query('SELECT * FROM subjects ORDER BY name ASC');
  res.json(subjects);
});

// POST /api/academic/subjects (Admin & Directory)
router.post('/subjects', authenticate, requireRole('admin', 'directory', 'director', 'records'), (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Subject name and code are required.' });

  try {
    const result = db.run('INSERT INTO subjects (name, code) VALUES (?, ?)', [name.trim(), code.trim().toUpperCase()]);

    logAudit(req, {
      action: 'CREATE_SUBJECT',
      entityType: 'SUBJECT',
      entityId: result.lastInsertRowid,
      newValues: { name: name.trim(), code: code.trim().toUpperCase() }
    });

    res.status(201).json({ id: Number(result.lastInsertRowid), name: name.trim(), code: code.trim().toUpperCase() });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A subject with this name or code already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/academic/subjects/:id (Edit Subject - Admin & Directory)
router.put('/subjects/:id', authenticate, requireRole('admin', 'directory', 'director', 'records'), (req, res) => {
  const subjectId = parseInt(req.params.id, 10);
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Subject name and code are required.' });

  const existing = db.queryOne('SELECT * FROM subjects WHERE id = ?', [subjectId]);
  if (!existing) return res.status(404).json({ error: 'Subject not found.' });

  try {
    db.run('UPDATE subjects SET name = ?, code = ? WHERE id = ?', [name.trim(), code.trim().toUpperCase(), subjectId]);

    logAudit(req, {
      action: 'UPDATE_SUBJECT',
      entityType: 'SUBJECT',
      entityId: subjectId,
      oldValues: existing,
      newValues: { id: subjectId, name: name.trim(), code: code.trim().toUpperCase() }
    });

    res.json({ id: subjectId, name: name.trim(), code: code.trim().toUpperCase() });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'A subject with this name or code already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/academic/subjects/:id (Delete Subject - Admin & Directory)
router.delete('/subjects/:id', authenticate, requireRole('admin', 'directory', 'director', 'records'), (req, res) => {
  const subjectId = parseInt(req.params.id, 10);
  const existing = db.queryOne('SELECT * FROM subjects WHERE id = ?', [subjectId]);
  if (!existing) return res.status(404).json({ error: 'Subject not found.' });

  // Guard against deleting subject with recorded marks or assessments
  const linkedAssessment = db.queryOne('SELECT COUNT(*) as count FROM assessments WHERE subject_id = ?', [subjectId]);
  if (linkedAssessment && linkedAssessment.count > 0) {
    return res.status(400).json({ error: `Cannot delete subject "${existing.name}" because it has ${linkedAssessment.count} active assessment(s) recorded.` });
  }

  db.transaction(() => {
    db.run('DELETE FROM class_subjects WHERE subject_id = ?', [subjectId]);
    db.run('DELETE FROM teacher_assignments WHERE subject_id = ?', [subjectId]);
    db.run('DELETE FROM subjects WHERE id = ?', [subjectId]);

    logAudit(req, {
      action: 'DELETE_SUBJECT',
      entityType: 'SUBJECT',
      entityId: subjectId,
      oldValues: existing
    });

    res.json({ success: true, message: `Subject "${existing.name}" (${existing.code}) deleted successfully.` });
  });
});

// GET /api/academic/promotion-evaluations
// Evaluates active students against the minimum passing promotion average threshold
router.get('/promotion-evaluations', authenticate, (req, res) => {
  const { academic_year_id, class_id, section_id, min_average } = req.query;

  // Resolve academic year
  let yearId = academic_year_id;
  if (!yearId) {
    const curYear = db.queryOne('SELECT id FROM academic_years WHERE is_current = 1');
    yearId = curYear ? curYear.id : 1;
  }

  // Resolve minimum average threshold
  let resolvedMin = min_average !== undefined && min_average !== '' ? parseFloat(min_average) : null;
  if (resolvedMin === null || isNaN(resolvedMin)) {
    const settingRow = db.queryOne("SELECT value FROM school_settings WHERE key = 'promotion_min_average'");
    resolvedMin = settingRow && settingRow.value ? parseFloat(settingRow.value) : 50.0;
  }

  // Query active students
  let studentSql = `
    SELECT s.id as student_id, s.student_id as student_code, s.full_name, s.gender,
           c.id as class_id, c.name as class_name, c.grade_level,
           sec.id as section_id, sec.name as section_name, sec.full_name as section_full_name,
           p.full_name as parent_name, p.phone_number as parent_phone
    FROM students s
    JOIN student_class_assignments csa ON s.id = csa.student_id
    JOIN classes c ON csa.class_id = c.id
    JOIN sections sec ON csa.section_id = sec.id
    LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1
    LEFT JOIN parents p ON sp.parent_id = p.id
    WHERE csa.academic_year_id = ? AND csa.status = 'Active'
  `;
  const studentParams = [yearId];

  if (class_id) {
    studentSql += ' AND csa.class_id = ?';
    studentParams.push(class_id);
  }

  if (section_id) {
    studentSql += ' AND csa.section_id = ?';
    studentParams.push(section_id);
  }

  studentSql += ' ORDER BY c.grade_level ASC, sec.name ASC, s.full_name ASC';

  const students = db.query(studentSql, studentParams);

  if (students.length === 0) {
    return res.json({
      summary: {
        total_students: 0,
        promoted_count: 0,
        retained_count: 0,
        pending_count: 0,
        class_overall_average: 0,
        min_passing_average: resolvedMin
      },
      evaluations: []
    });
  }

  // Query marks for these students in this academic year
  const marksSql = `
    SELECT m.student_id, m.marks_obtained, m.is_absent,
           a.id as assessment_id, a.name as assessment_name, a.max_marks, a.assessment_type,
           sub.id as subject_id, sub.name as subject_name, sub.code as subject_code
    FROM marks m
    JOIN assessments a ON m.assessment_id = a.id
    JOIN subjects sub ON a.subject_id = sub.id
    WHERE a.academic_year_id = ?
  `;
  const marks = db.query(marksSql, [yearId]);

  const marksByStudent = {};
  for (const m of marks) {
    if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = [];
    marksByStudent[m.student_id].push(m);
  }

  let totalScoreSum = 0;
  let studentsWithMarksCount = 0;
  let promotedCount = 0;
  let retainedCount = 0;
  let pendingCount = 0;

  const evaluations = students.map(student => {
    const studentMarks = marksByStudent[student.student_id] || [];
    const subjectsMap = {};

    let totalObtained = 0;
    let totalMax = 0;

    for (const m of studentMarks) {
      if (!subjectsMap[m.subject_id]) {
        subjectsMap[m.subject_id] = {
          subject_id: m.subject_id,
          subject_name: m.subject_name,
          subject_code: m.subject_code,
          marks_obtained: 0,
          max_marks: 0,
          assessments_count: 0
        };
      }

      if (!m.is_absent && m.marks_obtained !== null && m.marks_obtained !== undefined) {
        subjectsMap[m.subject_id].marks_obtained += Number(m.marks_obtained);
        totalObtained += Number(m.marks_obtained);
      }
      subjectsMap[m.subject_id].max_marks += Number(m.max_marks);
      subjectsMap[m.subject_id].assessments_count++;
      totalMax += Number(m.max_marks);
    }

    const subjectBreakdown = Object.values(subjectsMap).map(sub => {
      const pct = sub.max_marks > 0 ? parseFloat(((sub.marks_obtained / sub.max_marks) * 100).toFixed(1)) : 0;
      return {
        ...sub,
        percentage: pct,
        passed: pct >= resolvedMin
      };
    });

    const failedSubjects = subjectBreakdown.filter(s => !s.passed);
    let overallAverage = 0;
    let status = 'Pending Evaluation';

    if (totalMax > 0) {
      overallAverage = parseFloat(((totalObtained / totalMax) * 100).toFixed(2));
      totalScoreSum += overallAverage;
      studentsWithMarksCount++;

      if (overallAverage >= resolvedMin) {
        status = 'Promoted';
        promotedCount++;
      } else {
        status = 'Retained';
        retainedCount++;
      }
    } else {
      pendingCount++;
    }

    return {
      student_id: student.student_id,
      student_code: student.student_code,
      full_name: student.full_name,
      gender: student.gender,
      class_id: student.class_id,
      class_name: student.class_name,
      grade_level: student.grade_level,
      section_id: student.section_id,
      section_name: student.section_name,
      section_full_name: student.section_full_name,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      total_obtained: parseFloat(totalObtained.toFixed(1)),
      total_max: parseFloat(totalMax.toFixed(1)),
      overall_average: overallAverage,
      status,
      failed_subjects_count: failedSubjects.length,
      subject_breakdown: subjectBreakdown
    };
  });

  const classOverallAverage = studentsWithMarksCount > 0
    ? parseFloat((totalScoreSum / studentsWithMarksCount).toFixed(2))
    : 0;

  res.json({
    summary: {
      total_students: students.length,
      promoted_count: promotedCount,
      retained_count: retainedCount,
      pending_count: pendingCount,
      class_overall_average: classOverallAverage,
      min_passing_average: resolvedMin
    },
    evaluations
  });
});

module.exports = router;
