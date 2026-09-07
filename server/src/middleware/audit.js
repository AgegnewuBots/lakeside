const db = require('../db/database');

function logAudit(req, { action, entityType, entityId, oldValues = null, newValues = null }) {
  try {
    const userId = req.user ? req.user.id : null;
    const userName = req.user ? req.user.full_name : 'System';
    const userRole = req.user ? req.user.role : 'system';
    
    // Normalize IP address (handles X-Forwarded-For or remoteAddress)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const oldStr = oldValues ? (typeof oldValues === 'string' ? oldValues : JSON.stringify(oldValues)) : null;
    const newStr = newValues ? (typeof newValues === 'string' ? newValues : JSON.stringify(newValues)) : null;

    db.run(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, userRole, action, entityType, String(entityId || ''), oldStr, newStr, ip, userAgent]
    );
  } catch (err) {
    console.error('Failed to write audit log entry:', err.message);
  }
}

module.exports = {
  logAudit
};
