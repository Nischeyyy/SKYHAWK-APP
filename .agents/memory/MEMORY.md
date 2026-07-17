# Memory Index

- [Imported Expo+FastAPI+Mongo project setup](imported-expo-fastapi-mongo-setup.md) — no Replit MongoDB integration exists; use requestSecrets for MONGO_URL (user's own Atlas string) and a self-generated JWT_SECRET.
- [Stability hardening decisions](stability-hardening.md) — slowapi rate limiting, Motor pool config, JWT 401 intercept, ErrorBoundary pattern used in this project.
- [Six feature modules backend patterns](six-feature-modules.md) — SOS/panic, incident lifecycle PATCH, GPS pings, shift swap marketplace, payroll engine, compliance/wallet; key conventions and endpoint shapes.
- [Backend hardening gaps](backend-hardening-gaps.md) — password reset has no email delivery yet, JWT secret rotation declined by user, uploads/pay-stubs on local disk not object storage.
- [React Router v6 pathless layout route](react-router-v6-pathless-layout.md) — path="/*" outranks path="/" in v6 scoring; use a pathless layout route for protected children instead.
