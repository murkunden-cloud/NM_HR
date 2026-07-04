# PZHR Web - Complete Deployment Guide

## 🚀 Three Easy Deployment Options

Choose the option that best fits your needs!

---

## Option 1: Deploy to Vercel (Quickest & Easiest - Recommended)

Vercel is the easiest way to deploy Next.js apps - perfect for PZHR!

### Step 1: Prepare your GitHub/GitLab/Bitbucket Repository
1. Push your code to GitHub/GitLab/Bitbucket
2. Make sure your repository is accessible

### Step 2: Sign Up for Vercel
- Go to: https://vercel.com
- Sign up with your GitHub/GitLab/Bitbucket account

### Step 3: Import Your Project
1. Click "Add New Project"
2. Import your repository from GitHub/GitLab/Bitbucket
3. Configure:
   - **Project Name**: Choose a unique name (e.g., `pzhr-web`)
   - **Framework Preset**: `Next.js` (auto-detected!)
   - **Root Directory**: Leave as default (`.`)

### Step 4: Set Up Environment Variables
In the "Environment Variables" section, add:
- `DATABASE_URL` = Your PostgreSQL database connection string (see below)
- `NODE_ENV` = `production`

### Step 5: Deploy!
Click "Deploy" and wait ~2-3 minutes! You'll get a public URL like:
`https://pzhr-web.vercel.app`

---

## Option 2: Deploy to Render (Great for PostgreSQL + NodeJS)

### Step 1: Sign Up for Render
https://render.com

### Step 2: Create PostgreSQL Database
1. Go to "New" → "PostgreSQL"
2. Name: `pzhr-db`
3. Click "Create Database"
4. Copy the `DATABASE_URL` from the "Connections" tab

### Step 3: Deploy Web Service
1. New → "Web Service"
2. Connect your repository
3. Settings:
   - **Name**: `pzhr-web`
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variable: `DATABASE_URL` (from Step 2)
5. Click "Create Web Service"

---

## Option 3: Local Network Deployment (For Internal Use Only)

If you only need access within your local network:

### 1. Get Your Local IP
```powershell
ipconfig
# Look for "IPv4 Address" (usually starts with 192.168.x.x)
```

### 2. Update `start_prod.bat`
Make sure it has:
```
next start -H 0.0.0.0 -p 3001
```

### 3. Open Firewall (Windows)
1. Windows Defender Firewall → Advanced Settings
2. Inbound Rules → New Rule → Port
3. TCP, Specific local ports: `3001`
4. Allow the connection

### 4. Access from Other Devices
Connect to your IP: `http://192.168.X.X:3001`

---

## 📦 Database Setup

### Option A: Supabase (Free PostgreSQL)
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Database Settings
4. Copy the `Connection String` (URI)
5. Add `pgbouncer=true` to the end for connection pooling!

### Option B: Neon (Free PostgreSQL)
1. Sign up at https://neon.tech
2. Create a project
3. Copy the database URL

### Option C: Railway (Free Tier Available)
https://railway.app

---

## 📱 Mobile Access

Once deployed, your app is automatically mobile-friendly!
- Works on all devices: smartphones, tablets, laptops
- Responsive design included
- Accessible from anywhere in the world!

---

## 🔒 Important Security Notes

1. **Never commit `.env` files to git** - always use environment variables on the hosting provider
2. **Change default admin passwords immediately** on first login
3. **For production**, always use HTTPS (Vercel, Render, etc., handle this automatically!)

---

## 📞 Need Help?

Check the README.md file for more details!
