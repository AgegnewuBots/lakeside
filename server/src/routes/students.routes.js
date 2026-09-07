const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');
const { generateNextStudentId } = require('../utils/studentIdGenerator');

// GET /api/students (List students with filters & teacher scoping)
router.get('/', authenticate, (req, res) => {
  const { class_id, section_id, academic_year_id, status } = req.query;

  let baseSql = `
    SELECT s.*, 
           c.id as class_id, c.name as class_name, 
           sec.id as section_id, sec.name as section_name, sec.full_name as section_full_name,
           y.id as academic_year_id, y.name as academic_year_name,
           csa.roll_number, csa.status as enrollment_status,
           p.full_name as parent_name, p.phone_number as parent_phone, p.id as parent_id
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

  // Teacher scoping rule: Teacher can ONLY see students in assigned classes
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

  // Filter conditions
  if (academic_year_id) {
    baseSql += ' AND csa.academic_year_id = ?';
    params.push(academic_year_id);
  } else {
    // Default to current academic year
    baseSql += ' AND y.is_current = 1';
  }

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

  if (status) {
    baseSql += ' AND s.status = ?';
    params.push(status);
  }

  baseSql += ' ORDER BY c.grade_level ASC, sec.name ASC, s.full_name ASC';

  const rows = db.query(baseSql, params);
  res.json(rows);
});

// GET /api/students/next-id (Preview the next 5-digit Student ID)
router.get('/next-id', authenticate, (req, res) => {
  const nextId = generateNextStudentId();
  res.json({ next_student_id: nextId });
});

// GET /api/students/search-returning (Search existing/old students by name, ID, or parent phone)
router.get('/search-returning', authenticate, (req, res) => {
  const query = (req.query.query || req.query.q || '').trim();
  if (!query) {
    return res.json([]);
  }

  const likeTerm = `%${query}%`;
  const rows = db.query(`
    SELECT s.id as id, s.student_id as student_code, s.full_name, s.gender, s.date_of_birth, s.status,
           latest_csa.class_id as last_class_id, c.name as last_class_name,
           latest_csa.section_id as last_section_id, sec.full_name as last_section_full_name,
           latest_csa.academic_year_id as last_academic_year_id, y.name as last_academic_year_name,
           p.id as parent_id, p.full_name as parent_name, p.phone_number as parent_phone, sp.relationship as parent_relationship
    FROM students s
    LEFT JOIN (
      SELECT csa1.* FROM student_class_assignments csa1
      WHERE csa1.id = (
        SELECT MAX(csa2.id) FROM student_class_assignments csa2 WHERE csa2.student_id = csa1.student_id
      )
    ) latest_csa ON s.id = latest_csa.student_id
    LEFT JOIN classes c ON latest_csa.class_id = c.id
    LEFT JOIN sections sec ON latest_csa.section_id = sec.id
    LEFT JOIN academic_years y ON latest_csa.academic_year_id = y.id
    LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1
    LEFT JOIN parents p ON sp.parent_id = p.id
    WHERE s.full_name LIKE ? OR s.student_id LIKE ? OR p.phone_number LIKE ? OR p.full_name LIKE ?
    ORDER BY s.id DESC
    LIMIT 20
  `, [likeTerm, likeTerm, likeTerm, likeTerm]);

  res.json(rows);
});

// POST /api/students/re-enroll (Re-enroll returning/old student into new academic year)
router.post('/re-enroll', authenticate, requirePermission('students.create'), (req, res) => {
  const {
    student_id,
    target_academic_year_id,
    target_class_id,
    target_section_id,
    roll_number,
    parent_name,
    parent_phone,
    parent_relationship
  } = req.body;

  if (!student_id || !target_academic_year_id || !target_class_id || !target_section_id) {
    return res.status(400).json({ error: 'Student ID, target academic year, class, and section are required.' });
  }

  const student = db.queryOne('SELECT * FROM students WHERE id = ? OR student_id = ?', [student_id, student_id]);
  if (!student) {
    return res.status(404).json({ error: 'Returning student record not found in system directory.' });
  }

  const targetClass = db.queryOne('SELECT name FROM classes WHERE id = ?', [target_class_id]);
  const targetSection = db.queryOne('SELECT name, full_name FROM sections WHERE id = ?', [target_section_id]);
  const targetYear = db.queryOne('SELECT name FROM academic_years WHERE id = ?', [target_academic_year_id]);

  if (!targetClass || !targetSection || !targetYear) {
    return res.status(400).json({ error: 'Invalid target class, section, or academic year specified.' });
  }

  db.transaction(() => {
    // 1. Check if enrollment exists for this student in this academic year
    const existingEnrollment = db.queryOne(
      'SELECT id FROM student_class_assignments WHERE student_id = ? AND academic_year_id = ?',
      [student.id, target_academic_year_id]
    );

    let assignmentId;
    if (existingEnrollment) {
      db.run(`
        UPDATE student_class_assignments
        SET class_id = ?, section_id = ?, roll_number = ?, status = 'Active', assigned_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [target_class_id, target_section_id, roll_number || null, existingEnrollment.id]);
      assignmentId = existingEnrollment.id;
    } else {
      const res = db.run(`
        INSERT INTO student_class_assignments (student_id, academic_year_id, class_id, section_id, roll_number, status)
        VALUES (?, ?, ?, ?, ?, 'Active')
      `, [student.id, target_academic_year_id, target_class_id, target_section_id, roll_number || null]);
      assignmentId = Number(res.lastInsertRowid);
    }

    // 2. Mark student status as Active and existing student
    db.run("UPDATE students SET status = 'Active', is_existing_student = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [student.id]);

    // 3. Update primary parent details if provided
    if (parent_phone) {
      const primarySp = db.queryOne('SELECT parent_id FROM student_parents WHERE student_id = ? AND is_primary = 1', [student.id]);
      if (primarySp) {
        db.run(
          'UPDATE parents SET full_name = COALESCE(?, full_name), phone_number = ? WHERE id = ?',
          [parent_name ? parent_name.trim() : null, parent_phone.trim(), primarySp.parent_id]
        );
        if (parent_relationship) {
          db.run('UPDATE student_parents SET relationship = ? WHERE student_id = ? AND parent_id = ?', [parent_relationship, student.id, primarySp.parent_id]);
        }
      } else if (parent_name) {
        const pRes = db.run('INSERT INTO parents (full_name, phone_number) VALUES (?, ?)', [parent_name.trim(), parent_phone.trim()]);
        const pId = Number(pRes.lastInsertRowid);
        db.run(
          'INSERT INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, 1)',
          [student.id, pId, parent_relationship || 'Parent']
        );
      }
    }

    // 4. Record student re-enrollment history
    const historyPayload = {
      action: 'ANNUAL_RE_ENROLLMENT',
      academic_year: targetYear.name,
      class_name: targetClass.name,
      section_name: targetSection.full_name,
      roll_number: roll_number || null
    };

    db.run(
      'INSERT INTO student_history (student_id, change_type, previous_data, new_data, changed_by_user_id) VALUES (?, ?, ?, ?, ?)',
      [student.id, 'RE_ENROLLMENT', JSON.stringify({ is_returning: true }), JSON.stringify(historyPayload), req.user.id]
    );

    logAudit(req, {
      action: 'RE_ENROLL_STUDENT',
      entityType: 'STUDENT',
      entityId: student.student_id,
      newValues: historyPayload
    });

    res.json({
      success: true,
      message: `Returning student ${student.full_name} (#${student.student_id}) successfully re-enrolled into ${targetClass.name} (${targetSection.full_name}) for ${targetYear.name}. Permanent 5-digit ID preserved.`,
      id: student.id,
      student_id: student.student_id,
      student_code: student.student_id,
      class_name: targetClass.name,
      section_name: targetSection.full_name,
      academic_year_name: targetYear.name
    });
  });
});

