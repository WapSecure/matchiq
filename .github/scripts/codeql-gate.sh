#!/usr/bin/env bash
# usage: codeql-gate.sh <sarif-dir>
# Fails when CodeQL reports an unsuppressed result whose rule has
# security-severity >= 7.0 (high or critical). Lower severities stay visible
# in code scanning without blocking the merge.
set -euo pipefail
findings=$(jq -r --argjson t 7.0 '
  .runs[]
  | ([.tool.driver.rules[]?, .tool.extensions[]?.rules[]?]
      | map({key: .id, value: ((.properties["security-severity"] // "0") | tonumber)})
      | from_entries) as $sev
  | .results[]?
  | select((.suppressions // []) | length == 0)
  | select(($sev[.ruleId] // 0) >= $t)
  | "::error file=\(.locations[0].physicalLocation.artifactLocation.uri // "unknown"),line=\(.locations[0].physicalLocation.region.startLine // 1)::\(.ruleId): \(.message.text | split("\n")[0])"
' "$1"/*.sarif)
if [ -n "$findings" ]; then
  printf '%s\n' "$findings"
  echo "::error::CodeQL found $(printf '%s\n' "$findings" | wc -l | tr -d ' ') high or critical result(s)"
  exit 1
fi
echo "CodeQL: no high or critical results"
