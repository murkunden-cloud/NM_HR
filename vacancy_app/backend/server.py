from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import jwt
import json
import bcrypt
import sqlite3
import logging
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# ───────── DB (SQLite — single file, no install) ─────────
DB_PATH = os.environ.get("SQLITE_PATH") or str(ROOT_DIR / "pune_zone.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

DB = get_db()
DB_LOCK = __import__("threading").Lock()

def exec_sql(sql, params=()):
    with DB_LOCK:
        cur = DB.execute(sql, params)
        DB.commit()
        return cur

def query_all(sql, params=()):
    with DB_LOCK:
        cur = DB.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]

def query_one(sql, params=()):
    with DB_LOCK:
        cur = DB.execute(sql, params)
        r = cur.fetchone()
        return dict(r) if r else None

JWT_ALG = "HS256"
JWT_SECRET = os.environ['JWT_SECRET']

app = FastAPI(title="Pune Zone Transferee Management System")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("pz")

# ───────── Schema ─────────
def init_schema():
    DB.executescript("""
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpfno TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      REGION TEXT, ZONE TEXT, CIRCLE TEXT, DIVISION TEXT, SUBDIVISION TEXT,
      ORGNAME TEXT, CADRE TEXT, PAYGROUP TEXT, TYPE TEXT, DESIGNATION TEXT,
      SANCTIONED INTEGER DEFAULT 0, FILLED_IN INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_loc_org_des ON locations(ORGNAME, DESIGNATION);
    CREATE TABLE IF NOT EXISTS transfers_out (
      key TEXT PRIMARY KEY,
      orgname TEXT, designation TEXT, count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS transfers_in_pool (
      designation TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS transfers_in_deployed (
      key TEXT PRIMARY KEY,
      orgname TEXT, designation TEXT, count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, cpfno TEXT UNIQUE, doj TEXT, designation TEXT,
      orgname TEXT, circle TEXT, division TEXT, paygroup TEXT, remarks TEXT,
      created_at TEXT,
      original_orgname TEXT
    );
    CREATE TABLE IF NOT EXISTS transfer_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT, order_date TEXT, type TEXT,
      employee_name TEXT, employee_cpfno TEXT, designation TEXT,
      from_loc TEXT, to_loc TEXT, remarks TEXT,
      created_by TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_cpfno TEXT, user_name TEXT, action TEXT, detail TEXT, ts TEXT
    );
    CREATE TABLE IF NOT EXISTS master_employees (
      cpfno TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      designation TEXT,
      office TEXT,
      division TEXT,
      circle TEXT,
      zone TEXT,
      remarks TEXT
    );
    CREATE TABLE IF NOT EXISTS location_mappings (
      unmatched_orgname TEXT PRIMARY KEY,
      target_orgname TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    """)
    DB.commit()

    # Migration for existing databases that might not have original_orgname column
    try:
        DB.execute("ALTER TABLE employees ADD COLUMN original_orgname TEXT")
        DB.commit()
    except sqlite3.OperationalError:
        pass  # Column already exists

# ───────── Helpers ─────────
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_pw(p: str, h: str) -> bool:
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except Exception: return False

def make_token(uid: int, cpfno: str, role: str) -> str:
    return jwt.encode({
        "sub": str(uid), "cpfno": cpfno, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12), "type": "access"
    }, JWT_SECRET, algorithm=JWT_ALG)

def loc_key(orgname: str, designation: str) -> str:
    return f"{(orgname or '').strip()}_{(designation or '').strip()}".upper()

def get_mapped_orgname(orgname: str) -> tuple[str, str, str]:
    if not orgname or not orgname.strip():
        return None, None, None
    org_clean = orgname.strip()
    mapping = query_one("SELECT target_orgname FROM location_mappings WHERE UPPER(TRIM(unmatched_orgname)) = UPPER(TRIM(?))", (org_clean,))
    if mapping:
        target_name = mapping["target_orgname"]
        target_details = query_one("SELECT CIRCLE, DIVISION FROM locations WHERE ORGNAME = ? LIMIT 1", (target_name,))
        if target_details:
            return target_name, target_details["CIRCLE"], target_details["DIVISION"]
        return target_name, None, None
    return org_clean, None, None

def paygroup_to_class(pg) -> str:
    mp = {"1": "Class-I", "2": "Class-II", "3": "Class-III", "4": "Class-IV"}
    return mp.get(str(pg).strip(), "Unclassified")

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        # We only validate signature and expiration. We don't query the sqlite DB since Next.js manages users now.
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = {
            "id": str(payload.get("sub")),
            "role": payload.get("role", "employee")
        }
        return user
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError: raise HTTPException(401, "Invalid token")

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    role = user.get("role", "").lower()
    if "admin" not in role:
        raise HTTPException(403, "Admin only")
    return user

def log_audit(user: dict, action: str, detail: str):
    exec_sql("INSERT INTO audit_log (user_cpfno, user_name, action, detail, ts) VALUES (?,?,?,?,?)",
             (user.get("cpfno"), user.get("name"), action, detail, now_iso()))

# ───────── Pydantic ─────────
class LoginIn(BaseModel):
    cpfno: str; password: str

class UserCreate(BaseModel):
    cpfno: str; password: str; name: str
    role: str = "viewer"
    expires_in_days: Optional[int] = 90

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    expires_in_days: Optional[int] = None
    active: Optional[bool] = None

class TransferOutIn(BaseModel):
    orgname: str; designation: str; count: int

class TransferPoolIn(BaseModel):
    designation: str; count: int

class TransferDeployIn(BaseModel):
    designation: str; orgname: str; count: int = 1

class LocationAdjust(BaseModel):
    orgname: str; designation: str
    sanctioned: Optional[int] = None
    filled_in: Optional[int] = None

class ChangeLocationIn(BaseModel):
    orgname: str

class ResolveUnmatchedIn(BaseModel):
    unmatched_orgname: str
    target_orgname: str

