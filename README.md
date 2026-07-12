# Smartttend 🎓✨
### Smart AI Attendance Tracker for Students

Smartttend is a modern, student-first academic portal and automated AI attendance tracker. Designed to feel like an essential university dashboard rather than a generic utility, Smartttend helps students track their timetable, log lecture attendance, analyze bunking safety limits, configure academic settings, and interact with a context-aware AI assistant.

---

## 🚀 Key Features

### 1. 🎓 Modern Academic Dashboard
- **Overall Attendance progress gauge** showing real-time cumulative standing.
- **Smart Timeline Scheduler** detailing the *Current Lecture*, *Next Lecture*, and full *Today's Schedule*.
- **Quick-Mark Actions**: Log attendance (`Present`, `Absent`, `Cancelled`) directly from the dashboard in a single tap.
- **Subject standing cards** with custom visual colored tags indicating whether a subject is **Safe** or in a **Warning** state.

### 2. 📅 Flexible Attendance Logging & Backfills
- **Today's Timeline**: Quick-status check-ins.
- **Backfill Attendance**: Bulk log or modify records for any single day or across a full week (Monday-Friday) layout.
- **Cancelled / Holiday support**: Clean calculation logic ensuring that cancelled lectures or official holidays do not penalize a student's attendance percentage.

### 3. 🔒 Clerk Authentication & Unified Account Mapping
- Fully integrated with **Clerk Authentication** for secure sign-ups, email confirmation, and profile management.
- **Seamless Django Database Mapping**: Employs an automated interceptor to map incoming Clerk credentials to pre-registered Django database models via custom secure headers.
- **Strict Redirect Routing**: Automatically redirects logged-out users to `/login` and authenticated users to `/dashboard`.

### 4. 🧠 Smart AI Assistant & Settings
- **Context-Aware Gemini AI Integration** offering real-time recommendations, streak calculations, and advice on attendance safety.
- **Configurable Attendance Goals**: Custom goals (75%, 80%, 85%, 90%) saved to the student profile.
- **Simplified AI Configuration**: Clean toggles for *Enable AI Assistant*, *Daily Summary*, and *Lecture Reminders*.

### 5. 🔔 Notifications Center
- **Vertically-stacked Clean Reminder Cards** (styled after Google Calendar/Todoist).
- **Lecture Warnings**: Trigger notifications when subjects fall below target goal.
- **Instant Save**: Preferences are saved dynamically on toggle changes, raising instant toast confirmations.

### 6. 🎨 Appearance & Personalization
- **Theme Selection**:
  - `System Default (Recommended)`
  - `Light Mode`
  - `Dark Mode`
- **Instant Mode Swapping**: Fully synchronized with React Context API and stored directly in local storage with no manual save buttons.
- Fully styled with customized **Material UI (MUI v6)** theme tokens.

### 7. 🛡️ Privacy, Data & Danger Zone
- **Export Attendance Data**: Instant download of overall attendance logs as a formatted `.csv` file.
- **Danger Zone**: Securely delete user accounts with a confirmation dialog.

### 8. ℹ️ Simplified About & Developer Contact
- Dynamic updates checker displaying `v1.0.0 (Latest)`.
- Support options: One-tap feedback button linking to project issues, and developer links for Mrunali Sonje.

---

## 🛠️ Tech Stack

### Backend
- **Core Framework:** Python 3.10+, Django, Django REST Framework (DRF)
- **AI Integration:** Google GenAI / Gemini AI
- **Authentication:** Clerk & custom header authentication mapping (`users/authentication.py`)
- **Database:** PostgreSQL (with automatic fallback to SQLite for local development)
- **CORS & Security:** `django-cors-headers`

### Frontend
- **Runtime Environment:** React 19 (Vite)
- **Component Styling:** Material UI (MUI v6)
- **State & Routing:** React Router DOM (v6), React Context API
- **API Requests:** Axios (with custom auth headers injection interceptors)
- **Toasts:** Sonner
- **Animations:** Framer Motion

---

## 📁 Project Directory Structure

```text
Smartttend/
├── backend/
│   ├── config/             # Django settings, CORS configurations, and WSGI/ASGI entrypoints
│   ├── users/              # Clerk mapping, Django User models, Custom uploader views
│   ├── attendance/         # Check-in logs, Database signals, and CSV Export logic
│   ├── timetable/          # Timetable schedules, Subject serializers, and slot model
│   ├── analytics/          # Weekly and monthly chart distribution engine
│   ├── ai/                 # Gemini API client, memory endpoint, and prompt helpers
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/     # Loading circles, Custom guards
│   │   │   └── layout/     # Navigation Drawer, AppLayout wrapper
│   │   ├── context/        # AuthContext, ThemeContext controls
│   │   ├── pages/
│   │   │   ├── Dashboard/  # Core analytical dashboard & timeline
│   │   │   ├── Attendance/ # Today, Backfill, Subjects list, and Logs history
│   │   │   ├── Settings/   # Personal Profile, Academic, AI, Notifications, Theme switcher
│   │   │   ├── Login/      # Clerk unified auth interface
│   │   │   └── Splash/     # Animated logo intro screen
│   │   ├── services/       # Axios API config
│   │   └── App.jsx
│   └── package.json
└── README.md
```

---

## 🚀 Setup & Execution Instructions

### 1. Backend Setup

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv .venv
   .\.venv\Scripts\activate

   # macOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env`:
   ```ini
   DEBUG=True
   SECRET_KEY=your_django_secret_key
   # If left blank, Django will fallback to db.sqlite3 automatically:
   DB_NAME=
   DB_USER=
   DB_PASSWORD=
   ```
5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the development server:
   ```bash
   python manage.py runserver
   ```
   The backend will start running at `http://127.0.0.1:8000`.

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   The client will open at `http://localhost:5173`.

---

## 🛡️ API Endpoints Summary

- `GET /api/analytics/dashboard/` - Fetch overall, subject-wise, weekly, and monthly attendance charts data.
- `GET /api/timetable/slots/today/` - Retrieve scheduled lecture slots for today.
- `POST /api/attendance/records/mark/` - Log or edit an attendance slot (`Present`, `Absent`, `Cancelled`).
- `GET /api/attendance/records/` - Retrieve full attendance history.
- `GET /api/attendance/records/export/` - Download attendance data as CSV.
- `GET /api/users/profile/` - Fetch authenticated user academic details.
- `PATCH /api/users/profile/` - Update profile picture and academic details.
- `PUT /api/ai/memory/` - Save preferred attendance goals.
