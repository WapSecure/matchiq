#!/usr/bin/env bash
set -euo pipefail

if (($#)); then
  paths=("$@")
else
  paths=(
    infra/azure
    infra/vps
    .github/workflows/deploy-azure.yml
  )
fi

patterns=(
  'matchiq-dev-only'
  'infra/keycloak/matchiq-realm.json'
  'localhost:8180/realms/matchiq'
  'keycloak:8080/realms/matchiq'
)

failed=0
for pattern in "${patterns[@]}"; do
  if matches=$(grep -RFn -- "$pattern" "${paths[@]}"); then
    printf 'Hosted configuration references local authentication material:\n%s\n' "$matches" >&2
    failed=1
  fi
done

if ((failed)); then
  exit 1
fi

echo 'Hosted authentication boundary: local realm is not referenced'
