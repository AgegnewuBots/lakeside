const bcrypt = require('bcryptjs');
const db = require('./database');

function seed() {
  console.log('--- Initializing Clean Production Database for Lake Side Academy ---');

  // Clear existing tables in reverse dependency order
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM mark_history;
    DELETE FROM student_history;
    DELETE FROM sms_recipients;
    DELETE FROM sms_broadcasts;
    DELETE FROM announcements;
    DELETE FROM marks;
    DELETE FROM assessments;
    DELETE FROM student_parents;
    DELETE FROM parents;
    DELETE FROM student_class_assignments;
    DELETE FROM students;
    DELETE FROM teacher_assignments;
    DELETE FROM teachers;
    DELETE FROM user_permissions;
    DELETE FROM permissions;
    DELETE FROM users;
    DELETE FROM subjects;
    DELETE FROM sections;
    DELETE FROM classes;
    DELETE FROM terms;
    DELETE FROM academic_years;
    DELETE FROM school_settings;
    DELETE FROM sqlite_sequence;
  `);

  // 1. Institutional Settings
  const settings = [
    ['school_name', 'Lake Side Academy', 'Official school name'],
    ['school_motto', 'Excellence in Knowledge, Integrity in Character', 'School motto'],
    ['school_phone', '+251 11 654 3210', 'Main office telephone'],
    ['school_email', 'info@lakesideschool.edu.et', 'Official correspondence email'],
    ['school_address', 'Lake View Boulevard, Lakeside Campus', 'Physical campus location'],
    ['sms_provider', 'SMSETHIOPIA', 'Active SMS Gateway provider: SMSETHIOPIA'],
    ['sms_sender_id', 'LAKESIDE', 'Sender ID displayed on parent phones'],
    ['current_academic_year', '2018 E.C.', 'Current active academic year (Ethiopian Calendar)']
  ];
  for (const [k, v, d] of settings) {
    db.run('INSERT INTO school_settings (key, value, description) VALUES (?, ?, ?)', [k, v, d]);
  }

  // 2. Granular Permissions Catalog
  const permissionsList = [
    ['students.view', 'View Students', 'Students', 'Can view student profiles and records'],
    ['students.create', 'Create Students', 'Students', 'Can register new and existing students'],
    ['students.update', 'Update Students', 'Students', 'Can edit student details and demographics'],
    ['students.delete', 'Delete Students', 'Students', 'Can delete student records'],
    ['students.promote', 'Promote Students', 'Students', 'Can promote students to the next grade'],
    ['parents.view', 'View Parents', 'Parents', 'Can view parent contact and guardian records'],
    ['parents.create', 'Create Parents', 'Parents', 'Can register parents and link them to students'],
    ['parents.update', 'Update Parents', 'Parents', 'Can update parent phone and contact info'],
    ['parents.delete', 'Delete Parents', 'Parents', 'Can delete parent records'],
    ['teachers.view', 'View Teachers', 'Teachers', 'Can view faculty teachers list'],
    ['teachers.create', 'Create Teachers', 'Teachers', 'Can create teacher accounts'],
    ['teachers.update', 'Update Teachers', 'Teachers', 'Can edit teacher profiles'],
    ['teachers.delete', 'Delete Teachers', 'Teachers', 'Can delete teacher accounts'],
    ['classes.manage', 'Manage Classes', 'Academics', 'Can manage classes, sections, and subjects'],
    ['results.view', 'View Results', 'Academics', 'Can view assessments, marks, and gradebooks'],
    ['results.create', 'Enter Marks', 'Academics', 'Can enter student assessment marks'],
    ['results.update', 'Adjust Marks', 'Academics', 'Can adjust existing student marks with reason'],
    ['results.delete', 'Delete Results', 'Academics', 'Can delete assessment results'],
    ['sms.broadcast', 'Send SMS Broadcast', 'Communication', 'Can send general SMS announcements'],
    ['sms.result', 'Send Result SMS', 'Communication', 'Can generate and dispatch Result SMS to parents'],
    ['rankings.view', 'View Rankings', 'Academics', 'Can view class, grade, and multi-grade rankings'],
    ['audit.view', 'View Audit Logs', 'Security', 'Can inspect security logs and data diffs'],
    ['settings.manage', 'Manage Settings', 'System', 'Can modify school and SMS provider settings']
  ];
  for (const [code, name, cat, desc] of permissionsList) {
    db.run('INSERT INTO permissions (code, name, category, description) VALUES (?, ?, ?, ?)', [code, name, cat, desc]);
  }

  // 3. System Accounts (Admin, Director 1, Director 2, Registrar / Records Manager)
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('age1324', salt);
  const dirHash = bcrypt.hashSync('dir123', salt);

  // Executive Admin
  const adminUser = db.run(
    'INSERT INTO users (username, password_hash, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    ['admin', adminHash, 'Lakeside Executive Administrator', 'admin', null, '+251 91 100 0001']
  );
  const adminId = Number(adminUser.lastInsertRowid);

  // Director 1 (Managing Director)
  const dir1User = db.run(
    'INSERT INTO users (username, password_hash, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    ['director1', dirHash, 'Director 1 (Managing Director)', 'director', null, '+251 91 100 0002']
  );
  const dir1Id = Number(dir1User.lastInsertRowid);

  // Director 2 (Academic Director)
  const dir2User = db.run(
    'INSERT INTO users (username, password_hash, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    ['director2', dirHash, 'Director 2 (Academic Director)', 'director', null, '+251 91 100 0003']
  );
  const dir2Id = Number(dir2User.lastInsertRowid);

  // Registrar / Records Office Manager
  const regUser = db.run(
    'INSERT INTO users (username, password_hash, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    ['registrar', dirHash, 'Sister Martha (Registrar / Records Manager)', 'records', null, '+251 91 100 0004']
  );
  const regId = Number(regUser.lastInsertRowid);

  // Faculty Teacher (Mr. Abebe Kebede - Mathematics)
  const teachHash = bcrypt.hashSync('teach123', salt);
  const teachUser = db.run(
    'INSERT INTO users (username, password_hash, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    ['abebe', teachHash, 'Mr. Abebe Kebede (Mathematics Faculty)', 'teacher', null, '+251 91 100 0005']
  );
  const teachId = Number(teachUser.lastInsertRowid);

  const teacherProfile = db.run(
    'INSERT INTO teachers (user_id, staff_id, full_name, email, phone, qualification, join_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [teachId, 'T-101', 'Mr. Abebe Kebede', null, '+251 91 100 0005', 'B.Ed. Mathematics Education', '2023-09-01', 'Active']
  );
  const teacherProfileId = Number(teacherProfile.lastInsertRowid);

  // Grant all directory permissions to directors and registrar
  const allDirPermCodes = [
    'students.view', 'students.create', 'students.update', 'students.promote',
    'parents.view', 'parents.create', 'parents.update',
    'teachers.view', 'teachers.create', 'teachers.update',
    'classes.manage',
    'results.view', 'results.create', 'results.update',
    'sms.broadcast', 'sms.result',
    'rankings.view',
    'audit.view'
  ];

  for (const uId of [dir1Id, dir2Id, regId]) {
    for (const p of allDirPermCodes) {
      db.run('INSERT INTO user_permissions (user_id, permission_code, is_granted) VALUES (?, ?, 1)', [uId, p]);
    }
  }

  // 4. Academic Years (Ethiopian Calendar: 2018 E.C., 2017 E.C., 2016 E.C., 2015 E.C.)
  const yearsConfig = [
    { name: '2015 E.C.', start: '2022-09-11', end: '2023-07-07', current: 0 },
    { name: '2016 E.C.', start: '2023-09-11', end: '2024-07-07', current: 0 },
    { name: '2017 E.C.', start: '2024-09-11', end: '2025-07-07', current: 0 },
    { name: '2018 E.C.', start: '2025-09-11', end: '2026-07-07', current: 1 }
  ];

  const yearIds = {};
  for (const y of yearsConfig) {
    const res = db.run(
      'INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES (?, ?, ?, ?)',
      [y.name, y.start, y.end, y.current]
    );
    yearIds[y.name] = Number(res.lastInsertRowid);
  }

  // Terms for each year
  for (const yName of Object.keys(yearIds)) {
    const yId = yearIds[yName];
    const isCurrentYear = yName === '2018 E.C.';
    db.run('INSERT INTO terms (academic_year_id, name, is_current) VALUES (?, ?, ?)', [yId, 'First Semester', isCurrentYear ? 1 : 0]);
    db.run('INSERT INTO terms (academic_year_id, name, is_current) VALUES (?, ?, ?)', [yId, 'Second Semester', 0]);
    db.run('INSERT INTO terms (academic_year_id, name, is_current) VALUES (?, ?, ?)', [yId, 'Average Semester', 0]);
  }

  // 5. Classes & Sections (Kindergarten KG 1 - KG 3 & Elementary Grade 1 - Grade 8)
  const allLevels = [
    { name: 'KG 1', level: -3 },
    { name: 'KG 2', level: -2 },
    { name: 'KG 3', level: -1 },
    { name: 'Grade 1', level: 1 },
    { name: 'Grade 2', level: 2 },
    { name: 'Grade 3', level: 3 },
    { name: 'Grade 4', level: 4 },
    { name: 'Grade 5', level: 5 },
    { name: 'Grade 6', level: 6 },
    { name: 'Grade 7', level: 7 },
    { name: 'Grade 8', level: 8 }
  ];

  const classMap = {};
  const sectionMap = {};

  for (const g of allLevels) {
    const res = db.run('INSERT INTO classes (name, grade_level) VALUES (?, ?)', [g.name, g.level]);
    const cid = Number(res.lastInsertRowid);
    classMap[g.name] = cid;

    // Sections: Grade 5 defaults to A and B; all other grades/KGs default to A, B, C
    const defaultSections = g.level === 5 ? ['A', 'B'] : ['A', 'B', 'C'];
    for (const sName of defaultSections) {
      const sFullName = g.name + sName;
      const sRes = db.run('INSERT INTO sections (class_id, name, full_name) VALUES (?, ?, ?)', [cid, sName, sFullName]);
      sectionMap[sFullName] = Number(sRes.lastInsertRowid);
    }
  }

  // 6. Subjects (Core Ethiopian Curriculum)
  const subjectsList = [
    ['Mathematics', 'MATH'],
    ['English Language', 'ENG'],
    ['Amharic Language', 'AMH'],
    ['General Science', 'SCI'],
    ['Social Studies', 'SOC'],
    ['Environmental Science', 'ENV'],
    ['Information Technology', 'ICT'],
    ['Citizenship Education', 'CIT'],
    ['Physical Education', 'HPE'],
    ['Performing and Visual Arts', 'PVA']
  ];

  const subjectIdMap = {};
  for (const [sName, sCode] of subjectsList) {
    const res = db.run('INSERT INTO subjects (name, code) VALUES (?, ?)', [sName, sCode]);
    subjectIdMap[sCode] = Number(res.lastInsertRowid);
  }

  // 7. Class Subjects Association (KG, Primary Cycle 1: 1-4, Primary Cycle 2: 5-8)
  for (const g of allLevels) {
    const cid = classMap[g.name];
    const codes = g.level < 1
      ? ['MATH', 'ENG', 'AMH', 'HPE', 'PVA']
      : g.level <= 4
      ? ['MATH', 'ENG', 'AMH', 'ENV', 'HPE', 'PVA']
      : ['MATH', 'ENG', 'AMH', 'SCI', 'SOC', 'CIT', 'ICT', 'HPE', 'PVA'];

    for (const code of codes) {
      if (subjectIdMap[code]) {
        db.run('INSERT OR IGNORE INTO class_subjects (class_id, subject_id) VALUES (?, ?)', [cid, subjectIdMap[code]]);
      }
    }
  }

  // 8. Teacher Assignments (Mr. Abebe Kebede: Mathematics for Grade 7 & Grade 8, Sections A-C in 2018 E.C.)
  const currentYearId = yearIds['2018 E.C.'];
  const mathSubjectId = subjectIdMap['MATH'];
  if (currentYearId && mathSubjectId) {
    for (const gName of ['Grade 7', 'Grade 8']) {
      const cid = classMap[gName];
      for (const sName of ['A', 'B', 'C']) {
        const sid = sectionMap[gName + sName];
        if (cid && sid) {
          db.run(
            'INSERT OR IGNORE INTO teacher_assignments (teacher_id, academic_year_id, class_id, section_id, subject_id) VALUES (?, ?, ?, ?, ?)',
            [teacherProfileId, currentYearId, cid, sid, mathSubjectId]
          );
        }
      }
    }
  }

  // 9. Seed 15 Students per Section across all 32 sections and demo assessment marks
  const seedDemoData = require('./seed_demo_data');
  seedDemoData();

  console.log('--- Database successfully seeded with 15 students per section and realistic marks! ---');
}

if (require.main === module) {
  seed();
}

module.exports = seed;
