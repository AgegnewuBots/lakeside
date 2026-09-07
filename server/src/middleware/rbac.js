const db = require('../db/database');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: [${roles.join(', ')}]. Your role is '${req.user.role}'.`
      });
    }
    next();
  };
}

function requirePermission(permCode) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }
    // Admin always possesses full system permissions
    if (req.user.role === 'admin') {
      return next();
    }
    if (req.user.role === 'directory' || req.user.role === 'director' || req.user.role === 'records') {
      if (req.user.permissions && req.user.permissions.includes(permCode)) {
        return next();
      }
      return res.status(403).json({
        error: `Access denied. User lacks permission '${permCode}'. Contact administrator.`
      });
    }
    // Teachers do not possess general directory permissions
    return res.status(403).json({
      error: `Access denied. Permission '${permCode}' is not available for role '${req.user.role}'.`
    });
  };
}

/**
 * Validates that if the caller is a Teacher, they are strictly assigned to the requested class/section.
 * If Admin, Director, or Records, bypasses.
 */
function checkTeacherAssignment(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  if (req.user.role === 'admin' || req.user.role === 'directory' || req.user.role === 'director' || req.user.role === 'records') {
    return next();
  }
  if (req.user.role === 'teacher') {
    // Get teacher id
    const teacherRow = db.queryOne('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (!teacherRow) {
      return res.status(403).json({ error: 'Teacher profile not found for active user.' });
    }
    req.teacherId = teacherRow.id;

    // Check specific query or body parameters if present
    const classId = req.query.class_id || req.body.class_id;
    const sectionId = req.query.section_id || req.body.section_id;

    if (classId && sectionId) {
      const assignment = db.queryOne(
        'SELECT id FROM teacher_assignments WHERE teacher_id = ? AND class_id = ? AND section_id = ?',
        [teacherRow.id, classId, sectionId]
      );
      if (!assignment) {
        return res.status(403).json({
          error: 'Access denied. You are not assigned to teach this class and section.'
        });
      }
    } else if (sectionId) {
      const assignment = db.queryOne(
        'SELECT id FROM teacher_assignments WHERE teacher_id = ? AND section_id = ?',
        [teacherRow.id, sectionId]
      );
      if (!assignment) {
        return res.status(403).json({
          error: 'Access denied. You are not assigned to teach this section.'
        });
      }
    } else if (classId) {
      const assignment = db.queryOne(
        'SELECT id FROM teacher_assignments WHERE teacher_id = ? AND class_id = ?',
        [teacherRow.id, classId]
      );
      if (!assignment) {
        return res.status(403).json({
          error: 'Access denied. You are not assigned to teach this class.'
        });
      }
    }
    return next();
  }
  return res.status(403).json({ error: 'Invalid user role.' });
}

module.exports = {
  requireRole,
  requirePermission,
  checkTeacherAssignment
};