// GET /api/students/:id (Comprehensive 7-tab dossier)
router.get('/:id', authenticate, (req, res) => {
  const { id } = req.params;

  // Student profile
  const student = db.queryOne(`
    SELECT s.*, 
           c.id as class_id, c.name as class_name, 
           sec.id as section_id, sec.name as section_name, sec.full_name as section_full_name,
           y.id as academic_year_id, y.name as academic_year_name,
           csa.roll_number, csa.status as enrollment_status
    FROM students s
    JOIN student_class_assignments csa ON s.id = csa.student_id
    JOIN classes c ON csa.class_id = c.id
    JOIN sections sec ON csa.section_id = sec.id
    JOIN academic_years y ON csa.academic_year_id = y.id
    WHERE (s.id = ? OR s.student_id = ?) AND y.is_current = 1
    LIMIT 1
  `, [id, id]);

  if (!student) {
    return res.status(404).json({ error: 'Student not found in active academic year.' });
  }

  // Teacher check: If teacher, must be assigned to student's class
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    const isAssigned = db.queryOne(
      'SELECT 1 FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND section_id = ?',
      [teacher.id, student.class_id, student.section_id]
    );
    if (!isAssigned) {
      return res.status(403).json({ error: 'Access denied. Student is not in your assigned classes.' });
    }
  }

  // Tab 2: Parents Information
  const parents = db.query(`
    SELECT p.*, sp.relationship, sp.is_primary, sp.sms_enabled
    FROM parents p
    JOIN student_parents sp ON p.id = sp.parent_id
    WHERE sp.student_id = ?
    ORDER BY sp.is_primary DESC
  `, [student.id]);

  // Tab 3: Academic Results (Current Year)
  const currentMarks = db.query(`
    SELECT m.id as mark_id, m.marks_obtained, m.is_absent, m.remarks, m.updated_at,
           a.id as assessment_id, a.name as assessment_name, a.max_marks, a.assessment_date,
           sub.name as subject_name, sub.code as subject_code,
           t.name as term_name, u.full_name as entered_by_name
    FROM marks m
    JOIN assessments a ON m.assessment_id = a.id
    JOIN subjects sub ON a.subject_id = sub.id
    JOIN terms t ON a.term_id = t.id
    JOIN users u ON m.entered_by_user_id = u.id
    WHERE m.student_id = ? AND a.academic_year_id = ?
    ORDER BY a.term_id ASC, sub.name ASC, a.name ASC
  `, [student.id, student.academic_year_id]);

  // Tab 4: Academic History (All years & classes)
  const academicHistory = db.query(`
    SELECT csa.id, csa.roll_number, csa.status, csa.assigned_at,
           c.name as class_name, sec.name as section_name, sec.full_name as section_full_name,
           y.name as academic_year_name, y.is_current
    FROM student_class_assignments csa
    JOIN classes c ON csa.class_id = c.id
    JOIN sections sec ON csa.section_id = sec.id
    JOIN academic_years y ON csa.academic_year_id = y.id
    WHERE csa.student_id = ?
    ORDER BY y.id DESC
  `, [student.id]);

  // Tab 5: Rankings (Calculated per current term assessment)
  // Compute student summary
  let totalScore = 0;
  let totalMax = 0;
  for (const m of currentMarks) {
    if (!m.is_absent && m.marks_obtained !== null) {
      totalScore += Number(m.marks_obtained);
      totalMax += Number(m.max_marks);
    }
  }
  const averagePct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

  // Tab 6: SMS History for this student
  const smsHistory = db.query(`
    SELECT sr.*, sb.title as broadcast_title, sb.broadcast_type, sb.created_at as broadcast_date,
           u.full_name as sender_name
    FROM sms_recipients sr
    JOIN sms_broadcasts sb ON sr.broadcast_id = sb.id
    LEFT JOIN users u ON sb.sender_user_id = u.id
    WHERE sr.student_id = ?
    ORDER BY sr.sent_at DESC
  `, [student.id]);

  // Tab 7: Audit History
  const auditHistory = db.query(`
    SELECT * FROM audit_logs 
    WHERE (entity_type = 'STUDENT' AND entity_id = ?) 
       OR (entity_type = 'MARK' AND entity_id IN (SELECT id FROM marks WHERE student_id = ?))
    ORDER BY created_at DESC
  `, [student.id, student.id]);

  res.json({
    overview: student,
    parents,
    academic_results: currentMarks,
    academic_summary: {
      total_score: totalScore,
      total_max: totalMax,
      average_percentage: parseFloat(averagePct.toFixed(2))
    },
    academic_history: academicHistory,
    sms_history: smsHistory,
    audit_history: req.user.role === 'teacher' ? [] : auditHistory
  });
});

