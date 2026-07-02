# 🚀 Pune Zone Transferee Management System

## ⚡ SINGLE FILE TO RUN — Just double-click ONE thing

### Windows
1. Make sure you have **Python** (https://python.org/downloads) and **Node.js** (https://nodejs.org) installed.
2. Double-click **`RUN_ME_FIRST.bat`** — that's it.
   - First time: it installs everything (~10 min)
   - After that: it just starts the app and opens the browser
3. Login at http://localhost:3000 → CPFNO `2266083` / Password `PuneAdmin@123`

To stop the app: double-click **`STOP_APP.bat`**.

### Mac / Linux
```bash
chmod +x INSTALL_MAC_LINUX.sh START_APP.sh STOP_APP.sh
./INSTALL_MAC_LINUX.sh
./START_APP.sh
```

---

## 💾 Your data lives in ONE file

`backend\pune_zone.db` — that's the entire database.
- **Backup**: copy this file to a USB drive.
- **Move to another PC**: copy the WHOLE folder including `pune_zone.db`.
- **Reset everything**: delete `pune_zone.db` → restart the app → fresh data from `PZ5b9.xlsx`.

---

## 🔐 Login

| Role | CPFNO | Password |
|------|-------|----------|
| Admin | `2266083` | `PuneAdmin@123` |
| Viewer | `1000000` | `viewer123` |

Change the admin password from inside the app: **Users page** → click your row → Edit → set a new password.

---

## 🆘 Troubleshooting

**"Python is not recognized"** → re-install Python and tick "Add Python to PATH".

**Login screen says "Failed"** → make sure the backend started. After `RUN_ME_FIRST.bat`, wait 30 seconds before clicking Sign in. If still failing, open Command Prompt and run:
```
curl http://localhost:8001/api/auth/me
```
If you see `{"detail":"Not authenticated"}` → backend is running, refresh your browser (Ctrl+F5).
If you see `Failed to connect` → backend didn't start. Run `STOP_APP.bat` then `RUN_ME_FIRST.bat` again.

**Port already in use** → run `STOP_APP.bat` first.

---

Designed by **Nagesh D.M.** · Head Clerk · Pune Zone, MSEDCL.
