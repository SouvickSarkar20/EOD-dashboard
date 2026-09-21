# Operations Analytics and Management Dashboard

An end-to-end, enterprise-grade Operations Analytics and Management Dashboard built for supervising enrollment and collection operations across districts, stations, and personnel.

## Tech Stack

### Backend
- **Framework:** Python FastAPI (0.111+)
- **Database ORM:** SQLAlchemy 2.0 (Async) with Alembic migrations
- **Database:** PostgreSQL (Hosted on Supabase with PgBouncer connection pooler support)
- **Authentication & Security:** JWT (Access & Refresh Tokens), Passlib (bcrypt), Supabase Auth native TOTP 2FA for Admin accounts
- **Data Processing:** Pandas, OpenPyXL, XlsxWriter

### Frontend
- **Framework:** React 18/19 with TypeScript and Vite
- **Styling:** Tailwind CSS with Lucide Icons
- **State Management:** Zustand (Client Auth State) and TanStack React Query v5 (Server Data Cache)
- **Routing:** React Router v6
- **Data Visualization:** Recharts
- **Security:** `@supabase/supabase-js` for TOTP 2FA enrollment and verification

---

## Key Features

- **Executive Analytics:** High-level operational summaries, collection metrics, daily breakdown, and performance KPIs.
- **District and Station Supervision:** Hierarchical management across districts, stations, and District Managers (DMs).
- **Data Export & Reporting:** Export operational records and summary reports to Excel and CSV formats.
- **Role-Based Access Control:** Secure JWT authentication supporting Admin and DM roles.
- **Multi-Factor Authentication (2FA):** Native TOTP 2FA enrollment for Admin users using Authenticator apps via Supabase Auth.
- **PgBouncer Compatibility:** Built-in asyncpg configuration disabling prepared statement caching for pooled PostgreSQL environments.

---

## Repository Structure

```
.
├── backend/
│   ├── alembic/              # Alembic database migration scripts
│   ├── app/
│   │   ├── config.py         # Application settings and environment validation
│   │   ├── database.py       # Async SQLAlchemy engine and session factory
│   │   ├── main.py           # FastAPI application entrypoint and middleware
│   │   ├── dependencies/     # Dependency injection (authentication, db sessions)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── routers/          # API endpoints (Auth, Analytics, DMs, Exports)
│   │   ├── schemas/          # Pydantic data validation schemas
│   │   ├── services/         # Core business logic layer
│   │   └── utils/            # Security utilities and helpers
│   ├── scripts/              # Data seeding and maintenance scripts
│   ├── tests/                # Test suite (pytest with async engine override)
│   ├── Dockerfile            # Container build specification
│   └── requirements.txt      # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── api/              # Axios HTTP client and API functions
    │   ├── components/       # Shared UI components, tables, and charts
    │   ├── lib/              # Supabase client and utility helpers
    │   ├── pages/            # Application pages (Overview, Daily, Monthly, Settings, etc.)
    │   ├── store/            # Zustand state management
    │   └── types/            # TypeScript interface definitions
    ├── package.json          # Frontend dependencies and scripts
    └── vite.config.ts        # Vite configuration
```

---

## Local Development Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher and npm
- PostgreSQL database instance (or Supabase project URI)

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - On Windows:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - On Linux / macOS:
     ```bash
     python -m venv venv
     source venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create the environment configuration file:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your database credentials and secret key.

5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

6. Start the development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend API will be available at `http://localhost:8000` with interactive API documentation at `http://localhost:8000/docs`.

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Create the frontend environment configuration file:
   ```bash
   cp .env.example .env
   ```
   Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as needed.

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (asyncpg format, e.g., `postgresql+asyncpg://...`) |
| `SECRET_KEY` | Secret key used for signing JWT tokens |
| `ALGORITHM` | JWT signing algorithm (Default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan in minutes (Default: `30`) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan in days (Default: `7`) |
| `SUPABASE_URL` | Supabase project URL for Admin 2FA integration |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for admin-level authentication operations |
| `FRONTEND_URL` | Frontend origin URL for CORS configuration |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL for frontend client |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous API key |

---

## Database Connection Pooling Configuration

When deploying the application with PostgreSQL connection poolers (such as Supabase Shared or Session Pooler powered by PgBouncer), asyncpg prepared statements can cause `InvalidSQLStatementNameError` exceptions.

The application handles this automatically in `app/database.py` by setting:
```python
connect_args["statement_cache_size"] = 0
```
This ensures compatibility across pooled and serverless deployment environments without requiring dedicated database connections.

---

## Testing

Run the automated backend test suite using pytest:

```bash
cd backend
pytest
```

---

## License

This project is licensed under the MIT License.
