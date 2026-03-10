#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
npm install --legacy-peer-deps
VITE_API_URL=https://dynex-mbs-api.dev.hyperplane.dev npm run build
npx serve -s dist -l 8787
