---
name: Backend hardening gaps (Skyhawk)
description: What was added when closing "industry standard" backend gaps, and decisions future work should stay consistent with.
---

- Password reset has no email delivery wired up — no mail integration (SendGrid/Resend/Replit mail) is connected. `/auth/forgot-password` currently just logs the raw reset token server-side via `logger.info`. Before shipping this to real users, either connect an email integration or explicitly tell the user this is a known limitation.
- User declined JWT_SECRET rotation (2026-07-13) because it would force-logout all active sessions; the `InsecureKeyLengthWarning` (30 bytes vs recommended 32) is a known, accepted tradeoff for now — don't silently "fix" it again without asking.
- File uploads and generated PDFs (pay stubs) are stored on local disk under `backend/uploads/` and served via a FastAPI `StaticFiles` mount, not object storage. Fine for demo/dev; would need migrating to persistent object storage before a real multi-instance deploy since local disk isn't durable across redeploys.
- Push notifications: external provider needs a real (non-"placeholder") key. The code now short-circuits the network call entirely when the key looks like a placeholder, rather than making a call that will always 401 — check for this pattern before assuming push is "broken" vs. "unconfigured".
</content>
