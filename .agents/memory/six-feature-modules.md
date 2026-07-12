---
name: Six feature modules backend patterns
description: Key patterns and conventions for the SOS, incident lifecycle, GPS tracking, shift swaps, payroll, and compliance modules added to Skyhawk.
---

## Conventions

**SOS** — `POST /api/sos` creates both a `sos_alerts` doc and an auto-incident doc. Acknowledge via `POST /sos/{id}/acknowledge`, resolve via `POST /sos/{id}/resolve`. Admin-only list: `GET /sos/active`, `GET /sos/history`.

**Incident lifecycle** — status updates use `PATCH /incidents/{id}/status` (not PUT). Valid statuses: `submitted`, `open`, `under_review`, `escalated`, `resolved`. Each update appends to `audit_trail` array. Frontend incident review modal in ops.tsx uses this endpoint.

**GPS pings** — `POST /timeclock/location-ping` requires an active clock-in session. Denormalises last ping to `timeclock` doc for fast live-location queries. Admin live map: `GET /ops/live-locations` — marks guards stale if last ping > 15 min ago.

**Shift swaps** — state machine: `open` → `accepted` (volunteer picks it up) → `approved`/`rejected` (admin decision). Guard cancels only their own swap. Admin endpoint: `POST /admin/shift-swaps/{id}/decision` with `{ action: "approve"|"reject" }`.

**Payroll** — `POST /admin/payroll/calculate` reads timeclock entries for the period and computes regular/OT hours + gross/net. Stored in `db.payroll`. Pay stub: `GET /payroll/{period_id}/stub` (guards see only their own).

**Compliance** — `GET /compliance/status` returns per-doc `compliance_status` + `days_until_expiry`. `GET /admin/compliance` returns all guards sorted by worst licence status first. Wallet docs: `POST /wallet/documents`, `PATCH /wallet/documents/{id}`.

**Why:** All routes inserted before `app.include_router(api)` at bottom of server.py. Edit failures on server.py are often whitespace/context mismatches — always ReadFile the exact lines first.

**Floating SOS button** — rendered in `_layout.tsx` `AuthGate` return, visible only when `user.role !== "admin"` and not on the `(auth)` or `sos` segments. Positioned above the tab bar (`bottom: 96`).

**ops.tsx tab bar** — changed from fixed 3-tab `View` to horizontal `ScrollView` with 6 tabs (Announce, Incidents, Sites, SOS, Swaps, Live). Tab badge counts come from live state.
