# Skyhawk Security Operations

A workforce management app for security guards — shift scheduling, time clock, wallet, incident reports, payroll, and announcements.

## Stack

- **Backend**: Python / FastAPI + Motor (async MongoDB driver), running on port 8000
- **Frontend**: React Native / Expo (web mode), running on port 8080
- **Proxy**: Node.js reverse proxy on port 5000 (the Replit webview port)
  - `/api/*` → backend :8000
  - `/*` → frontend :8080

## How to run

Two workflows must be running:

1. **Backend API** — `cd backend && uvicorn server:app --host 0.0.0.0 --port 8000 --reload`
2. **Start application** — `node proxy.js & cd frontend && bash start.sh`

The webview shows the Expo web app at port 5000.

## Environment variables / secrets

| Key | Type | Description |
|-----|------|-------------|
| `MONGO_URL` | Secret | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `JWT_SECRET` | Secret | Secret key for signing JWT auth tokens |
| `DB_NAME` | Env var | MongoDB database name (set to `skyhawk_ops`) |
| `EMERGENT_PUSH_KEY` | Optional secret | Push notification key (falls back gracefully if missing) |

See `backend/.env.example` for the full list with placeholders. On Replit, set `MONGO_URL`/`JWT_SECRET` as Secrets (never commit real values); `DB_NAME` is a shared env var already set in `.replit`. There is no Replit-managed MongoDB integration — `MONGO_URL` must point at your own MongoDB Atlas (or other) cluster.

## Python dependency management

`backend/requirements.txt` is the original dependency manifest from the imported repo and is kept for reference/non-Replit use. On Replit, packages are actually installed via the root `pyproject.toml`/`uv.lock` (created by Replit's package manager) into `.pythonlibs`, which is what `uvicorn` resolves against. When adding a Python dependency, add it to both files to keep them in sync.

## Demo credentials

The backend seeds demo data on first start:
- **Email**: `guard@skyhawk.com`
- **Password**: `Password123`

## Key files

- `backend/server.py` — all API routes (auth, shifts, timeclock, wallet, incidents, payroll, announcements)
- `frontend/src/api/client.ts` — API client (uses relative URLs so the proxy handles routing)
- `frontend/app/` — Expo Router screens
- `proxy.js` — single-port reverse proxy (required for Replit's port-5000-only external access)

## User preferences

- Keep the existing React Native / FastAPI / MongoDB stack — do not migrate to other frameworks or databases.
