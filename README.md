# 🎓 College Digital Permission & Gate Pass System

A comprehensive, role-based web application for managing student campus out-passes and leave permissions. Featuring real-time Firebase Cloud Firestore synchronization, Firebase Cloud Messaging (FCM) web push alerts, automated email notifications with official **Exit Pass Tokens**, and digital QR code gate verification.

---

## 📑 Table of Contents
- [System Architecture & Roles](#-system-architecture--roles)
- [Key Features](#-key-features)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Local Setup](#-installation--local-setup)
- [Configuration (.env)](#-configuration-env)
- [User Workflows](#-user-workflows)
- [API Reference](#-api-reference)
- [Deployment Checklist](#-deployment-checklist)
- [License](#-license)

---

## 🏛️ System Architecture & Roles

```
┌──────────────┐       1. Submit Request        ┌───────────────────────┐
│   STUDENT    │ ─────────────────────────────> │        TEACHER        │
└──────────────┘                                └───────────┬───────────┘
       ▲                                                    │ 2. Parent Verification
       │                                                    ▼
       │  4. Email Exit Token / Pass            ┌───────────────────────┐
       │     (or Rejection Email)               │          HOD          │
       │                                        └───────────┬───────────┘
       │                                                    │ 3. Final Approval
       ▼                                                    ▼
┌──────────────┐         5. QR Code or Token    ┌───────────────────────┐
│ PERMISSION   │ ─────────────────────────────> │     SECURITY GATE     │
│  SLIP (QR)   │                                └───────────────────────┘
└──────────────┘
```

The system provides 4 specialized portals accessible from a single unified authentication screen:

1. **Student Portal** (`/student/dashboard.html`): Apply for day exit, emergency, or leave passes; track approval status live; generate digital QR permission slips.
2. **Teacher Portal** (`/teacher/dashboard.html`): Class proctors/teachers review requests from their assigned department, year, and section. Enforces parent contact verification before approval. Supports direct emergency pass issuance.
3. **HOD Portal** (`/hod/dashboard.html`): Department Heads review verified requests, grant final approval (which generates the official **Exit Token** and emails it to the student), or reject with formal reasons.
4. **Security Gate Portal** (`/security/dashboard.html`): Gate security officers scan the student's QR code or enter their **Permission ID** / **Exit Token** to log gate exits (`OUT`) and entries (`RETURNED`), automatically flagging late returns.

---

## ✨ Key Features

- **Automated Email Notifications**:
  - **Exit Pass Token Email**: Delivered upon HOD or Teacher approval, containing the student's unique security token (`EXP-XXXXXX`), pass details, gate instructions, and a direct link to the digital QR slip.
  - **Permission Denied Email**: Automatically informs students when an application is rejected, including the reviewing officer's name and exact denial reason.
- **Dual-Mode Security Verification**: Security officers can verify permissions by either scanning the QR code, entering the Permission ID (`PER-2026-XXXXX`), or entering the Exit Token (`EXP-XXXXXX`) sent to the student's email.
- **Real-Time Dual Synchronization**: Client `localStorage` seamlessly syncs two-way with Google Cloud Firestore (`onSnapshot`), providing live multi-tab and multi-device updates without page reloads.
- **Web Push Notifications**: Firebase Cloud Messaging (FCM) and Service Worker integration dispatch real-time alerts across devices.
- **Parent Contact Checklist**: Enforces proctor verification (parent contacted, parent confirmed) before a pass can be approved.
- **Digital QR Slip Generator**: Dynamic QR code rendering (`qrcode.js`) with one-click PNG download (`html2canvas`) and print support.

---

## 📂 Project Structure

```
├── .env                        # Local environment configuration (SMTP, PORT)
├── .env.example                # Example environment variables template
├── .gitignore                  # Git ignore rules (protects credentials & node_modules)
├── firebase-boot.js            # Firestore dual-sync, auth & FCM token registration
├── firebase-messaging-sw.js    # Firebase Cloud Messaging background worker
├── index.html                  # Unified login & registration page for all 4 roles
├── notifications.js            # In-app toasts, local browser push, & email client helper
├── package.json                # Project dependencies & scripts
├── push-sw.js                  # Background push notification handler
├── server.js                   # Node.js Express server (FCM push + Nodemailer email API)
├── serviceAccount.json         # Firebase Admin SDK service account key
├── sw.js                       # Core service worker for notifications
│
├── hod/
│   └── dashboard.html          # Head of Department portal
├── security/
│   └── dashboard.html          # Security Gate verification & activity logs
├── student/
│   ├── dashboard.html          # Student request submission & status tracker
│   └── permission-slip.html    # Verified digital pass with QR code & download
└── teacher/
    └── dashboard.html          # Class teacher verification & parent contact portal
```

---

## 💻 Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6 Modules), CSS3 (Modern Glassmorphic UI with CSS Variables, Inter font, FontAwesome 6).
- **Backend**: Node.js, Express.js (v5), CORS.
- **Email Service**: Nodemailer (supporting Gmail SMTP, custom SMTP, and Ethereal preview mode).
- **Database & Auth**: Google Cloud Firestore & Firebase Authentication (v10 Web SDK).
- **Push Services**: Firebase Admin SDK (Messaging) & Service Workers.
- **Libraries**: `qrcode.js` (QR generation), `html2canvas` (PNG slip download).

---

## 📋 Prerequisites

Before running the application, ensure you have:
1. **Node.js** (v18.0.0 or higher recommended).
2. A modern web browser with Notification & Service Worker support (Chrome, Edge, Firefox, Brave).
3. A Google Firebase project with Cloud Firestore and Cloud Messaging enabled.
4. A standard static HTTP server (e.g., VS Code *Live Server* or Python `http.server`).

---

## 🚀 Installation & Local Setup

### 1. Clone or Extract the Repository
```bash
cd exit--app-main
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Configure Firebase Admin
Ensure your `serviceAccount.json` file is present in the project root directory. (Generate this from **Firebase Console** ➔ **Project Settings** ➔ **Service Accounts** ➔ **Generate New Private Key**).

### 4. Configure Email & Environment Variables
Copy `.env.example` to `.env` (or edit existing `.env`):
```bash
cp .env.example .env
```
*(See Configuration section below).*

### 5. Start the Backend Server
```bash
npm start
```
The server will start at `http://localhost:3001`:
```
🚀 College Permission Server running at http://localhost:3001
📬 FCM Push & Email Exit Pass services ready.
```

### 6. Serve the Frontend
Open the project root with a static server (e.g. VS Code **Live Server** on port `5500` or `npx serve .`):
Navigate to `http://localhost:5500/index.html`.

---

## ⚙️ Configuration (.env)

Open `.env` in the root folder:

```env
# Server Port
PORT=3001

# SMTP Email Configuration
# Leave blank to use free development preview mode (Ethereal Email)
# Or configure your Gmail / College SMTP credentials for real student delivery:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-college-email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="College Permission & Gate System" <noreply@bvcits.edu.in>

# Frontend Base URL (used in email buttons linking to the permission slip)
BASE_APP_URL=http://localhost:5500
```

> **Tip for Gmail Users**: Google requires an **App Password** for SMTP. In your Google Account:
> Go to **Security** ➔ **2-Step Verification** ➔ **App Passwords** ➔ Create an app named "College Exit Pass" and paste the 16-character code into `SMTP_PASS`.

---

## 🔄 User Workflows

### 1. Student Request Flow
1. Student registers/logs in at `index.html` with their register number (e.g., `24A91A0512`) and college email.
2. Selects category (Medical, Personal, Emergency, Official Duty), date, departure time, destination, and reason.
3. Submits the request (status becomes `pending_teacher_verification`).

### 2. Teacher Verification Flow
1. Teacher logs into `teacher/dashboard.html`. Requests automatically filter by the teacher's assigned department, year, and section.
2. Teacher opens the request and initiates the **Parent Verification Checklist**:
   - Calls the student's parent directly from the UI.
   - Marks parent confirmation status and inputs notes.
3. Teacher chooses:
   - **Verify & Send to HOD**: Forwards request to HOD queue (`teacher_verified`).
   - **Direct Exit Pass (Email Token)**: Instantly issues an emergency pass and emails the student their Exit Token.
   - **Reject**: Rejection reason is captured, and an official denial email is sent to the student.

### 3. HOD Approval Flow
1. HOD logs into `hod/dashboard.html`.
2. Reviews teacher verification notes and student attendance.
3. Chooses:
   - **Approve & Generate QR**: Issues unique Exit Token (`EXP-XXXXXX`), generates QR slip, and sends the student an official Exit Pass Token email.
   - **Reject**: Captures reason and sends a rejection notification email.

### 4. Security Gate Flow
1. Officer opens `security/dashboard.html`.
2. Student presents either:
   - The digital QR code from `permission-slip.html`.
   - The Permission ID (`PER-2026-XXXXX`).
   - The **Exit Token** (`EXP-XXXXXX`) from their email.
3. Security verifies identity, clicks **Mark OUT**, and departure time is logged.
4. When student returns, security clicks **Mark IN (Returned)**. Late arrivals are automatically flagged.

---

## 📡 API Reference

The backend Express server (`server.js`) exposes the following endpoints:

### `GET /api/health`
Health check endpoint.
- **Response**: `200 OK` `{ "ok": true, "time": "2026-10-25T16:11:05.000Z" }`

### `POST /api/send-email`
Sends an automated exit pass token or rejection email to the student.
- **Body**:
```json
{
  "to": "student@college.edu",
  "type": "approved", // or "rejected"
  "fullName": "Student Name",
  "regNo": "24A91A0512",
  "branch": "CSE",
  "year": "II Year",
  "permissionId": "PER-2026-00042",
  "exitToken": "EXP-7G9B2C",
  "outTime": "04:30 PM",
  "date": "2026-10-25",
  "destination": "Hospital",
  "reason": "Medical",
  "officerName": "Dr. K. Sharma",
  "officerRole": "HOD",
  "rejectionReason": "Notes if rejected"
}
```
- **Response**: `200 OK` `{ "success": true, "messageId": "...", "previewUrl": "..." }`

### `POST /api/send-push`
Dispatches a Firebase Cloud Messaging web push notification to a user's active device.
- **Body**:
```json
{
  "userId": "24A91A0512",
  "title": "🎉 Request Approved!",
  "body": "Your exit token is EXP-7G9B2C. Show it at the gate.",
  "link": "/student/permission-slip.html?id=PER-2026-00042"
}
```

---

## 🛡️ Deployment Checklist

When deploying to production:
1. **Never commit secrets**: Verify `serviceAccount.json` and `.env` are listed in `.gitignore`.
2. **Deploy Backend (`server.js`)**: Deploy to a host like Render, Railway, Fly.io, or VPS. Provide environment variables (`PORT`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `BASE_APP_URL`) in the host dashboard.
3. **Update Frontend API URLs**: Change `http://localhost:3001` in the frontend files to your live backend domain.
4. **Deploy Frontend over HTTPS**: Host HTML/CSS/JS files on Firebase Hosting, Vercel, or Netlify. HTTPS is strictly required for Web Push notifications and Service Workers.
5. **Firebase Security Rules**: In Firebase Console, ensure Cloud Firestore rules allow read/write operations for authenticated sessions.

---

## 📄 License
This project is developed for educational and institutional campus gate administration. All rights reserved.
