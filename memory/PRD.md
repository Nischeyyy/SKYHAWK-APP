# Skyhawk Security Operations — Product Requirements (v1)

## Overview
Mobile-first operations app for Skyhawk Security guards (React Native / Expo). Replaces fragmented texting/Jotform workflows with a centralized operations hub. **Not a messaging platform** — all comms are broadcast-only with read receipts.

## Tech Stack
- **Frontend**: Expo SDK 54 + Expo Router 6 (file-based), TypeScript, `expo-camera`, `expo-location`, `expo-image-picker`, `expo-notifications`, `expo-secure-store`, `@expo/vector-icons`
- **Backend**: FastAPI + `motor` (async MongoDB) + PyJWT + bcrypt + httpx
- **Auth**: Custom JWT (bcrypt hashed passwords, 7-day tokens), tokens stored in expo-secure-store (mobile) / localStorage (web)
- **Push**: Emergent managed push (`EMERGENT_PUSH_KEY` — placeholder locally, replaced at deploy time)
- **Design**: Dark-First Utility (#0F172A obsidian / #F59E0B high-vis amber) — tactical command center aesthetic

## Modules (v1 MVP)
1. **Dashboard** — today/next shift, active clock-in banner, unread announcements badge, licence expiry alert, quick actions (payroll, announcements, incident, onboarding), emergency contacts
2. **My Schedule** — Weekly/monthly toggle, grouped by day, status chips
3. **Open Shifts Marketplace** — Filter (all/urgent/best-pay), claim/cancel/waitlist, pay preview, spots remaining
4. **Time Clock** — GPS permission → selfie capture (front camera) → geofence distance check → confirm; break start/end; clock-out with hours calc
5. **Digital Wallet** — Employee ID card with mock QR (BSON-derived pattern), certifications (Security Licence, Company ID, First Aid, Smart Serve, WHMIS, Work Permit) with expiry status
6. **Announcements** — Severity badges (critical/warning/info), read receipts, acknowledge button, read count
7. **Site Instructions Acknowledgment** — On shift detail; guard must ack before shift
8. **Incident Reporting** — Type (incident/injury/lost & found/property damage), severity, description, witness info, photos, digital signature, history tab
9. **Payroll Tracker** — Pipeline visualization (Submitted → Under Review → Released → Paid), current period hero card, all-time totals, pay history
10. **Profile** — Employee info, credentials, emergency contact, equipment issued (uniform, radio, keys)
11. **Onboarding Progress** — 6-step tracker with completion %

## Endpoints Overview (all under `/api`)
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /dashboard`, `GET /schedule?range=week|month`
- `GET /shifts/{id}`, `POST /shifts/{id}/acknowledge-instructions`
- `GET /open-shifts`, `POST /open-shifts/{id}/claim`, `POST /open-shifts/{id}/cancel-claim`, `GET /my-claims`
- `GET /timeclock/status`, `POST /timeclock/clock-in`, `POST /timeclock/clock-out`, `POST /timeclock/break`, `GET /timeclock/history`
- `GET /wallet`, `GET /announcements`, `POST /announcements/{id}/acknowledge`
- `POST /incidents`, `GET /incidents`
- `GET /payroll`, `GET /profile`, `GET /onboarding/status`
- `POST /register-push`

## Seed Data (auto on empty DB)
- 3 users (admin, 2 guards), 4 sites (Toronto Financial Tower, Skyline Convention, Northlake Warehouse, Harbourfront Residences)
- Guard's today shift + tomorrow shift + 4 upcoming + 5 completed past shifts
- 7 open shifts across next week (2 urgent), 4 announcements (1 critical, 1 warning), 4 payroll periods (paid → submitted), 6 wallet docs, 3 equipment items

## Priorities Addressed (from user brief)
✅ Open Shift Marketplace ✅ Digital Onboarding tracker ✅ Digital Licence + QR ID ✅ Payroll pipeline with 4 stages ✅ GPS + Selfie clock-in ✅ Announcements with read receipts ✅ Site instructions acknowledgment ✅ QR Employee ID

## Deferred (v2)
Availability preferences, Company Resources (SOPs/videos), Equipment return/damage flows, Admin dashboard, Direct deposit setup UI, SIN submission UI.

## Test Credentials
See `/app/memory/test_credentials.md`.
