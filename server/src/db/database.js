const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { DB_PATH } = require('../config/constants');

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new DatabaseSync(DB_PATH);
    // Enable Foreign Keys and Write-Ahead Logging for high concurrency & integrity
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');

    // Auto-initialize schema
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Safe migrations for SMSEthiopia API v2 tracking
  try {
    const cols = db.prepare("PRAGMA table_info(sms_recipients)").all();
    const colNames = cols.map(c => c.name);
    if (!colNames.includes('provider_message_id')) {
      db.exec("ALTER TABLE sms_recipients ADD COLUMN provider_message_id TEXT;");
    }
    if (!colNames.includes('provider_status')) {
      db.exec("ALTER TABLE sms_recipients ADD COLUMN provider_status TEXT DEFAULT 'PENDING';");
    }
    if (!colNames.includes('segments')) {
      db.exec("ALTER TABLE sms_recipients ADD COLUMN segments INTEGER DEFAULT 1;");
    }
  } catch (err) {
    // Migration failsafe
  }

  // Safe migration: Seed KG 1, KG 2, KG 3 and Sections A-E if missing
  try {
    const kgClasses = [
      { name: 'KG 1', level: -3 },
      { name: 'KG 2', level: -2 },
      { name: 'KG 3', level: -1 }
    ];

    for (const kg of kgClasses) {
      const existing = db.prepare("SELECT id FROM classes WHERE name = ?").get(kg.name);
      let classId;
      if (!existing) {
        const res = db.prepare("INSERT INTO classes (name, grade_level) VALUES (?, ?)").run(kg.name, kg.level);
        classId = Number(res.lastInsertRowid);
      } else {
        classId = existing.id;
      }

      // Sections A, B, C (baseline template: A-C; D and E removed)
      for (const sName of ['A', 'B', 'C']) {
        const sFullName = `${kg.name}${sName}`;
        db.prepare("INSERT OR IGNORE INTO sections (class_id, name, full_name) VALUES (?, ?, ?)").run(classId, sName, sFullName);
      }
    }
  } catch (err) {
    // KG migration failsafe
  }

  // Safe migration: Ensure Terms (First Semester, Second Semester, Average Semester)
  try {
    const years = db.prepare("SELECT id, name FROM academic_years").all();
    for (const y of years) {
      const termNames = ['First Semester', 'Second Semester', 'Average Semester'];
      for (const tName of termNames) {
        const existing = db.prepare("SELECT id FROM terms WHERE academic_year_id = ? AND name = ?").get(y.id, tName);
        if (!existing) {
          db.prepare("INSERT INTO terms (academic_year_id, name, is_current) VALUES (?, ?, 0)").run(y.id, tName);
        }
      }
    }
  } catch (err) {
    // Terms migration failsafe
  }

  // Safe migration: class_subjects
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS class_subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE(class_id, subject_id)
      );
      CREATE INDEX IF NOT EXISTS idx_class_subjects_lookup ON class_subjects(class_id, subject_id);
    `);

    // Populate default curriculum mappings if needed
    const classes = db.prepare("SELECT id, name, grade_level FROM classes").all();
    const subjects = db.prepare("SELECT id, code FROM subjects").all();
    const subMap = {};
    subjects.forEach(s => { subMap[s.code] = s.id; });

    const insertStmt = db.prepare("INSERT OR IGNORE INTO class_subjects (class_id, subject_id) VALUES (?, ?)");

    for (const cls of classes) {
      let codes = [];
      if (cls.grade_level < 1) {
        // Kindergarten (KG 1, KG 2, KG 3)
        codes = ['MATH', 'ENG', 'AMH', 'HPE', 'PVA'];
      } else if (cls.grade_level <= 4) {
        // Primary Cycle 1 (Grades 1-4)
        codes = ['MATH', 'ENG', 'AMH', 'ENV', 'HPE', 'PVA'];
      } else {
        // Primary Cycle 2 (Grades 5-8)
        codes = ['MATH', 'ENG', 'AMH', 'SCI', 'SOC', 'CIT', 'ICT', 'HPE', 'PVA'];
      }

      for (const code of codes) {
        if (subMap[code]) {
          insertStmt.run(cls.id, subMap[code]);
        }
      }
    }
  } catch (err) {
    // Class subjects failsafe
  }

  // Safe migration: Add assessment_type column to assessments table & promotion_min_average setting
  try {
    const aCols = db.prepare("PRAGMA table_info(assessments)").all();
    const aColNames = aCols.map(c => c.name);
    if (!aColNames.includes('assessment_type')) {
      db.exec("ALTER TABLE assessments ADD COLUMN assessment_type TEXT DEFAULT 'Test';");
    }
  } catch (err) {
    // Assessment type migration failsafe
  }

  try {
    const existingPromo = db.prepare("SELECT value FROM school_settings WHERE key = 'promotion_min_average'").get();
    if (!existingPromo) {
      db.prepare("INSERT INTO school_settings (key, value, description) VALUES ('promotion_min_average', '50.0', 'Minimum passing cumulative average percentage required for student promotion')").run();
    }
  } catch (err) {
    // Promotion min average failsafe
  }
}

// Database helper utilities with prepared statements
const db = {
  get raw() {
    return getDatabase();
  },

  query(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    return Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
  },

  queryOne(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    return Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
  },

  run(sql, params = []) {
    const database = getDatabase();
    const stmt = database.prepare(sql);
    return Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
  },

  exec(sql) {
    const database = getDatabase();
    return database.exec(sql);
  },

  transaction(callback) {
    const database = getDatabase();
    database.exec('BEGIN TRANSACTION;');
    try {
      const result = callback(db);
      database.exec('COMMIT;');
      return result;
    } catch (err) {
      database.exec('ROLLBACK;');
      throw err;
    }
  }
};

module.exports = db;
