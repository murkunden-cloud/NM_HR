# PZHR Web - Intranet Deployment Guide

This guide will help you deploy the PZHR Web application on your local Intranet, allowing employees to access it from their mobile phones or other PCs by typing `http://hr.punezone.com` (if DNS is configured) or `http://<YOUR_SERVER_IP>:3001`.

## 1. Running the Production Build

You can now start the server in **Production Mode** instead of Development Mode. Production mode is significantly faster and more stable.

1. Double-click `start_prod.bat`.
2. This script will automatically build the Next.js app and start both the Vacancy Backend and the Next.js Main Server.

## 2. Windows Firewall Configuration

By default, Windows blocks incoming connections. To allow other devices on the same Wi-Fi/Intranet to access the application, you must open port 3001.

1. Open the Start Menu and search for **Windows Defender Firewall with Advanced Security**.
2. Click **Inbound Rules** on the left panel.
3. Click **New Rule...** on the right panel.
4. Select **Port** and click Next.
5. Select **TCP** and Specific local ports: `3001, 4002`. Click Next.
6. Select **Allow the connection**. Click Next.
7. Apply to Domain, Private, and Public. Click Next.
8. Name it **PZHR Web Ports (3001, 4002)** and Finish.

## 3. Persistent Background Service (Optional but Recommended)

If you want the application to start automatically when the computer turns on (without needing to keep the command prompt window open), you should use **PM2** (Process Manager).

### Setup PM2:
1. Open PowerShell as Administrator.
2. Run `npm install -g pm2`
3. Run `pm2 install pm2-windows-service`
4. CD into your directory: `cd D:\MYPRO\pzhr_web`
5. Run `pm2 start npm --name "pzhr_web" -- start`
6. Run `pm2 save`

*Note: For the python backend, you can create a second PM2 process or run it as a standard Windows service using NSSM.*

## 4. Setting up custom Domain (`hr.punezone.com`)

To access the server using `http://hr.punezone.com` instead of the IP address, you have two options depending on your Intranet setup:

### Option A: Intranet DNS Server (Recommended for Office)
If your office uses a central DNS server or a managed router:
1. Log into your router or DNS Server administration panel.
2. Add a new **A Record** or **Static DNS Entry**.
3. Set the Hostname to `hr.punezone.com` and point the IP address to the IPv4 address of the PC hosting the application.
4. Employees can now type `hr.punezone.com:3001` on their devices.

### Option B: Local Hosts File (For testing on specific PCs)
If you only want specific PCs to access it via the domain name:
1. Open Notepad as **Administrator**.
2. File > Open > `C:\Windows\System32\drivers\etc\hosts`.
3. Add this line at the bottom: `<YOUR_SERVER_IP> hr.punezone.com` (e.g. `192.168.1.100 hr.punezone.com`).
4. Save the file.
5. You can now access the app via `http://hr.punezone.com:3001` on that PC.
