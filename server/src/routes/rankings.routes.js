const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/rankings
router.get('/', authenticate, (req, res) => {
  const {
    academic_year_id,
    term_id,
    assessment_name, // e.g. 'ALL', 'Mid', 'Final', 'Tests', 'F.Mid', 'F.Final', 'F.Tests', 'S.Mid', 'S.Final', 'S.Tests'
    scope,           // 'GRADE_1_8', 'GRADES_1_4', 'GRADES_5_8', 'KG_1_3'
    class_ids,
    section_ids,
    subject_id
  } = req.query;

  // Resolve academic year
  let yearId = academic_year_id;
  if (!yearId) {
    const curYear = db.queryOne('SELECT id FROM academic_years WHERE is_current = 1');
    yearId = curYear ? curYear.id : 1;
  }

  // Resolve term (support F. and S. shorthand)
  let termId = term_id;
  let resolvedAssessment = assessment_name || 'ALL';

  if (assessment_name) {
    if (assessment_name.startsWith('F.')) {
      const fTerm = db.queryOne("SELECT id FROM terms WHERE academic_year_id = ? AND (name LIKE 'First%' OR name LIKE '%1%')", [yearId]);
      if (fTerm) termId = fTerm.id;
      resolvedAssessment = assessment_name.replace('F.', '');
    } else if (assessment_name.startsWith('S.')) {
      const sTerm = db.queryOne("SELECT id FROM terms WHERE academic_year_id = ? AND (name LIKE 'Second%' OR name LIKE '%2%')", [yearId]);
      if (sTerm) termId = sTerm.id;
      resolvedAssessment = assessment_name.replace('S.', '');
    }
  }

  if (!termId) {
    const curTerm = db.queryOne('SELECT id FROM terms WHERE academic_year_id = ? AND is_current = 1', [yearId]);
    termId = curTerm ? curTerm.id : 1;
  }

  // Parse class_ids and section_ids
  let parsedClassIds = [];
  if (class_ids) {
    parsedClassIds = Array.isArray(class_ids) ? class_ids : class_ids.split(',').map(s => s.trim()).filter(Boolean);
  }

  let parsedSectionIds = [];
  if (section_ids) {
    parsedSectionIds = Array.isArray(section_ids) ? section_ids : section_ids.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Teacher scoping rule
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacher) return res.status(403).json({ error: 'Teacher profile not found.' });

    const assignedSections = db.query(
      'SELECT DISTINCT class_id, section_id FROM teacher_assignments WHERE teacher_id = ?',
      [teacher.id]
    );

    const allowedSectionIds = assignedSections.map(a => String(a.section_id));
    if (parsedSectionIds.length > 0) {
      parsedSectionIds = parsedSectionIds.filter(id => allowedSectionIds.includes(String(id)));
      if (parsedSectionIds.length === 0) {
        return res.status(403).json({ error: 'You do not have access to the requested class/sections.' });
      }
    } else {
      parsedSectionIds = allowedSectionIds;
    }
  }

  // Base query to fetch active students in the selected scope
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

  // Apply Scope Filters
  if (scope === 'GRADE_1_8') {
    studentSql += ' AND c.grade_level >= 1 AND c.grade_level <= 8';
  } else if (scope === 'GRADES_1_4') {
    studentSql += ' AND c.grade_level >= 1 AND c.grade_level <= 4';
  } else if (scope === 'GRADES_5_8') {
    studentSql += ' AND c.grade_level >= 5 AND c.grade_level <= 8';
  } else if (scope === 'KG_1_3') {
    studentSql += ' AND c.grade_level < 1';
  }

  if (parsedClassIds.length > 0) {
    studentSql += ` AND csa.class_id IN (${parsedClassIds.map(() => '?').join(',')})`;
    studentParams.push(...parsedClassIds);
  }

  if (parsedSectionIds.length > 0) {
    studentSql += ` AND csa.section_id IN (${parsedSectionIds.map(() => '?').join(',')})`;
    studentParams.push(...parsedSectionIds);
  }

  const eligibleStudents = db.query(studentSql, studentParams);
  if (eligibleStudents.length === 0) {
    return res.json({
      summary: {
        total_students: 0,
        average_mark: 0,
        total_possible_marks: 0,
        assessment_name: resolvedAssessment || 'All Assessments'
      },
      rankings: []
    });
  }

  // Fetch marks matching assessment and term
  let marksSql = `
    SELECT m.student_id, m.marks_obtained, m.is_absent,
           a.id as assessment_id, a.name as assessment_name, a.max_marks,
           sub.id as subject_id, sub.name as subject_name, sub.code as subject_code
    FROM marks m
    JOIN assessments a ON m.assessment_id = a.id
    JOIN subjects sub ON a.subject_id = sub.id
    WHERE a.academic_year_id = ?
  `;
  const marksParams = [yearId];

  if (termId && resolvedAssessment !== 'YEAR_AVERAGE') {
    marksSql += ' AND a.term_id = ?';
    marksParams.push(termId);
  }

  if (resolvedAssessment && resolvedAssessment !== 'ALL' && resolvedAssessment !== 'YEAR_AVERAGE') {
    const lowAss = resolvedAssessment.toLowerCase();
    if (lowAss === 'mid' || lowAss === 'midterm' || lowAss.includes('mid')) {
      marksSql += " AND (a.name = 'Mid' OR a.name LIKE '%Mid%')";
    } else if (lowAss === 'final' || lowAss.includes('final')) {
      marksSql += " AND (a.name = 'Final' OR a.name LIKE '%Final%')";
    } else if (lowAss === 'tests' || lowAss === 'test' || lowAss.includes('test')) {
      marksSql += " AND (a.name = 'Tests' OR a.name LIKE 'Test%')";
    } else {
      marksSql += ' AND a.name = ?';
      marksParams.push(resolvedAssessment);
    }
  }

  if (subject_id) {
    marksSql += ' AND a.subject_id = ?';
    marksParams.push(subject_id);
  }

  const allMarks = db.query(marksSql, marksParams);

  // Group marks by student
  const studentMarksMap = {};
  for (const m of allMarks) {
    if (!studentMarksMap[m.student_id]) {
      studentMarksMap[m.student_id] = [];
    }
    studentMarksMap[m.student_id].push(m);
  }

  // Compute marks per student
  const rawList = [];
  let grandTotalScore = 0;
  let grandTotalMax = 0;

  for (const student of eligibleStudents) {
    const marks = studentMarksMap[student.student_id] || [];
    let totalObtained = 0;
    let totalMax = 0;
    const subjectBreakdown = {};

    for (const m of marks) {
      if (!m.is_absent && m.marks_obtained !== null) {
        totalObtained += Number(m.marks_obtained);
      }
      totalMax += Number(m.max_marks);

      if (!subjectBreakdown[m.subject_name]) {
        subjectBreakdown[m.subject_name] = {
          obtained: 0,
          max: 0,
          percentage: 0
        };
      }
      if (!m.is_absent && m.marks_obtained !== null) {
        subjectBreakdown[m.subject_name].obtained += Number(m.marks_obtained);
      }
      subjectBreakdown[m.subject_name].max += Number(m.max_marks);
    }

    for (const subKey in subjectBreakdown) {
      const s = subjectBreakdown[subKey];
      s.percentage = s.max > 0 ? parseFloat(((s.obtained / s.max) * 100).toFixed(2)) : 0;
    }

    const averagePct = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;

    grandTotalScore += totalObtained;
    grandTotalMax += totalMax;

    rawList.push({
      student_id: student.student_id,
      student_code: student.student_code,
      full_name: student.full_name,
      gender: student.gender,
      class_name: student.class_name,
      section_name: student.section_name,
      section_full_name: student.section_full_name,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      total_obtained: parseFloat(totalObtained.toFixed(2)),
      total_max: parseFloat(totalMax.toFixed(2)),
      average_percentage: averagePct,
      subject_marks: subjectBreakdown,
      has_results: marks.length > 0
    });
  }

  // Sort descending by average_percentage, then total_obtained
  rawList.sort((a, b) => {
    if (b.average_percentage !== a.average_percentage) {
      return b.average_percentage - a.average_percentage;
    }
    return b.total_obtained - a.total_obtained;
  });

  // Qualification Rule: Must have at least 50 marks to be ranked in Top 10!
  // Students with 0 marks or <50 marks cannot be in Top 10
  const qualifiedList = rawList.filter(s => s.has_results && s.total_obtained >= 50);
  const belowThresholdList = rawList.filter(s => !s.has_results || s.total_obtained < 50);

  // Sequential letter generator (0 -> A, 1 -> B, 2 -> C...)
  const getLetter = (idx) => {
    let str = "";
    let n = idx;
    while (n >= 0) {
      str = String.fromCharCode(65 + (n % 26)) + str;
      n = Math.floor(n / 26) - 1;
    }
    return str;
  };

  // Assign ranks with standard competition ranking: 1, 2, 3, 4... (pure numbers without letter suffixes)
  for (let i = 0; i < qualifiedList.length; i++) {
    const curr = qualifiedList[i];

    if (i > 0) {
      const prev = qualifiedList[i - 1];
      if (curr.average_percentage === prev.average_percentage && curr.total_obtained === prev.total_obtained) {
        // Tied with previous student: keep same rank number
        curr.rank_number = prev.rank_number;
      } else {
        // Not tied: skip to 1-indexed position
        curr.rank_number = i + 1;
      }
    } else {
      curr.rank_number = 1;
    }

    curr.rank = curr.rank_number;
    curr.is_top_3 = curr.rank_number <= 3;
    curr.is_top_10 = curr.rank_number <= 10;
    curr.qualified = true;
    curr.promoted_status = curr.average_percentage >= 50 ? 'Promoted' : 'Detained';
  }

  // Below threshold students (0 marks or <50 marks)
  for (let j = 0; j < belowThresholdList.length; j++) {
    const s = belowThresholdList[j];
    s.rank_number = null;
    s.rank = 'Unranked (<50)';
    s.is_top_3 = false;
    s.is_top_10 = false;
    s.qualified = false;
    s.promoted_status = s.average_percentage >= 50 ? 'Promoted' : 'Detained';
  }

  const finalRankings = [...qualifiedList, ...belowThresholdList];
  const overallAvg = grandTotalMax > 0 ? parseFloat(((grandTotalScore / grandTotalMax) * 100).toFixed(2)) : 0;

  res.json({
    summary: {
      total_students: eligibleStudents.length,
      total_ranked: qualifiedList.length,
      average_mark: overallAvg,
      total_marks_obtained: grandTotalScore,
      total_possible_marks: grandTotalMax,
      assessment_name: resolvedAssessment || 'All Configured Assessments',
      scope: scope || 'ALL'
    },
    rankings: finalRankings
  });
});

module.exports = router;
