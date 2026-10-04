#!/usr/bin/env bash
# Runs the Maestro web flows headless against a running Catnasta stack.
#   BASE_URL  frontend URL (default http://localhost:3000)
#   API_URL   API URL used to set up opponents (default http://localhost:5001)
# Extra arguments are passed to `maestro test`, e.g. ./e2e/run.sh e2e/flows/02-auth.yaml
set -euo pipefail

cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:5001}"

targets=("$@")
if [ ${#targets[@]} -eq 0 ]; then
  targets=(e2e)
fi

exec maestro test \
  --headless \
  --platform web \
  --screen-size "${SCREEN_SIZE:-1440x900}" \
  -e BASE_URL="$BASE_URL" \
  -e API_URL="$API_URL" \
  "${targets[@]}"
