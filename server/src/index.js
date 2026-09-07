const express = require('express');
const cors = require('cors');
const { PORT, SCHOOL_NAME } = require('./config/constants');
const db = require('./db/database');

// Route imports
const authRoutes = require('./routes/auth.routes');
const academicRoutes = require('./routes/academic.routes');
const teachersRoutes = require('./routes/teachers.routes');
const studentsRoutes = require('./routes/students.routes');
const searchRoutes = require('./routes/search.routes');
const parentsRoutes = require('./routes/parents.routes');
const assessmentsRoutes = require('./routes/assessments.routes');
const marksRoutes = require('./routes/marks.routes');
const rankingsRoutes = require('./routes/rankings.routes');
const smsRoutes = require('./routes/sms.routes');
const announcementsRoutes = require('./routes/announcements.routes');
const usersRoutes = require('./routes/users.routes');
const auditRoutes = require('./routes/audit.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

// Global Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    school: SCHOOL_NAME,
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: err.message || 'An unexpected internal server error occurred.'
  });
});

const path = require('path');
const fs = require('fs');

// Serve client static build files in unified production deployment
const candidateClientPaths = [
  path.join(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist')
];

const clientDistPath = candidateClientPaths.find(p => fs.existsSync(p));
if (clientDistPath) {
  app.use(express.static(clientDistPath));
}

// 404 Route Handler for unmatched API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// SPA fallback for all frontend React routes
app.get('*', (req, res) => {
  if (clientDistPath && fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  }
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`  ${SCHOOL_NAME} Management System API Server`);
    console.log(`  Running on: http://localhost:${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`========================================================`);
  });
}

module.exports = app;
