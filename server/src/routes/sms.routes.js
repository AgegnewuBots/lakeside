const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');
const smsEthiopia = require('../services/smsEthiopia.service');

// GET /api/sms/broadcasts (List SMS broadcast history)
router.get('/broadcasts', authenticate, (req, res) => {
  let sql = `
    SELECT sb.*, u.full_name as sender_name, u.role as sender_role_name
    FROM sms_broadcasts sb
    LEFT JOIN users u ON sb.sender_user_id = u.id
  `;
  const params = [];

  // Teacher scoping rule: Teacher only sees own SMS broadcasts
  if (req.user.role === 'teacher') {
    sql += ' WHERE sb.sender_user_id = ?';
    params.push(req.user.id);
  }

  sql += ' ORDER BY sb.created_at DESC';
  const broadcasts = db.query(sql, params);
  res.json(broadcasts);
});

// GET /api/sms/broadcasts/:id (Details & individual recipient status)
router.get('/broadcasts/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const broadcast = db.queryOne(`
    SELECT sb.*, u.full_name as sender_name
    FROM sms_broadcasts sb
    LEFT JOIN users u ON sb.sender_user_id = u.id
    WHERE sb.id = ?
  `, [id]);

  if (!broadcast) return res.status(404).json({ error: 'Broadcast not found.' });

  const recipients = db.query(`
    SELECT sr.*, s.student_id as student_code, s.full_name as student_name,
           p.full_name as parent_name,
           sec.full_name as class_section
    FROM sms_recipients sr
    LEFT JOIN students s ON sr.student_id = s.id
    LEFT JOIN parents p ON sr.parent_id = p.id
    LEFT JOIN student_class_assignments csa ON s.id = csa.student_id AND csa.status = 'Active'
    LEFT JOIN sections sec ON csa.section_id = sec.id
    WHERE sr.broadcast_id = ?
    ORDER BY sr.id ASC
  `, [id]);

  res.json({
    broadcast,
    recipients
  });
});

// POST /api/sms/calculate-recipients (Calculate count and preview deduplicated parents before sending)
router.post('/calculate-recipients', authenticate, (req, res) => {
  const { target_type, class_ids = [], section_ids = [], student_id, student_ids = [], deduplicate_parents = true } = req.body;

  let query = `
    SELECT s.id as student_id, s.student_id as student_code, s.full_name as student_name,
           sec.full_name as section_name,
           p.id as parent_id, p.full_name as parent_name, p.phone_number as parent_phone
    FROM students s
    JOIN student_class_assignments csa ON s.id = csa.student_id AND csa.status = 'Active'
    JOIN sections sec ON csa.section_id = sec.id
    JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1 AND sp.sms_enabled = 1
    JOIN parents p ON sp.parent_id = p.id
    WHERE s.status = 'Active'
  `;
  const params = [];

  // Teacher scoping rule
  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    query += `
      AND EXISTS (
        SELECT 1 FROM teacher_assignments ta 
        WHERE ta.teacher_id = ? AND ta.class_id = csa.class_id AND ta.section_id = csa.section_id
      )
    `;
    params.push(teacher.id);
  }

  if (target_type === 'STUDENT') {
    if (Array.isArray(student_ids) && student_ids.length > 0) {
      const placeholders = student_ids.map(() => '?').join(',');
      query += ` AND (s.id IN (${placeholders}) OR s.student_id IN (${placeholders}))`;
      params.push(...student_ids, ...student_ids);
    } else if (student_id) {
      query += ' AND (s.id = ? OR s.student_id = ?)';
      params.push(student_id, student_id);
    }
  } else if (target_type === 'SECTION' && section_ids.length > 0) {
    query += ` AND csa.section_id IN (${section_ids.map(() => '?').join(',')})`;
    params.push(...section_ids);
  } else if (target_type === 'GRADE' && class_ids.length > 0) {
    query += ` AND csa.class_id IN (${class_ids.map(() => '?').join(',')})`;
    params.push(...class_ids);
  }

  const rows = db.query(query, params);

  // Parent Deduplication logic (Section 14: Avoid duplicate SMS if same parent connected to multiple students)
  let finalRecipients = [];
  if (deduplicate_parents) {
    const seenPhones = new Set();
    for (const r of rows) {
      if (!seenPhones.has(r.parent_phone)) {
        seenPhones.add(r.parent_phone);
        finalRecipients.push(r);
      }
    }
  } else {
    finalRecipients = rows;
  }

  res.json({
    total_students_selected: rows.length,
    total_unique_phones: finalRecipients.length,
    estimated_sms_count: finalRecipients.length,
    sample_recipients: finalRecipients.slice(0, 10)
  });
});

// POST /api/sms/broadcast (Send general announcement SMS broadcast)
router.post('/broadcast', authenticate, async (req, res) => {
  // Check permission: Admin always allowed; Directory/Director/Records needs 'sms.broadcast'; Teacher allowed for assigned classes
  if ((req.user.role === 'directory' || req.user.role === 'director' || req.user.role === 'records') && !req.user.permissions?.includes('sms.broadcast')) {
    return res.status(403).json({ error: 'User lacks permission to send SMS broadcasts.' });
  }

  const {
    title,
    message,
    target_type = 'ALL',
    class_ids = [],
    section_ids = [],
    student_id,
    student_ids = [],
    deduplicate_parents = true
  } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message text are required.' });
  }

  // Teacher scoping rule
  if (req.user.role === 'teacher') {
    if (target_type === 'ALL' || target_type === 'GRADE') {
      return res.status(403).json({ error: 'Teachers can only send SMS to assigned sections or students.' });
    }
  }

  // Resolve target students & parents
  let query = `
    SELECT s.id as student_id, s.student_id as student_code, s.full_name as student_name,
           p.id as parent_id, p.full_name as parent_name, p.phone_number as parent_phone
    FROM students s
    JOIN student_class_assignments csa ON s.id = csa.student_id AND csa.status = 'Active'
    JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1 AND sp.sms_enabled = 1
    JOIN parents p ON sp.parent_id = p.id
    WHERE s.status = 'Active'
  `;
  const params = [];

  if (req.user.role === 'teacher') {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    query += `
      AND EXISTS (
        SELECT 1 FROM teacher_assignments ta 
        WHERE ta.teacher_id = ? AND ta.class_id = csa.class_id AND ta.section_id = csa.section_id
      )
    `;
    params.push(teacher.id);
  }

  if (target_type === 'STUDENT') {
    if (Array.isArray(student_ids) && student_ids.length > 0) {
      const placeholders = student_ids.map(() => '?').join(',');
      query += ` AND (s.id IN (${placeholders}) OR s.student_id IN (${placeholders}))`;
      params.push(...student_ids, ...student_ids);
    } else if (student_id) {
      query += ' AND (s.id = ? OR s.student_id = ?)';
      params.push(student_id, student_id);
    }
  } else if (section_ids.length > 0) {
    query += ` AND csa.section_id IN (${section_ids.map(() => '?').join(',')})`;
    params.push(...section_ids);
  } else if (class_ids.length > 0) {
    query += ` AND csa.class_id IN (${class_ids.map(() => '?').join(',')})`;
    params.push(...class_ids);
  }

  const candidateRecipients = db.query(query, params);
  if (candidateRecipients.length === 0) {
    return res.status(400).json({ error: 'No eligible recipients found matching the specified criteria.' });
  }

  // Deduplicate parents
  const finalRecipients = [];
  const seenPhones = new Set();
  for (const c of candidateRecipients) {
    if (deduplicate_parents) {
      if (!seenPhones.has(c.parent_phone)) {
        seenPhones.add(c.parent_phone);
        finalRecipients.push(c);
      }
    } else {
      finalRecipients.push(c);
    }
  }

  // 1. Create Broadcast entry
  const bcastRes = db.run(`
    INSERT INTO sms_broadcasts (title, broadcast_type, sender_user_id, sender_role, target_type, target_filters_json, message_template, total_recipients, sent_count, failed_count, status)
    VALUES (?, 'ANNOUNCEMENT', ?, ?, ?, ?, ?, ?, 0, 0, 'Processing')
  `, [title.trim(), req.user.id, req.user.role, target_type, JSON.stringify({ class_ids, section_ids, student_id }), message.trim(), finalRecipients.length]);

  const broadcastId = Number(bcastRes.lastInsertRowid);
  let sentCount = 0;
  let failedCount = 0;

  // 2. Dispatch real SMS via SMSEthiopia API v2
  for (const r of finalRecipients) {
    let status = 'Sent';
    let providerStatus = 'ACCEPTED';
    let providerMessageId = null;
    let segments = 1;
    let errorMessage = null;

    try {
      const dispatch = await smsEthiopia.sendSms(r.parent_phone, message.trim());
      if (dispatch.sent) {
        status = 'Sent';
        providerStatus = dispatch.status || 'ACCEPTED';
        providerMessageId = dispatch.id;
        segments = dispatch.segments || 1;
        sentCount++;
      } else {
        status = 'Failed';
        providerStatus = 'FAILED';
        errorMessage = dispatch.error_message || 'SMS delivery rejected by gateway';
        failedCount++;
      }
    } catch (err) {
      status = 'Failed';
      providerStatus = 'FAILED';
      errorMessage = err.message;
      failedCount++;
    }

    db.run(`
      INSERT INTO sms_recipients 
        (broadcast_id, student_id, parent_id, phone_number, message_content, status, provider_message_id, provider_status, segments, error_message, sent_at, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ${status === 'Sent' ? 'CURRENT_TIMESTAMP' : 'NULL'})
    `, [broadcastId, r.student_id, r.parent_id, r.parent_phone, message.trim(), status, providerMessageId, providerStatus, segments, errorMessage]);
  }

  // 3. Update broadcast record with final counts
  const finalStatus = failedCount === finalRecipients.length ? 'Failed' : 'Completed';
  db.run(`
    UPDATE sms_broadcasts 
    SET sent_count = ?, failed_count = ?, status = ?
    WHERE id = ?
  `, [sentCount, failedCount, finalStatus, broadcastId]);

  logAudit(req, {
    action: 'SEND_SMS_BROADCAST',
    entityType: 'SMS_BROADCAST',
    entityId: broadcastId,
    newValues: { title, target_type, total: finalRecipients.length, sent: sentCount, failed: failedCount }
  });

  res.status(201).json({
    success: true,
    broadcast_id: broadcastId,
    total_recipients: finalRecipients.length,
    sent_count: sentCount,
    failed_count: failedCount,
    status: finalStatus,
    message: `Dispatched SMS broadcast to ${finalRecipients.length} parent phone numbers (Sent: ${sentCount}, Failed: ${failedCount}).`
  });
});

// POST /api/sms/send-individual (Direct SMS from Directory / Records to a specific student's parent phone)
router.post('/send-individual', authenticate, async (req, res) => {
  const { student_id, phone_number, message } = req.body;

  if (!phone_number || !message || !message.trim()) {
    return res.status(400).json({ error: 'Parent phone number and message text are required.' });
  }

  // Teacher scoping check if sender is teacher
  if (req.user.role === 'teacher' && student_id) {
    const teacher = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    const isAssigned = db.queryOne(`
      SELECT 1 FROM student_class_assignments csa
      JOIN teacher_assignments ta ON ta.class_id = csa.class_id AND ta.section_id = csa.section_id
      WHERE (csa.student_id = ? OR csa.student_id IN (SELECT id FROM students WHERE student_id = ?))
        AND ta.teacher_id = ?
    `, [student_id, student_id, teacher?.id]);
    if (!isAssigned) {
      return res.status(403).json({ error: 'Access denied: You are not assigned to this student.' });
    }
  }

  let studentObj = null;
  if (student_id) {
    studentObj = db.queryOne('SELECT id, student_id, full_name FROM students WHERE id = ? OR student_id = ?', [student_id, student_id]);
  }

  const cleanPhone = phone_number.trim();
  const trimmedMsg = message.trim();

  // 1. Create Broadcast entry
  const bcastRes = db.run(`
    INSERT INTO sms_broadcasts (title, broadcast_type, sender_user_id, sender_role, target_type, target_filters_json, message_template, total_recipients, sent_count, failed_count, status)
    VALUES (?, 'ANNOUNCEMENT', ?, ?, 'STUDENT', ?, ?, 1, 0, 0, 'Processing')
  `, [
    studentObj ? `Direct SMS to parent of ${studentObj.full_name}` : `Direct SMS to ${cleanPhone}`,
    req.user.id,
    req.user.role,
    JSON.stringify({ student_id: studentObj?.id, phone: cleanPhone }),
    trimmedMsg
  ]);

  const broadcastId = Number(bcastRes.lastInsertRowid);

  let status = 'Sent';
  let providerStatus = 'ACCEPTED';
  let providerMessageId = null;
  let segments = 1;
  let errorMessage = null;

  try {
    const dispatch = await smsEthiopia.sendSms(cleanPhone, trimmedMsg);
    if (dispatch.sent) {
      status = 'Sent';
      providerStatus = dispatch.status || 'ACCEPTED';
      providerMessageId = dispatch.id;
      segments = dispatch.segments || 1;
    } else {
      status = 'Failed';
      providerStatus = 'FAILED';
      errorMessage = dispatch.error_message || 'SMS delivery rejected by gateway';
    }
  } catch (err) {
    status = 'Failed';
    providerStatus = 'FAILED';
    errorMessage = err.message;
  }

  db.run(`
    INSERT INTO sms_recipients 
      (broadcast_id, student_id, parent_id, phone_number, message_content, status, provider_message_id, provider_status, segments, error_message, sent_at, delivered_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ${status === 'Sent' ? 'CURRENT_TIMESTAMP' : 'NULL'})
  `, [broadcastId, studentObj?.id || null, cleanPhone, trimmedMsg, status, providerMessageId, providerStatus, segments, errorMessage]);

  db.run(`
    UPDATE sms_broadcasts 
    SET sent_count = ?, failed_count = ?, status = ?
    WHERE id = ?
  `, [status === 'Sent' ? 1 : 0, status === 'Failed' ? 1 : 0, status === 'Sent' ? 'Completed' : 'Failed', broadcastId]);

  logAudit(req, {
    action: 'SEND_INDIVIDUAL_SMS',
    entityType: 'SMS_BROADCAST',
    entityId: broadcastId,
    newValues: { phone: cleanPhone, student: studentObj?.full_name, status }
  });

  if (status === 'Failed') {
    return res.status(502).json({ error: errorMessage || 'Failed to deliver SMS to gateway.' });
  }

  res.json({
    success: true,
    message: `SMS sent successfully to ${cleanPhone}.`,
    broadcast_id: broadcastId
  });
});

// POST /api/sms/result-broadcast (Auto-generate and dispatch Result SMS directly from DB results)
router.post('/result-broadcast', authenticate, async (req, res) => {
  if ((req.user.role === 'directory' || req.user.role === 'director' || req.user.role === 'records') && !req.user.permissions?.includes('sms.result')) {
    return res.status(403).json({ error: 'User lacks permission to send Result SMS.' });
  }

  const {
    academic_year_id,
    term_id,
    assessment_name = 'Midterm',
    class_ids = [],
    section_ids = [],
    message_template = 'Dear Parent, your child {student_name}\'s Grade {class_section} {assessment_name} results are ready. Total: {total_marks}/{max_marks}. Average: {average}%. Rank: {rank}. Lake Side Academy.'
  } = req.body;

  // Resolve active year
  let yearId = academic_year_id;
  if (!yearId) {
    const cur = db.queryOne('SELECT id FROM academic_years WHERE is_current = 1');
    yearId = cur ? cur.id : 1;
  }
  let tId = term_id;

  // Resolve shorthand benchmark prefixes (F.Mid, S.Final, etc.)
  let resolvedAssessment = assessment_name || 'ALL';
  if (assessment_name) {
    if (assessment_name.startsWith('F.')) {
      const fTerm = db.queryOne("SELECT id FROM terms WHERE academic_year_id = ? AND (name LIKE 'First%' OR name LIKE '%1%')", [yearId]);
      if (fTerm) tId = fTerm.id;
      resolvedAssessment = assessment_name.replace('F.', '');
    } else if (assessment_name.startsWith('S.')) {
      const sTerm = db.queryOne("SELECT id FROM terms WHERE academic_year_id = ? AND (name LIKE 'Second%' OR name LIKE '%2%')", [yearId]);
      if (sTerm) tId = sTerm.id;
      resolvedAssessment = assessment_name.replace('S.', '');
    }
  }

  // Teacher scoping rule
  if (req.user.role === 'teacher') {
    if (class_ids.length === 0 && section_ids.length === 0) {
      return res.status(403).json({ error: 'Teachers must specify assigned class or section.' });
    }
  }

  // Compute rankings/results using the ranking engine logic
  let studentSql = `
    SELECT s.id as student_id, s.student_id as student_code, s.full_name,
           c.name as class_name, sec.full_name as section_full_name,
           p.id as parent_id, p.full_name as parent_name, p.phone_number as parent_phone
    FROM students s
    JOIN student_class_assignments csa ON s.id = csa.student_id AND csa.status = 'Active'
    JOIN classes c ON csa.class_id = c.id
    JOIN sections sec ON csa.section_id = sec.id
    JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1 AND sp.sms_enabled = 1
    JOIN parents p ON sp.parent_id = p.id
    WHERE csa.academic_year_id = ?
  `;
  const studentParams = [yearId];

  if (section_ids.length > 0) {
    studentSql += ` AND csa.section_id IN (${section_ids.map(() => '?').join(',')})`;
    studentParams.push(...section_ids);
  } else if (class_ids.length > 0) {
    studentSql += ` AND csa.class_id IN (${class_ids.map(() => '?').join(',')})`;
    studentParams.push(...class_ids);
  }

  const eligibleStudents = db.query(studentSql, studentParams);
  if (eligibleStudents.length === 0) {
    return res.status(400).json({ error: 'No eligible students with primary SMS parents found.' });
  }

  // Fetch assessment marks
  let marksSql = `
    SELECT m.student_id, m.marks_obtained, a.max_marks
    FROM marks m
    JOIN assessments a ON m.assessment_id = a.id
    WHERE a.academic_year_id = ?
  `;
  const marksParams = [yearId];
  if (tId) {
    marksSql += ' AND a.term_id = ?';
    marksParams.push(tId);
  }
  if (resolvedAssessment && resolvedAssessment !== 'ALL') {
    marksSql += ' AND a.name = ?';
    marksParams.push(resolvedAssessment);
  }
  const marksRows = db.query(marksSql, marksParams);

  const marksMap = {};
  for (const r of marksRows) {
    if (!marksMap[r.student_id]) marksMap[r.student_id] = [];
    marksMap[r.student_id].push(r);
  }

  // Calculate scores and ranks
  const computedList = [];
  for (const s of eligibleStudents) {
    const sMarks = marksMap[s.student_id] || [];
    let obtained = 0;
    let maxPossible = 0;
    for (const m of sMarks) {
      if (m.marks_obtained !== null) obtained += Number(m.marks_obtained);
      maxPossible += Number(m.max_marks);
    }
    const avg = maxPossible > 0 ? (obtained / maxPossible) * 100 : 0;
    computedList.push({
      ...s,
      total_obtained: obtained,
      max_marks: maxPossible,
      average: parseFloat(avg.toFixed(2))
    });
  }

  // Sort descending by average, then total marks
  computedList.sort((a, b) => {
    if (b.average !== a.average) return b.average - a.average;
    return b.total_obtained - a.total_obtained;
  });

  const getLetter = (idx) => {
    let str = "";
    let n = idx;
    while (n >= 0) {
      str = String.fromCharCode(65 + (n % 26)) + str;
      n = Math.floor(n / 26) - 1;
    }
    return str;
  };

  for (let i = 0; i < computedList.length; i++) {
    const curr = computedList[i];
    const letter = getLetter(i);
    if (i > 0) {
      const prev = computedList[i - 1];
      if (curr.average === prev.average && curr.total_obtained === prev.total_obtained) {
        curr.rank_number = prev.rank_number;
      } else {
        curr.rank_number = i + 1;
      }
    } else {
      curr.rank_number = 1;
    }
    curr.rank = `${curr.rank_number} ${letter}`;
  }

  // 1. Create SMS Broadcast entry
  const bcastRes = db.run(`
    INSERT INTO sms_broadcasts (title, broadcast_type, sender_user_id, sender_role, target_type, target_filters_json, message_template, total_recipients, sent_count, failed_count, status)
    VALUES (?, 'RESULT_SMS', ?, ?, 'SECTION', ?, ?, ?, 0, 0, 'Processing')
  `, [
    `${assessment_name} Results Announcement`,
    req.user.id,
    req.user.role,
    JSON.stringify({ academic_year_id: yearId, term_id: tId, assessment_name }),
    message_template,
    computedList.length
  ]);
  const broadcastId = Number(bcastRes.lastInsertRowid);
  let sentCount = 0;
  let failedCount = 0;

  // 2. Generate individualized SMS from database results and dispatch via SMSEthiopia API v2
  for (const item of computedList) {
    let personalizedMsg = message_template
      .replace(/\+?\s*\{student_name\}/gi, item.full_name)
      .replace(/\+?\s*\{class_section\}/gi, item.section_full_name)
      .replace(/\+?\s*\{assessment_name\}/gi, assessment_name)
      .replace(/\+?\s*\{total_marks\}/gi, String(item.total_obtained))
      .replace(/\+?\s*\{max_marks\}/gi, String(item.max_marks))
      .replace(/\+?\s*\{average\}/gi, String(item.average))
      .replace(/\+?\s*\{rank\}/gi, String(item.rank));

    let status = 'Sent';
    let providerStatus = 'ACCEPTED';
    let providerMessageId = null;
    let segments = 1;
    let errorMessage = null;

    try {
      const dispatch = await smsEthiopia.sendSms(item.parent_phone, personalizedMsg);
      if (dispatch.sent) {
        status = 'Sent';
        providerStatus = dispatch.status || 'ACCEPTED';
        providerMessageId = dispatch.id;
        segments = dispatch.segments || 1;
        sentCount++;
      } else {
        status = 'Failed';
        providerStatus = 'FAILED';
        errorMessage = dispatch.error_message || 'Delivery rejected by gateway';
        failedCount++;
      }
    } catch (err) {
      status = 'Failed';
      providerStatus = 'FAILED';
      errorMessage = err.message;
      failedCount++;
    }

    db.run(`
      INSERT INTO sms_recipients 
        (broadcast_id, student_id, parent_id, phone_number, message_content, status, provider_message_id, provider_status, segments, error_message, sent_at, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ${status === 'Sent' ? 'CURRENT_TIMESTAMP' : 'NULL'})
    `, [broadcastId, item.student_id, item.parent_id, item.parent_phone, personalizedMsg, status, providerMessageId, providerStatus, segments, errorMessage]);
  }

  // 3. Update broadcast record with final counts
  const finalStatus = failedCount === computedList.length ? 'Failed' : 'Completed';
  db.run(`
    UPDATE sms_broadcasts 
    SET sent_count = ?, failed_count = ?, status = ?
    WHERE id = ?
  `, [sentCount, failedCount, finalStatus, broadcastId]);

  logAudit(req, {
    action: 'DISPATCH_RESULT_SMS',
    entityType: 'SMS_BROADCAST',
    entityId: broadcastId,
    newValues: { assessment: assessment_name, total_students: computedList.length, sent: sentCount, failed: failedCount }
  });

  res.status(201).json({
    success: true,
    broadcast_id: broadcastId,
    total_sent: sentCount,
    failed_count: failedCount,
    status: finalStatus,
    message: `Result SMS compiled from database and dispatched to ${computedList.length} parents (Sent: ${sentCount}, Failed: ${failedCount}).`
  });
});

// POST /api/sms/result-preview (Preview Result SMS before broadcasting)
router.post('/result-preview', authenticate, (req, res) => {
  const {
    academic_year_id,
    term_id,
    class_id,
    section_id,
    class_ids = [],
    section_ids = [],
    assessment_name = 'Midterm',
    include_rank = true,
    include_subjects = true
  } = req.body;

  let yearId = academic_year_id;
  if (!yearId) {
    const cur = db.queryOne('SELECT id FROM academic_years WHERE is_current = 1');
    yearId = cur ? cur.id : 1;
  }
  let tId = term_id;
  if (!tId) {
    const curTerm = db.queryOne('SELECT id FROM terms WHERE academic_year_id = ? AND is_current = 1', [yearId]);
    tId = curTerm ? curTerm.id : 1;
  }

  const effectiveClasses = class_id ? [class_id] : class_ids;
  const effectiveSections = section_id ? [section_id] : section_ids;

  let studentSql = `
    SELECT s.id as student_id, s.student_id as student_code, s.full_name,
           c.name as class_name, sec.full_name as section_full_name,
           p.id as parent_id, p.full_name as parent_name, p.phone_number as parent_phone
    FROM students s
    JOIN student_class_assignments csa ON s.id = csa.student_id AND csa.status = 'Active'
    JOIN classes c ON csa.class_id = c.id
    JOIN sections sec ON csa.section_id = sec.id
    JOIN student_parents sp ON s.id = sp.student_id AND sp.is_primary = 1 AND sp.sms_enabled = 1
    JOIN parents p ON sp.parent_id = p.id
    WHERE csa.academic_year_id = ?
  `;
  const studentParams = [yearId];

  if (effectiveSections.length > 0) {
    studentSql += ` AND csa.section_id IN (${effectiveSections.map(() => '?').join(',')})`;
    studentParams.push(...effectiveSections);
  } else if (effectiveClasses.length > 0) {
    studentSql += ` AND csa.class_id IN (${effectiveClasses.map(() => '?').join(',')})`;
    studentParams.push(...effectiveClasses);
  }

  const eligibleStudents = db.query(studentSql, studentParams);

  // Calculate scores
  let marksSql = `
    SELECT m.student_id, m.marks_obtained, a.max_marks
    FROM marks m
    JOIN assessments a ON m.assessment_id = a.id
    WHERE a.academic_year_id = ? AND a.term_id = ?
  `;
  const marksParams = [yearId, tId];
  if (assessment_name && assessment_name !== 'ALL') {
    const lowAss = assessment_name.toLowerCase();
    if (lowAss === 'mid' || lowAss === 'midterm' || lowAss.includes('mid')) {
      marksSql += " AND (a.name = 'Mid' OR a.name LIKE '%Mid%')";
    } else if (lowAss === 'final' || lowAss.includes('final')) {
      marksSql += " AND (a.name = 'Final' OR a.name LIKE '%Final%')";
    } else if (lowAss === 'tests' || lowAss === 'test' || lowAss.includes('test')) {
      marksSql += " AND (a.name = 'Tests' OR a.name LIKE 'Test%')";
    } else {
      marksSql += ' AND a.name = ?';
      marksParams.push(assessment_name);
    }
  }
  const marksRows = db.query(marksSql, marksParams);
  const marksMap = {};
  for (const r of marksRows) {
    if (!marksMap[r.student_id]) marksMap[r.student_id] = [];
    marksMap[r.student_id].push(r);
  }

  const computedList = [];
  for (const s of eligibleStudents) {
    const sMarks = marksMap[s.student_id] || [];
    let obtained = 0;
    let maxPossible = 0;
    for (const m of sMarks) {
      if (m.marks_obtained !== null) obtained += Number(m.marks_obtained);
      maxPossible += Number(m.max_marks);
    }
    const avg = maxPossible > 0 ? (obtained / maxPossible) * 100 : 0;
    computedList.push({
      ...s,
      total_obtained: obtained,
      max_marks: maxPossible,
      average: parseFloat(avg.toFixed(2))
    });
  }

  computedList.sort((a, b) => b.average - a.average);
  for (let i = 0; i < computedList.length; i++) {
    computedList[i].rank = i + 1;
  }

  const sample = computedList[0];
  const sampleMsg = sample
    ? `Dear Parent, your child ${sample.full_name}'s ${sample.section_full_name} ${assessment_name} results: Total: ${sample.total_obtained}/${sample.max_marks}. Average: ${sample.average}%. Rank: ${sample.rank}. Lake Side Academy.`
    : 'No sample available.';

  res.json({
    total_recipients: computedList.length,
    cohort: computedList,
    preview_sample: {
      student_name: sample?.full_name,
      parent_phone: sample?.parent_phone,
      message: sampleMsg
    }
  });
});

