const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

// GET /api/users (Admin lists all system users)
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const users = db.query(`
    SELECT id, username, full_name, role, email, phone, is_active, created_at, updated_at
    FROM users
    ORDER BY role ASC, full_name ASC
  `);

  const allPerms = db.query('SELECT user_id, permission_code, is_granted FROM user_permissions');

  const data = users.map(u => ({
    ...u,
    permissions: allPerms.filter(p => p.user_id === u.id && p.is_granted === 1).map(p => p.permission_code)
  }));

  res.json(data);
});

// GET /api/users/permissions-catalog (Admin gets all available permissions)
router.get('/permissions-catalog', authenticate, requireRole('admin'), (req, res) => {
  const catalog = db.query('SELECT * FROM permissions ORDER BY category ASC, name ASC');
  res.json(catalog);
});

// POST /api/users (Admin creates Directory or Admin user)
router.post('/', authenticate, requireRole('admin'), (req, res) => {
  const { username, password, full_name, role, email, phone, permissions = [] } = req.body;

  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Username, password, full name, and role are required.' });
  }

  const existing = db.queryOne('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username.trim()]);
  if (existing) {
    return res.status(400).json({ error: `Username '${username}' is already in use.` });
  }

  db.transaction(() => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const userRes = db.run(
      'INSERT INTO users (username, password_hash, full_name, role, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [username.trim(), hash, full_name.trim(), role, email || null, phone || null]
    );
    const userId = Number(userRes.lastInsertRowid);

    // If directory/director/records user, assign permissions
    if ((role === 'directory' || role === 'director' || role === 'records') && Array.isArray(permissions)) {
      for (const pCode of permissions) {
        db.run('INSERT INTO user_permissions (user_id, permission_code, is_granted) VALUES (?, ?, 1)', [userId, pCode]);
      }
    }

    logAudit(req, {
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: userId,
      newValues: { username, role, full_name, email, permissions }
    });

    res.status(201).json({
      id: userId,
      username,
      full_name,
      role,
      email,
      phone,
      permissions
    });
  });
});

// PUT /api/users/:id/permissions (Admin updates Directory user permissions)
router.put('/:id/permissions', authenticate, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body; // array of permission codes

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array of codes.' });
  }

  const user = db.queryOne('SELECT id, username, role FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.transaction(() => {
    // Delete existing
    db.run('DELETE FROM user_permissions WHERE user_id = ?', [id]);

    // Insert new
    for (const code of permissions) {
      db.run('INSERT INTO user_permissions (user_id, permission_code, is_granted) VALUES (?, ?, 1)', [id, code]);
    }

    logAudit(req, {
      action: 'UPDATE_USER_PERMISSIONS',
      entityType: 'USER_PERMISSIONS',
      entityId: id,
      newValues: { username: user.username, permissions }
    });

    res.json({ success: true, message: `Updated permissions for user '${user.username}'.`, permissions });
  });
});

// PUT /api/users/:id/status (Toggle active status)
router.put('/:id/status', authenticate, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const user = db.queryOne('SELECT id, username, is_active FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.run('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [is_active ? 1 : 0, id]);

  logAudit(req, {
    action: 'TOGGLE_USER_STATUS',
    entityType: 'USER',
    entityId: id,
    oldValues: { is_active: user.is_active },
    newValues: { is_active: is_active ? 1 : 0 }
  });

  res.json({ success: true, message: `User status changed to ${is_active ? 'Active' : 'Inactive'}.` });
});

// PUT /api/users/:id (Admin edits user details & resets password)
router.put('/:id', authenticate, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { username, full_name, role, email, phone, new_password } = req.body;

  const user = db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // 1. Username validation & uniqueness
  let targetUsername = user.username;
  if (username && username.trim() !== user.username) {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    const existing = db.queryOne('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?', [trimmed, id]);
    if (existing) {
      return res.status(400).json({ error: `Username '${trimmed}' is already in use.` });
    }
    targetUsername = trimmed;
  }

  // 2. Full name
  const targetFullName = full_name ? full_name.trim() : user.full_name;

  // 3. Email & Phone
  const targetEmail = email !== undefined ? (email ? email.trim() : null) : user.email;
  const targetPhone = phone !== undefined ? (phone ? phone.trim() : null) : user.phone;

  // 4. Role (guard against changing primary admin)
  let targetRole = user.role;
  if (role && role !== user.role) {
    if (user.username === 'admin') {
      return res.status(400).json({ error: 'Cannot change the primary admin account role.' });
    }
    targetRole = role;
  }

  // 5. Password reset if provided
  let targetHash = user.password_hash;
  if (new_password) {
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    targetHash = bcrypt.hashSync(new_password, 10);
  }

  db.transaction(() => {
    db.run(
      'UPDATE users SET username = ?, password_hash = ?, full_name = ?, role = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [targetUsername, targetHash, targetFullName, targetRole, targetEmail, targetPhone, id]
    );

    // If teacher, sync teacher record
    if (user.role === 'teacher' || targetRole === 'teacher') {
      db.run(
        'UPDATE teachers SET full_name = ?, email = ?, phone = ? WHERE user_id = ?',
        [targetFullName, targetEmail, targetPhone, id]
      );
    }

    logAudit(req, {
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      oldValues: { username: user.username, full_name: user.full_name, role: user.role, email: user.email, phone: user.phone },
      newValues: { username: targetUsername, full_name: targetFullName, role: targetRole, email: targetEmail, phone: targetPhone, passwordReset: !!new_password }
    });

    res.json({
      success: true,
      message: `User '${targetUsername}' updated successfully${new_password ? ' and password reset' : ''}.`,
      user: {
        id: Number(id),
        username: targetUsername,
        full_name: targetFullName,
        role: targetRole,
        email: targetEmail,
        phone: targetPhone
      }
    });
  });
});

module.exports = router;
