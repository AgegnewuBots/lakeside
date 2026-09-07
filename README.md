# Lake Side Academy Management System
### ሌክ ሳይድ አካዳሚ - Institutional Educational Administration Platform

[![Tests](https://img.shields.io/badge/Tests-77%2F77%20Passed-brightgreen.svg)](tests/run-all-tests.js)
[![Node.js](https://img.shields.io/badge/Node.js-v22%2B-blue.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Database](https://img.shields.io/badge/Database-SQLite%20(node%3Asqlite%20WAL)-lightgrey.svg)](https://nodejs.org/api/sqlite.html)
[![Calendar](https://img.shields.io/badge/Calendar-Ethiopian%20Solar%20Civil-orange.svg)](#-ethiopian-calendar-engine)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#-license)

An institutional-grade, multi-role school management system engineered for full educational governance. Built for real school operations with authentic school workflows, bilingual English & Amharic typography, automated academic rankings, dynamic assessments adhering to a strict 100 maximum total marks policy, and zero mock placeholder data.

---

## 📸 System Showcase & Visual Architecture

### 1. Dedicated Operational Portals

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LAKE SIDE ACADEMY GATEWAY                             │
├──────────────────────┬───────────────────────┬──────────────────────────────┤
│  👑 Executive Admin  │  📁 Directory Office  │  🧑‍🏫 Faculty Gradebook      │
│  - Academic Setup    │  - 5-Digit Student IDs│  - Teacher-Scoped Classes    │
│  - User Management   │  - Dual-Mode Intake   │  - Dynamic 100-Max Marks     │
│  - Audit Diff Logs   │  - Promotion Wizard   │  - Audited Adjustments       │
│  - School-Wide SMS   │  - Printable ID Cards │  - Parent SMS Dispatches     │
└──────────────────────┴───────────────────────┴──────────────────────────────┘
```

---

## 🌟 Key Functional Highlights

### 🎓 1. Directory Records & Dual-Mode Student Intake
* **Permanent 5-Digit Student IDs**: Uniquely generated sequence (`10001+`), permanently assigned and preserved throughout the student's academic journey.
* **Dual-Mode Intake Switcher**:
  - **New Student Intake**: Complete onboarding with multi-child parent phone linking.
  - **Returning Student Re-Enrollment**: Fast lookup by 5-digit ID or Name, preserving historical enrollment records while advancing academic year, grade, and section.
* **Student Promotion Wizard & Cutoff Engine**:
  - Dynamic class-wide cumulative weighted ranking.
  - Registrar-configurable passing threshold (e.g., 50%, 55%, 60%, 65%, 70%) with one-click bulk promotion status decisioning (**Promoted** vs **Retained**).
* **Photorealistic School ID Card Generator**:
  - Direct student identity badge issuance modal featuring school crest, photo frame, 5-digit ID, date of birth, emergency parent phone, QR code verification, and registrar authorization signature.

### 📝 2. Faculty Teacher Workspace & Dynamic Assessments
* **Strict Class & Subject Roster Confinement**: Teachers only see and interact with their assigned grades, sections, and subjects (e.g. Mr. Abebe Kebede confined to Grade 7 & 8 Mathematics).
* **Strict 100 Maximum Marks Policy**:
  - Dynamic creation of assessment instances (e.g., *Test 1*, *Test 2*, *Midterm*, *Final*, *Quiz*).
  - Real-time client & server validation ensuring total marks for any subject in a term cannot exceed 100 points.
* **Audited Mark Adjustments**:
  - Full cryptographic audit history (`mark_history` and `audit_logs`).
  - Mandatory justification reason required for every score alteration.
* **Pure Numeric Academic Rankings**:
  - Olympic tie-breaker skipping logic (e.g., ties for Rank 1 result in Ranks 1, 1, 3).

### 📱 3. Parent SMS Gateway & Live Simulator
* **SMS Ethiopia API v2 Integration**: Automated tokenized SMS notifications for grade reports, fee reminders, and school-wide administrative announcements.
* **Zero-Setup Live Feed Simulator**: Embedded parent device simulator displaying dispatched SMS cards directly from the database for development and testing without billing charges.

### 📅 4. Native Ethiopian Solar Calendar (E.C.) Engine
* Built-in civil solar calendar engine operating in `Africa/Addis_Ababa` timezone.
* Direct-typing `DD/MM/YYYY` Ethiopian date picker with automatic leap year (`Pagume 5/6`) calculations and conversion utilities.

---

## 🔑 Default Accounts & Access Credentials

| Role | Portal URL | Username | Password | Assigned Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Executive Admin** | `/admin` | `admin` | `age1324` | Institutional Sovereign Control |
| **Registrar / Directory** | `/login` | `registrar` | `dir123` | Student Records, Promotion & Badges |
| **Managing Director** | `/login` | `director1` | `dir123` | Institutional Oversight & Reports |
| **Faculty Teacher** | `/login` | `abebe` | `teach123` | Grade 7 & 8 Mathematics (Mr. Abebe) |

---

## 🚀 Quick Start & Local Execution

### Prerequisites
* **Node.js**: `v22.0.0` or higher (*Node.js 22+ required for native `node:sqlite` DatabaseSync*)
* **NPM**: `v10.0.0` or higher

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/AgegnewuBots/lakeside.git
cd lakeside

# 2. Install dependencies for all workspaces
npm run install:all

# 3. Setup environment configuration
cp .env.example .env

# 4. Initialize and seed clean production database
npm run seed

# 5. Launch full development stack (Backend on :3001, Frontend on :5173)
npm run dev
```

---

## 🧪 Comprehensive Automated Test Suite

The system includes an automated test harness covering database health, security RBAC, 100-mark rules, promotion calculations, and returning student workflows:

```bash
npm test
```

```
======================================================
  LAKESIDE SCHOOL MANAGEMENT SYSTEM - AUTOMATED TEST SUITE
======================================================
  ✓ Suite 1: Database Architecture & Core Health
  ✓ Suite 2: Authentication & Access Control (JWT & Roles)
  ✓ Suite 3: 5-Digit Unique Student ID Generator & Uniqueness
  ✓ Suite 4: Historical Records Preservation & Promotion
  ✓ Suite 5: Real-time Multi-Criteria Student Search
  ✓ Suite 6: Teacher Scope Isolation (Assigned Classes Only)
  ✓ Suite 7: Audited Mark Adjustment & Mandatory Justification
  ✓ Suite 8: Academic Ranking Engine (Olympic Tie-Breaker)
  ✓ Suite 9: Result SMS Database Generator & Live Simulator Feed
  ✓ Suite 10: Security Audit Logs & Diff Viewer Payload
  ✓ Suite 11: Dynamic Assessments & Maximum 100 Total Marks Policy
  ✓ Suite 12: Directory Promotion Evaluation Engine & Automated Status
  ✓ Suite 13: Returning Student Intake & Re-Enrollment Workflow
======================================================
  Total Tests Run: 77 | Passed: 77 | Failed: 0
======================================================
```

---

## 📂 Repository Structure

```
lakeside/
├── client/                     # React 18 + Vite Frontend SPA
│   ├── src/
│   │   ├── components/         # Modal, Navbar, Sidebar, EthiopianDatePicker, DiffViewer
│   │   ├── context/            # AuthContext, NotificationContext, ThemeContext
│   │   ├── pages/
│   │   │   ├── Admin/          # Academic, Users, SMS, Rankings, Audit Logs
│   │   │   ├── Directory/      # Intake, Promotion Wizard, Student List, ID Lookup
│   │   │   ├── Teacher/        # Gradebook, Dynamic Assessments, Mark Adjustment
│   │   │   ├── ParentSMS/      # Live SMS Feed Simulator
│   │   │   └── Landing/        # Bilingual Portal Landing Page
│   │   └── styles/index.css    # Responsive theme design system (Light/Dark)
├── server/                     # Express API Server (Node 22+)
│   ├── src/
│   │   ├── config/             # Constants & Environment loader
│   │   ├── db/                 # schema.sql, database.js, seed.js (node:sqlite WAL)
│   │   ├── middleware/         # auth.js (JWT), rbac.js, audit.js
│   │   ├── routes/             # Academic, Marks, Assessments, SMS, Auth, Users
│   │   ├── services/           # SMSEthiopia API v2 Integration
│   │   └── utils/              # Ethiopian Calendar conversion, ID Generator
├── tests/                      # Comprehensive 77-test automated test suite
├── dev-runner.js               # Unified dual-stack dev launcher
├── ABOUT.txt                   # Complete architectural system specification
└── README.md                   # System documentation & showcase
```

---

## 🔒 Security & Privacy

* **Zero Secret Exposure**: `.env` and production API credentials are fully protected and excluded from version control.
* **SQL Injection Prevention**: 100% of SQLite database statements use strictly parameterized queries via `node:sqlite`.
* **Zero External Telemetry**: Runs entirely locally with zero unauthorized external tracking or mock dependencies.

---

## 📄 License

Private & Proprietary - Lake Side Academy. All rights reserved.