// GET /api/sms/simulator/parents (Distinct parents with children for simulator)
router.get('/simulator/parents', (req, res) => {
  const parents = db.query(`
    SELECT DISTINCT p.id, p.full_name as name, p.phone_number as phone
    FROM parents p
    JOIN student_parents sp ON p.id = sp.parent_id
    ORDER BY p.full_name ASC
  `);
  for (const p of parents) {
    p.students = db.query(`
      SELECT s.id, s.full_name, s.student_id as student_code
      FROM students s
      JOIN student_parents sp ON s.id = sp.student_id
      WHERE sp.parent_id = ?
    `, [p.id]);
  }
  res.json(parents);
});

// GET /api/sms/simulator/feed and /simulator-messages
router.get(['/simulator/feed', '/simulator-messages'], (req, res) => {
  const { phone_number } = req.query;
  let sql = `
    SELECT sr.*, sr.phone_number as recipient_phone,
           sb.title as broadcast_title, sb.broadcast_type, sb.created_at as broadcast_date,
           s.full_name as student_name, s.student_id as student_id_number,
           p.full_name as parent_name,
           sec.full_name as class_section
    FROM sms_recipients sr
    JOIN sms_broadcasts sb ON sr.broadcast_id = sb.id
    LEFT JOIN students s ON sr.student_id = s.id
    LEFT JOIN parents p ON sr.parent_id = p.id
    LEFT JOIN student_class_assignments csa ON s.id = csa.student_id AND csa.status = 'Active'
    LEFT JOIN sections sec ON csa.section_id = sec.id
  `;
  const params = [];

  if (phone_number) {
    sql += ' WHERE sr.phone_number = ?';
    params.push(phone_number.trim());
  }

  sql += ' ORDER BY sr.id DESC LIMIT 100';

  const messages = db.query(sql, params);
  res.json(messages);
});


