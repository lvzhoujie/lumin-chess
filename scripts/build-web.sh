#!/usr/bin/env bash
# Bundle the web version for static-or-PHP hosting (e.g. Bluehost public_html).
# Output: web-deploy/{index.html, leaderboard.php, README.md}
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p web-deploy
cp index.html web-deploy/index.html
cp leaderboard.php web-deploy/leaderboard.php
# .htaccess is hand-curated inside web-deploy/ — keep it intact across builds.
if [[ ! -f web-deploy/.htaccess ]]; then
  echo "✕ web-deploy/.htaccess missing — restore from version control before deploying."
  exit 1
fi

echo "✓ Web bundle ready at $ROOT/web-deploy/"
echo "  Upload web-deploy/index.html and web-deploy/leaderboard.php to your host."
echo "  See web-deploy/README.md for Bluehost-specific notes."
