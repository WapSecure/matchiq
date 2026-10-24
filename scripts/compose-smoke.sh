#!/usr/bin/env bash
set -euo pipefail

docker compose --profile app exec -T api node --input-type=module \
  < scripts/compose-smoke.mjs
