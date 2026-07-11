#!/bin/bash
# Use relative URLs so API calls go through the port-5000 proxy
echo "EXPO_PUBLIC_BACKEND_URL=" > .env
# Start expo web on port 8080 (proxied from 5000 via proxy.js)
CI=1 npx expo start --web --port 8080
