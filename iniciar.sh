#!/bin/bash
cd "$(dirname "$0")"
npm install --no-audit --no-fund
(sleep 2; xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null) &
node server.js
