const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const db = require('../db/database');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No bearer token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user record
    const user = db.queryOne('SELECT id, username, full_name, role, email, phone, is_active FROM users WHERE id = ?', [decoded.id]);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User account is inactive or not found.' });
    }

    // If directory/director/records user, load active permissions
    let permissions = [];
    if (user.role === 'directory' || user.role === 'director' || user.role === 'records') {
      const permRows = db.query('SELECT permission_code FROM user_permissions WHERE user_id = ? AND is_granted = 1', [user.id]);
      permissions = permRows.map(r => r.permission_code);
    } else if (user.role === 'admin') {
      // Admin has all permissions
      const allPerms = db.query('SELECT code FROM permissions');
      permissions = allPerms.map(r => r.code);
    }

    req.user = {
      ...user,
      permissions
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

// Optional authentication (for public / landing features)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.queryOne('SELECT id, username, full_name, role, email, phone FROM users WHERE id = ?', [decoded.id]);
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuth
};
