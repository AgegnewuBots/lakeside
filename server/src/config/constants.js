const fs = require('fs');
const path = require('path');

// Safely load environment variables from .env if present
const candidatePaths = [
  path.join(__dirname, '../../../.env'),
  path.join(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env')
];

for (const envFile of candidatePaths) {
  if (fs.existsSync(envFile)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envFile);
      } else {
        const content = fs.readFileSync(envFile, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match && !process.env[match[1]]) {
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            process.env[match[1]] = value.trim();
          }
        });
      }
      break;
    } catch (e) {
      console.warn('Warning loading .env file:', e.message);
    }
  }
}

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'lakeside-super-secret-production-jwt-key-2026-prod',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../../lakeside.db'),
  NODE_ENV: process.env.NODE_ENV || 'production',
  SCHOOL_NAME: 'Lake Side Academy',
  DEFAULT_STUDENT_ID_START: 10001,
  SMS_ETHIOPIA_API_KEY: process.env.SMS_ETHIOPIA_API_KEY || '',
  SMS_ETHIOPIA_BASE_URL: process.env.SMS_ETHIOPIA_BASE_URL || 'https://smsethiopia.com/api/'
};

