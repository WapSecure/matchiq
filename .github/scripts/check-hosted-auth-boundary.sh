#!/usr/bin/env bash
set -euo pipefail

if (($#)); then
  paths=("$@")
else
  paths=()
  while IFS= read -r path; do
    paths+=("$path")
  done < <(find infra -type f ! -path 'infra/keycloak/*' -print)
  while IFS= read -r path; do
    paths+=("$path")
  done < <(find .github/workflows -type f \( -name 'deploy*.yml' -o -name 'deploy*.yaml' \) -print)
fi

if ((${#paths[@]} == 0)); then
  echo 'No hosted deployment configuration found' >&2
  exit 2
fi

patterns=(
  'matchiq-dev-only'
  'infra/keycloak/matchiq-realm.json'
  'localhost:8180/realms/matchiq'
  'keycloak:8080/realms/matchiq'
)

failed=0
for pattern in "${patterns[@]}"; do
  if matches=$(grep -IFn -- "$pattern" "${paths[@]}"); then
    printf 'Hosted configuration references local authentication material:\n%s\n' "$matches" >&2
    failed=1
  fi
done

if ((failed)); then
  exit 1
fi

echo 'Hosted authentication boundary: local realm is not referenced'