// POST /api/students (Register New Student)
// Admin or Directory with 'students.create' permission
router.post('/', authenticate, requirePermission('students.create'), (req, res) => {
  const {
    full_name,
    gender,
    date_of_birth,
    address,
    class_id,
    section_id,
    academic_year_id,
    parent_name,
    parent_phone,
    parent_email,
    parent_relationship = 'Father',
    is_existing_student = 0,
    custom_student_id
  } = req.body;

  if (!full_name || !gender || !date_of_birth || !class_id || !section_id || !parent_phone) {
    return res.status(400).json({ error: 'Full name, gender, DOB, class, section, and parent phone are required.' });
  }

  // Generate or validate unique 5-digit Student ID
  const studentId = custom_student_id ? String(custom_student_id).trim() : generateNextStudentId();

  const existing = db.queryOne('SELECT id FROM students WHERE student_id = ?', [studentId]);
  if (existing) {
    return res.status(400).json({ error: `Student ID '${studentId}' already exists. IDs must be strictly unique.` });
  }

  // Duplicate Check: A student with the same full name CANNOT have the same parent phone number
  const trimmedName = full_name.trim();
  const trimmedPhone = parent_phone.trim();
  const duplicateStudent = db.queryOne(`
    SELECT s.id, s.student_id, s.full_name, p.phone_number
    FROM students s
    JOIN student_parents sp ON s.id = sp.student_id
    JOIN parents p ON sp.parent_id = p.id
    WHERE LOWER(TRIM(s.full_name)) = LOWER(?)
      AND TRIM(p.phone_number) = ?
    LIMIT 1
  `, [trimmedName, trimmedPhone]);

  if (duplicateStudent) {
    return res.status(400).json({
      error: `Duplicate student prevented: A student named '${trimmedName}' is already registered with parent phone '${trimmedPhone}' (Student ID: ${duplicateStudent.student_id}). Same student name can only be registered with a different parent phone number.`
    });
  }

  // Get active year if not provided
  let yearId = academic_year_id;
  if (!yearId) {
    const currentYear = db.queryOne('SELECT id FROM academic_years WHERE is_current = 1');
    yearId = currentYear ? currentYear.id : 1;
  }

  db.transaction(() => {
    // 1. Create Student
    const regDate = new Date().toISOString().split('T')[0];
    const studRes = db.run(
      `INSERT INTO students (student_id, full_name, gender, date_of_birth, address, registration_date, status, is_existing_student)
       VALUES (?, ?, ?, ?, ?, ?, 'Active', ?)`,
      [studentId, full_name.trim(), gender, date_of_birth, address || null, regDate, is_existing_student ? 1 : 0]
    );
    const newStudentDbId = Number(studRes.lastInsertRowid);

    // 2. Class Assignment
    db.run(
      `INSERT INTO student_class_assignments (student_id, academic_year_id, class_id, section_id, status)
       VALUES (?, ?, ?, ?, 'Active')`,
      [newStudentDbId, yearId, class_id, section_id]
    );

    // 3. Parent Linking (Check if parent with phone already exists to reuse & link siblings!)
    let parentRow = db.queryOne('SELECT id FROM parents WHERE phone_number = ?', [parent_phone.trim()]);
    let parentId;
    if (parentRow) {
      parentId = parentRow.id;
    } else {
      const parentRes = db.run(
        'INSERT INTO parents (full_name, phone_number, email, address) VALUES (?, ?, ?, ?)',
        [parent_name ? parent_name.trim() : 'Parent of ' + full_name, parent_phone.trim(), parent_email || null, address || null]
      );
      parentId = Number(parentRes.lastInsertRowid);
    }

    // Link student to parent
    db.run(
      'INSERT INTO student_parents (student_id, parent_id, relationship, is_primary, sms_enabled) VALUES (?, ?, ?, 1, 1)',
      [newStudentDbId, parentId, parent_relationship]
    );

    // 4. Audit Log
    logAudit(req, {
      action: is_existing_student ? 'REGISTER_EXISTING_STUDENT' : 'REGISTER_NEW_STUDENT',
      entityType: 'STUDENT',
      entityId: studentId,
      newValues: {
        student_id: studentId,
        full_name,
        class_id,
        section_id,
        parent_phone
      }
    });

    res.status(201).json({
      id: newStudentDbId,
      student_id: studentId,
      full_name,
      status: 'Active',
      message: `Student registered successfully with Student ID ${studentId}.`
    });
  });
});