class EmployeeIn(BaseModel):
    name: str; cpfno: str
    doj: Optional[str] = None
    designation: str
    orgname: Optional[str] = None
    circle: Optional[str] = None
    division: Optional[str] = None
    paygroup: Optional[str] = None
    remarks: Optional[str] = None

class TransferOrderIn(BaseModel):
    order_no: str; order_date: str; type: str
    employee_name: str
    employee_cpfno: Optional[str] = None
    designation: str
    from_loc: Optional[str] = None
    to_loc: Optional[str] = None
    remarks: Optional[str] = None

# ───────── Auth ─────────
@api.post("/auth/login")
def login(body: LoginIn, response: Response):
    user = query_one("SELECT * FROM users WHERE cpfno = ?", (body.cpfno.strip(),))
    if not user or not verify_pw(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid CPFNO or password")
    if user.get("active") == 0:
        raise HTTPException(403, "Account disabled")
    if user.get("expires_at"):
        exp = datetime.fromisoformat(user["expires_at"])
        now = datetime.now(timezone.utc)
        exp_aware = exp if exp.tzinfo else exp.replace(tzinfo=timezone.utc)
        if exp_aware < now:
            raise HTTPException(403, "Your 3-month access period has ended. Contact admin.")
    token = make_token(user["id"], user["cpfno"], user["role"])
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax", max_age=12*3600, path="/")
    return {
        "id": str(user["id"]), "cpfno": user["cpfno"], "name": user["name"],
        "role": user["role"], "expires_at": user.get("expires_at"), "token": token
    }

@api.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
def me(user: dict = Depends(get_current_user)):
    return user

@api.get("/master-employees/search")
def search_master_employees(q: str, user: dict = Depends(get_current_user)):
    like = f"%{q.strip()}%"
    rows = query_all("SELECT * FROM master_employees WHERE cpfno LIKE ? OR name LIKE ? LIMIT 50", (like, like))
    return rows

@api.get("/locations/staff")
def get_location_staff(orgname: str, designation: str, user: dict = Depends(get_current_user)):
    rows = query_all("SELECT id, name, cpfno, doj, remarks, original_orgname FROM employees WHERE UPPER(TRIM(orgname)) = UPPER(TRIM(?)) AND UPPER(TRIM(designation)) = UPPER(TRIM(?)) ORDER BY name",
                     (orgname.strip(), designation.strip()))
    for r in rows:
        r["id"] = str(r["id"])
    return rows

# ───────── User Mgmt ─────────
@api.get("/users")
def list_users(_: dict = Depends(require_admin)):
    rows = query_all("SELECT id, cpfno, name, role, active, expires_at, created_at FROM users ORDER BY role DESC, cpfno")
    for r in rows:
        r["id"] = str(r["id"]); r["active"] = bool(r["active"])
    return rows

@api.post("/users")
def create_user(body: UserCreate, admin: dict = Depends(require_admin)):
    if query_one("SELECT id FROM users WHERE cpfno = ?", (body.cpfno,)):
        raise HTTPException(400, "CPFNO already exists")
    expires_at = None
    if body.role != "admin" and body.expires_in_days:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)).isoformat()
    role = body.role if body.role in ("admin", "viewer") else "viewer"
    cur = exec_sql("INSERT INTO users (cpfno, name, role, password_hash, active, expires_at, created_at) VALUES (?,?,?,?,1,?,?)",
                   (body.cpfno.strip(), body.name.strip(), role, hash_pw(body.password), expires_at, now_iso()))
    log_audit(admin, "CREATE_USER", f"{body.cpfno} ({role})")
    return {"id": str(cur.lastrowid), "cpfno": body.cpfno, "name": body.name, "role": role, "expires_at": expires_at, "active": True}

@api.put("/users/{uid}")
def update_user(uid: str, body: UserUpdate, admin: dict = Depends(require_admin)):
    sets, params = [], []
    if body.name is not None: sets.append("name = ?"); params.append(body.name)
    if body.role in ("admin", "viewer"): sets.append("role = ?"); params.append(body.role)
    if body.password: sets.append("password_hash = ?"); params.append(hash_pw(body.password))
    if body.active is not None: sets.append("active = ?"); params.append(1 if body.active else 0)
    if body.expires_in_days is not None:
        sets.append("expires_at = ?"); params.append((datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)).isoformat())
    if sets:
        params.append(int(uid))
        exec_sql(f"UPDATE users SET {', '.join(sets)} WHERE id = ?", params)
    log_audit(admin, "UPDATE_USER", f"{uid}: {[s.split(' ')[0] for s in sets]}")
    return {"ok": True}

@api.delete("/users/{uid}")
def del_user(uid: str, admin: dict = Depends(require_admin)):
    u = query_one("SELECT cpfno FROM users WHERE id = ?", (int(uid),))
    if u and u["cpfno"] == os.environ.get("ADMIN_CPFNO"):
        raise HTTPException(400, "Cannot delete the primary admin")
    exec_sql("DELETE FROM users WHERE id = ?", (int(uid),))
    log_audit(admin, "DELETE_USER", uid)
    return {"ok": True}

# ───────── Locations / Vacancy ─────────
def _compose_location(d: dict) -> dict:
    key = loc_key(d.get("ORGNAME"), d.get("DESIGNATION"))
    t_out = query_one("SELECT count FROM transfers_out WHERE key = ?", (key,))
    t_in = query_one("SELECT count FROM transfers_in_deployed WHERE key = ?", (key,))
    sanc = int(d.get("SANCTIONED") or 0)
    base = int(d.get("FILLED_IN") or 0)
    out_c = int(t_out["count"]) if t_out else 0
    in_c = int(t_in["count"]) if t_in else 0
    active = base - out_c + in_c
    d.pop("id", None)
    d["CLASS"] = paygroup_to_class(d.get("PAYGROUP"))
    d["KEY"] = key
    d["OUT_COUNT"] = out_c
    d["IN_COUNT"] = in_c
    d["ACTIVE_FILLED"] = active
    d["NET_VACANCY"] = sanc - active
    return d

