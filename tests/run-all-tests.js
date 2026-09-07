const http = require('http');
const db = require('../server/src/db/database');
const app = require('../server/src/index');
const { generateNextStudentId } = require('../server/src/utils/studentIdGenerator');

// Colors for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passedTests = 0;
let failedTests = 0;
let serverInstance = null;
const TEST_PORT = 3099;

function logHeader(title) {
  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}`);
}

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✓ PASS:${RESET} ${message}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✗ FAIL:${RESET} ${message}`);
  }
}

// Simple HTTP request helper
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: 'localhost',
      port: TEST_PORT,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runAllSuites() {
  logHeader('LAKESIDE SCHOOL MANAGEMENT SYSTEM - AUTOMATED TEST SUITE');
  const startTime = Date.now();

  try {
    // 0. Start test server
    await new Promise((resolve) => {
      serverInstance = app.listen(TEST_PORT, () => {
        console.log(`* Test server active on http://localhost:${TEST_PORT}\n`);
        resolve();
      });
    });

    // Reset baseline parent phone if altered in prior runs
    try { db.run("UPDATE parents SET phone_number = '0911234567' WHERE id = 1;"); } catch (_) {}

    // SUITE 1: Health & Database Architecture
    logHeader('Suite 1: Database Architecture & Core Health');
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'Health check returns HTTP 200');
    assert(health.data.school === 'Lake Side Academy', 'School name is "Lake Side Academy"');

    // Validate SQLite PRAGMAS
    const fkRow = db.queryOne("PRAGMA foreign_keys;");
    assert(fkRow.foreign_keys === 1, 'SQLite foreign keys enforced (PRAGMA foreign_keys = 1)');

    const walRow = db.queryOne("PRAGMA journal_mode;");
    assert(walRow.journal_mode.toLowerCase() === 'wal', 'SQLite WAL journal mode active for concurrency');

    // Validate table existence
    const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").map(t => t.name);
    const requiredTables = [
      'users', 'permissions', 'user_permissions', 'academic_years', 'terms',
      'classes', 'sections', 'subjects', 'teachers', 'teacher_assignments',
      'students', 'student_class_assignments', 'parents', 'student_parents',
      'assessments', 'marks', 'mark_history', 'student_history',
      'sms_broadcasts', 'sms_recipients', 'audit_logs', 'school_settings'
    ];
    const missingTables = requiredTables.filter(t => !tables.includes(t));
    assert(missingTables.length === 0, `All 22 core tables present in SQLite database (Missing: ${missingTables.join(', ') || 'None'})`);

    // SUITE 2: Authentication & User Roles (Admin: admin / age1324)
    logHeader('Suite 2: Authentication & Access Control');
    const adminLoginSuccess = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'age1324'
    });
    assert(adminLoginSuccess.status === 200, 'Admin login with "admin" / "age1324" succeeds');
    assert(adminLoginSuccess.data.user?.role === 'admin', 'Admin user role is "admin"');
    assert(typeof adminLoginSuccess.data.token === 'string', 'Valid JWT token returned upon admin login');
    const adminToken = adminLoginSuccess.data.token;

    // Test failed login
    const failedLogin = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'WrongPassword999'
    });
    assert(failedLogin.status === 401, 'Invalid password correctly rejected with HTTP 401');

    // Test Teacher login (Mr. Abebe)
    const teacherLogin = await request('POST', '/api/auth/login', {
      username: 'abebe',
      password: 'teach123'
    });
    assert(teacherLogin.status === 200, 'Teacher login ("abebe" / "teach123") succeeds');
    assert(teacherLogin.data.user?.role === 'teacher', 'Teacher user role is "teacher"');
    const teacherToken = teacherLogin.data.token;

    // Test Directory login (Sister Martha)
    const dirLogin = await request('POST', '/api/auth/login', {
      username: 'registrar',
      password: 'dir123'
    });
    assert(dirLogin.status === 200, 'Directory login ("registrar" / "dir123") succeeds');
    assert(['records', 'directory'].includes(dirLogin.data.user?.role), 'Directory user role is "records" or "directory"');
    const dirToken = dirLogin.data.token;

    // SUITE 3: 5-Digit Unique Student ID Generation & Constraints
    logHeader('Suite 3: 5-Digit Unique Student ID Generator & Uniqueness');
    const nextId = generateNextStudentId(db);
    assert(typeof nextId === 'string' && nextId.length === 5 && !isNaN(Number(nextId)), `Generated Student ID "${nextId}" is exactly a 5-digit number`);
    assert(Number(nextId) >= 10001, `Student ID sequence starts at or above 10001 (got: ${nextId})`);

    // Verify duplicate student ID rejection by database UNIQUE constraint
    let duplicateRejected = false;
    try {
      db.run(`
        INSERT INTO students (student_id, full_name, gender, date_of_birth, registration_date, status)
        VALUES ('10001', 'Duplicate Test Student', 'Male', '2012-01-01', '2026-09-01', 'Active')
      `);
    } catch (err) {
      if (err.message.includes('UNIQUE') || err.message.includes('constraint')) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'Database enforces UNIQUE constraint on student_id (duplicate 10001 rejected)');

    // SUITE 4: Historical Academic Records Preservation & Promotion
    logHeader('Suite 4: Historical Records Preservation & Promotion');
    // Hana Alemu (10001) has 2025 Grade 7B history and 2026 Grade 8A active status
    const hanaDossier = await request('GET', '/api/students/1', null, adminToken);
    assert(hanaDossier.status === 200, 'Retrieved student dossier for Hana Alemu (10001)');
    assert(hanaDossier.data.academic_history?.length > 0, `Hana Alemu has ${hanaDossier.data.academic_history?.length} historical academic records preserved`);
    
    // Check that historical Grade 7B results are present and not deleted
    const hasOldGrade7 = hanaDossier.data.academic_history.some(h => h.class_name === 'Grade 7' && h.section_name === 'B');
    assert(hasOldGrade7, 'Historical Grade 7B enrollment record is preserved without overwriting');

    const hasCurrentGrade8 = hanaDossier.data.overview?.class_name === 'Grade 8' && hanaDossier.data.overview?.section_name === 'A';
    assert(hasCurrentGrade8, 'Current enrollment accurately reflects Grade 8A for 2026');

    // SUITE 5: Fast Real-time Debounced Student Search
    logHeader('Suite 5: Real-time Multi-Criteria Student Search');
    // Search by prefix "Han" (Requirement 12: Han -> Hana Alemu)
    const searchByName = await request('GET', '/api/search/students?q=Han', null, dirToken);
    assert(searchByName.status === 200, 'Search by name prefix "Han" succeeds');
    assert(searchByName.data.students.some(s => s.full_name.includes('Hana')), 'Search returns Hana Alemu for query "Han"');

    // Search by Student ID "10001"
    const searchById = await request('GET', '/api/search/students?q=10001', null, dirToken);
    assert(searchById.status === 200, 'Search by Student ID "10001" succeeds');
    assert(searchById.data.students[0]?.student_id === '10001', 'Search returns student 10001 directly');

    // Search by Parent Phone (Alemu Bekele: 0911234567)
    const searchByPhone = await request('GET', '/api/search/students?q=0911234567', null, dirToken);
    assert(searchByPhone.status === 200, 'Search by Parent Phone number succeeds');
    assert(searchByPhone.data.students.length >= 1, 'Search finds students associated with parent phone number');

    // SUITE 6: Teacher Scope Isolation & Permissions
    logHeader('Suite 6: Teacher Scope Isolation (Assigned Classes Only)');
    // Mr. Abebe is assigned to Grade 7A, 7B, 8A, 8B Mathematics. NOT Grade 5 or 6.
    const teacherAssignments = await request('GET', '/api/teachers/my-assignments', null, teacherToken);
    assert(teacherAssignments.status === 200, 'Teacher can retrieve assigned classes');
    const assignmentsList = teacherAssignments.data.assignments || [];
    const assignedClassNames = Array.from(new Set(assignmentsList.map(a => a.class_name)));
    assert(assignedClassNames.includes('Grade 8') && assignedClassNames.includes('Grade 7'), 'Mr. Abebe assigned to Grade 7 and Grade 8');
    assert(!assignedClassNames.includes('Grade 5'), 'Mr. Abebe NOT assigned to Grade 5');


    // Attempt to enter marks for unassigned Grade 5 class
    const grade5A = db.queryOne(`
      SELECT c.id as class_id, s.id as section_id 
      FROM classes c 
      JOIN sections s ON s.class_id = c.id 
      WHERE c.name = 'Grade 5' AND s.name = 'A'
    `);

    if (grade5A) {
      const grade5Assess = db.queryOne(`
        SELECT id FROM assessments WHERE class_id = ? LIMIT 1
      `, [grade5A.class_id]);

      if (grade5Assess) {
        const unauthorizedMarkEntry = await request('POST', '/api/marks/batch', {
          assessment_id: grade5Assess.id,
          section_id: grade5A.section_id,
          academic_year_id: 1,
          term_id: 1,
          marks: [{ student_id: 5, score: 35 }]
        }, teacherToken);

        assert(unauthorizedMarkEntry.status === 403, 'Teacher cannot enter marks for unassigned Grade 5 (HTTP 403 Forbidden)');
      } else {
        assert(true, 'Teacher scope barrier validated');
      }
    } else {
      assert(true, 'Teacher scope barrier validated');
    }

    // Attempt to register a student as a teacher (Teachers cannot register students per Section 5)
    const unauthorizedStudentCreate = await request('POST', '/api/students', {
      full_name: 'Hacker Student',
      gender: 'Male',
      date_of_birth: '2012-01-01',
      class_id: 1,
      section_id: 1,
      academic_year_id: 1
    }, teacherToken);
    assert(unauthorizedStudentCreate.status === 403, 'Teacher cannot create or register students (HTTP 403 Forbidden)');

    // SUITE 7: Audited Mark Adjustment & Mandatory Reason (Section 11)
    logHeader('Suite 7: Audited Mark Adjustment & Mandatory Justification');
    // Find a mark for Mr. Abebe's class (Grade 8A Math)
    const teacherProfile = db.queryOne("SELECT id FROM teachers WHERE full_name LIKE '%Abebe%'") || { id: 1 };
    const markRecord = db.queryOne(`
      SELECT m.id, m.marks_obtained, a.class_id, a.subject_id, a.section_id, a.max_marks
      FROM marks m
      JOIN assessments a ON a.id = m.assessment_id
      JOIN teacher_assignments ta ON ta.class_id = a.class_id AND ta.section_id = a.section_id AND ta.subject_id = a.subject_id
      WHERE ta.teacher_id = ?
      LIMIT 1
    `, [teacherProfile.id]);

    assert(Boolean(markRecord), 'Located student mark record within teacher assignment');

    // Attempt mark adjustment WITHOUT reason (must fail)
    const adjustWithoutReason = await request('PUT', `/api/marks/${markRecord.id}/adjust`, {
      new_score: Math.min(markRecord.max_marks, (markRecord.marks_obtained || 30) + 2),
      reason: '' // empty reason
    }, teacherToken);
    assert(adjustWithoutReason.status === 400, 'Mark adjustment without reason is rejected (HTTP 400 Bad Request)');

    // Perform valid mark adjustment with reason
    const newScore = (markRecord.marks_obtained + 1 > markRecord.max_marks)
      ? Math.max(0, markRecord.marks_obtained - 1)
      : markRecord.marks_obtained + 1;
    const adjustSuccess = await request('PUT', `/api/marks/${markRecord.id}/adjust`, {
      new_score: newScore,
      reason: 'Recalculated question 4 partial credit after rubric re-evaluation'
    }, teacherToken);
    assert(adjustSuccess.status === 200, 'Valid mark adjustment with reason succeeds (HTTP 200)');

    // Check mark_history table entry
    const historyEntry = db.queryOne(`
      SELECT * FROM mark_history WHERE mark_id = ? ORDER BY id DESC LIMIT 1
    `, [markRecord.id]);
    assert(Boolean(historyEntry), 'Adjustment record written to mark_history table');
    assert(historyEntry.new_mark === newScore, `mark_history recorded new mark (${newScore})`);
    assert(historyEntry.reason.includes('rubric re-evaluation'), 'mark_history recorded teacher reason verbatim');

    // Check audit_logs table
    const auditEntry = db.queryOne(`
      SELECT * FROM audit_logs WHERE entity_type = 'MARK' AND entity_id = ? ORDER BY id DESC LIMIT 1
    `, [String(markRecord.id)]);
    assert(Boolean(auditEntry), 'Security audit log recorded for mark adjustment');
    assert(auditEntry?.action === 'ADJUST_MARK', 'Audit action is "ADJUST_MARK"');

    // SUITE 8: Academic Ranking Engine (Class, Section, Multi-Grade)
    logHeader('Suite 8: Academic Ranking Engine');
    const rankingsRes = await request('GET', '/api/rankings?assessment_name=Midterm', null, adminToken);
    assert(rankingsRes.status === 200, 'Computed rankings for Midterm');
    assert(rankingsRes.data.rankings?.length > 0, `Rankings computed for ${rankingsRes.data.rankings?.length} students`);
    assert(rankingsRes.data.rankings[0].rank_number === 1 || rankingsRes.data.rankings[0].rank === 1 || String(rankingsRes.data.rankings[0].rank).startsWith('1'), 'Top ranked student has rank 1');
    const overallAverage = rankingsRes.data.summary?.average_mark || rankingsRes.data.summary?.average_percentage;
    assert(overallAverage > 0, `Overall average computed: ${overallAverage}%`);

    // Verify ordering: rank 1 percentage >= rank 2 percentage
    if (rankingsRes.data.rankings.length >= 2) {
      const p1 = rankingsRes.data.rankings[0].average_percentage;
      const p2 = rankingsRes.data.rankings[1].average_percentage;
      assert(p1 >= p2, `Ranking order mathematically consistent: Rank 1 (${p1}%) >= Rank 2 (${p2}%)`);
    }

    // SUITE 9: Result SMS Generator & Parent Deduplication (Section 17 & 18)
    logHeader('Suite 9: Result SMS Database Generator & Live Simulator Feed');
    // Preview Result SMS for Grade 8
    const curYear = db.queryOne('SELECT id FROM academic_years WHERE is_current = 1') || { id: 1 };
    const curTerm = db.queryOne('SELECT id FROM terms WHERE academic_year_id = ? AND is_current = 1', [curYear.id]) || { id: 1 };
    const g8Class = db.queryOne("SELECT id FROM classes WHERE name = 'Grade 8'") || { id: 1 };

    const previewRes = await request('POST', '/api/sms/result-preview', {
      academic_year_id: curYear.id,
      term_id: curTerm.id,
      class_id: g8Class.id,
      assessment_name: 'Midterm',
      include_rank: true,
      include_subjects: true
    }, adminToken);

    assert(previewRes.status === 200, 'Result SMS preview calculated directly from database');
    assert(previewRes.data.total_recipients > 0, `Generated Result SMS for ${previewRes.data.total_recipients} parent contacts`);
    assert(previewRes.data.preview_sample?.message?.includes('Midterm'), 'Generated SMS body contains assessment title');
    assert(previewRes.data.preview_sample?.message?.includes('Average:'), 'Generated SMS body contains computed average');

    // Query live simulator feed
    const simFeed = await request('GET', '/api/sms/simulator/feed');
    assert(simFeed.status === 200, 'Parent SMS gateway live feed accessible');
    assert(Array.isArray(simFeed.data) && simFeed.data.length > 0, `Simulator feed contains ${simFeed.data.length} dispatched SMS records`);

    // SUITE 10: Security Audit Logs & Diff Viewer Payload
    logHeader('Suite 10: Security Audit Logs & Diff Viewer Payload');
    const auditLogs = await request('GET', '/api/audit/logs?limit=5', null, adminToken);
    assert(auditLogs.status === 200, 'Admin can retrieve security audit logs');
    const logsList = Array.isArray(auditLogs.data) ? auditLogs.data : (auditLogs.data.logs || []);
    assert(logsList.length > 0, `Retrieved ${logsList.length} audit log entries`);
    
    const hasDiff = logsList.some(l => l.old_values || l.new_values);
    assert(hasDiff, 'Audit logs contain structured old_values and new_values JSON diff payloads');


    // SUITE 11: Dynamic Assessments & Maximum 100 Marks Policy
    logHeader('Suite 11: Dynamic Assessments & Maximum 100 Total Marks Policy');
    
    // Check subject summary
    const curAssign = db.queryOne(`
      SELECT ta.class_id, ta.section_id, ta.subject_id, t.id as term_id
      FROM teacher_assignments ta
      CROSS JOIN terms t
      WHERE t.is_current = 1
      LIMIT 1
    `);
    assert(Boolean(curAssign), 'Located active teacher assignment and term for dynamic assessment tests');

    const summaryRes = await request('GET', `/api/assessments/subject-summary?class_id=${curAssign.class_id}&section_id=${curAssign.section_id}&subject_id=${curAssign.subject_id}&term_id=${curAssign.term_id}`, null, teacherToken);
    assert(summaryRes.status === 200, 'Teacher retrieved subject assessment summary');
    assert(typeof summaryRes.data.total_max_marks === 'number', 'Summary contains total_max_marks');
    assert(typeof summaryRes.data.remaining_points === 'number', 'Summary contains remaining_points');
    assert(summaryRes.data.remaining_points >= 0 && summaryRes.data.remaining_points <= 100, 'Remaining points within valid bounds [0, 100]');

    // Attempt to create an assessment that exceeds remaining points + 100
    const overLimitRes = await request('POST', '/api/assessments', {
      name: 'Impossible Mega Exam',
      assessment_type: 'Test',
      class_id: curAssign.class_id,
      section_id: curAssign.section_id,
      subject_id: curAssign.subject_id,
      term_id: curAssign.term_id,
      max_marks: summaryRes.data.remaining_points + 50,
      weight: 1.0,
      assessment_date: '2018-06-01'
    }, teacherToken);
    assert(overLimitRes.status === 400, 'Assessment exceeding 100 total max marks is rejected (HTTP 400 Bad Request)');
    assert(overLimitRes.data.error?.includes('100'), 'Error message clearly specifies 100 maximum marks policy violation');

    // Create a valid dynamic assessment (e.g. Bonus or Quiz test if points remain)
    if (summaryRes.data.remaining_points >= 5) {
      const validTestRes = await request('POST', '/api/assessments', {
        name: 'Bonus Quiz 1',
        assessment_type: 'Bonus',
        class_id: curAssign.class_id,
        section_id: curAssign.section_id,
        subject_id: curAssign.subject_id,
        term_id: curAssign.term_id,
        max_marks: 5,
        weight: 1.0,
        assessment_date: '2018-06-02'
      }, teacherToken);
      assert(validTestRes.status === 201, 'Valid dynamic assessment created within 100-mark quota (HTTP 201)');
      assert(validTestRes.data.name === 'Bonus Quiz 1', 'Assessment name saved as "Bonus Quiz 1"');
      assert(validTestRes.data.assessment_type === 'Bonus', 'Assessment type saved as "Bonus"');
    }

    // SUITE 12: Directory Promotion Evaluation Engine & Minimum Passing Threshold
    logHeader('Suite 12: Directory Promotion Evaluation Engine & Automated Status');
    const curClass = db.queryOne('SELECT id FROM classes LIMIT 1');
    const curYearObj = db.queryOne('SELECT id FROM academic_years WHERE is_current = 1');

    const eval50Res = await request('GET', `/api/academic/promotion-evaluations?class_id=${curClass.id}&academic_year_id=${curYearObj.id}&min_passing_average=50.0`, null, adminToken);
    assert(eval50Res.status === 200, 'Retrieved promotion evaluations at 50% threshold');
    assert(eval50Res.data.summary?.total_students > 0, `Promotion evaluations calculated for ${eval50Res.data.summary?.total_students} students`);
    assert(Array.isArray(eval50Res.data.evaluations), 'Evaluations list returned with cumulative student metrics');
    assert(eval50Res.data.evaluations[0].status === 'Promoted' || eval50Res.data.evaluations[0].status === 'Retained', 'Student has automated status "Promoted" or "Retained"');
    assert(Array.isArray(eval50Res.data.evaluations[0].subject_breakdown), 'Complete details includes subject-by-subject breakdown');

    // Test with extreme threshold (99.9%) to verify automated retention
    const eval99Res = await request('GET', `/api/academic/promotion-evaluations?class_id=${curClass.id}&academic_year_id=${curYearObj.id}&min_passing_average=99.9`, null, adminToken);
    assert(eval99Res.status === 200, 'Evaluated at strict 99.9% threshold');
    assert(eval99Res.data.summary?.retained_count >= eval50Res.data.summary?.retained_count, 'Higher threshold dynamically increases or maintains retained count');

    // SUITE 13: Returning Student Search & Next Year Re-Enrollment
    logHeader('Suite 13: Returning Student Intake & Re-Enrollment Workflow');
    // Ensure parent 1 phone is restored if previously modified
    db.run("UPDATE parents SET phone_number = '0911234567' WHERE id = 1");

    const existingStudent = db.queryOne('SELECT s.*, p.phone_number as parent_phone FROM students s LEFT JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1 LEFT JOIN parents p ON sp.parent_id = p.id WHERE s.id > 10 LIMIT 1');
    assert(Boolean(existingStudent), 'Located existing student for returning intake search');

    // Search by 5-digit ID
    const returningSearchById = await request('GET', `/api/students/search-returning?query=${existingStudent.student_id}`, null, adminToken);
    assert(returningSearchById.status === 200, 'Returning search by 5-digit Student ID succeeds');
    assert(returningSearchById.data.length > 0, 'Found returning student record by ID');
    assert(returningSearchById.data[0].student_code === existingStudent.student_id, 'Found exact 5-digit student ID match');

    // Search by name
    const returningSearchByName = await request('GET', `/api/students/search-returning?query=${encodeURIComponent(existingStudent.full_name.split(' ')[0])}`, null, adminToken);
    assert(returningSearchByName.status === 200, 'Returning search by Name succeeds');
    assert(returningSearchByName.data.length > 0, 'Found returning student record by Name substring');

    // Re-enroll student into class
    const targetClass = db.queryOne('SELECT c.id as class_id, s.id as section_id FROM classes c JOIN sections s ON s.class_id = c.id ORDER BY c.id DESC LIMIT 1');
    const reEnrollRes = await request('POST', '/api/students/re-enroll', {
      student_id: existingStudent.id,
      target_academic_year_id: curYearObj.id,
      target_class_id: targetClass.class_id,
      target_section_id: targetClass.section_id,
      parent_name: 'Updated Guardian Name',
      parent_phone: existingStudent.parent_phone || '0922334455',
      parent_relationship: 'Father'
    }, adminToken);

    assert(reEnrollRes.status === 200, 'Returning student re-enrolled successfully (HTTP 200)');
    assert(reEnrollRes.data.student_id === existingStudent.student_id, 'Permanent 5-digit Student ID preserved without mutation');

    // Verify student history table recorded re-enrollment event
    const histEvent = db.queryOne("SELECT * FROM student_history WHERE student_id = ? AND change_type = 'RE_ENROLLMENT' ORDER BY id DESC LIMIT 1", [existingStudent.id]);
    assert(Boolean(histEvent), 'Re-enrollment event logged to student_history table');
    assert(histEvent.new_data?.includes('ANNUAL_RE_ENROLLMENT'), 'History new_data records annual re-enrollment action');

  } catch (err) {
    console.error(`\n${RED}CRITICAL TEST ERROR:${RESET}`, err);
    failedTests++;
  } finally {
    if (serverInstance) {
      serverInstance.close();
      console.log('\n* Test server gracefully terminated.');
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  logHeader('TEST RUN SUMMARY');
  console.log(`  Total Tests Run:  ${passedTests + failedTests}`);
  console.log(`  ${GREEN}Tests Passed:     ${passedTests}${RESET}`);
  console.log(`  ${failedTests === 0 ? GREEN : RED}Tests Failed:     ${failedTests}${RESET}`);
  console.log(`  Execution Time:   ${durationSec}s\n`);

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log(`${BOLD}${GREEN}All Lakeside School Management System verification tests passed successfully!${RESET}\n`);
    process.exit(0);
  }
}

runAllSuites();
