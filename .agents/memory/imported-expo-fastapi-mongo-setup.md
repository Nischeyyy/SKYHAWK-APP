---
name: Imported Expo+FastAPI+Mongo project setup
description: Setup and debugging notes for a React Native/Expo web frontend + FastAPI/Motor/MongoDB backend imported from GitHub, proxied through a single Node port on Replit.
---

## Environment/secrets
- No Replit-managed MongoDB integration exists (confirmed via `searchIntegrations`). Use `requestSecrets` for `MONGO_URL` (user's own Atlas connection string) — do not attempt to provision a Replit database for this stack unless asked.
- For secrets like `JWT_SECRET` that just need to be a random value (not tied to an external account), self-generate via `crypto.randomBytes` and offer it to the user as a paste-in suggestion through `requestSecrets` rather than asking them to go find one.
- Expo+FastAPI+Mongo imports need explicit dependency installs (`installLanguagePackages` for backend, `yarn install` for frontend) before workflows will bind their ports — don't assume an imported repo's deps are present.

## Single-port proxy + CORS
- When a Node reverse proxy (`proxy.js`) sits in front of an Expo web dev server, do NOT rewrite the `Host` header to `localhost:<port>` when forwarding. Expo's dev server CORS middleware compares the browser's `Origin` host against the request's `Host` header and rejects (500) when they mismatch — which happens for any access through the Replit domain/iframe. Pass `Host` through unchanged.

## Metro's persistent bundle cache can silently go stale — check this FIRST for "my fix isn't showing up" bugs
**Why:** Metro caches the web bundle on disk (`frontend/.expo/web/cache`, plus `/tmp/metro-file-map-*`) keyed by content hash. In one debugging session, edits to `login.tsx`/`AuthContext.tsx`/`client.ts` (including freshly-added `console.log` diagnostics) never appeared in the served bundle — confirmed by curling the actual `entry.bundle` and grepping for the new strings, which were absent even after multiple hard refreshes and workflow restarts. Only after deleting `frontend/.expo/web/cache`, `/tmp/metro-file-map-*`, and `frontend/node_modules/.cache`, then restarting the workflow, did the bundle contain the new code (verified by grepping the bundle again). This wasted a long back-and-forth with the user (repeated "please click again" requests) chasing a phantom app-logic bug that was actually just a stale build.
**How to apply:** When a frontend code change (especially one added specifically to debug something) doesn't seem to take effect — no new console output, behavior unchanged — before assuming the code path isn't being hit or asking the user to re-test again, verify directly: `curl` the running app's actual served JS bundle and `grep` for a unique string from your edit. If it's missing, clear Metro's caches (`frontend/.expo/web/cache`, `/tmp/metro-file-map-*`, `node_modules/.cache`) and restart the workflow before further live debugging.

## `EXPO_PUBLIC_*` env vars: empty string vs undefined
- Setting `EXPO_PUBLIC_BACKEND_URL=` (empty value) in `.env` for same-origin relative-URL API calls can get inlined by Metro as `undefined` instead of `""` once the bundle cache is rebuilt/invalidated (it worked as `""` under a stale/cached bundle, then flipped to `undefined` after a clean rebuild — likely a dotenv/env-inlining edge case around empty values). This produced request URLs like `undefined/api/auth/login`, which don't start with `/`, so they resolved to the wrong path and got served by the frontend's catch-all HTML instead of hitting the backend/proxy — a silent failure with a 200 status and a plausible-looking (but wrong) response body.
- Always guard with an explicit fallback in code: `const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';` — don't rely on the env file's empty value alone to produce an empty string at runtime.

## Debugging technique: browser console log capture is scoped to the embedded Replit preview
The automatic browser-console log capture (surfaced via the logs-refresh tool) only sees console output from the Replit-embedded preview iframe, not from a separate browser tab/window the user opens manually (e.g. testing in incognito). If a user reports testing in "a new tab" and no corresponding console output shows up, that's expected — ask them to reproduce inside the embedded preview if you need to observe it yourself.
