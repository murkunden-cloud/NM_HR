# Pune Zone Transferee Management System (PZTMS)

Vacancy & transferee tracker for Pune Zone offices.
**Stack**: React 19 + FastAPI + MongoDB.

---

## 🚀 Run Locally

### Prerequisites
| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org |
| Yarn | latest | `npm install -g yarn` |
| MongoDB | 6.0+ | https://www.mongodb.com/try/download/community |

> **Tip — easiest MongoDB option:** create a free MongoDB Atlas cluster at https://cloud.mongodb.com and use its connection string. No local install needed.

---

### 1) Backend (FastAPI on port 8001)

```bash
cd backend

# create a virtual environment
python -m venv venv

# activate it
# macOS / Linux:
source venv/bin/activate
# Windows (PowerShell):
venv\Scripts\Activate.ps1
# Windows (cmd):
venv\Scripts\activate.bat

# install dependencies
pip install -r requirements.txt
```

Edit `backend/.env` and set the values:

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="pune_zone_db"
CORS_ORIGINS="*"
JWT_SECRET="<paste any random 64-char hex string>"
ADMIN_CPFNO="2266083"
ADMIN_PASSWORD="PuneAdmin@123"
ADMIN_NAME="Nagesh D.M (Head Clerk)"
VIEWER_CPFNO="1000000"
VIEWER_PASSWORD="viewer123"
VIEWER_NAME="Default Viewer"
```

Start the backend:

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

On first start, the backend automatically:
- creates the `pune_zone_db` database
- seeds the admin (CPFNO `2266083`) + viewer (CPFNO `1000000`) users
- loads all 2291 location-designation rows from `backend/PZ5b9.xlsx`

You should see:
```
INFO:pz:Seeded admin 2266083
INFO:pz:Seeded viewer 1000000
INFO:pz:Seeded 2291 locations from PZ5b9.xlsx
```

Test the API: open http://localhost:8001/docs in a browser → Swagger UI.

---

### 2) Frontend (React on port 3000)

Open a **new terminal**:

```bash
cd frontend
yarn install
```

Edit `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
```

Start the frontend:

```bash
yarn start
```

Your browser will open http://localhost:3000 automatically.

---

## 🔐 Login

| Role | CPFNO | Password | Access |
|------|-------|----------|--------|
| **Admin** | `2266083` | `PuneAdmin@123` | Everything: edit Sanctioned/Filled, manage users, audit log, bulk uploads |
| **Viewer** | `1000000` | `viewer123` | Transfer IN/OUT + view only (3-month auto-expiry) |

> After your first admin login, go to **Users** in the navigation and change the admin password.

---

## 📂 Project Structure

```
/
├── backend/
│   ├── server.py              # FastAPI app: auth, locations, transfers, employees, orders, users, audit, PDF
│   ├── requirements.txt
│   ├── .env                   # MongoDB URL, JWT secret, admin/viewer credentials
│   └── PZ5b9.xlsx             # Seed data (2291 location-designation rows)
└── frontend/
    ├── package.json
    ├── .env                   # REACT_APP_BACKEND_URL
    └── src/
        ├── App.js             # Routes + Protected wrapper
        ├── context/
        │   └── AuthContext.js # JWT/cookie auth state
        ├── lib/
        │   └── api.js         # axios instance with Bearer token
        ├── pages/
        │   ├── Login.js
        │   ├── Vacancy.js     # Main dashboard (filters, KPIs, ledger, pool, out)
        │   ├── Employees.js
        │   ├── TransferOrders.js
        │   ├── Users.js       # admin-only
        │   └── Audit.js       # admin-only
        └── components/
            ├── Layout.js      # Header / nav / footer
            └── ui/            # shadcn primitives
```

---

## ✨ Features

- **Vacancy Ledger** — 2291 locations, KPI cards (Sanctioned / Active Filled / Incoming Pool / Outbound / Net Vacancy), cascading filters (Cadre → Class I/II/III/IV → Circle → Division → Designation)
- **Zone Pool IN** — add headcount to pool, then deploy to a specific office (decrements pool)
- **Out of Zone** — record per-location outbound transfers
- **Sanctioned/Filled override** — admin-only (pencil icon next to each row)
- **Employees register** — CRUD + bulk Excel upload + search
- **Transfer Orders** — issue & track individual transfer orders (IN/OUT, order no, date, employee, from→to)
- **User management** — admin can create viewer users with custom expiry (default 90 days), primary admin protected from deletion
- **Audit log** — every mutation recorded with user, action, detail, timestamp
- **PDF report** — filtered vacancy report download
- **Replace base Excel** — admin can re-upload `PZ5b9.xlsx` to refresh the baseline

---

## 🐛 Troubleshooting

**Mongo connection error**
```
pymongo.errors.ServerSelectionTimeoutError
```
→ Make sure MongoDB is running (`mongod` service / `brew services start mongodb-community` / Atlas connection string is reachable).

**Port already in use**
```bash
# kill anything on port 8001 / 3000
# macOS/Linux:
lsof -ti:8001 | xargs kill -9
# Windows:
netstat -ano | findstr :8001
taskkill /PID <pid> /F
```

**Frontend can't reach backend**
- Make sure `REACT_APP_BACKEND_URL` in `frontend/.env` matches the backend address (default `http://localhost:8001`).
- Restart `yarn start` after editing `.env`.

**Reset everything**
```bash
# in mongo shell
use pune_zone_db
db.dropDatabase()
```
Restart the backend → it re-seeds users + locations from the Excel file.

---

## 🛠 Make a Production Build

```bash
cd frontend
yarn build
# output in frontend/build — serve with any static host (nginx, vercel, netlify, etc.)
```

For the backend, run via gunicorn:
```bash
pip install gunicorn
gunicorn server:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001 --workers 4
```

---

Designed & Managed by **Nagesh D.M. (Head Clerk)** — Pune Zone.
