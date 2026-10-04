#!/usr/bin/env bash
# मराठी शिका (Marathi Tutor) — clone & run with: ./start.sh
# First run installs deps + builds automatically. Ctrl+C to stop.
set -u
APP="$(cd "$(dirname "$0")" && pwd)"
WEB="$APP/web"
DIST="$WEB/dist"

free_port() {
  python3 - "$1" <<'EOF'
import socket,sys
start=int(sys.argv[1])
for p in range(start,start+20):
    s=socket.socket()
    try:
        s.bind(('127.0.0.1',p)); print(p); break
    except OSError:
        continue
    finally:
        try: s.close()
        except OSError: pass
EOF
}

# --- prerequisites ---
command -v python3 >/dev/null 2>&1 || { echo "Need python3 on PATH."; exit 1; }
if [ ! -d "$WEB/node_modules" ]; then
  command -v npm >/dev/null 2>&1 || { echo "Need Node 18+ (npm) on PATH: https://nodejs.org/"; exit 1; }
  echo "Installing dependencies (first run only)…"
  (cd "$WEB" && npm install) || exit 1
fi
if [ ! -f "$DIST/index.html" ] || [ "${1:-}" = "--rebuild" ]; then
  command -v npm >/dev/null 2>&1 || { echo "Need Node 18+ (npm) on PATH: https://nodejs.org/"; exit 1; }
  echo "Building…"
  (cd "$WEB" && npm run build) || exit 1
fi

PORT="${PORT:-$(free_port 8080)}"
cd "$DIST" || { echo "Missing $DIST"; exit 1; }
URL="http://localhost:$PORT/"
echo "मराठी शिका → $URL"
echo "Press Ctrl+C to stop."
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1; xdg-open "$URL" >/dev/null 2>&1 &)
elif command -v open >/dev/null 2>&1; then
  (sleep 1; open "$URL" >/dev/null 2>&1 &)
fi
exec python3 -m http.server "$PORT"
