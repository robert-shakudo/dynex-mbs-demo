#!/bin/bash
set -e
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

npm install --legacy-peer-deps

# Build with empty API URL — all /api calls are proxied through nginx on the same origin
VITE_API_URL="" npm run build

# nginx config: serve SPA + proxy /api/* to backend via internal cluster URL (no CORS)
cat > /tmp/nginx.conf << 'NGINXEOF'
events { worker_processes 1; }
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  server {
    listen 8787;
    location /api/ {
      proxy_pass http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_read_timeout 120s;
    }
    location /health {
      proxy_pass http://hyperplane-service-f49ba0.hyperplane-pipelines.svc.cluster.local:8787;
    }
    location / {
      root /app/dist;
      try_files $uri $uri/ /index.html;
      add_header Cache-Control "no-cache";
    }
  }
}
NGINXEOF

mkdir -p /app && cp -r dist /app/dist
nginx -c /tmp/nginx.conf -g "daemon off;"
