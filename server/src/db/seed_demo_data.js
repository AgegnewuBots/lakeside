const db = require('./database');

function seedDemoData() {
  console.log('--- Seeding 15 Students per Class Section & Realistic Demo Marks ---');

  // Ensure sections D and E are deleted, and Grade 5 only has A and B
  db.run("DELETE FROM sections WHERE name IN ('D', 'E')");
  db.run("DELETE FROM sections WHERE class_id = (SELECT id FROM classes WHERE grade_level = 5) AND name = 'C'");

  // 1. Fetch current academic year & first semester term
  const currentYear = db.queryOne('SELECT id, name FROM academic_years WHERE is_current = 1');
  if (!currentYear) {
    throw new Error('No active academic year found in database.');
  }

  const prevYear = db.queryOne("SELECT id, name FROM academic_years WHERE name LIKE '2017%'");

  const firstTerm = db.queryOne(
    "SELECT id, name FROM terms WHERE academic_year_id = ? AND (name LIKE 'First%' OR name LIKE '%1%')",
    [currentYear.id]
  );
  if (!firstTerm) {
    throw new Error('No First Semester term found in database.');
  }

  // Fetch users for entered_by
  const teacherUser = db.queryOne("SELECT id FROM users WHERE role = 'teacher' AND username = 'abebe'");
  const adminUser = db.queryOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  const teacherUserId = teacherUser ? teacherUser.id : 1;
  const adminUserId = adminUser ? adminUser.id : 1;

  // 2. Fetch all classes and their sections
  // Put Grade 8A first so that Student ID 1 / 10001 is placed in Grade 8A
  const rawSections = db.query(`
    SELECT s.id, s.class_id, s.name, s.full_name, c.name as class_name, c.grade_level
    FROM sections s
    JOIN classes c ON s.class_id = c.id
    ORDER BY c.grade_level ASC, s.name ASC
  `);

  // Move Grade 8A to first for student ID 1 index compatibility, keeping 32 sections total
  const g8A = rawSections.find(s => s.class_name === 'Grade 8' && s.name === 'A');
  const otherSections = rawSections.filter(s => !(s.class_name === 'Grade 8' && s.name === 'A'));
  const sections = g8A ? [g8A, ...otherSections] : rawSections;

  console.log(`Found ${sections.length} total sections across all classes.`);

  // 3. Clear existing students, parents, assessments, and marks to ensure pristine sequence
  db.exec(`
    DELETE FROM mark_history;
    DELETE FROM marks;
    DELETE FROM assessments;
    DELETE FROM sms_recipients;
    DELETE FROM sms_broadcasts;
    DELETE FROM student_parents;
    DELETE FROM parents;
    DELETE FROM student_class_assignments;
    DELETE FROM students;
    DELETE FROM sqlite_sequence WHERE name IN ('students', 'parents', 'student_parents', 'student_class_assignments', 'assessments', 'marks', 'mark_history', 'sms_broadcasts', 'sms_recipients');
  `);

  // Authentic Ethiopian Names Pool
  const boyFirstNames = [
    'Abebe', 'Dawit', 'Yohannes', 'Samuel', 'Natnael', 'Abel', 'Eyob', 'Biruk',
    'Robel', 'Kirubel', 'Henok', 'Tewodros', 'Solomon', 'Haile', 'Ermias',
    'Nahom', 'Biniyam', 'Kaleab', 'Michael', 'Surafel', 'Daniel', 'Kidus',
    'Yared', 'Ephrem', 'Bisrat', 'Bereket', 'Mulugeta', 'Girma', 'Kassahun',
    'Desta', 'Tamirat', 'Amanuel', 'Fitsum', 'Leul', 'Yosef', 'Senay',
    'Dagmawi', 'Nebiyu', 'Anteneh', 'Fikru', 'Tadesse', 'Melaku', 'Ashenafi'
  ];

  const girlFirstNames = [
    'Hana', 'Selam', 'Betelhem', 'Eden', 'Sara', 'Meron', 'Rahel', 'Bethlehem',
    'Tsion', 'Mahlet', 'Tigist', 'Feven', 'Helina', 'Liya', 'Martha', 'Ruth',
    'Eyerusalem', 'Kalkidan', 'Yordanos', 'Fikir', 'Blen', 'Sosina', 'Senait',
    'Lidya', 'Saron', 'Blene', 'Haimanot', 'Hirut', 'Mekdes', 'Hewan',
    'Hiwot', 'Genet', 'Samrawit', 'Hawlet', 'Dinknesh', 'Hermela', 'Kidist',
    'Birtukan', 'Nigist', 'Frehiwot', 'Tsedey', 'Helen', 'Semhar', 'Winta'
  ];

  const paternalNames = [
    'Kebede', 'Alemu', 'Tadesse', 'Bekele', 'Worku', 'Haile', 'Girma', 'Desta',
    'Mengistu', 'Tesfaye', 'Assefa', 'Berhanu', 'Molla', 'Getachew', 'Tekle',
    'Demisse', 'Belay', 'Negash', 'Zewdu', 'Fekadu', 'Wolde', 'Wondimu',
    'Ayele', 'Gebre', 'Admasu', 'Chernet', 'Habte', 'Mekonnen', 'Bogale',
    'Shimelis', 'Hailu', 'Yilma', 'Teshome', 'Kassa', 'Welde', 'Tilahun'
  ];

  const familyGrandfatherNames = [
    'Belayneh', 'Gebremariam', 'Woldemichael', 'Hailemariam', 'Tesfamariam',
    'Gebretsadik', 'Woldesenbet', 'Teklemariam', 'Gebremedhin', 'Asres',
    'Woldegiorgis', 'Habtemariam', 'Woldetensae', 'Kidanemariam', 'Gebresilassie',
    'Gebrehana', 'Woldekidan', 'Teklehaimanot', 'Gebremeskel', 'Woldeselassie'
  ];

  const occupations = [
    'Civil Engineer', 'Merchant', 'University Lecturer', 'Physician', 'Senior Accountant',
    'Architect', 'IT Consultant', 'Nurse', 'Business Owner', 'Banking Officer',
    'Pharmacist', 'Attorney', 'Civil Servant', 'Logistics Specialist', 'Airline Pilot'
  ];

  // Subjects lookup
  const subjects = db.query('SELECT id, name, code FROM subjects');
  const subjectMap = {};
  for (const sub of subjects) {
    subjectMap[sub.code] = sub.id;
  }

  // Find Grade 7B for Hana's historical record
  const g7B = rawSections.find(s => s.class_name === 'Grade 7' && s.name === 'B');

  // Transaction for high-speed insertion
  db.transaction(() => {
    let studentNumber = 10001;
    let globalIndex = 0;

    const studentRoster = []; // Store for mark population

    for (const section of sections) {
      // Determine birth year based on grade level (in Ethiopian Calendar, current = 2018 E.C.)
      let birthYearEth;
      if (section.grade_level === -3) birthYearEth = 2014;
      else if (section.grade_level === -2) birthYearEth = 2013;
      else if (section.grade_level === -1) birthYearEth = 2012;
      else birthYearEth = 2018 - 7 - (section.grade_level - 1); // Grade 1 = 2011, Grade 8 = 2004

      for (let roll = 1; roll <= 15; roll++) {
        let isBoy = (roll % 2 === 1);
        let firstName = isBoy
          ? boyFirstNames[(globalIndex + roll) % boyFirstNames.length]
          : girlFirstNames[(globalIndex + roll) % girlFirstNames.length];
        let fatherName = paternalNames[(globalIndex * 2 + roll) % paternalNames.length];
        let grandFatherName = familyGrandfatherNames[(globalIndex * 3 + roll) % familyGrandfatherNames.length];
        let fullName = `${firstName} ${fatherName} ${grandFatherName}`;
        let gender = isBoy ? 'Male' : 'Female';
        // Family deduplication & sibling grouping
        // Pool of ~280 families across 480 students so multiple siblings naturally group together
        const familySlot = (globalIndex * 13) % 280;
        let parentPhone = `+251 91 ${100 + (familySlot % 899)} ${String(1000 + (familySlot * 31) % 9000).padStart(4, '0')}`;
        let parentName = `${isBoy ? 'Ato' : 'W/ro'} ${fatherName} ${grandFatherName}`;

        // Special profile for the very first student (10001): Hana Alemu Bekele
        if (studentNumber === 10001) {
          isBoy = false;
          gender = 'Female';
          firstName = 'Hana';
          fatherName = 'Alemu';
          grandFatherName = 'Bekele';
          fullName = 'Hana Alemu Bekele';
          parentName = 'Ato Alemu Bekele';
          parentPhone = '0911234567';
        } else if (studentNumber === 10155) {
          // Dawit Alemu Bekele (Hana's younger brother in Grade 5)
          isBoy = true;
          gender = 'Male';
          firstName = 'Dawit';
          fatherName = 'Alemu';
          grandFatherName = 'Bekele';
          fullName = 'Dawit Alemu Bekele';
          parentName = 'Ato Alemu Bekele';
          parentPhone = '0911234567';
        }

        const birthDay = String(1 + ((roll * 3) % 28)).padStart(2, '0');
        const birthMonth = String(1 + ((roll * 2) % 12)).padStart(2, '0');
        const dob = `${birthDay}/${birthMonth}/${birthYearEth}`;
        const isExisting = roll <= 11 ? 1 : 0; // ~75% existing, 25% new intake

        const studentCode = String(studentNumber);
        studentNumber++;

        // Insert student
        const sRes = db.run(`
          INSERT INTO students (student_id, full_name, gender, date_of_birth, registration_date, status, is_existing_student)
          VALUES (?, ?, ?, ?, '01/01/2018', 'Active', ?)
        `, [studentCode, fullName, gender, dob, isExisting]);
        const sId = Number(sRes.lastInsertRowid);

        // Insert student class assignment for 2018 E.C.
        db.run(`
          INSERT INTO student_class_assignments (student_id, academic_year_id, class_id, section_id, roll_number, status)
          VALUES (?, ?, ?, ?, ?, 'Active')
        `, [sId, currentYear.id, section.class_id, section.id, roll]);

        // If Hana (ID 10001), also insert historical Grade 7B assignment in 2017 E.C.
        if (studentCode === '10001' && prevYear && g7B) {
          db.run(`
            INSERT INTO student_class_assignments (student_id, academic_year_id, class_id, section_id, roll_number, status)
            VALUES (?, ?, ?, ?, 1, 'Promoted')
          `, [sId, prevYear.id, g7B.class_id, g7B.id]);
        }

        // Check if parent with same phone already exists to group siblings into one family
        let pId;
        const existingParent = db.queryOne('SELECT id FROM parents WHERE phone_number = ?', [parentPhone]);
        if (existingParent) {
          pId = existingParent.id;
        } else {
          const occupation = occupations[(globalIndex + roll) % occupations.length];
          const pRes = db.run(`
            INSERT INTO parents (full_name, phone_number, occupation)
            VALUES (?, ?, ?)
          `, [parentName, parentPhone, occupation]);
          pId = Number(pRes.lastInsertRowid);
        }

        // Link student to parent
        db.run(`
          INSERT INTO student_parents (student_id, parent_id, relationship, is_primary, sms_enabled)
          VALUES (?, ?, ?, 1, 1)
        `, [sId, pId, isBoy ? 'Father' : 'Mother']);

        studentRoster.push({
          id: sId,
          code: studentCode,
          name: fullName,
          class_id: section.class_id,
          class_name: section.class_name,
          section_id: section.id,
          section_name: section.name,
          grade_level: section.grade_level,
          roll: roll
        });

        globalIndex++;
      }
    }

    console.log(`Created ${studentRoster.length} students across ${sections.length} sections.`);

    // 4. Create Assessments & Marks
    console.log('Creating assessments and demo assessment marks...');

    // Assessment configurations per class cycle
    // In First Semester:
    // Benchmark 1: Tests (max 20)
    // Benchmark 2: Mid (max 30)
    // Benchmark 3: Final (max 50)

    for (const section of sections) {
      // Determine which subjects to assess for this section
      let assessSubjectCodes = [];
      if (section.grade_level < 1) {
        // Kindergarten: Early Numeracy/Math, English, Amharic
        assessSubjectCodes = ['MATH', 'ENG', 'AMH'];
      } else if (section.grade_level <= 4) {
        // Grades 1-4: Math, English, Amharic, Environmental Science
        assessSubjectCodes = ['MATH', 'ENG', 'AMH', 'ENV'];
      } else if (section.grade_level <= 6) {
        // Grades 5-6: Math, English, General Science, Social Studies
        assessSubjectCodes = ['MATH', 'ENG', 'SCI', 'SOC'];
      } else {
        // Grades 7-8: Math (Mr. Abebe Kebede's specialty!), English, General Science, ICT
        assessSubjectCodes = ['MATH', 'ENG', 'SCI', 'ICT'];
      }

      const sectionStudents = studentRoster.filter(s => s.section_id === section.id);

      for (const code of assessSubjectCodes) {
        const subId = subjectMap[code];
        if (!subId) continue;

        const isMathFaculty = (section.grade_level === 7 || section.grade_level === 8) && code === 'MATH';
        const enteredByUser = isMathFaculty ? teacherUserId : adminUserId;

        // 3 Benchmarks: Tests (20), Mid (30), Final (50)
        const benchmarks = [
          { name: 'Tests', max_marks: 20, weight: 20 },
          { name: 'Mid', max_marks: 30, weight: 30 },
          { name: 'Final', max_marks: 50, weight: 50 }
        ];

        for (const bm of benchmarks) {
          const aRes = db.run(`
            INSERT INTO assessments (academic_year_id, term_id, class_id, section_id, subject_id, name, max_marks, weight_percentage, assessment_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2025-11-15', 'Completed')
          `, [currentYear.id, firstTerm.id, section.class_id, section.id, subId, bm.name, bm.max_marks, bm.weight]);
          const aId = Number(aRes.lastInsertRowid);

          // Enter realistic marks for each of the 15 students
          for (const st of sectionStudents) {
            // Seed a consistent performance profile per student (based on their roll number)
            // Roll 1: Outstanding student (~96%)
            // Roll 2: Outstanding student (~96% - intentional tie to test Olympic competition tie-breaker!)
            // Roll 3: High achiever (~91%)
            // Roll 4-9: Solid proficient (70% - 86%)
            // Roll 10-13: Average (57% - 68%)
            // Roll 14: Passing (52%)
            // Roll 15: Needs support (48% - tests minimum 50 marks threshold!)
            let ratio;
            if (st.roll === 1) ratio = 0.96;
            else if (st.roll === 2) ratio = 0.96;
            else if (st.roll === 3) ratio = 0.91;
            else if (st.roll === 4) ratio = 0.86;
            else if (st.roll === 5) ratio = 0.83;
            else if (st.roll === 6) ratio = 0.79;
            else if (st.roll === 7) ratio = 0.76;
            else if (st.roll === 8) ratio = 0.73;
            else if (st.roll === 9) ratio = 0.70;
            else if (st.roll === 10) ratio = 0.67;
            else if (st.roll === 11) ratio = 0.64;
            else if (st.roll === 12) ratio = 0.61;
            else if (st.roll === 13) ratio = 0.57;
            else if (st.roll === 14) ratio = 0.52;
            else ratio = 0.48; // Below 50 to test unranked threshold!

            // Add slight variation based on subject code to be realistic
            const codeBonus = code === 'MATH' ? 0.01 : code === 'ENG' ? -0.01 : 0;
            const finalRatio = Math.min(0.99, Math.max(0.40, ratio + codeBonus));

            const rawScore = bm.max_marks * finalRatio;
            // Round to 1 decimal place or half point
            const markObtained = Math.round(rawScore * 2) / 2;

            let remark = 'Satisfactory';
            if (finalRatio >= 0.90) remark = 'Distinction';
            else if (finalRatio >= 0.80) remark = 'Very Good';
            else if (finalRatio >= 0.65) remark = 'Good Effort';
            else if (finalRatio >= 0.50) remark = 'Passing';
            else remark = 'Requires Support';

            db.run(`
              INSERT INTO marks (assessment_id, student_id, marks_obtained, is_absent, remarks, entered_by_user_id)
              VALUES (?, ?, ?, 0, ?, ?)
            `, [aId, st.id, markObtained, remark, enteredByUser]);
          }
        }
      }
    }

    // Seed initial SMS broadcast and simulator records
    const bRes = db.run(`
      INSERT INTO sms_broadcasts (title, broadcast_type, sender_user_id, sender_role, target_type, message_template, total_recipients, sent_count, failed_count, status, created_at)
      VALUES (?, 'ANNOUNCEMENT', ?, 'admin', 'ALL', ?, 15, 15, 0, 'Completed', '2025-11-20 10:00:00')
    `, [
      'First Semester Midterm Schedule Notice',
      adminUserId,
      'Dear Parents, First Semester Midterm assessments for 2018 E.C. are now complete. Individual student report cards and rank summaries are available. - Lake Side Academy'
    ]);
    const broadcastId = Number(bRes.lastInsertRowid);

    // Add recipients for the first 15 students (Grade 8A cohort)
    const sampleCohort = studentRoster.slice(0, 15);
    for (const st of sampleCohort) {
      const parentInfo = db.queryOne(`
        SELECT p.id as parent_id, p.full_name as parent_name, p.phone_number
        FROM parents p
        JOIN student_parents sp ON p.id = sp.parent_id
        WHERE sp.student_id = ? AND sp.is_primary = 1
      `, [st.id]);

      if (parentInfo) {
        db.run(`
          INSERT INTO sms_recipients (broadcast_id, student_id, parent_id, phone_number, message_content, status, sent_at, delivered_at)
          VALUES (?, ?, ?, ?, ?, 'Delivered', '2025-11-20 10:00:02', '2025-11-20 10:00:05')
        `, [
          broadcastId,
          st.id,
          parentInfo.parent_id,
          parentInfo.phone_number,
          `Dear ${parentInfo.parent_name}, First Semester Midterm notice for ${st.name} (Grade 8A): report cards are available. Lake Side Academy.`
        ]);
      }
    }
  });

  const totalStudents = db.queryOne('SELECT COUNT(*) as c FROM students').c;
  const totalMarks = db.queryOne('SELECT COUNT(*) as c FROM marks').c;
  const totalAssessments = db.queryOne('SELECT COUNT(*) as c FROM assessments').c;

  console.log('======================================================');
  console.log('DEMO DATA SEEDING COMPLETE!');
  console.log(`Total Students Enrolled: ${totalStudents} (15 per section across 32 sections)`);
  console.log(`Total Assessments Created: ${totalAssessments}`);
  console.log(`Total Student Marks Entered: ${totalMarks}`);
  console.log('======================================================');
}

if (require.main === module) {
  seedDemoData();
}

module.exports = seedDemoData;