// POST /api/students/:id/promote (Student Promotion across Academic Years)
router.post('/:id/promote', authenticate, requirePermission('students.promote'), (req, res) => {
  const { id } = req.params;
  const { target_academic_year_id, target_class_id, target_section_id, roll_number } = req.body;

  if (!target_academic_year_id || !target_class_id || !target_section_id) {
    return res.status(400).json({ error: 'Target academic year, class, and section are required.' });
  }

  const student = db.queryOne('SELECT * FROM students WHERE id = ? OR student_id = ?', [id, id]);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  // Get current assignment
  const currentAssignment = db.queryOne(`
    SELECT csa.*, c.name as class_name, s.name as section_name, y.name as year_name
    FROM student_class_assignments csa
    JOIN classes c ON csa.class_id = c.id
    JOIN sections s ON csa.section_id = s.id
    JOIN academic_years y ON csa.academic_year_id = y.id
    WHERE csa.student_id = ? AND csa.status = 'Active'
    ORDER BY csa.id DESC LIMIT 1
  `, [student.id]);

  db.transaction(() => {
    // Mark previous assignment as 'Promoted'
    if (currentAssignment) {
      db.run('UPDATE student_class_assignments SET status = ? WHERE id = ?', ['Promoted', currentAssignment.id]);
    }

    // Insert new assignment linked to previous
    const newAssign = db.run(`
      INSERT INTO student_class_assignments (student_id, academic_year_id, class_id, section_id, roll_number, status, promoted_from_id)
      VALUES (?, ?, ?, ?, ?, 'Active', ?)
    `, [student.id, target_academic_year_id, target_class_id, target_section_id, roll_number || null, currentAssignment ? currentAssignment.id : null]);

    // Record student history
    const targetClass = db.queryOne('SELECT name FROM classes WHERE id = ?', [target_class_id]);
    const targetSection = db.queryOne('SELECT name, full_name FROM sections WHERE id = ?', [target_section_id]);
    const targetYear = db.queryOne('SELECT name FROM academic_years WHERE id = ?', [target_academic_year_id]);

    const oldData = currentAssignment ? {
      class: currentAssignment.class_name,
      section: currentAssignment.section_name,
      academic_year: currentAssignment.year_name
    } : null;

    const newData = {
      class: targetClass ? targetClass.name : target_class_id,
      section: targetSection ? targetSection.full_name : target_section_id,
      academic_year: targetYear ? targetYear.name : target_academic_year_id
    };

    db.run(
      'INSERT INTO student_history (student_id, change_type, previous_data, new_data, changed_by_user_id) VALUES (?, ?, ?, ?, ?)',
      [student.id, 'PROMOTION', JSON.stringify(oldData), JSON.stringify(newData), req.user.id]
    );

    logAudit(req, {
      action: 'PROMOTE_STUDENT',
      entityType: 'STUDENT',
      entityId: student.student_id,
      oldValues: oldData,
      newValues: newData
    });

    res.json({
      success: true,
      message: `Student ${student.full_name} (${student.student_id}) successfully promoted. Historical records preserved.`,
      new_assignment_id: Number(newAssign.lastInsertRowid)
    });
  });
});

