"""
Skyhawk Security Operations — Unified Notification Module
Handles email (SendGrid), SMS (Twilio), and in-app (MongoDB) notifications.
Push notifications are handled separately in server.py via the Emergent client.

All channels degrade gracefully when credentials are absent — the app keeps
working, messages are logged, and no errors are surfaced to users.
"""
import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("skyhawk.notifications")

# ── SendGrid ──────────────────────────────────────────────────────────────────
SENDGRID_API_KEY  = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_FROM     = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@skyhawksecurity.com")
EMAIL_ENABLED     = bool(SENDGRID_API_KEY)

# ── Twilio ────────────────────────────────────────────────────────────────────
TWILIO_SID    = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN  = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM   = os.environ.get("TWILIO_FROM_NUMBER", "")
SMS_ENABLED   = bool(TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM)

# Lazy-initialised SDK clients (created on first use, never cached across
# module reloads so env-var changes take effect without restarting).
_sg_client = None
_tw_client = None


def _get_sg():
    global _sg_client
    if _sg_client is None and EMAIL_ENABLED:
        try:
            from sendgrid import SendGridAPIClient  # type: ignore
            _sg_client = SendGridAPIClient(SENDGRID_API_KEY)
        except ImportError:
            logger.warning("sendgrid package not installed — email disabled. Run: pip install sendgrid")
    return _sg_client


def _get_tw():
    global _tw_client
    if _tw_client is None and SMS_ENABLED:
        try:
            from twilio.rest import Client  # type: ignore
            _tw_client = Client(TWILIO_SID, TWILIO_TOKEN)
        except ImportError:
            logger.warning("twilio package not installed — SMS disabled. Run: pip install twilio")
    return _tw_client


def log_status() -> None:
    """Log which notification channels are active at startup."""
    logger.info(
        "Notification channels: email=%s sms=%s",
        "enabled" if EMAIL_ENABLED else "disabled (SENDGRID_API_KEY missing)",
        "enabled" if SMS_ENABLED else "disabled (TWILIO_* vars missing)",
    )


# ── Email ─────────────────────────────────────────────────────────────────────

def _send_email_sync(to: str, subject: str, body_html: str, body_text: str) -> bool:
    """Synchronous SendGrid send — run via asyncio.to_thread()."""
    try:
        from sendgrid.helpers.mail import Mail  # type: ignore
        sg = _get_sg()
        if not sg:
            return False
        msg = Mail(
            from_email=SENDGRID_FROM,
            to_emails=to,
            subject=subject,
            html_content=body_html,
            plain_text_content=body_text,
        )
        resp = sg.send(msg)
        ok = resp.status_code < 300
        if not ok:
            logger.warning("SendGrid returned %s for %s", resp.status_code, to)
        return ok
    except Exception as exc:
        logger.warning("Email send failed (non-blocking): %s", exc)
        return False


async def send_email(
    to: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None,
) -> bool:
    """Send a transactional email via SendGrid. Returns True on success."""
    if not EMAIL_ENABLED:
        logger.debug("Email not configured — skipping: %s → %s", subject, to)
        return False
    sg = _get_sg()
    if not sg:
        return False
    return await asyncio.to_thread(
        _send_email_sync, to, subject, body_html, body_text or ""
    )


# ── SMS ───────────────────────────────────────────────────────────────────────

def _send_sms_sync(to_phone: str, body: str) -> bool:
    """Synchronous Twilio send — run via asyncio.to_thread()."""
    try:
        tw = _get_tw()
        if not tw:
            return False
        tw.messages.create(body=body, from_=TWILIO_FROM, to=to_phone)
        return True
    except Exception as exc:
        logger.warning("SMS send failed (non-blocking) to %s: %s", to_phone, exc)
        return False


async def send_sms(to_phone: str, body: str) -> bool:
    """Send an SMS via Twilio. Returns True on success."""
    if not SMS_ENABLED:
        logger.debug("SMS not configured — skipping to %s", to_phone)
        return False
    if not to_phone or not to_phone.strip():
        return False
    tw = _get_tw()
    if not tw:
        return False
    return await asyncio.to_thread(_send_sms_sync, to_phone, body)


# ── In-App Notifications ──────────────────────────────────────────────────────

async def save_inapp(
    db,
    user_ids: list,
    title: str,
    body: str,
    category: str = "general",
    link: Optional[str] = None,
) -> None:
    """Persist in-app notification records for one or more users."""
    if not user_ids:
        return
    now = datetime.now(timezone.utc).isoformat()
    docs = [
        {
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "title": title,
            "body": body,
            "category": category,
            "link": link,
            "read": False,
            "created_at": now,
        }
        for uid in user_ids
    ]
    try:
        await db.notifications.insert_many(docs)
    except Exception as exc:
        logger.warning("In-app notification save failed: %s", exc)


# ── Email Templates ───────────────────────────────────────────────────────────

_BASE_STYLE = """
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #000; color: #fff; padding: 40px 20px; max-width: 600px; margin: 0 auto;
"""

def email_template(title: str, body_lines: list, cta_text: str = "", cta_link: str = "") -> str:
    """Wrap content in a simple dark-themed Skyhawk email shell."""
    body_html = "".join(f"<p style='color:#D1D5DB;line-height:1.6;margin:8px 0'>{l}</p>" for l in body_lines)
    cta = (
        f"<a href='{cta_link}' style='display:inline-block;background:#3B82F6;color:#fff;"
        f"padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:20px'>"
        f"{cta_text}</a>"
        if cta_text and cta_link else ""
    )
    return f"""
    <div style='{_BASE_STYLE}'>
      <div style='background:#111;border:1px solid #1F2937;border-radius:12px;padding:32px;'>
        <h1 style='color:#fff;font-size:20px;margin:0 0 8px'>🦅 Skyhawk Security</h1>
        <hr style='border:none;border-top:1px solid #1F2937;margin:16px 0'>
        <h2 style='color:#fff;font-size:18px;margin:0 0 16px'>{title}</h2>
        {body_html}
        {cta}
        <hr style='border:none;border-top:1px solid #1F2937;margin:24px 0 16px'>
        <p style='color:#4B5563;font-size:12px;margin:0'>
          Skyhawk Security Operations · This is an automated message.
        </p>
      </div>
    </div>
    """
