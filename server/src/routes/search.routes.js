const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/search/students
router.get('/students', authenticate, (req, res) => {
  const { q = '', class_id, section_id, academic_year_id } = req.query;
  const queryTerm = q.trim();

  let baseSql = `
    SELECT s.id, s.student_id, s.full_name, s.gender, s.date_of_birth, s.status,
           c.id as class_id, c.name as class_name, 
           sec.id as section_id, sec.name as section_name, sec.full_name as section_full_name,
           y.id as academic_year_id, y.name as academic_year_name,
           csa.roll_number,
           p.full_name as parent_name, p.phone_number as parent_phone
    FROM students s
    JOIN student_class_assignments csa ON s.id = csa.student_id
    JOIN classes c ON csa.class_id = c.id
    JOIN sections sec ON csa.section_id = sec.id
    JOIN academic_years y ON csa.academic_year_id = y.id
    LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1
    LEFT JOIN parents p ON sp.parent_id = p.id
    WHERE 1=1
  `;
  const params = [];

  // Teacher scoping rule: Teacher can ONLY search within their assigned classes
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher) return res.status(403).json({ error: 'Teacher profile not found.' });

    baseSql += `
      AND EXISTS (
        SELECT 1 FROM teacher_assignments ta 
        WHERE ta.teacher_id = ? 
          AND ta.class_id = csa.class_id 
          AND ta.section_id = csa.section_id
      )
    `;
    params.push(teacher.id);
  }

  // Academic year (defaults to current)
  if (academic_year_id) {
    baseSql += ' AND csa.academic_year_id = ?';
    params.push(academic_year_id);
  } else {
    baseSql += ' AND y.is_current = 1';
  }

  // Filter by class or section
  if (class_id) {
    if (class_id === 'ALL_KG') {
      baseSql += " AND c.name LIKE 'KG%'";
    } else if (class_id === 'ALL_PRIMARY') {
      baseSql += " AND c.name LIKE 'Grade%'";
    } else {
      baseSql += ' AND csa.class_id = ?';
      params.push(class_id);
    }
  }
  if (section_id) {
    baseSql += ' AND csa.section_id = ?';
    params.push(section_id);
  }

  // If query search term provided: Match student_id, name, parent name, or parent phone
  if (queryTerm) {
    baseSql += `
      AND (
        s.student_id LIKE ? OR
        s.full_name LIKE ? COLLATE NOCASE OR
        p.full_name LIKE ? COLLATE NOCASE OR
        p.phone_number LIKE ?
      )
    `;
    const wildcard = `%${queryTerm}%`;
    params.push(wildcard, wildcard, wildcard, wildcard);
  }

  baseSql += ' ORDER BY s.full_name ASC LIMIT 50';

  const results = db.query(baseSql, params);
  res.json({
    total: results.length,
    query: queryTerm,
    students: results
  });
});

// GET /api/search/global - Multi-entity fast search for the top navigation bar
router.get('/global', authenticate, (req, res) => {
  const { q = '' } = req.query;
  const term = q.trim();
  if (!term) {
    return res.json({ query: '', students: [], teachers: [], parents: [], total: 0 });
  }

  const wildcard = `%${term}%`;

  // Teacher Scoping Barrier: Teachers can ONLY search their assigned students, never other staff or parents
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher) return res.status(403).json({ error: 'Teacher profile not found.' });

    const students = db.query(`
      SELECT s.id, s.student_id, s.full_name, s.gender, sec.full_name as section_full_name, 
             p.full_name as parent_name, p.phone_number as parent_phone
      FROM students s
      JOIN student_class_assignments csa ON s.id = csa.student_id
      JOIN sections sec ON csa.section_id = sec.id
      JOIN academic_years y ON csa.academic_year_id = y.id AND y.is_current = 1
      LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1
      LEFT JOIN parents p ON sp.parent_id = p.id
      WHERE (s.student_id LIKE ? OR s.full_name LIKE ? COLLATE NOCASE OR p.phone_number LIKE ?)
        AND EXISTS (
          SELECT 1 FROM teacher_assignments ta 
          WHERE ta.teacher_id = ? 
            AND ta.class_id = csa.class_id 
            AND ta.section_id = csa.section_id
        )
      GROUP BY s.id
      ORDER BY s.full_name ASC LIMIT 8
    `, [wildcard, wildcard, wildcard, teacher.id]);

    return res.json({
      query: term,
      students,
      teachers: [],
      parents: [],
      total: students.length
    });
  }

  // 1. Search Students (Admin & Directory)
  const students = db.query(`
    SELECT s.id, s.student_id, s.full_name, s.gender, sec.full_name as section_full_name, 
           p.full_name as parent_name, p.phone_number as parent_phone
    FROM students s
    LEFT JOIN student_class_assignments csa ON s.id = csa.student_id
    LEFT JOIN sections sec ON csa.section_id = sec.id
    LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1
    LEFT JOIN parents p ON sp.parent_id = p.id
    WHERE (s.student_id LIKE ? OR s.full_name LIKE ? COLLATE NOCASE OR p.phone_number LIKE ?)
    GROUP BY s.id
    ORDER BY s.full_name ASC LIMIT 8
  `, [wildcard, wildcard, wildcard]);

  // 2. Search Teachers (Admin & Directory)
  const teachers = db.query(`
    SELECT t.id, t.full_name, t.email, t.phone, t.staff_id
    FROM teachers t
    WHERE (t.full_name LIKE ? COLLATE NOCASE OR t.email LIKE ? COLLATE NOCASE OR t.phone LIKE ?)
    ORDER BY t.full_name ASC LIMIT 6
  `, [wildcard, wildcard, wildcard]);

  // 3. Search Parents (Admin & Directory)
  const parents = db.query(`
    SELECT p.id, p.full_name, p.phone_number, p.email,
      (SELECT GROUP_CONCAT(st.full_name, ', ') 
       FROM students st 
       JOIN student_parents sp ON st.id = sp.student_id 
       WHERE sp.parent_id = p.id) as children_names
    FROM parents p
    WHERE (p.full_name LIKE ? COLLATE NOCASE OR p.phone_number LIKE ?)
    ORDER BY p.full_name ASC LIMIT 6
  `, [wildcard, wildcard]);

  res.json({
    query: term,
    students,
    teachers,
    parents,
    total: students.length + teachers.length + parents.length
  });
});

module.exports = router;