@api.get("/locations")
def list_locations(user: dict = Depends(get_current_user)):
    docs = query_all("SELECT * FROM locations")
    loc_map = {}
    composed = []
    for d in docs:
        item = _compose_location(d)
        loc_map[item["KEY"]] = item
        composed.append(item)
        
    t_out = query_all("SELECT orgname, designation, count FROM transfers_out WHERE count > 0")
    t_in = query_all("SELECT orgname, designation, count FROM transfers_in_deployed WHERE count > 0")
    
    extra_keys = {}
    for item in t_out:
        k = loc_key(item["orgname"], item["designation"])
        if k not in loc_map:
            extra_keys[k] = (item["orgname"], item["designation"])
    for item in t_in:
        k = loc_key(item["orgname"], item["designation"])
        if k not in loc_map:
            extra_keys[k] = (item["orgname"], item["designation"])
            
    if extra_keys:
        org_templates = {r["ORGNAME"]: r for r in docs if r["ORGNAME"]}
        des_templates = {r["DESIGNATION"]: r for r in docs if r["DESIGNATION"]}
        
        for k, (org, des) in extra_keys.items():
            org_tmpl = org_templates.get(org, {})
            des_tmpl = des_templates.get(des, {})
            
            v_loc = {
                "REGION": org_tmpl.get("REGION"),
                "ZONE": org_tmpl.get("ZONE"),
                "CIRCLE": org_tmpl.get("CIRCLE") or org_tmpl.get("ORGNAME"),
                "DIVISION": org_tmpl.get("DIVISION"),
                "SUBDIVISION": org_tmpl.get("SUBDIVISION"),
                "ORGNAME": org,
                "CADRE": des_tmpl.get("CADRE") or "Unclassified",
                "PAYGROUP": des_tmpl.get("PAYGROUP") or "3",
                "TYPE": des_tmpl.get("TYPE") or "Technical",
                "DESIGNATION": des,
                "SANCTIONED": 0,
                "FILLED_IN": 0
            }
            composed.append(_compose_location(v_loc))
            
    return composed

@api.get("/filter-options")
def filter_options(user: dict = Depends(get_current_user)):
    docs = query_all("SELECT CADRE, PAYGROUP, CIRCLE, DIVISION, DESIGNATION, TYPE, ORGNAME FROM locations")
    def uniq(field):
        return sorted({str(d.get(field)) for d in docs if d.get(field) not in (None, "", "None")})
    return {
        "cadres": uniq("CADRE"), "paygroups": uniq("PAYGROUP"),
        "classes": ["Class-I", "Class-II", "Class-III", "Class-IV"],
        "circles": uniq("CIRCLE"), "divisions": uniq("DIVISION"),
        "designations": uniq("DESIGNATION"), "types": uniq("TYPE"),
        "orgnames": uniq("ORGNAME"),
    }

@api.put("/locations/adjust")
def adjust_location(body: LocationAdjust, admin: dict = Depends(require_admin)):
    sets, params = [], []
    if body.sanctioned is not None: sets.append("SANCTIONED = ?"); params.append(body.sanctioned)
    if body.filled_in is not None: sets.append("FILLED_IN = ?"); params.append(body.filled_in)
    if not sets: raise HTTPException(400, "Nothing to update")
    params += [body.orgname, body.designation]
    cur = exec_sql(f"UPDATE locations SET {', '.join(sets)} WHERE ORGNAME = ? AND DESIGNATION = ?", params)
    log_audit(admin, "ADJUST_LOCATION", f"{body.orgname}/{body.designation} → {sets}")
    return {"modified": cur.rowcount}

@api.get("/locations/unmatched")
def get_unmatched_locations(user: dict = Depends(get_current_user)):
    return query_all("""
        SELECT orgname, COUNT(*) as emp_count
        FROM employees
        WHERE orgname NOT IN (SELECT DISTINCT ORGNAME FROM locations WHERE ORGNAME IS NOT NULL)
          AND orgname IS NOT NULL AND orgname != ''
        GROUP BY orgname
        ORDER BY emp_count DESC
    """)

@api.post("/locations/resolve-unmatched")
def resolve_unmatched(body: ResolveUnmatchedIn, admin: dict = Depends(require_admin)):
    target = query_one("SELECT CIRCLE, DIVISION FROM locations WHERE ORGNAME = ? LIMIT 1", (body.target_orgname,))
    if not target:
        raise HTTPException(400, f"Target location '{body.target_orgname}' not found in locations table")
    
    # Save the persistent mapping rule
    exec_sql("INSERT OR REPLACE INTO location_mappings (unmatched_orgname, target_orgname, created_at) VALUES (?, ?, ?)",
             (body.unmatched_orgname, body.target_orgname, now_iso()))
    
    with DB_LOCK:
        cur = DB.execute(
            "UPDATE employees SET orgname = ?, circle = ?, division = ?, original_orgname = COALESCE(original_orgname, orgname) WHERE orgname = ?",
            (body.target_orgname, target["CIRCLE"], target["DIVISION"], body.unmatched_orgname)
        )
        DB.commit()
        updated_count = cur.rowcount
    log_audit(admin, "RESOLVE_UNMATCHED_LOC", f"Mapped '{body.unmatched_orgname}' -> '{body.target_orgname}' ({updated_count} employees)")
    return {"ok": True, "updated": updated_count}

@api.get("/locations/mappings")
def get_location_mappings(user: dict = Depends(get_current_user)):
    return query_all("SELECT unmatched_orgname, target_orgname, created_at FROM location_mappings ORDER BY created_at DESC")

