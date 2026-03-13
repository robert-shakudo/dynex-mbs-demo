#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

npm install --legacy-peer-deps

# Build with empty API URL — all /api calls are proxied through the same origin
VITE_API_URL="" npm run build

# Express proxy server: serves SPA static files + proxies /api/* to backend (no CORS)
node proxy-server.js
