# EOD Management & Analytics Dashboard

A full-stack, enterprise-grade Operations Analytics & Management Dashboard designed for supervising enrollment/collection operations across districts, stations, and personnel.

## 🚀 Tech Stack

### Backend
- **Framework:** Python FastAPI (0.111+)
- **Database ORM:** SQLAlchemy 2.0 (Async) + Alembic migrations
- **Database:** PostgreSQL (Hosted on Supabase)
- **Authentication & Security:** 
  - JWT Tokens (Access & Refresh with rotation)
  - Passlib + bcrypt password hashing
  - **Supabase Auth native MFA (2FA)** for Admin users
- **Data Processing:** Pandas, OpenPyXL, XlsxWriter

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Shadcn UI primitives + Lucide Icons
- **State Management:** Zustand (Client Auth State) + React Query v5 (Server Data Cache)
- **Routing:** React Router v6
- **Data Visualization:** Recharts
- **Supabase Integration:** `@supabase/supabase-js` for Admin 2FA TOTP enrollment & challenge

---

## 📁 Repository Structure

```
.
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint, CORS & router registration
│   │   ├── config.py         # Settings & environment validation
│   │   ├── database.py       # Async SQLAlchemy engine & session factory
│   │   ├── models/           # SQLAlchemy ORM models (AdminUser, Station, DailyRecord, etc.)
│   │   ├── schemas/          # Pydantic v2 schemas (DTOs)
│   │   ├── routers/          # API endpoints (Auth, DMs, Analytics, Exports, Anomalies)
│   │   ├── services/         # Business logic layer
│   │   ├── dependencies/     # FastAPI auth & session injection
│   │   └── utils/            # Security & pagination utilities
│   ├── alembic/              # Database migration scripts
│   ├── scripts/              # Migration & data seeding tools
│   ├── tests/                # Async unit & integration test suite
│   ├── Dockerfile            # Container definition for backend
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # React + Vite Application
    ├── src/
    │   ├── api/              # Axios HTTP client & API query functions
    │   ├── components/       # Reusable UI, Charts, Tables, & Filters
    │   ├── lib/              # Supabase client setup & helper utilities
    │   ├── pages/            # View pages (Overview, Monthly, Daily, DM Management, Settings)
    │   ├── store/            # Zustand auth & session store
    │   └── types/            # TypeScript interfaces & types
    ├── package.json          # Frontend dependencies
    └── vite.config.ts        # Vite configuration
```

---

## 🛠️ Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm
- PostgreSQL database (or Supabase project URI)

### 1. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables template
cp .env.example .env
# Fill in your DATABASE_URL, SECRET_KEY, and SUPABASE credentials in .env

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```
Backend API will be running at `http://localhost:8000` (Interactive docs at `http://localhost:8000/docs`).

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Start frontend dev server
npm run dev
```
Frontend will be running at `http://localhost:5173`.

---

## 🔒 Security & Admin 2FA Features
- **Demo Credentials**: Admin starts with simple initial credentials (`admin@demo.com` / `AdminDemo123!`).
- **Credentials Edit**: Admin can update email & password in the Settings view.
- **Supabase 2FA**: Admin can enable native Supabase TOTP 2FA via Settings, scan QR code using Google Authenticator / Authy, and require 2FA verification on subsequent logins.

---

## 📜 License
MIT License.