@api.delete("/locations/mappings")
def delete_location_mapping(unmatched_orgname: str, admin: dict = Depends(require_admin)):
    with DB_LOCK:
        cur = DB.execute("DELETE FROM location_mappings WHERE unmatched_orgname = ?", (unmatched_orgname,))
        DB.commit()
        deleted = cur.rowcount
    log_audit(admin, "DELETE_LOCATION_MAPPING", unmatched_orgname)
    return {"ok": True, "deleted": deleted}

# ───────── Transfers ─────────
@api.delete("/transfers/reset")
def reset_transfers(admin: dict = Depends(require_admin)):
    a = exec_sql("DELETE FROM transfers_out").rowcount
    b = exec_sql("DELETE FROM transfers_in_pool").rowcount
    c = exec_sql("DELETE FROM transfers_in_deployed").rowcount
    log_audit(admin, "RESET_TRANSFERS", f"out:{a} pool:{b} deployed:{c}")
    return {"out": a, "pool": b, "deployed": c}

@api.delete("/transfers/in/pool/{designation}")
def del_pool(designation: str, admin: dict = Depends(require_admin)):
    cur = exec_sql("DELETE FROM transfers_in_pool WHERE designation = ?", (designation,))
    log_audit(admin, "POOL_DELETE", designation)
    return {"deleted": cur.rowcount}

@api.post("/transfers/out")
def add_out(body: TransferOutIn, user: dict = Depends(get_current_user)):
    key = loc_key(body.orgname, body.designation)
    cur = query_one("SELECT count FROM transfers_out WHERE key = ?", (key,))
    new_count = max(0, (cur["count"] if cur else 0) + body.count)
    exec_sql("INSERT INTO transfers_out (key, orgname, designation, count) VALUES (?,?,?,?) "
             "ON CONFLICT(key) DO UPDATE SET count=excluded.count, orgname=excluded.orgname, designation=excluded.designation",
             (key, body.orgname, body.designation, new_count))
    log_audit(user, "TRANSFER_OUT", f"{body.count} at {body.orgname}/{body.designation} → total {new_count}")
    return {"key": key, "count": new_count}

@api.put("/transfers/out")
def set_out(body: TransferOutIn, user: dict = Depends(get_current_user)):
    key = loc_key(body.orgname, body.designation)
    if body.count <= 0:
        exec_sql("DELETE FROM transfers_out WHERE key = ?", (key,))
        log_audit(user, "TRANSFER_OUT_CLEAR", key)
        return {"key": key, "count": 0}
    exec_sql("INSERT INTO transfers_out (key, orgname, designation, count) VALUES (?,?,?,?) "
             "ON CONFLICT(key) DO UPDATE SET count=excluded.count",
             (key, body.orgname, body.designation, body.count))
    log_audit(user, "TRANSFER_OUT_SET", f"{body.orgname}/{body.designation} = {body.count}")
    return {"key": key, "count": body.count}

@api.get("/transfers/out")
def list_out(user: dict = Depends(get_current_user)):
    return query_all("SELECT key, orgname, designation, count FROM transfers_out")

@api.post("/transfers/in/pool")
def add_pool(body: TransferPoolIn, user: dict = Depends(get_current_user)):
    cur = query_one("SELECT count FROM transfers_in_pool WHERE designation = ?", (body.designation,))
    new_count = max(0, (cur["count"] if cur else 0) + body.count)
    exec_sql("INSERT INTO transfers_in_pool (designation, count) VALUES (?,?) "
             "ON CONFLICT(designation) DO UPDATE SET count=excluded.count",
             (body.designation, new_count))
    log_audit(user, "POOL_ADD", f"+{body.count} {body.designation} → {new_count}")
    return {"designation": body.designation, "count": new_count}

@api.put("/transfers/in/pool")
def set_pool(body: TransferPoolIn, user: dict = Depends(get_current_user)):
    if body.count <= 0:
        exec_sql("DELETE FROM transfers_in_pool WHERE designation = ?", (body.designation,))
        return {"designation": body.designation, "count": 0}
    exec_sql("INSERT INTO transfers_in_pool (designation, count) VALUES (?,?) "
             "ON CONFLICT(designation) DO UPDATE SET count=excluded.count",
             (body.designation, body.count))
    log_audit(user, "POOL_SET", f"{body.designation} = {body.count}")
    return {"designation": body.designation, "count": body.count}

@api.get("/transfers/in/pool")
def list_pool(user: dict = Depends(get_current_user)):
    return query_all("SELECT designation, count FROM transfers_in_pool")

@api.post("/transfers/in/deploy")
def deploy(body: TransferDeployIn, user: dict = Depends(get_current_user)):
    pool = query_one("SELECT count FROM transfers_in_pool WHERE designation = ?", (body.designation,))
    avail = pool["count"] if pool else 0
    if avail < body.count:
        raise HTTPException(400, f"Pool has only {avail} for {body.designation}")
    key = loc_key(body.orgname, body.designation)
    cur = query_one("SELECT count FROM transfers_in_deployed WHERE key = ?", (key,))
    new_count = (cur["count"] if cur else 0) + body.count
    exec_sql("INSERT INTO transfers_in_deployed (key, orgname, designation, count) VALUES (?,?,?,?) "
             "ON CONFLICT(key) DO UPDATE SET count=excluded.count",
             (key, body.orgname, body.designation, new_count))
    new_pool = avail - body.count
    if new_pool <= 0:
        exec_sql("DELETE FROM transfers_in_pool WHERE designation = ?", (body.designation,))
    else:
        exec_sql("UPDATE transfers_in_pool SET count = ? WHERE designation = ?", (new_pool, body.designation))
    log_audit(user, "DEPLOY", f"{body.count} {body.designation} → {body.orgname}")
    return {"deployed_to": key, "count": new_count, "pool_remaining": new_pool}

