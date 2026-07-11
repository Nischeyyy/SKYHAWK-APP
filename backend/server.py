"""Skyhawk Security Operations - Backend API
JWT-based authentication, shift management, time clock, wallet, incidents, payroll, announcements.
"""
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone, date
from typing import Optional, List
from contextlib import asynccontextmanager

import jwt
import bcrypt
import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", 168))
EMERGENT_PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")
PUSH_BASE_URL = "https://integrations.emergentagent.com"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("skyhawk")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

push_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": EMERGENT_PUSH_KEY},
    timeout=10.0,
)


# ============================================================
# Utilities
# ============================================================
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": now_utc() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": now_utc(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


bearer = HTTPBearer(auto_error=False)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def send_push(recipients: list[str], data: dict, idempotency_key: Optional[str] = None):
    if not recipients:
        return
    if "title" not in data or "message" not in data:
        return
    payload = {"recipients": recipients, "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    try:
        resp = await push_client.post("/api/v1/push/trigger", json=payload)
        if resp.status_code >= 400:
            logger.warning(f"Push failed: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.warning(f"Push notification failed (non-blocking): {e}")


# ============================================================
# Pydantic Models
# ============================================================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    phone: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class ClockInIn(BaseModel):
    shift_id: Optional[str] = None
    latitude: float
    longitude: float
    selfie_base64: str
    site_id: Optional[str] = None


class ClockOutIn(BaseModel):
    latitude: float
    longitude: float
    selfie_base64: Optional[str] = None


class BreakIn(BaseModel):
    action: str  # "start" | "end"


class AckIn(BaseModel):
    pass


class IncidentIn(BaseModel):
    type: str  # incident|injury|lost_found|property_damage
    site_id: Optional[str] = None
    description: str
    severity: str = "medium"  # low|medium|high|critical
    witness_name: Optional[str] = None
    witness_contact: Optional[str] = None
    photos: List[str] = []  # base64
    signature_base64: Optional[str] = None


class RegisterPushIn(BaseModel):
    user_id: str
    platform: str
    device_token: str


class ClaimShiftIn(BaseModel):
    pass


class SiteAckIn(BaseModel):
    site_id: str


# ============================================================
# App
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    await seed_data()
    yield
    client.close()
    await push_client.aclose()


app = FastAPI(title="Skyhawk Ops API", lifespan=lifespan)
api = APIRouter(prefix="/api")


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.shifts.create_index("id", unique=True)
    await db.open_shifts.create_index("id", unique=True)
    await db.sites.create_index("id", unique=True)
    await db.announcements.create_index("id", unique=True)
    await db.incidents.create_index("id", unique=True)
    await db.timeclock.create_index("id", unique=True)
    await db.payroll.create_index("id", unique=True)
    await db.push_tokens.create_index([("user_id", 1), ("device_token", 1)], unique=True)


# ============================================================
# Seed demo data
# ============================================================
async def seed_data():
    # Idempotent seed
    if await db.users.count_documents({}) > 0:
        return
    logger.info("Seeding demo data...")

    admin_id = str(uuid.uuid4())
    guard_id = str(uuid.uuid4())
    guard2_id = str(uuid.uuid4())

    await db.users.insert_many([
        {
            "id": admin_id,
            "email": "admin@skyhawk.com",
            "hashed_password": hash_password("Admin123"),
            "full_name": "Admin Steele",
            "phone": "+1 416 555 0000",
            "role": "admin",
            "employee_number": "SH-0001",
            "licence_number": "SG-ADM-2026",
            "licence_expiry": iso(now_utc() + timedelta(days=400)),
            "certifications": ["First Aid", "Smart Serve", "WHMIS", "CPR"],
            "employment_status": "Active - Full Time",
            "photo_url": "https://images.unsplash.com/photo-1547882230-87a3d4390e8d",
            "emergency_contact": {"name": "Sara Steele", "phone": "+1 416 555 0111", "relation": "Spouse"},
            "onboarding_complete": True,
            "created_at": iso(now_utc()),
        },
        {
            "id": guard_id,
            "email": "guard@skyhawk.com",
            "hashed_password": hash_password("Password123"),
            "full_name": "Marcus Vance",
            "phone": "+1 416 555 0142",
            "role": "employee",
            "employee_number": "SH-2041",
            "licence_number": "SG-ON-89442",
            "licence_expiry": iso(now_utc() + timedelta(days=42)),
            "certifications": ["First Aid", "WHMIS", "Smart Serve"],
            "employment_status": "Active - Full Time",
            "photo_url": "https://images.unsplash.com/photo-1547882230-87a3d4390e8d",
            "emergency_contact": {"name": "Elena Vance", "phone": "+1 416 555 0999", "relation": "Sister"},
            "onboarding_complete": True,
            "created_at": iso(now_utc()),
        },
        {
            "id": guard2_id,
            "email": "guard2@skyhawk.com",
            "hashed_password": hash_password("Password123"),
            "full_name": "Priya Kaur",
            "phone": "+1 647 555 0212",
            "role": "employee",
            "employee_number": "SH-2088",
            "licence_number": "SG-ON-91201",
            "licence_expiry": iso(now_utc() + timedelta(days=180)),
            "certifications": ["First Aid", "CPR"],
            "employment_status": "Active - Part Time",
            "photo_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
            "emergency_contact": {"name": "Ravi Kaur", "phone": "+1 647 555 0111", "relation": "Father"},
            "onboarding_complete": False,
            "created_at": iso(now_utc()),
        },
    ])

    # Sites
    site_ids = [str(uuid.uuid4()) for _ in range(4)]
    sites = [
        {
            "id": site_ids[0], "name": "Toronto Financial Tower",
            "address": "88 Bay Street, Toronto, ON M5J 2S1",
            "latitude": 43.6467, "longitude": -79.3785,
            "supervisor": "Derek Cole", "supervisor_phone": "+1 416 555 0301",
            "instructions": "Report to lobby desk. Uniform inspection required. Rounds every 30 minutes. Log all entries in the electronic register. No mobile use on patrol.",
            "geofence_radius_m": 150,
        },
        {
            "id": site_ids[1], "name": "Skyline Convention Centre",
            "address": "255 Front Street West, Toronto, ON M5V 2W6",
            "latitude": 43.6427, "longitude": -79.3860,
            "supervisor": "Alicia Ng", "supervisor_phone": "+1 416 555 0342",
            "instructions": "Enter via service entrance C. Check credentials at all main doors. Escalate any suspicious packages immediately to supervisor.",
            "geofence_radius_m": 200,
        },
        {
            "id": site_ids[2], "name": "Northlake Warehouse",
            "address": "1200 Pharmacy Ave, Scarborough, ON M1P 2M3",
            "latitude": 43.7691, "longitude": -79.2966,
            "supervisor": "Jamal Reeves", "supervisor_phone": "+1 416 555 0555",
            "instructions": "K9 unit on-site nights. Loading bay 4 requires escort access. Motion sensors monitored — reset via panel in office 2B.",
            "geofence_radius_m": 250,
        },
        {
            "id": site_ids[3], "name": "Harbourfront Residences",
            "address": "10 Queens Quay West, Toronto, ON M5J 2R9",
            "latitude": 43.6389, "longitude": -79.3806,
            "supervisor": "Fiona Marsh", "supervisor_phone": "+1 416 555 0212",
            "instructions": "Concierge relief 22:00 - 06:00. Verify all guest passes. Escalate noise complaints to property manager.",
            "geofence_radius_m": 120,
        },
    ]
    await db.sites.insert_many(sites)

    # Today's active shift for guard
    today = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    shift_start = today.replace(hour=18, minute=0)
    shift_end = today.replace(hour=23, minute=59) + timedelta(hours=2)  # ends 02:00 next day

    scheduled_shifts = []
    # Today's shift (active/upcoming)
    scheduled_shifts.append({
        "id": str(uuid.uuid4()), "user_id": guard_id, "site_id": site_ids[0],
        "start": iso(shift_start), "end": iso(shift_end),
        "role": "Concierge Security", "pay_rate": 24.50, "status": "scheduled",
        "instructions_acknowledged": False,
    })
    # Tomorrow
    scheduled_shifts.append({
        "id": str(uuid.uuid4()), "user_id": guard_id, "site_id": site_ids[1],
        "start": iso(tomorrow.replace(hour=22)), "end": iso(tomorrow.replace(hour=23, minute=59) + timedelta(hours=6, minutes=1)),
        "role": "Event Security", "pay_rate": 26.00, "status": "scheduled",
        "instructions_acknowledged": True,
    })
    # This week upcoming
    for i in range(2, 6):
        d = today + timedelta(days=i)
        scheduled_shifts.append({
            "id": str(uuid.uuid4()), "user_id": guard_id, "site_id": site_ids[i % 4],
            "start": iso(d.replace(hour=18)),
            "end": iso(d.replace(hour=23, minute=59) + timedelta(hours=2, minutes=1)),
            "role": "Patrol", "pay_rate": 24.50, "status": "scheduled",
            "instructions_acknowledged": False,
        })
    # Past week completed
    for i in range(1, 6):
        d = today - timedelta(days=i)
        scheduled_shifts.append({
            "id": str(uuid.uuid4()), "user_id": guard_id, "site_id": site_ids[i % 4],
            "start": iso(d.replace(hour=18)),
            "end": iso(d.replace(hour=23, minute=59) + timedelta(hours=2, minutes=1)),
            "role": "Patrol", "pay_rate": 24.50, "status": "completed",
            "hours_worked": 8.0, "instructions_acknowledged": True,
        })
    await db.shifts.insert_many(scheduled_shifts)

    # Open shifts marketplace
    open_shifts = []
    for i, offset in enumerate([1, 2, 3, 4, 5, 6, 7]):
        d = today + timedelta(days=offset)
        open_shifts.append({
            "id": str(uuid.uuid4()),
            "site_id": site_ids[i % 4],
            "start": iso(d.replace(hour=18 if i % 2 == 0 else 8)),
            "end": iso(d.replace(hour=23, minute=59) + timedelta(hours=2 if i % 2 == 0 else -7)),
            "role": ["Patrol", "Concierge", "Event Security", "K9 Support"][i % 4],
            "pay_rate": [24.5, 26.0, 28.0, 30.0][i % 4],
            "spots_available": (i % 3) + 1,
            "posted_at": iso(now_utc() - timedelta(hours=i * 3)),
            "claimed_by": [],
            "waitlist": [],
            "urgent": i < 2,
        })
    await db.open_shifts.insert_many(open_shifts)

    # Announcements
    announcements = [
        {
            "id": str(uuid.uuid4()), "title": "Winter Uniform Rollout",
            "body": "All guards must collect winter jackets from HQ by Nov 15. Sign the equipment log on pickup.",
            "severity": "info", "site_id": None, "posted_by": "Operations",
            "posted_at": iso(now_utc() - timedelta(hours=4)),
            "read_by": [],
        },
        {
            "id": str(uuid.uuid4()), "title": "URGENT: Elevator Outage - Bay Street",
            "body": "Elevator 3 at 88 Bay St is out of service until 22:00. Use stairwell C for patrol rounds. Report anyone using it.",
            "severity": "critical", "site_id": site_ids[0], "posted_by": "Derek Cole",
            "posted_at": iso(now_utc() - timedelta(hours=1)),
            "read_by": [],
        },
        {
            "id": str(uuid.uuid4()), "title": "Payroll Cycle Update",
            "body": "This period closes Sunday 23:59. Ensure all timecards are submitted with GPS + selfie verification.",
            "severity": "info", "site_id": None, "posted_by": "Payroll",
            "posted_at": iso(now_utc() - timedelta(days=1)),
            "read_by": [guard_id],
        },
        {
            "id": str(uuid.uuid4()), "title": "Emergency Contact Drill",
            "body": "Full drill Thu 03:00. All patrol staff must acknowledge this notice by 20:00.",
            "severity": "warning", "site_id": None, "posted_by": "HQ Command",
            "posted_at": iso(now_utc() - timedelta(hours=8)),
            "read_by": [],
        },
    ]
    await db.announcements.insert_many(announcements)

    # Payroll periods
    payroll_periods = []
    for i in range(4):
        period_end = today - timedelta(days=i * 14)
        period_start = period_end - timedelta(days=13)
        stages = ["paid", "released", "under_review", "submitted"]
        payroll_periods.append({
            "id": str(uuid.uuid4()),
            "user_id": guard_id,
            "period_start": iso(period_start),
            "period_end": iso(period_end),
            "pay_date": iso(period_end + timedelta(days=5)),
            "hours_regular": 76.5 - i * 2,
            "hours_overtime": 4.0 if i == 0 else 0.0,
            "gross": (76.5 - i * 2) * 24.5 + (98 if i == 0 else 0),
            "net": ((76.5 - i * 2) * 24.5 + (98 if i == 0 else 0)) * 0.72,
            "status": stages[i],
            "pay_stub_url": None,
        })
    await db.payroll.insert_many(payroll_periods)

    # Wallet documents
    wallet_docs = [
        {"id": str(uuid.uuid4()), "user_id": guard_id, "type": "security_licence",
         "name": "Ontario Security Guard Licence", "number": "SG-ON-89442",
         "expiry": iso(now_utc() + timedelta(days=42)), "status": "expiring_soon"},
        {"id": str(uuid.uuid4()), "user_id": guard_id, "type": "company_id",
         "name": "Skyhawk Company ID", "number": "SH-2041",
         "expiry": iso(now_utc() + timedelta(days=800)), "status": "valid"},
        {"id": str(uuid.uuid4()), "user_id": guard_id, "type": "first_aid",
         "name": "First Aid & CPR", "number": "FA-2024-88112",
         "expiry": iso(now_utc() + timedelta(days=210)), "status": "valid"},
        {"id": str(uuid.uuid4()), "user_id": guard_id, "type": "smart_serve",
         "name": "Smart Serve Ontario", "number": "SS-2025-4421",
         "expiry": iso(now_utc() + timedelta(days=500)), "status": "valid"},
        {"id": str(uuid.uuid4()), "user_id": guard_id, "type": "whmis",
         "name": "WHMIS 2015", "number": "WH-2025-9012",
         "expiry": iso(now_utc() + timedelta(days=300)), "status": "valid"},
        {"id": str(uuid.uuid4()), "user_id": guard_id, "type": "work_permit",
         "name": "Work Permit", "number": "WP-CA-88214",
         "expiry": iso(now_utc() + timedelta(days=900)), "status": "valid"},
    ]
    await db.wallet_documents.insert_many(wallet_docs)

    # Equipment assigned
    await db.equipment.insert_many([
        {"id": str(uuid.uuid4()), "user_id": guard_id, "type": "uniform",
         "description": "Winter Jacket XL / Trousers 34", "issued_at": iso(now_utc() - timedelta(days=180)), "status": "issued"},
        {"id": str(uuid.uuid4()), "user_id": guard_id, "type": "radio",
         "description": "Motorola CP200d #R-4412", "issued_at": iso(now_utc() - timedelta(days=90)), "status": "issued"},
        {"id": str(uuid.uuid4()), "user_id": guard_id, "type": "keys",
         "description": "Master keyring #K-88 (Bay St)", "issued_at": iso(now_utc() - timedelta(days=60)), "status": "issued"},
    ])

    logger.info("Seed complete.")


# ============================================================
# AUTH
# ============================================================
@api.get("/")
async def root():
    return {"service": "Skyhawk Ops API", "status": "online"}


@api.post("/auth/register", response_model=AuthOut)
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": body.email.lower(),
        "hashed_password": hash_password(body.password),
        "full_name": body.full_name,
        "phone": body.phone,
        "role": "employee",
        "employee_number": f"SH-{str(uuid.uuid4())[:4].upper()}",
        "licence_number": None,
        "licence_expiry": None,
        "certifications": [],
        "employment_status": "Onboarding",
        "photo_url": None,
        "emergency_contact": None,
        "onboarding_complete": False,
        "created_at": iso(now_utc()),
    }
    await db.users.insert_one(user)
    token = create_access_token(user_id, user["email"], "employee")
    user.pop("hashed_password", None)
    user.pop("_id", None)
    return {"access_token": token, "token_type": "bearer", "user": user}


@api.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    user.pop("hashed_password", None)
    user.pop("_id", None)
    return {"access_token": token, "token_type": "bearer", "user": user}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ============================================================
# DASHBOARD
# ============================================================
@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    now = now_utc()
    uid = user["id"]

    # Today's shift
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    today_shift = await db.shifts.find_one(
        {"user_id": uid, "start": {"$gte": iso(today_start), "$lt": iso(today_end)}},
        {"_id": 0},
    )
    if today_shift:
        site = await db.sites.find_one({"id": today_shift["site_id"]}, {"_id": 0})
        today_shift["site"] = site

    # Next shift
    next_shift = await db.shifts.find_one(
        {"user_id": uid, "start": {"$gte": iso(now)}, "status": "scheduled"},
        {"_id": 0},
        sort=[("start", 1)],
    )
    if next_shift:
        site = await db.sites.find_one({"id": next_shift["site_id"]}, {"_id": 0})
        next_shift["site"] = site

    # Active clock-in
    active_clock = await db.timeclock.find_one(
        {"user_id": uid, "clock_out": None}, {"_id": 0, "selfie_in": 0, "selfie_out": 0}
    )

    # Announcements (unread)
    unread_ann = await db.announcements.count_documents({"read_by": {"$ne": uid}})

    # Latest payroll status
    latest_payroll = await db.payroll.find_one(
        {"user_id": uid}, {"_id": 0}, sort=[("period_end", -1)]
    )

    # Licence expiry
    licence_days_remaining = None
    if user.get("licence_expiry"):
        expiry = datetime.fromisoformat(user["licence_expiry"].replace("Z", "+00:00"))
        licence_days_remaining = (expiry - now).days

    return {
        "today_shift": today_shift,
        "next_shift": next_shift,
        "active_clock": active_clock,
        "unread_announcements": unread_ann,
        "latest_payroll": latest_payroll,
        "licence_days_remaining": licence_days_remaining,
        "emergency_contacts": [
            {"name": "HQ Dispatch", "phone": "+1 416 555 0000"},
            {"name": "911 Emergency", "phone": "911"},
            {"name": "Site Supervisor", "phone": (today_shift or {}).get("site", {}).get("supervisor_phone")},
        ],
    }


# ============================================================
# SCHEDULE
# ============================================================
@api.get("/schedule")
async def schedule(
    user=Depends(get_current_user),
    range: str = Query("week"),  # week|month
):
    now = now_utc()
    if range == "month":
        start = now - timedelta(days=15)
        end = now + timedelta(days=30)
    else:
        weekday = now.weekday()
        start = (now - timedelta(days=weekday)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
    shifts = await db.shifts.find(
        {"user_id": user["id"], "start": {"$gte": iso(start), "$lt": iso(end)}},
        {"_id": 0},
    ).sort("start", 1).to_list(200)
    site_ids = list({s["site_id"] for s in shifts})
    sites = {s["id"]: s for s in await db.sites.find({"id": {"$in": site_ids}}, {"_id": 0}).to_list(50)}
    for s in shifts:
        s["site"] = sites.get(s["site_id"])
    return {"shifts": shifts, "range_start": iso(start), "range_end": iso(end)}


@api.get("/shifts/{shift_id}")
async def get_shift(shift_id: str, user=Depends(get_current_user)):
    s = await db.shifts.find_one({"id": shift_id, "user_id": user["id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Shift not found")
    s["site"] = await db.sites.find_one({"id": s["site_id"]}, {"_id": 0})
    return s


@api.post("/shifts/{shift_id}/acknowledge-instructions")
async def acknowledge_instructions(shift_id: str, user=Depends(get_current_user)):
    r = await db.shifts.update_one(
        {"id": shift_id, "user_id": user["id"]},
        {"$set": {"instructions_acknowledged": True, "instructions_acknowledged_at": iso(now_utc())}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Shift not found")
    return {"acknowledged": True}


# ============================================================
# OPEN SHIFTS
# ============================================================
@api.get("/open-shifts")
async def list_open_shifts(
    user=Depends(get_current_user),
    site_id: Optional[str] = None,
    from_date: Optional[str] = None,
):
    q = {}
    if site_id:
        q["site_id"] = site_id
    if from_date:
        q["start"] = {"$gte": from_date}
    shifts = await db.open_shifts.find(q, {"_id": 0}).sort("start", 1).to_list(100)
    site_ids = list({s["site_id"] for s in shifts})
    sites = {s["id"]: s for s in await db.sites.find({"id": {"$in": site_ids}}, {"_id": 0}).to_list(50)}
    for s in shifts:
        s["site"] = sites.get(s["site_id"])
        s["already_claimed"] = user["id"] in (s.get("claimed_by") or [])
        s["on_waitlist"] = user["id"] in (s.get("waitlist") or [])
    return {"shifts": shifts}


@api.post("/open-shifts/{shift_id}/claim")
async def claim_shift(shift_id: str, user=Depends(get_current_user)):
    s = await db.open_shifts.find_one({"id": shift_id})
    if not s:
        raise HTTPException(404, "Shift not found")
    claimed = s.get("claimed_by") or []
    if user["id"] in claimed:
        raise HTTPException(400, "Already claimed")
    if len(claimed) >= s["spots_available"]:
        # Add to waitlist
        await db.open_shifts.update_one({"id": shift_id}, {"$addToSet": {"waitlist": user["id"]}})
        return {"status": "waitlisted"}
    await db.open_shifts.update_one({"id": shift_id}, {"$addToSet": {"claimed_by": user["id"]}})
    # Create a scheduled shift for the user
    new_shift = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "site_id": s["site_id"],
        "start": s["start"], "end": s["end"], "role": s["role"],
        "pay_rate": s["pay_rate"], "status": "scheduled",
        "claimed_from_open": shift_id,
        "instructions_acknowledged": False,
    }
    await db.shifts.insert_one(new_shift)
    await send_push([user["id"]], {"title": "Shift Claimed", "message": f"You claimed {s['role']} on {s['start'][:10]}"})
    return {"status": "claimed", "shift_id": new_shift["id"]}


@api.post("/open-shifts/{shift_id}/cancel-claim")
async def cancel_claim(shift_id: str, user=Depends(get_current_user)):
    await db.open_shifts.update_one({"id": shift_id}, {"$pull": {"claimed_by": user["id"], "waitlist": user["id"]}})
    await db.shifts.delete_one({"user_id": user["id"], "claimed_from_open": shift_id})
    return {"status": "cancelled"}


@api.get("/my-claims")
async def my_claims(user=Depends(get_current_user)):
    shifts = await db.shifts.find(
        {"user_id": user["id"], "claimed_from_open": {"$exists": True}},
        {"_id": 0},
    ).sort("start", -1).to_list(50)
    return {"claims": shifts}


# ============================================================
# TIME CLOCK
# ============================================================
def haversine_m(lat1, lon1, lat2, lon2):
    import math
    R = 6371000
    p1 = math.radians(lat1); p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1); dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))


@api.get("/timeclock/status")
async def timeclock_status(user=Depends(get_current_user)):
    active = await db.timeclock.find_one({"user_id": user["id"], "clock_out": None}, {"_id": 0, "selfie_in": 0, "selfie_out": 0})
    return {"active": active}


@api.post("/timeclock/clock-in")
async def clock_in(body: ClockInIn, user=Depends(get_current_user)):
    existing = await db.timeclock.find_one({"user_id": user["id"], "clock_out": None})
    if existing:
        raise HTTPException(400, "Already clocked in. Clock out first.")

    site = None
    geofence_ok = True
    distance_m = None
    if body.site_id:
        site = await db.sites.find_one({"id": body.site_id}, {"_id": 0})
    elif body.shift_id:
        sh = await db.shifts.find_one({"id": body.shift_id})
        if sh:
            site = await db.sites.find_one({"id": sh["site_id"]}, {"_id": 0})

    if site:
        distance_m = haversine_m(body.latitude, body.longitude, site["latitude"], site["longitude"])
        geofence_ok = distance_m <= site.get("geofence_radius_m", 200)

    entry = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "shift_id": body.shift_id,
        "site_id": site["id"] if site else None,
        "clock_in": iso(now_utc()),
        "clock_in_lat": body.latitude,
        "clock_in_lng": body.longitude,
        "selfie_in": body.selfie_base64,
        "geofence_ok": geofence_ok,
        "geofence_distance_m": distance_m,
        "clock_out": None,
        "breaks": [],
        "hours_worked": None,
    }
    await db.timeclock.insert_one(entry)
    entry.pop("selfie_in", None)
    entry.pop("_id", None)
    return {"entry": entry, "geofence_ok": geofence_ok, "distance_m": distance_m}


@api.post("/timeclock/clock-out")
async def clock_out(body: ClockOutIn, user=Depends(get_current_user)):
    active = await db.timeclock.find_one({"user_id": user["id"], "clock_out": None})
    if not active:
        raise HTTPException(400, "Not currently clocked in")
    clock_out_dt = now_utc()
    clock_in_dt = datetime.fromisoformat(active["clock_in"].replace("Z", "+00:00"))
    total_seconds = (clock_out_dt - clock_in_dt).total_seconds()
    # Subtract break minutes
    break_seconds = 0
    for br in active.get("breaks", []):
        if br.get("end"):
            b_start = datetime.fromisoformat(br["start"].replace("Z", "+00:00"))
            b_end = datetime.fromisoformat(br["end"].replace("Z", "+00:00"))
            break_seconds += (b_end - b_start).total_seconds()
    hours = round(max(0, total_seconds - break_seconds) / 3600, 2)
    await db.timeclock.update_one(
        {"id": active["id"]},
        {"$set": {
            "clock_out": iso(clock_out_dt),
            "clock_out_lat": body.latitude,
            "clock_out_lng": body.longitude,
            "selfie_out": body.selfie_base64,
            "hours_worked": hours,
        }},
    )
    return {"hours_worked": hours}


@api.post("/timeclock/break")
async def break_action(body: BreakIn, user=Depends(get_current_user)):
    active = await db.timeclock.find_one({"user_id": user["id"], "clock_out": None})
    if not active:
        raise HTTPException(400, "Not currently clocked in")
    breaks = active.get("breaks", [])
    if body.action == "start":
        if breaks and not breaks[-1].get("end"):
            raise HTTPException(400, "Already on break")
        breaks.append({"start": iso(now_utc()), "end": None})
    elif body.action == "end":
        if not breaks or breaks[-1].get("end"):
            raise HTTPException(400, "Not on break")
        breaks[-1]["end"] = iso(now_utc())
    else:
        raise HTTPException(400, "Invalid action")
    await db.timeclock.update_one({"id": active["id"]}, {"$set": {"breaks": breaks}})
    return {"breaks": breaks}


@api.get("/timeclock/history")
async def timeclock_history(user=Depends(get_current_user), limit: int = 20):
    entries = await db.timeclock.find(
        {"user_id": user["id"]},
        {"_id": 0, "selfie_in": 0, "selfie_out": 0},
    ).sort("clock_in", -1).to_list(limit)
    return {"entries": entries}


# ============================================================
# WALLET
# ============================================================
@api.get("/wallet")
async def wallet(user=Depends(get_current_user)):
    docs = await db.wallet_documents.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    qr_payload = f"SKYHAWK|{user['employee_number']}|{user['id']}"
    return {
        "documents": docs,
        "employee": {
            "id": user["id"],
            "full_name": user["full_name"],
            "employee_number": user.get("employee_number"),
            "photo_url": user.get("photo_url"),
            "role": user["role"],
            "licence_number": user.get("licence_number"),
            "employment_status": user.get("employment_status"),
        },
        "qr_payload": qr_payload,
    }


# ============================================================
# ANNOUNCEMENTS
# ============================================================
@api.get("/announcements")
async def announcements(user=Depends(get_current_user)):
    items = await db.announcements.find({}, {"_id": 0}).sort("posted_at", -1).to_list(50)
    for a in items:
        a["read"] = user["id"] in (a.get("read_by") or [])
        a["read_count"] = len(a.get("read_by") or [])
    return {"announcements": items}


@api.post("/announcements/{ann_id}/acknowledge")
async def ack_announcement(ann_id: str, user=Depends(get_current_user)):
    r = await db.announcements.update_one(
        {"id": ann_id}, {"$addToSet": {"read_by": user["id"]}}
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Announcement not found")
    return {"acknowledged": True}


# ============================================================
# INCIDENTS
# ============================================================
@api.post("/incidents")
async def create_incident(body: IncidentIn, user=Depends(get_current_user)):
    inc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["full_name"],
        "type": body.type,
        "site_id": body.site_id,
        "description": body.description,
        "severity": body.severity,
        "witness_name": body.witness_name,
        "witness_contact": body.witness_contact,
        "photos": body.photos,
        "signature_base64": body.signature_base64,
        "status": "submitted",
        "created_at": iso(now_utc()),
    }
    await db.incidents.insert_one(inc)
    inc.pop("_id", None)
    inc.pop("photos", None)
    inc.pop("signature_base64", None)
    return inc


@api.get("/incidents")
async def list_incidents(user=Depends(get_current_user)):
    items = await db.incidents.find(
        {"user_id": user["id"]},
        {"_id": 0, "photos": 0, "signature_base64": 0},
    ).sort("created_at", -1).to_list(50)
    return {"incidents": items}


# ============================================================
# PAYROLL
# ============================================================
@api.get("/payroll")
async def payroll(user=Depends(get_current_user)):
    periods = await db.payroll.find({"user_id": user["id"]}, {"_id": 0}).sort("period_end", -1).to_list(20)
    current = periods[0] if periods else None
    total_hours = sum(p.get("hours_regular", 0) + p.get("hours_overtime", 0) for p in periods)
    total_gross = sum(p.get("gross", 0) for p in periods)
    return {"periods": periods, "current": current, "total_hours": total_hours, "total_gross": total_gross}


# ============================================================
# PROFILE
# ============================================================
@api.get("/profile")
async def profile(user=Depends(get_current_user)):
    equipment = await db.equipment.find({"user_id": user["id"]}, {"_id": 0}).to_list(20)
    return {"user": user, "equipment": equipment}


# ============================================================
# ONBOARDING
# ============================================================
@api.get("/onboarding/status")
async def onboarding_status(user=Depends(get_current_user)):
    ob = await db.onboarding.find_one({"user_id": user["id"]}, {"_id": 0})
    if not ob:
        ob = {
            "user_id": user["id"],
            "documents_uploaded": user.get("onboarding_complete", False),
            "sin_submitted": user.get("onboarding_complete", False),
            "direct_deposit_submitted": user.get("onboarding_complete", False),
            "emergency_contact_added": bool(user.get("emergency_contact")),
            "agreements_signed": user.get("onboarding_complete", False),
            "training_complete": user.get("onboarding_complete", False),
        }
    completed = sum(1 for v in ob.values() if v is True)
    total = 6
    return {"status": ob, "completed": completed, "total": total, "percent": int(completed / total * 100)}


# ============================================================
# PUSH NOTIFICATIONS
# ============================================================
@api.post("/register-push", status_code=201)
async def register_push(body: RegisterPushIn):
    try:
        resp = await push_client.post("/api/v1/push/users/register", json=body.model_dump())
        if resp.status_code == 401:
            # Placeholder key - store locally
            await db.push_tokens.update_one(
                {"user_id": body.user_id, "device_token": body.device_token},
                {"$set": body.model_dump()},
                upsert=True,
            )
            return {"status": "registered_local"}
        if resp.status_code >= 500:
            raise HTTPException(502, "Push provider unavailable")
        resp.raise_for_status()
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Push register fallback: {e}")
        await db.push_tokens.update_one(
            {"user_id": body.user_id, "device_token": body.device_token},
            {"$set": body.model_dump()},
            upsert=True,
        )
    return {"status": "registered"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
