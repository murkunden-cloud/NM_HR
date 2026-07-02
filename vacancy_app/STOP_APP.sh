#!/usr/bin/env bash
# Stop PZTMS servers
if [ -f .backend.pid ]; then
    kill $(cat .backend.pid) 2>/dev/null && echo "Backend stopped."
    rm .backend.pid
fi
if [ -f .frontend.pid ]; then
    kill $(cat .frontend.pid) 2>/dev/null && echo "Frontend stopped."
    rm .frontend.pid
fi
# fallback
( lsof -ti:8001 | xargs kill -9 2>/dev/null ) || true
( lsof -ti:3000 | xargs kill -9 2>/dev/null ) || true
echo "Done."
