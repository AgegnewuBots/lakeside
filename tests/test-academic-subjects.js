const http = require('http');
const jwt = require('../server/node_modules/jsonwebtoken');
const { JWT_SECRET } = require('../server/src/config/constants');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;

function assert(condition, desc) {
  if (condition) {
    passed++;
    console.log(`  ${GREEN}✓ PASS:${RESET} ${desc}`);
  } else {
    failed++;
    console.error(`  ${RED}✗ FAIL:${RESET} ${desc}`);
  }
}

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
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

async function runTests() {
  console.log(`\n${BOLD}======================================================${RESET}`);
  console.log(`${BOLD}  Academic Class Subjects & Management Verification  ${RESET}`);
  console.log(`${BOLD}======================================================${RESET}`);

  // 1. Auth Tokens
  const db = require('../server/src/db/database');
  const adminUser = db.queryOne("SELECT id FROM users WHERE username = 'admin'");
  const dirUser = db.queryOne("SELECT id FROM users WHERE username = 'registrar'");
  const adminToken = jwt.sign({ id: adminUser ? adminUser.id : 1, username: 'admin', role: 'admin' }, JWT_SECRET);
  const dirToken = jwt.sign({ id: dirUser ? dirUser.id : 4, username: 'registrar', role: 'directory' }, JWT_SECRET);

  // 2. GET /api/academic/classes
  console.log('\nTesting GET /api/academic/classes...');
  const classesRes = await request('GET', '/api/academic/classes', null, dirToken);
  assert(classesRes.status === 200, 'GET /api/academic/classes returns HTTP 200');
  assert(Array.isArray(classesRes.data), 'Classes response is an array');
  assert(classesRes.data.length === 11, `All 11 classes returned (KG 1-3 + Grades 1-8) (got: ${classesRes.data.length})`);

  const grade1 = classesRes.data.find(c => c.name === 'Grade 1');
  assert(grade1 !== undefined, 'Grade 1 exists in classes list');
  assert(Array.isArray(grade1.sections) && grade1.sections.length === 3, 'Grade 1 has 3 sections (A, B, C)');
  assert(Array.isArray(grade1.subjects) && grade1.subjects.length > 0, `Grade 1 has assigned subjects (count: ${grade1.subjects.length})`);

  // 3. POST /api/academic/classes/:classId/subjects (Directory role adds subject)
  console.log('\nTesting POST /api/academic/classes/:classId/subjects (Directory Role)...');
  const addSubRes = await request('POST', `/api/academic/classes/${grade1.id}/subjects`, {
    name: 'Art and Craft',
    code: 'ART'
  }, dirToken);
  assert(addSubRes.status === 201, 'Directory user can add subject to a class (HTTP 201)');
  assert(addSubRes.data.code === 'ART', 'Subject code matches ART');
  const createdSubId = addSubRes.data.id;

  // Verify subject appears in Grade 1
  const updatedClasses = await request('GET', '/api/academic/classes', null, dirToken);
  const updatedGrade1 = updatedClasses.data.find(c => c.name === 'Grade 1');
  const hasArt = updatedGrade1.subjects.some(s => s.code === 'ART');
  assert(hasArt, 'Newly added subject ART appears in Grade 1 subjects list');

  // 4. PUT /api/academic/subjects/:id (Directory role edits subject)
  console.log('\nTesting PUT /api/academic/subjects/:id (Directory Role)...');
  const editSubRes = await request('PUT', `/api/academic/subjects/${createdSubId}`, {
    name: 'Advanced Art & Craft',
    code: 'AART'
  }, dirToken);
  assert(editSubRes.status === 200, 'Directory user can edit subject name and code (HTTP 200)');
  assert(editSubRes.data.name === 'Advanced Art & Craft', 'Subject name updated successfully');
  assert(editSubRes.data.code === 'AART', 'Subject code updated to AART');

  // 5. DELETE /api/academic/classes/:classId/subjects/:subjectId (Directory role removes subject from class)
  console.log('\nTesting DELETE /api/academic/classes/:classId/subjects/:subjectId (Directory Role)...');
  const removeSubRes = await request('DELETE', `/api/academic/classes/${grade1.id}/subjects/${createdSubId}`, null, dirToken);
  assert(removeSubRes.status === 200, 'Directory user can remove subject from class (HTTP 200)');

  // Verify subject removed from Grade 1
  const verifyClasses = await request('GET', '/api/academic/classes', null, dirToken);
  const verifyGrade1 = verifyClasses.data.find(c => c.name === 'Grade 1');
  const artStillThere = verifyGrade1.subjects.some(s => s.id === createdSubId);
  assert(!artStillThere, 'Subject successfully removed from Grade 1 subjects list');

  // 6. DELETE /api/academic/subjects/:id (Directory role deletes subject from library)
  console.log('\nTesting DELETE /api/academic/subjects/:id (Directory Role)...');
  const delSubRes = await request('DELETE', `/api/academic/subjects/${createdSubId}`, null, dirToken);
  assert(delSubRes.status === 200, 'Directory user can delete subject from library (HTTP 200)');

  // 7. Security: Unauthenticated request rejected
  console.log('\nTesting Security: Unauthenticated access rejected...');
  const unauthRes = await request('POST', `/api/academic/classes/${grade1.id}/subjects`, { code: 'HCK' }, null);
  assert(unauthRes.status === 401, 'Unauthenticated request to add subject rejected with HTTP 401');

  console.log(`\n${BOLD}======================================================${RESET}`);
  console.log(`  Tests Passed: ${GREEN}${passed}${RESET} | Tests Failed: ${failed > 0 ? RED : GREEN}${failed}${RESET}`);
  console.log(`${BOLD}======================================================${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
