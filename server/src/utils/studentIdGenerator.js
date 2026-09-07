const db = require('../db/database');
const { DEFAULT_STUDENT_ID_START } = require('../config/constants');

/**
 * Generates the next unique 5-digit Student ID.
 * Example: 10001, 10002, 10003
 * Queries current max numeric student_id in the database to ensure continuity and zero duplicates.
 */
function generateNextStudentId() {
  const row = db.queryOne(`
    SELECT student_id 
    FROM students 
    WHERE length(student_id) = 5 AND student_id GLOB '[0-9][0-9][0-9][0-9][0-9]'
    ORDER BY CAST(student_id AS INTEGER) DESC 
    LIMIT 1
  `);

  if (!row || !row.student_id) {
    return String(DEFAULT_STUDENT_ID_START);
  }

  const currentMax = parseInt(row.student_id, 10);
  const nextId = currentMax + 1;
  return String(nextId);
}

module.exports = {
  generateNextStudentId
};
