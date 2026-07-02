#!/usr/bin/env bash
# ============================================
# PZTMS - macOS / Linux Start Script
# ============================================
set -e

echo ""
echo "Starting Pune Zone Transferee Management System..."
echo ""

# Kill anything already on these ports
( lsof -ti:8001 | xargs kill -9 2>/dev/null ) || true
( lsof -ti:3000 | xargs kill -9 2>/dev/null ) || true

# Start backend
cd backend
source venv/bin/activate
nohup uvicorn server:app --host 0.0.0.0 --port 8001 --reload > ../backend.log 2>&1 &
BACK_PID=$!
echo $BACK_PID > ../.backend.pid
deactivate
cd ..

# Start frontend
cd frontend
nohup yarn start > ../frontend.log 2>&1 &
FRONT_PID=$!
echo $FRONT_PID > ../.frontend.pid
cd ..

echo ""
echo "===================================================="
echo "  PZTMS is running"
echo "===================================================="
echo ""
echo "Backend:  http://localhost:8001    (PID $BACK_PID)"
echo "Frontend: http://localhost:3000    (PID $FRONT_PID)"
echo ""
echo "Logs:"
echo "  tail -f backend.log"
echo "  tail -f frontend.log"
echo ""
echo "To stop:  ./STOP_APP.sh"
echo ""
echo "Login:"
echo "  Admin  - CPFNO: 2266083  Password: PuneAdmin@123"
echo "  Viewer - CPFNO: 1000000  Password: viewer123"
echo ""

# Wait and open browser
sleep 12
if command -v open &> /dev/null; then
    open http://localhost:3000   # mac
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000   # linux
fi
