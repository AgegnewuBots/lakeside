const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

// GET /api/settings (Public / authenticated)
router.get('/', optionalAuth, (req, res) => {
  const rows = db.query('SELECT key, value, description, updated_at FROM school_settings');
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  res.json({
    settings,
    raw: rows
  });
});

// PUT /api/settings (Admin updates settings)
router.put('/', authenticate, requireRole('admin'), (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings key-value object required.' });
  }

  db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      db.run(`
        INSERT INTO school_settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `, [key, String(value)]);
    }

    logAudit(req, {
      action: 'UPDATE_SETTINGS',
      entityType: 'SETTINGS',
      entityId: 'SCHOOL_SETTINGS',
      newValues: settings
    });

    res.json({ success: true, message: 'School settings updated successfully.' });
  });
});

module.exports = router;
