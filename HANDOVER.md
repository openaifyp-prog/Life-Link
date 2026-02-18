# LifeLink - Blood Donation Platform

**Handover & Deployment Guide**

## Overview

LifeLink is a blood donation platform connecting donors with patients in real-time. This package includes:

1.  **Frontend**: Static HTML/CSS/JS (Public Interface)
2.  **Backend**: Next.js (API & Admin System)
3.  **Database**: Local JSON Storage (Demo Mode)

---

## 1. Prerequisites

Before running the project, ensure the following are installed on the machine:

- [Node.js](https://nodejs.org/) (Version 18 or higher)
- [Git](https://git-scm.com/)

---

## 2. Installation Setup

### Step 1: Unzip & Open

Extract the project folder. Open your terminal (Command Prompt or PowerShell) and navigate to the project folder:

```bash
cd lifelink
```

### Step 2: Install Backend Dependencies

Navigate to the backend folder and install the required libraries:

```bash
cd backend
npm install
```

---

## 3. Configuration (.env)

You must configure the environment variables for the backend to work.

1.  Navigate to `lifelink/backend/`.
2.  Create a file named `.env.local`.
3.  Paste the following configuration:

```env
JWT_SECRET=lifelink_jwt_secret_key_2024_super_secure
JWT_EXPIRY=86400

# Default Admin Credentials
ADMIN_EMAIL=admin@lifelink.pk
ADMIN_PASSWORD=admin123

# Environment Settings
API_BASE_URL=http://localhost:3000
ENVIRONMENT=development
```

---

## 4. Running the Project Locally

To run the full system, you need **two** terminal windows open.

### Terminal 1: Start Backend (API)

```bash
cd lifelink/backend
npm run dev
```

- The API will start at: `http://localhost:3000`

### Terminal 2: Start Frontend (UI)

You can use any local server (like Live Server in VS Code or Python).

```bash
python -m http.server 8080
```

- The Website will be available at: `http://localhost:8080`

---

## 5. Deployment (Going Live)

### Vercel Deployment

This project is optimized for **Vercel**.

1.  Push the code to a GitHub repository.
2.  Import the repository into Vercel.
3.  Deploy the **Backend** folder (`lifelink/backend`) as a Next.js project.
    - _Add the Environment Variables from Step 3 during deployment._
4.  Update `js/api.js` in the Frontend code to point to the new Backend URL.
5.  Deploy the **Frontend** folder (`lifelink/`) as a Static Site.

**Note on Data Persistence:**
Currently, the system uses local JSON files for data. On Vercel (Serverless), data will reset periodically. For permanent storage in a commercial production environment, the backend should be connected to a database like MongoDB.

---

## 6. Admin Credentials

- **Login URL**: `/admin/login.html` (e.g., `http://localhost:8080/admin/login.html`)
- **Email**: `admin@lifelink.pk`
- **Password**: `admin123`

---

## 7. Troubleshooting

- **Error: "Module not found"**: Ensure you ran `npm install` inside the `backend` folder.
- **Error: "Fetch failed"**: Ensure the Backend server is running on port 3000.
- **Data disappearing**: This is expected behavior on Vercel deployments due to serverless architecture (see Note on Data Persistence).
