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
