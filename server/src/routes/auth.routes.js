const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { JWT_SECRET } = require('../config/constants');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.queryOne('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username.trim()]);
  if (!user || !user.is_active) {
    // Log failed login attempt
    logAudit({ headers: req.headers, socket: req.socket, user: null }, {
      action: 'FAILED_LOGIN',
      entityType: 'AUTH',
      entityId: username,
      newValues: { reason: 'User not found or inactive', attemptedUsername: username, ip }
    });
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatch) {
    // Log failed login attempt
    logAudit({ headers: req.headers, socket: req.socket, user: null }, {
      action: 'FAILED_LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      newValues: { reason: 'Password mismatch', username: user.username, ip }
    });
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Generate JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Fetch permissions if directory, director, or records
  let permissions = [];
  if (user.role === 'directory' || user.role === 'director' || user.role === 'records') {
    const permRows = db.query('SELECT permission_code FROM user_permissions WHERE user_id = ? AND is_granted = 1', [user.id]);
    permissions = permRows.map(r => r.permission_code);
  } else if (user.role === 'admin') {
    const allPerms = db.query('SELECT code FROM permissions');
    permissions = allPerms.map(r => r.code);
  }

  // Log successful login
  logAudit({ headers: req.headers, socket: req.socket, user }, {
    action: 'LOGIN',
    entityType: 'AUTH',
    entityId: user.id,
    newValues: { username: user.username, role: user.role, ip }
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      permissions
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: req.user
  });
});

// PUT /api/auth/profile (User updates their own credentials - username, password, contact details)
router.put('/profile', authenticate, (req, res) => {
  const { username, current_password, new_password, email, phone } = req.body;
  const userId = req.user.id;

  const currentUser = db.queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!currentUser) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // 1. If username update requested
  let updatedUsername = currentUser.username;
  if (username && username.trim() !== currentUser.username) {
    const trimmedUser = username.trim();
    if (trimmedUser.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    const taken = db.queryOne('SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?', [trimmedUser, userId]);
    if (taken) {
      return res.status(400).json({ error: `Username '${trimmedUser}' is already in use by another account.` });
    }
    updatedUsername = trimmedUser;
  }

  // 2. If password update requested
  let updatedPasswordHash = currentUser.password_hash;
  if (new_password) {
    if (!current_password) {
      return res.status(400).json({ error: 'Current password is required to change your password.' });
    }
    const match = bcrypt.compareSync(current_password, currentUser.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    updatedPasswordHash = bcrypt.hashSync(new_password, 10);
  }

  const updatedEmail = email !== undefined ? (email ? email.trim() : null) : currentUser.email;
  const updatedPhone = phone !== undefined ? (phone ? phone.trim() : null) : currentUser.phone;

  db.transaction(() => {
    db.run(
      'UPDATE users SET username = ?, password_hash = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [updatedUsername, updatedPasswordHash, updatedEmail, updatedPhone, userId]
    );

    // If teacher, sync teacher record contact
    if (currentUser.role === 'teacher') {
      db.run('UPDATE teachers SET email = ?, phone = ? WHERE user_id = ?', [updatedEmail, updatedPhone, userId]);
    }

    logAudit(req, {
      action: 'UPDATE_PROFILE',
      entityType: 'USER',
      entityId: userId,
      oldValues: { username: currentUser.username, email: currentUser.email, phone: currentUser.phone },
      newValues: { username: updatedUsername, email: updatedEmail, phone: updatedPhone, passwordChanged: !!new_password }
    });

    // Re-issue JWT token with updated username
    const newToken = jwt.sign(
      { id: currentUser.id, username: updatedUsername, role: currentUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Account credentials and profile successfully updated.',
      token: newToken,
      user: {
        id: currentUser.id,
        username: updatedUsername,
        full_name: currentUser.full_name,
        role: currentUser.role,
        email: updatedEmail,
        phone: updatedPhone,
        permissions: req.user.permissions || []
      }
    });
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  logAudit(req, {
    action: 'LOGOUT',
    entityType: 'AUTH',
    entityId: req.user.id,
    newValues: { username: req.user.username }
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/demo-switch (Disabled for Production Integrity)
router.post('/demo-switch', (req, res) => {
  return res.status(403).json({
    error: 'Demo authentication disabled. Lakeside Academy is running in production mode. Please sign in with your verified credentials.'
  });
});

module.exports = router;
