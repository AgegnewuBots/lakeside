-- ============================================================================
-- LAKESIDE SCHOOL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Relational SQLite3 Schema with Foreign Keys & Indexes
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'directory', 'director', 'records', 'teacher')),
  email TEXT,
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Granular Permissions & Overrides
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  is_granted INTEGER DEFAULT 1,
  UNIQUE(user_id, permission_code)
);

-- 3. Academic Structure: Academic Years & Terms
CREATE TABLE IF NOT EXISTS academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL, -- e.g. '2025-2026' or '2026'
  start_date TEXT,
  end_date TEXT,
  is_current INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'First Term', 'Second Term'
  is_current INTEGER DEFAULT 0
);

-- 4. Classes, Sections, Subjects
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL, -- e.g. 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'
  grade_level INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'A', 'B'
  full_name TEXT NOT NULL, -- e.g. 'Grade 8A'
  UNIQUE(class_id, name)
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL, -- e.g. 'Mathematics', 'English', 'Science'
  code TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(class_id, subject_id)
);

-- 5. Teachers & Teacher Class/Section/Subject Assignments
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  qualification TEXT,
  join_date TEXT,
  status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, academic_year_id, class_id, section_id, subject_id)
);

-- 6. Students (Immutable 5-digit Student ID, support for new and old students)
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT UNIQUE NOT NULL, -- e.g. '10001', '10002' (5 digits)
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
  date_of_birth TEXT NOT NULL,
  address TEXT,
  registration_date TEXT NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Transferred', 'Graduated', 'Suspended')),
  is_existing_student INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. Student Class Enrollments & Historical Promotion Records
CREATE TABLE IF NOT EXISTS student_class_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  roll_number INTEGER,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Promoted', 'Retained', 'Transferred')),
  promoted_from_id INTEGER REFERENCES student_class_assignments(id),
  assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, academic_year_id)
);

-- 8. Parents & Student-Parent Relationships (Multi-student linking & deduplication)
CREATE TABLE IF NOT EXISTS parents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  address TEXT,
  occupation TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_parents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('Father', 'Mother', 'Guardian', 'Other')),
  is_primary INTEGER DEFAULT 1,
  sms_enabled INTEGER DEFAULT 1,
  UNIQUE(student_id, parent_id)
);

-- 9. Academic Assessments & Marks System
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. 'Test 1', 'Test 2', 'Midterm', 'Final Exam', 'Quiz', 'Assignment'
  assessment_type TEXT DEFAULT 'Test' CHECK (assessment_type IN ('Test', 'Mid', 'Final', 'Bonus', 'Custom')),
  max_marks REAL NOT NULL CHECK (max_marks > 0),
  weight_percentage REAL DEFAULT 0,
  assessment_date TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Draft', 'Open', 'Completed', 'Locked')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained REAL,
  is_absent INTEGER DEFAULT 0,
  remarks TEXT,
  entered_by_user_id INTEGER NOT NULL REFERENCES users(id),
  entered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assessment_id, student_id)
);

-- 10. Mark Adjustment & Audit History (Mandatory Reason & Diff Tracking)
CREATE TABLE IF NOT EXISTS mark_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mark_id INTEGER NOT NULL REFERENCES marks(id) ON DELETE CASCADE,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id),
  student_id INTEGER NOT NULL REFERENCES students(id),
  previous_mark REAL,
  new_mark REAL NOT NULL,
  reason TEXT NOT NULL, -- Mandatory justification for change
  changed_by_user_id INTEGER NOT NULL REFERENCES users(id),
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 11. Student Profile & Class Historical Changes
CREATE TABLE IF NOT EXISTS student_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- 'PROMOTION', 'CLASS_CHANGE', 'INFO_UPDATE'
  previous_data TEXT, -- JSON representation
  new_data TEXT,      -- JSON representation
  changed_by_user_id INTEGER NOT NULL REFERENCES users(id),
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 12. SMS Broadcasts & Recipients Delivery Tracker
CREATE TABLE IF NOT EXISTS sms_broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  broadcast_type TEXT NOT NULL CHECK (broadcast_type IN ('ANNOUNCEMENT', 'RESULT_SMS', 'ATTENDANCE', 'URGENT')),
  sender_user_id INTEGER NOT NULL REFERENCES users(id),
  sender_role TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'ALL', 'GRADE', 'SECTION', 'MULTI_SECTION', 'STUDENT'
  target_filters_json TEXT,
  message_template TEXT NOT NULL,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Completed' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  broadcast_id INTEGER NOT NULL REFERENCES sms_broadcasts(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  parent_id INTEGER REFERENCES parents(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'Sent' CHECK (status IN ('Sent', 'Delivered', 'Failed', 'Pending')),
  error_message TEXT,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  delivered_at TEXT
);

-- 13. School Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_user_id INTEGER NOT NULL REFERENCES users(id),
  target_audience TEXT DEFAULT 'ALL' CHECK (target_audience IN ('ALL', 'GRADE', 'SECTION', 'TEACHERS')),
  target_class_id INTEGER REFERENCES classes(id),
  target_section_id INTEGER REFERENCES sections(id),
  is_pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 14. Comprehensive Security & Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values TEXT, -- JSON
  new_values TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 15. School Settings
CREATE TABLE IF NOT EXISTS school_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for Ultra-Fast Lookups & Debounced Search
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON students(full_name);
CREATE INDEX IF NOT EXISTS idx_parents_phone ON parents(phone_number);
CREATE INDEX IF NOT EXISTS idx_parents_name ON parents(full_name);
CREATE INDEX IF NOT EXISTS idx_student_class_lookup ON student_class_assignments(student_id, academic_year_id, class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_marks_assessment_student ON marks(assessment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_lookup ON teacher_assignments(teacher_id, academic_year_id, class_id, section_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_sms_recipients_broadcast ON sms_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
