#!/usr/bin/env bash
# ============================================
# PZTMS - macOS / Linux Installer
# ============================================
set -e

echo ""
echo "===================================================="
echo "  Pune Zone Transferee Management System - Installer"
echo "===================================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed."
    echo "Install with: brew install python  (mac)  |  sudo apt install python3 python3-venv (linux)"
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Install from https://nodejs.org or:"
    echo "  brew install node              (mac)"
    echo "  sudo apt install nodejs npm    (linux)"
    exit 1
fi

# Yarn
if ! command -v yarn &> /dev/null; then
    echo "Installing yarn globally..."
    npm install -g yarn
fi

# MongoDB check
if ! command -v mongod &> /dev/null; then
    echo ""
    echo "[WARNING] MongoDB does not appear to be installed."
    echo "Install with:"
    echo "  brew tap mongodb/brew && brew install mongodb-community  (mac)"
    echo "  sudo apt install mongodb                                 (linux)"
    echo ""
    echo "Then start it with:"
    echo "  brew services start mongodb-community  (mac)"
    echo "  sudo systemctl start mongod            (linux)"
    echo ""
    echo "OR edit backend/.env MONGO_URL to point at a MongoDB Atlas cloud cluster."
    echo ""
    read -p "Press Enter to continue anyway..."
fi

echo ""
echo "[1/3] Installing backend (Python) dependencies..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..

echo ""
echo "[2/3] Installing frontend (Node) dependencies..."
cd frontend
yarn install
cd ..

echo ""
echo "[3/3] Configuring environment files..."
if [ ! -f "frontend/.env" ]; then
cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
ENABLE_HEALTH_CHECK=false
EOF
fi

chmod +x START_APP.sh STOP_APP.sh 2>/dev/null || true

echo ""
echo "===================================================="
echo "  INSTALLATION COMPLETE!"
echo "===================================================="
echo ""
echo "To start the app, run:"
echo "  ./START_APP.sh"
echo ""
echo "Then open http://localhost:3000 in your browser."
echo ""
echo "Login:"
echo "  Admin  - CPFNO: 2266083  Password: PuneAdmin@123"
echo "  Viewer - CPFNO: 1000000  Password: viewer123"
echo ""