# ───────── Employees ─────────
@api.get("/employees")
def list_employees(
    q: Optional[str] = None,
    circle: Optional[str] = None,
    division: Optional[str] = None,
    designation: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    where_clauses = []
    params = []
    if q:
        like = f"%{q.strip()}%"
        where_clauses.append("(name LIKE ? OR cpfno LIKE ? OR designation LIKE ? OR orgname LIKE ?)")
        params.extend([like, like, like, like])
    if circle and circle != "All":
        where_clauses.append("circle = ?")
        params.append(circle)
    if division and division != "All":
        where_clauses.append("division = ?")
        params.append(division)
    if designation and designation != "All":
        where_clauses.append("designation = ?")
        params.append(designation)
        
    where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    rows = query_all(f"SELECT * FROM employees {where_str} ORDER BY name LIMIT 500", params)
    for r in rows: r["id"] = str(r["id"])
    return rows

@api.post("/employees")
def create_emp(body: EmployeeIn, admin: dict = Depends(require_admin)):
    d = body.model_dump(); d["created_at"] = now_iso()
    raw_org = d.get("orgname")
    mapped_org, mapped_circle, mapped_division = get_mapped_orgname(raw_org)
    
    orgname = mapped_org or raw_org
    circle = mapped_circle or d.get("circle")
    division = mapped_division or d.get("division")
    original_orgname = raw_org

    try:
        cur = exec_sql("""INSERT INTO employees (name, cpfno, doj, designation, orgname, circle, division, paygroup, remarks, created_at, original_orgname)
                          VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                       (d["name"], d["cpfno"], d.get("doj"), d["designation"], orgname,
                        circle, division, d.get("paygroup"), d.get("remarks"), d["created_at"], original_orgname))
    except sqlite3.IntegrityError:
        raise HTTPException(400, f"Employee with CPFNO {d['cpfno']} already exists")
    log_audit(admin, "EMP_CREATE", f"{d['name']} ({d['cpfno']})")
    return {"id": str(cur.lastrowid), **d}

@api.put("/employees/{eid}")
def update_emp(eid: str, body: EmployeeIn, admin: dict = Depends(require_admin)):
    d = body.model_dump()
    raw_org = d.get("orgname")
    mapped_org, mapped_circle, mapped_division = get_mapped_orgname(raw_org)
    
    orgname = mapped_org or raw_org
    circle = mapped_circle or d.get("circle")
    division = mapped_division or d.get("division")
    original_orgname = raw_org

    exec_sql("""UPDATE employees SET name=?, cpfno=?, doj=?, designation=?, orgname=?, circle=?, division=?, paygroup=?, remarks=?, original_orgname=?
                WHERE id = ?""",
             (d["name"], d["cpfno"], d.get("doj"), d["designation"], orgname,
              circle, division, d.get("paygroup"), d.get("remarks"), original_orgname, int(eid)))
    log_audit(admin, "EMP_UPDATE", eid)
    return {"ok": True}

@api.put("/employees/{eid}/location")
def change_employee_location(eid: str, body: ChangeLocationIn, admin: dict = Depends(require_admin)):
    target = query_one("SELECT CIRCLE, DIVISION FROM locations WHERE ORGNAME = ? LIMIT 1", (body.orgname,))
    if not target:
        raise HTTPException(400, f"Target location '{body.orgname}' not found in locations table")
    with DB_LOCK:
        cur = DB.execute(
            "UPDATE employees SET orgname = ?, circle = ?, division = ?, original_orgname = COALESCE(original_orgname, orgname) WHERE id = ?",
            (body.orgname, target["CIRCLE"], target["DIVISION"], int(eid))
        )
        DB.commit()
        updated = cur.rowcount
    if updated == 0:
        raise HTTPException(404, "Employee not found")
    log_audit(admin, "CHANGE_EMP_LOC", f"ID {eid} → {body.orgname}")
    return {"ok": True}

@api.delete("/employees/{eid}")
def delete_emp(eid: str, admin: dict = Depends(require_admin)):
    exec_sql("DELETE FROM employees WHERE id = ?", (int(eid),))
    log_audit(admin, "EMP_DELETE", eid)
    return {"ok": True}

@api.post("/employees/bulk-upload")
async def bulk_upload_emp(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    raw = await file.read()
    try: df = pd.read_excel(io.BytesIO(raw))
    except Exception as e: raise HTTPException(400, f"Cannot read excel: {e}")
    df.columns = [str(c).strip().lower() for c in df.columns]
    required = {"name", "cpfno", "designation"}
    if not required.issubset(set(df.columns)):
        raise HTTPException(400, f"Excel must have columns: {required}. Got: {list(df.columns)}")
    inserted = 0
    for _, row in df.iterrows():
        name = str(row.get("name", "")).strip()
        cpfno = str(row.get("cpfno", "")).strip()
        if not name or not cpfno: continue
        d = {
            "name": name, "cpfno": cpfno,
            "doj": str(row.get("doj", "")).strip() if "doj" in df.columns else None,
            "designation": str(row.get("designation", "")).strip(),
            "orgname": str(row.get("orgname", "")).strip() if "orgname" in df.columns else None,
            "circle": str(row.get("circle", "")).strip() if "circle" in df.columns else None,
            "division": str(row.get("division", "")).strip() if "division" in df.columns else None,
            "paygroup": str(row.get("paygroup", "")).strip() if "paygroup" in df.columns else None,
            "remarks": str(row.get("remarks", "")).strip() if "remarks" in df.columns else None,
            "created_at": now_iso(),
        }
        raw_org = d.get("orgname")
        mapped_org, mapped_circle, mapped_division = get_mapped_orgname(raw_org)
        
        orgname = mapped_org or raw_org
        circle = mapped_circle or d.get("circle")
        division = mapped_division or d.get("division")
        original_orgname = raw_org

        exec_sql("""INSERT INTO employees (name, cpfno, doj, designation, orgname, circle, division, paygroup, remarks, created_at, original_orgname)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    ON CONFLICT(cpfno) DO UPDATE SET name=excluded.name, doj=excluded.doj, designation=excluded.designation,
                      orgname=excluded.orgname, circle=excluded.circle, division=excluded.division, paygroup=excluded.paygroup,
                      remarks=excluded.remarks, original_orgname=excluded.original_orgname""",
                 (d["name"], d["cpfno"], d["doj"], d["designation"], orgname,
                  circle, division, d.get("paygroup"), d.get("remarks"), d["created_at"], original_orgname))
        inserted += 1
    log_audit(admin, "EMP_BULK_UPLOAD", f"{inserted} rows")
    return {"inserted": inserted}

# ───────── Transfer Orders ─────────
@api.get("/transfer-orders")
def list_orders(user: dict = Depends(get_current_user)):
    rows = query_all("SELECT * FROM transfer_orders ORDER BY order_date DESC, id DESC")
    for r in rows: r["id"] = str(r["id"])
    return rows

@api.post("/transfer-orders")
def create_order(body: TransferOrderIn, user: dict = Depends(get_current_user)):
    d = body.model_dump(); d["created_by"] = user.get("cpfno"); d["created_at"] = now_iso()
    cur = exec_sql("""INSERT INTO transfer_orders (order_no, order_date, type, employee_name, employee_cpfno,
                       designation, from_loc, to_loc, remarks, created_by, created_at)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                   (d["order_no"], d["order_date"], d["type"], d["employee_name"], d.get("employee_cpfno"),
                    d["designation"], d.get("from_loc"), d.get("to_loc"), d.get("remarks"),
                    d["created_by"], d["created_at"]))
    log_audit(user, "ORDER_CREATE", f"{d['order_no']} ({d['type']})")
    return {"id": str(cur.lastrowid), **d}

@api.delete("/transfer-orders/{oid}")
def del_order(oid: str, admin: dict = Depends(require_admin)):
    exec_sql("DELETE FROM transfer_orders WHERE id = ?", (int(oid),))
    log_audit(admin, "ORDER_DELETE", oid)
    return {"ok": True}

# ───────── Audit ─────────
@api.get("/audit-log")
def audit_log_api(admin: dict = Depends(require_admin)):
    rows = query_all("SELECT * FROM audit_log ORDER BY id DESC LIMIT 500")
    for r in rows: r["id"] = str(r["id"])
    return rows

# ───────── Reports ─────────
@api.get("/report/pdf")
def report_pdf(
    cadre: Optional[str] = None, paygroup: Optional[str] = None, type: Optional[str] = None,
    circle: Optional[str] = None, division: Optional[str] = None, designation: Optional[str] = None,
    status: Optional[str] = None, user: dict = Depends(get_current_user)
):
    docs = query_all("SELECT * FROM locations")
    locs = [_compose_location(d) for d in docs]
    def m(d):
        if cadre and cadre != "All" and d.get("CADRE") != cadre: return False
        if paygroup and paygroup != "All" and str(d.get("PAYGROUP")) != str(paygroup): return False
        if type and type != "All" and d.get("TYPE") != type: return False
        if circle and circle != "All" and d.get("CIRCLE") != circle: return False
        if division and division != "All" and d.get("DIVISION") != division: return False
        if designation and designation != "All" and d.get("DESIGNATION") != designation: return False
        if status == "vacant" and d["NET_VACANCY"] <= 0: return False
        if status == "filled" and d["NET_VACANCY"] != 0: return False
        if status == "surplus" and d["NET_VACANCY"] >= 0: return False
        return True
    rows = [d for d in locs if m(d)]
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=20, rightMargin=20, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("<b>Pune Zone Transferee Management — Vacancy Report</b>", styles['Title']),
        Paragraph(f"Cadre: {cadre or 'All'} | Class: {paygroup or 'All'} | Type: {type or 'All'} | Circle: {circle or 'All'} | Division: {division or 'All'} | Designation: {designation or 'All'} | Status: {status or 'all'}", styles['Normal']),
        Paragraph(f"Generated: {datetime.now().strftime('%d-%b-%Y %H:%M')} by {user.get('name')} ({user.get('cpfno')})", styles['Italic']),
        Spacer(1, 10),
    ]
    headers = ["Org / Location", "Circle", "Division", "Designation", "Class", "Sanc", "Base", "OUT", "IN", "Active", "Vacancy"]
    data = [headers]
    tot = [0]*6
    for r in rows:
        s = int(r.get("SANCTIONED") or 0); f = int(r.get("FILLED_IN") or 0)
        o = r["OUT_COUNT"]; i = r["IN_COUNT"]; a = r["ACTIVE_FILLED"]; v = r["NET_VACANCY"]
        tot[0]+=s; tot[1]+=f; tot[2]+=o; tot[3]+=i; tot[4]+=a; tot[5]+=v
        data.append([r.get("ORGNAME",""), r.get("CIRCLE",""), r.get("DIVISION",""),
                     r.get("DESIGNATION",""), r.get("CLASS",""),
                     str(s), str(f), str(o), str(i), str(a), str(v)])
    data.append(["TOTAL", "", "", "", "", *[str(x) for x in tot]])
    t = Table(data, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#4F46E5")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 7),
        ('GRID', (0,0), (-1,-1), 0.25, colors.grey),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#F97316")),
        ('TEXTCOLOR', (0,-1), (-1,-1), colors.white),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('ALIGN', (5,1), (-1,-1), 'RIGHT'),
    ]))
    story.append(t)
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=PuneZone_Vacancy_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    })

