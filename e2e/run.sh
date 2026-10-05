#!/usr/bin/env bash
# Runs the Playwright tests headless against a running Catnasta stack.
#   BASE_URL  frontend URL (default http://localhost:3000)
#   API_URL   API URL used to set up opponents (default http://localhost:5001)
# Extra arguments are passed to `playwright test`, e.g. ./e2e/run.sh auth
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  pnpm install --frozen-lockfile
fi
# Downloads Chromium the first time; a no-op once it's there.
pnpm exec playwright install chromium >/dev/null

exec pnpm exec playwright test "$@"
