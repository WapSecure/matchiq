#!/usr/bin/env bash
# Installs a pinned Trivy release into $RUNNER_TEMP/bin after verifying its SHA-256.
# The release binary is used instead of a wrapper action so nothing mutable runs
# in CI; bump TRIVY_VERSION and TRIVY_SHA256 together.
set -euo pipefail
TRIVY_VERSION=0.75.0
TRIVY_SHA256=c6e65abddb348e25f10549df887045629cf28cc72453cd1c63acb717316b3f3f
archive="trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz"
bin_dir="${RUNNER_TEMP:?}/bin"
mkdir -p "$bin_dir"
curl -sSfL -o "$RUNNER_TEMP/$archive" \
  "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/${archive}"
echo "${TRIVY_SHA256}  $RUNNER_TEMP/$archive" | sha256sum --check --strict
tar -xzf "$RUNNER_TEMP/$archive" -C "$bin_dir" trivy
echo "$bin_dir" >> "$GITHUB_PATH"
"$bin_dir/trivy" --version