@api.get("/report/excel")
def report_excel(
    cadre: Optional[str] = None, paygroup: Optional[str] = None, type: Optional[str] = None,
    circle: Optional[str] = None, division: Optional[str] = None, designation: Optional[str] = None,
    status: Optional[str] = None, user: dict = Depends(get_current_user)
):
    docs = query_all("SELECT * FROM locations")
    locs = [_compose_location(d) for d in docs]
    def m(d):
        if cadre and cadre != "All" and d.get("CADRE") != cadre: return False
        if paygroup and paygroup != "All" and str(d.get("PAYGROUP")) != str(paygroup): return False
        if type and type != "All" and d.get("TYPE") != type: return False
        if circle and circle != "All" and d.get("CIRCLE") != circle: return False
        if division and division != "All" and d.get("DIVISION") != division: return False
        if designation and designation != "All" and d.get("DESIGNATION") != designation: return False
        if status == "vacant" and d["NET_VACANCY"] <= 0: return False
        if status == "filled" and d["NET_VACANCY"] != 0: return False
        if status == "surplus" and d["NET_VACANCY"] >= 0: return False
        return True
    rows = [d for d in locs if m(d)]
    df = pd.DataFrame([{
        "Office": r.get("ORGNAME"), "Circle": r.get("CIRCLE"), "Division": r.get("DIVISION"),
        "Type": r.get("TYPE"), "Cadre": r.get("CADRE"), "Class": r.get("CLASS"),
        "Designation": r.get("DESIGNATION"),
        "Sanctioned": r.get("SANCTIONED"), "Base Filled": r.get("FILLED_IN"),
        "OUT": r["OUT_COUNT"], "IN": r["IN_COUNT"],
        "Active Filled": r["ACTIVE_FILLED"], "Net Vacancy": r["NET_VACANCY"],
        "Vacancy": f"{r['NET_VACANCY']} Vacant" if r["NET_VACANCY"] > 0 else f"{abs(r['NET_VACANCY'])} Surplus" if r["NET_VACANCY"] < 0 else "Full",
    } for r in rows])
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as w:
        (df if not df.empty else pd.DataFrame([{"info": "No data for current filters"}])).to_excel(w, sheet_name="Vacancy", index=False)
        sm = pd.DataFrame([{
            "Total Sanctioned": int(df["Sanctioned"].sum() if not df.empty else 0),
            "Total Active Filled": int(df["Active Filled"].sum() if not df.empty else 0),
            "Total OUT": int(df["OUT"].sum() if not df.empty else 0),
            "Total IN": int(df["IN"].sum() if not df.empty else 0),
            "Net Vacancy": int(df["Net Vacancy"].sum() if not df.empty else 0),
            "Total Rows": len(df),
            "Filters Applied": f"Cadre={cadre}, Class={paygroup}, Type={type}, Circle={circle}, Division={division}, Designation={designation}, Status={status}",
            "Generated By": user.get("name"),
            "Generated At": datetime.now().strftime("%d-%b-%Y %H:%M"),
        }])
        sm.T.to_excel(w, sheet_name="Summary", header=False)
    buf.seek(0)
    return StreamingResponse(buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=PuneZone_Vacancy_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"})

# ───────── Locations Bulk Excel (admin) ─────────
@api.post("/locations/bulk-upload")
async def loc_bulk_upload(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    raw = await file.read()
    df = pd.read_excel(io.BytesIO(raw))
    df.columns = [str(c).strip() for c in df.columns]
    exec_sql("DELETE FROM locations")
    for _, row in df.iterrows():
        d = row.to_dict()
        for k, v in list(d.items()):
            if isinstance(v, float) and pd.isna(v): d[k] = None
        exec_sql("""INSERT INTO locations (REGION, ZONE, CIRCLE, DIVISION, SUBDIVISION, ORGNAME,
                     CADRE, PAYGROUP, TYPE, DESIGNATION, SANCTIONED, FILLED_IN)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                 (d.get("REGION"), d.get("ZONE"), d.get("CIRCLE"), d.get("DIVISION"),
                  d.get("SUBDIVISION"), d.get("ORGNAME"), d.get("CADRE"),
                  str(d.get("PAYGROUP")) if d.get("PAYGROUP") is not None else None,
                  d.get("TYPE"), d.get("DESIGNATION"),
                  int(d.get("SANCTIONED") or 0), int(d.get("FILLED_IN") or 0)))
    log_audit(admin, "LOC_BULK_UPLOAD", f"{len(df)} rows replaced")
    return {"loaded": len(df)}

# ───────── Seed ─────────
def seed_data():
    admin_cpfno = os.environ["ADMIN_CPFNO"]
    admin_pw = os.environ["ADMIN_PASSWORD"]
    admin_name = os.environ.get("ADMIN_NAME", "Admin")
    existing = query_one("SELECT * FROM users WHERE cpfno = ?", (admin_cpfno,))
    if not existing:
        exec_sql("INSERT INTO users (cpfno, name, role, password_hash, active, created_at) VALUES (?,?,?,?,1,?)",
                 (admin_cpfno, admin_name, "admin", hash_pw(admin_pw), now_iso()))
        log.info(f"Seeded admin {admin_cpfno}")
    elif not verify_pw(admin_pw, existing.get("password_hash", "")):
        exec_sql("UPDATE users SET password_hash = ? WHERE cpfno = ?", (hash_pw(admin_pw), admin_cpfno))

    viewer_cpfno = os.environ.get("VIEWER_CPFNO")
    if viewer_cpfno and not query_one("SELECT id FROM users WHERE cpfno = ?", (viewer_cpfno,)):
        exec_sql("INSERT INTO users (cpfno, name, role, password_hash, active, expires_at, created_at) VALUES (?,?,?,?,1,?,?)",
                 (viewer_cpfno, os.environ.get("VIEWER_NAME", "Viewer"), "viewer",
                  hash_pw(os.environ["VIEWER_PASSWORD"]),
                  (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(), now_iso()))
        log.info(f"Seeded viewer {viewer_cpfno}")

    cnt = query_one("SELECT COUNT(*) AS c FROM locations")
    if cnt and cnt["c"] == 0:
        xlsx = ROOT_DIR / "PZ5b9.xlsx"
        if xlsx.exists():
            df = pd.read_excel(xlsx)
            df.columns = [str(c).strip() for c in df.columns]
            for _, row in df.iterrows():
                d = row.to_dict()
                for k, v in list(d.items()):
                    if isinstance(v, float) and pd.isna(v): d[k] = None
                exec_sql("""INSERT INTO locations (REGION, ZONE, CIRCLE, DIVISION, SUBDIVISION, ORGNAME,
                             CADRE, PAYGROUP, TYPE, DESIGNATION, SANCTIONED, FILLED_IN)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                         (d.get("REGION"), d.get("ZONE"), d.get("CIRCLE"), d.get("DIVISION"),
                          d.get("SUBDIVISION"), d.get("ORGNAME"), d.get("CADRE"),
                          str(d.get("PAYGROUP")) if d.get("PAYGROUP") is not None else None,
                          d.get("TYPE"), d.get("DESIGNATION"),
                          int(d.get("SANCTIONED") or 0), int(d.get("FILLED_IN") or 0)))
            log.info(f"Seeded {len(df)} locations from PZ5b9.xlsx")

    # Seed master_employees and employees from master_employees.xlsx
    cnt_master = query_one("SELECT COUNT(*) AS c FROM master_employees")
    cnt_emp = query_one("SELECT COUNT(*) AS c FROM employees")
    
    if (cnt_master and cnt_master["c"] == 0) or (cnt_emp and cnt_emp["c"] == 0):
        path1 = Path("d:/MYPRO/Vacancy/master_employees.xlsx")
        path2 = ROOT_DIR / "master_employees.xlsx"
        xlsx_path = None
        if path1.exists():
            xlsx_path = path1
        elif path2.exists():
            xlsx_path = path2
            
        if xlsx_path:
            log.info(f"Seeding from master_employees file: {xlsx_path}")
            try:
                df = pd.read_excel(xlsx_path)
                df.columns = [str(c).strip() for c in df.columns]
                
                # 1. Seed master_employees table if empty
                if cnt_master and cnt_master["c"] == 0:
                    df_unique = df.drop_duplicates(subset=["CPFNO"])
                    with DB_LOCK:
                        cur = DB.cursor()
                        for _, row in df_unique.iterrows():
                            cpf = str(row.get("CPFNO", "")).strip()
                            if not cpf or cpf.lower() == "nan":
                                continue
                            name = str(row.get("EmployeeName", "")).strip()
                            des = str(row.get("Designation", "")).strip() if pd.notna(row.get("Designation")) else None
                            office = str(row.get("PresentOffice", "")).strip() if pd.notna(row.get("PresentOffice")) else None
                            div = str(row.get("presentDivision", "")).strip() if pd.notna(row.get("presentDivision")) else None
                            circle = str(row.get("PresentCircle", "")).strip() if pd.notna(row.get("PresentCircle")) else None
                            zone = str(row.get("PresentZone", "")).strip() if pd.notna(row.get("PresentZone")) else None
                            rem = str(row.get("Remarks", "")).strip() if pd.notna(row.get("Remarks")) else None
                            
                            cur.execute("""INSERT OR REPLACE INTO master_employees (cpfno, name, designation, office, division, circle, zone, remarks)
                                           VALUES (?,?,?,?,?,?,?,?)""", (cpf, name, des, office, div, circle, zone, rem))
                        DB.commit()
                    log.info("Seeded master_employees successfully")
                
                # 2. Seed active employees table if empty (only those in Pune Zone)
                if cnt_emp and cnt_emp["c"] == 0:
                    # Map designation to paygroup from locations table
                    pg_rows = query_all("SELECT DISTINCT DESIGNATION, PAYGROUP FROM locations WHERE DESIGNATION IS NOT NULL AND PAYGROUP IS NOT NULL")
                    des_pg_map = {r["DESIGNATION"].strip().upper(): str(r["PAYGROUP"]) for r in pg_rows}
                    
                    inserted = 0
                    with DB_LOCK:
                        cur = DB.cursor()
                        for _, row in df.iterrows():
                            # Only Pune Zone employees
                            zone = str(row.get("PresentZone", "")).strip()
                            if zone.upper() != "PUNE ZONE":
                                continue
                            cpf = str(row.get("CPFNO", "")).strip()
                            if not cpf or cpf.lower() == "nan":
                                continue
                            name = str(row.get("EmployeeName", "")).strip()
                            des = str(row.get("Designation", "")).strip() if pd.notna(row.get("Designation")) else ""
                            office = str(row.get("PresentOffice", "")).strip() if pd.notna(row.get("PresentOffice")) else ""
                            div = str(row.get("presentDivision", "")).strip() if pd.notna(row.get("presentDivision")) else ""
                            circle = str(row.get("PresentCircle", "")).strip() if pd.notna(row.get("PresentCircle")) else ""
                            remarks = str(row.get("Remarks", "")).strip() if pd.notna(row.get("Remarks")) else ""
                            
                            pg = des_pg_map.get(des.strip().upper(), "3")
                            
                            try:
                                cur.execute("""INSERT OR REPLACE INTO employees (name, cpfno, doj, designation, orgname, circle, division, paygroup, remarks, created_at)
                                               VALUES (?,?,?,?,?,?,?,?,?,?)""",
                                            (name, cpf, None, des, office, circle, div, pg, remarks, now_iso()))
                                inserted += 1
                            except sqlite3.IntegrityError:
                                pass
                        DB.commit()
                    log.info(f"Seeded {inserted} active employees in Pune Zone successfully")
                    
            except Exception as e:
                log.error(f"Error seeding from master_employees file: {e}")


@app.on_event("startup")
def startup():
    init_schema()
    seed_data()

app.include_router(api)

# Serve compiled frontend (production mode) — single-port single-URL deployment
FRONTEND_BUILD = ROOT_DIR.parent / "frontend" / "build"
if FRONTEND_BUILD.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    # All non-API GET requests fall through to React's index.html (SPA routing)
    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        candidate = FRONTEND_BUILD / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_BUILD / "index.html")

    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD / "static")), name="static")
    log.info(f"Serving compiled frontend from {FRONTEND_BUILD}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
