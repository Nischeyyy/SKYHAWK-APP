---
name: Stability hardening decisions
description: Key implementation decisions made during the stability pass — rate limiting, DB config, frontend error patterns.
---

## Rate Limiting (slowapi)
slowapi requires `request: Request` as the **first parameter** in any rate-limited route handler — Depends() params come after. Login: 10/min, register: 5/min, dashboard: 60/min, global default: 300/min.

**Why:** FastAPI's dependency injection doesn't pass the raw Request to the handler unless explicitly listed.

**How to apply:** Any new rate-limited route needs `@limiter.limit("N/minute")` decorator AND `request: Request` as first arg.

## Motor Connection Pool
`serverSelectionTimeoutMS=5000, connectTimeoutMS=10000, socketTimeoutMS=30000, maxPoolSize=50, minPoolSize=5, retryWrites=True` — set at client init in server.py.

**Why:** Default Motor has no serverSelectionTimeout so Atlas connection failures hang indefinitely.

## JWT 401 Global Intercept Pattern
`client.ts` exports `setUnauthorizedHandler(cb)`. AuthProvider registers the callback in a useEffect. Any 401 on an auth=true request fires the callback → clears token → sets `sessionExpired=true` in AuthContext. Login screen reads `sessionExpired` from context and shows a banner.

**Why:** Screens call `api()` directly; central intercept avoids repeating logout logic in every screen.

## Error Boundary
`frontend/src/components/ErrorBoundary.tsx` — class component, wraps root GestureHandlerRootView in `_layout.tsx`. Has `reset()` for Try Again. Per-screen boundaries can be added by wrapping screen content.

## Pre-existing TS error (do not fix in stability pass)
`app/incidents.tsx:176` — `theme.colors.cardAlt` doesn't exist in the type. Pre-existing before this pass.

## Structured Logging
Custom JSON formatter (`_JSONFormatter`) replaces default logging. Each line is one JSON object: `ts`, `level`, `logger`, `msg`, `extra`. Uses `logging.root.handlers = [_handler]` to replace all handlers globally.