// PUT /api/students/:id (Update student details)
router.put('/:id', authenticate, requirePermission('students.update'), (req, res) => {
  const { id } = req.params;
  const { full_name, gender, date_of_birth, address, status } = req.body;

  const current = db.queryOne('SELECT * FROM students WHERE id = ? OR student_id = ?', [id, id]);
  if (!current) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  const updatedName = full_name ? full_name.trim() : current.full_name;
  const updatedGender = gender || current.gender;
  const updatedDob = date_of_birth || current.date_of_birth;
  const updatedAddress = address !== undefined ? address : current.address;
  const updatedStatus = status || current.status;

  db.run(`
    UPDATE students 
    SET full_name = ?, gender = ?, date_of_birth = ?, address = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [updatedName, updatedGender, updatedDob, updatedAddress, updatedStatus, current.id]);

  const oldValues = {
    full_name: current.full_name,
    gender: current.gender,
    date_of_birth: current.date_of_birth,
    address: current.address,
    status: current.status
  };

  const newValues = {
    full_name: updatedName,
    gender: updatedGender,
    date_of_birth: updatedDob,
    address: updatedAddress,
    status: updatedStatus
  };

  // Record data history
  db.run(
    'INSERT INTO student_history (student_id, change_type, previous_data, new_data, changed_by_user_id) VALUES (?, ?, ?, ?, ?)',
    [current.id, 'INFO_UPDATE', JSON.stringify(oldValues), JSON.stringify(newValues), req.user.id]
  );

  logAudit(req, {
    action: 'UPDATE_STUDENT',
    entityType: 'STUDENT',
    entityId: current.student_id,
    oldValues,
    newValues
  });

  res.json({ success: true, message: 'Student information updated successfully.' });
});

// DELETE /api/students/:id (Admin only)
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const student = db.queryOne('SELECT * FROM students WHERE id = ? OR student_id = ?', [id, id]);
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  db.run('DELETE FROM students WHERE id = ?', [student.id]);

  logAudit(req, {
    action: 'DELETE_STUDENT',
    entityType: 'STUDENT',
    entityId: student.student_id,
    oldValues: student
  });

  res.json({ success: true, message: `Student ${student.full_name} (${student.student_id}) deleted.` });
});

module.exports = router;
