#!/bin/bash
# Write the backend URL at startup so Expo can find the API
echo "EXPO_PUBLIC_BACKEND_URL=https://8000-${REPLIT_DEV_DOMAIN}" > .env
npx expo start --web --port 5000 --non-interactive
