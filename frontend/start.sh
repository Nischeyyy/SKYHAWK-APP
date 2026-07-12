#!/bin/bash
# Set the full public URL so API calls work from Expo Go on a real device
echo "EXPO_PUBLIC_BACKEND_URL=https://${REPLIT_DEV_DOMAIN}" > .env

# Tell Metro to advertise itself at the Replit Expo domain.
# Expo Go will connect to: exp://REPLIT_EXPO_DEV_DOMAIN
export REACT_NATIVE_PACKAGER_HOSTNAME="${REPLIT_EXPO_DEV_DOMAIN}"

# Start without CI=1 so the QR code and hot-reload work
npx expo start --port 8080
