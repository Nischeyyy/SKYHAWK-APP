---
name: Imported Expo+FastAPI+Mongo project setup
description: How to bring up an imported React Native/Expo + FastAPI + MongoDB (Motor) project on Replit when secrets are missing.
---

- `searchIntegrations({ query: "mongodb" })` returns no Replit-managed MongoDB integration/connector. The user must supply their own MongoDB Atlas connection string as `MONGO_URL` via `requestSecrets`.
- `JWT_SECRET` (or similar internally-used signing secrets) has no external service tied to it, so there's no `setEnvVars`-style path to create a secret directly — only `requestSecrets` (user must submit via form). Practical pattern: generate a strong random value with `crypto.randomBytes` in an impure CodeExecution function, then include it in the `requestSecrets` `userMessage` as a ready-to-paste suggestion so the user isn't forced to invent one.
- For Expo web + FastAPI + Mongo stacks proxied through a single Node port-5000 reverse proxy: backend needs `pip`/`uv` deps installed (`installLanguagePackages` python) and frontend needs `yarn install` before workflows will bind their ports; missing installs show up as `uvicorn: command not found` / `ConfigError: ... expo is not installed`.
