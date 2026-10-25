#!/usr/bin/env bash
set -euo pipefail

scope=${1:?scope is required}
cache_path=${2:?cache path is required}
primary_key=${3:?primary key is required}
matched_key=${4:-}
exact_hit=${5:-false}
summary=${GITHUB_STEP_SUMMARY:-}

if [[ "$cache_path" != /* || "$cache_path" == / ]]; then
  echo 'Invalid build cache path' >&2
  exit 2
fi

if [[ -n "$matched_key" ]]; then
  result='prefix restore'
  [[ "$exact_hit" == true ]] && result='exact hit'
else
  result='miss'
  matched_key='None'
fi

size_bytes=0
size_display='0 B'
if [[ -d "$cache_path" ]]; then
  size_kib=$(du -sk "$cache_path" | awk '{print $1}')
  size_bytes=$((size_kib * 1024))
  size_display=$(du -sh "$cache_path" | awk '{print $1}')
fi

printf 'Docker build cache (%s): %s, %s (%s bytes)\n' "$scope" "$result" "$size_display" "$size_bytes"

if [[ -n "$summary" ]]; then
  {
    echo '### Docker build cache'
    echo
    echo '| Scope | Result | Requested key | Restored key | Cache size | Bytes |'
    echo '| --- | --- | --- | --- | ---: | ---: |'
    printf '| %s | %s | `%s` | `%s` | %s | %s |\n' \
      "$scope" "$result" "$primary_key" "$matched_key" "$size_display" "$size_bytes"
  } >> "$summary"
fi
