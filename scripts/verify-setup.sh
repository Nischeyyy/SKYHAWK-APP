#!/usr/bin/env bash
# Verify the Skyhawk Security Operations app is running correctly on Replit.
# Run this after starting both workflows to confirm everything is healthy.

set -e

echo "=== Skyhawk Setup Verification ==="

# 1. Backend health check
echo ""
echo "1. Backend API (port 8000)..."
HEALTH=$(curl -sf http://localhost:8000/api/health 2>/dev/null || echo '{"status":"error"}')
echo "   Response: $HEALTH"
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   ✓ Backend is up and database is connected"
else
  echo "   ✗ Backend is not healthy — check 'Backend API' workflow logs"
  exit 1
fi

# 2. Frontend / proxy check
echo ""
echo "2. Frontend proxy (port 5000)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ 2>/dev/null || echo "000")
echo "   HTTP status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✓ Frontend proxy is up"
else
  echo "   ✗ Frontend is not responding — check 'Start application' workflow logs"
  exit 1
fi

echo ""
echo "=== All checks passed. App is running. ==="
echo "   Demo guard:   guard@skyhawk.com / Password123"
echo "   Demo manager: admin@skyhawk.com  / Admin123"
