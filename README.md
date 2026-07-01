# 🚀 AptitudeX – Secure Online Assessment Platform

AptitudeX is a full-stack online assessment platform designed to provide secure, scalable, and reliable online examinations. The platform follows a **Zero-Trust Architecture**, where all critical operations—including grading, timing, and anti-cheat enforcement—are handled entirely on the backend.

Built as a production-style project, AptitudeX demonstrates modern full-stack development practices, backend security, role-based access control, and real-world examination workflows.

---

## ✨ Key Features

### 👨‍💼 Admin Module

- Secure Admin Authentication
- Question Bank Management (CRUD)
- Assessment Creation & Publishing
- Random Question & Option Support
- Student Monitoring Dashboard
- Result Management
- Audit Log Tracking

### 👨‍🎓 Student Module

- Secure Student Authentication
- Join Assessment using Exam Code
- Real-Time Timer
- Resume Active Session
- Auto Submission
- View Published Results

---

## 🛡️ Security Features

- Backend-Enforced Grading
- Zero-Trust Architecture
- JWT Authentication
- HttpOnly Secure Cookies
- Role-Based Access Control (RBAC)
- Session Locking
- Server-Side Timer Enforcement
- Input Validation using Zod
- Audit Logging
- API Standardization
- Rate Limiting

---

## 🚫 Anti-Cheat Features

- 3-Strike Violation System
- Automatic Exam Termination
- Multi-Tab Detection (BroadcastChannel)
- Tab Switching Detection
- Window Blur Detection
- Fullscreen Exit Detection
- Copy / Paste / Cut Prevention
- Right Click Prevention
- Developer Tools Shortcut Detection
- Duplicate Violation Filtering
- Backend Violation Synchronization

---

## 🏗️ Technology Stack

### Frontend

- Next.js (App Router)
- React
- TypeScript
- HTML5
- CSS3

### Backend

- Next.js API Routes
- Node.js
- REST APIs

### Database

- SQLite

### Authentication & Security

- JWT
- HttpOnly Cookies
- Zod Validation

---

## 📂 Project Structure

```
app/
├── admin/
├── student/
├── exam/
├── api/

components/

lib/

middleware.ts

public/
```

---

## 🔄 System Workflow

```
Student
    │
    ▼
Login
    │
    ▼
Join Assessment
    │
    ▼
Server Validation
    │
    ▼
Start Exam
    │
    ▼
Server Timer
    │
    ▼
Answer Questions
    │
    ▼
Backend Grading
    │
    ▼
Results
```

---

## 🗄️ Database

Core Tables

- Users
- Questions
- Assessments
- Assessment Questions
- Attendance
- Responses
- Violations
- Audit Logs

---

## ⚙️ Environment Variables

Create a `.env` file:

```env
JWT_SECRET=your_secure_secret_key
```

---

## 🚀 Installation

Clone the repository

```bash
git clone https://github.com/MAYUR14N/AptitudeX.git
```

Navigate into the project

```bash
cd AptitudeX
```

Install dependencies

```bash
npm install
```

Run the development server

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## 🧪 Tested Features

- User Registration
- User Login
- Admin Authentication
- Question CRUD
- Assessment CRUD
- Assessment Publishing
- Student Exam Flow
- Auto Submission
- Anti-Cheat Enforcement
- Monitoring Dashboard
- Result Publication
- Session Locking
- Audit Logging

---

## 📦 Deployment

The project is compatible with Vercel deployment.

> **Note:** SQLite is suitable for demos and local development. Since Vercel uses an ephemeral filesystem, database changes are not persistent. For long-term production deployments, migrate to PostgreSQL or another hosted database.

---

## 🔮 Future Improvements

- PostgreSQL Support
- Redis-Based Rate Limiting
- Email Notifications
- Analytics Dashboard
- Question Import via CSV
- AI-Based Proctoring
- Docker Deployment
- CI/CD with GitHub Actions

---

## 👨‍💻 Author

**Mayur Naik**

Computer Science & Design Engineering Student

---

## 📄 License

This project is intended for educational and portfolio purposes.
