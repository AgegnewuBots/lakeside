# Lake Side Academy Management System

An institutional-grade educational administration platform engineered for real school operations, featuring multi-role access control, continuous dynamic assessments, Ethiopian Calendar (E.C.) integration, parent SMS broadcasts, student demographic tracking, and historical records preservation.

---

## 🏛️ System Portals & Roles

- **Executive Administrator (`/admin`)**: Institutional governance, user permissions, academic curriculum setup, section capacity tracking, whole-school SMS broadcasts, tokenized result SMS generator, and security audit logs.
- **Directory / Records Office (`/login -> Records Office`)**: Registrar student intake (New Intake vs Returning Re-Enrollment), 5-digit Student ID issuance, Ethiopian Calendar date picker, multi-child parent phone linking, promotion evaluations with configurable passing thresholds, and printable photorealistic School ID Cards.
- **Teacher Workspace (`/login -> Teacher Portal`)**: Roster-confined gradebook for faculty members, dynamic assessment instance creation (strict 100 maximum marks policy), spreadsheet mark entry, audited mark adjustments requiring mandatory justifications, and direct SMS communication with parents of enrolled students.
- **Parent SMS Gateway & Simulator Feed**: SMS notification dispatch with live simulation feed for parent grade reports and school announcements.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v22.0.0 or higher (uses built-in `node:sqlite` DatabaseSync)
- **NPM**: v10.0.0 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/lakeside.git
   cd lakeside
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```
   *(Or individually inside `client/` and `server/`)*

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Initialize & Seed Database**:
   ```bash
   npm run seed
   ```

5. **Start Full Development Stack**:
   ```bash
   npm run dev
   ```
   - **Backend API**: `http://localhost:3001`
   - **Frontend App**: `http://localhost:5173`

---

## 🔑 Default Accounts & Credentials

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `age1324` | Full executive administration & audit |
| **Registrar / Directory** | `registrar` | `dir123` | Student registration, promotion & ID cards |
| **Managing Director** | `director1` | `dir123` | Institutional overview & reports |
| **Teacher (Upper Primary)** | `abebe` | `teach123` | Grade 7 & 8 Mathematics marks & assessments |

---

## 🧪 Automated Testing

Run the comprehensive test suite verifying 77 test cases across database integrity, authentication, 100-mark validation rules, promotion algorithms, and audit logging:

```bash
npm test
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Lucide React, Vanilla CSS design system
- **Backend**: Node.js 22+, Express, `node:sqlite` (DatabaseSync with WAL mode)
- **Security**: bcryptjs, JWT authentication, parameterized SQL queries, RBAC middleware, full audit trail diff logger
- **Calendar**: Built-in Ethiopian Civil Solar Calendar engine

---

## 📄 License
Private & Proprietary - Lake Side Academy. All rights reserved.