// GET /api/sms/provider-status (Live SMSEthiopia Gateway status & connectivity)
router.get('/provider-status', authenticate, async (req, res) => {
  try {
    const status = await smsEthiopia.testGatewayConnection();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to query gateway status: ' + err.message });
  }
});

// GET /api/sms/sync-status/:recipientId (Query live SMSEthiopia status by message ID)
router.get('/sync-status/:recipientId', authenticate, async (req, res) => {
  const { recipientId } = req.params;
  const recipient = db.queryOne('SELECT * FROM sms_recipients WHERE id = ?', [recipientId]);
  if (!recipient) {
    return res.status(404).json({ error: 'SMS recipient record not found.' });
  }

  if (!recipient.provider_message_id) {
    return res.json({ 
      synced: false, 
      status: recipient.status, 
      provider_status: recipient.provider_status || 'LOCAL_ONLY', 
      message: 'No external gateway message ID recorded for this dispatch.' 
    });
  }

  try {
    const liveStatus = await smsEthiopia.getMessageStatus(recipient.provider_message_id);
    if (liveStatus.success) {
      let mappedStatus = 'Sent';
      if (liveStatus.status === 'DELIVERED') mappedStatus = 'Delivered';
      else if (liveStatus.status === 'FAILED') mappedStatus = 'Failed';

      db.run(`
        UPDATE sms_recipients 
        SET provider_status = ?, status = ?, delivered_at = CASE WHEN ? = 'DELIVERED' THEN CURRENT_TIMESTAMP ELSE delivered_at END
        WHERE id = ?
      `, [liveStatus.status, mappedStatus, liveStatus.status, recipientId]);

      const updated = db.queryOne('SELECT * FROM sms_recipients WHERE id = ?', [recipientId]);
      return res.json({ synced: true, liveStatus, recipient: updated });
    } else {
      return res.status(400).json({ error: liveStatus.error_message });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to synchronize with gateway: ' + err.message });
  }
});

// POST /api/sms/sync-broadcast/:broadcastId (Synchronize entire broadcast with SMSEthiopia)
router.post('/sync-broadcast/:broadcastId', authenticate, async (req, res) => {
  const { broadcastId } = req.params;
  const recipients = db.query('SELECT * FROM sms_recipients WHERE broadcast_id = ? AND provider_message_id IS NOT NULL', [broadcastId]);
  
  let syncedCount = 0;
  for (const r of recipients) {
    try {
      const live = await smsEthiopia.getMessageStatus(r.provider_message_id);
      if (live.success) {
        let mappedStatus = 'Sent';
        if (live.status === 'DELIVERED') mappedStatus = 'Delivered';
        else if (live.status === 'FAILED') mappedStatus = 'Failed';

        db.run(`
          UPDATE sms_recipients 
          SET provider_status = ?, status = ?, delivered_at = CASE WHEN ? = 'DELIVERED' THEN CURRENT_TIMESTAMP ELSE delivered_at END
          WHERE id = ?
        `, [live.status, mappedStatus, live.status, r.id]);
        syncedCount++;
      }
    } catch (e) {
      // Continue next recipient
    }
  }

  res.json({ success: true, synced_count: syncedCount, total_checked: recipients.length });
});

// POST /api/sms/retry/:id (Retry failed SMS recipient via real SMSEthiopia gateway)
router.post('/retry/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const recipient = db.queryOne('SELECT * FROM sms_recipients WHERE id = ?', [id]);
  if (!recipient) return res.status(404).json({ error: 'SMS recipient record not found.' });

  try {
    const dispatch = await smsEthiopia.sendSms(recipient.phone_number, recipient.message_content);
    if (dispatch.sent) {
      db.run(`
        UPDATE sms_recipients 
        SET status = 'Sent', provider_status = ?, provider_message_id = ?, segments = ?, error_message = NULL, delivered_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [dispatch.status || 'ACCEPTED', dispatch.id, dispatch.segments || 1, id]);

      res.json({ success: true, message: `Message to ${recipient.phone_number} successfully redelivered via SMSEthiopia gateway.` });
    } else {
      db.run(`
        UPDATE sms_recipients 
        SET status = 'Failed', provider_status = 'FAILED', error_message = ?
        WHERE id = ?
      `, [dispatch.error_message || 'Retry failed', id]);

      res.status(400).json({ error: dispatch.error_message || 'Retry failed at SMSEthiopia gateway.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Network error retrying SMS: ' + err.message });
  }
});

module.exports = router;
