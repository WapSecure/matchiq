#!/usr/bin/env bash
set -euo pipefail

app=${1:?app is required}
image=${2:?image is required}
dockerfile=${3:?dockerfile is required}
context=${4:?context is required}
shift 4

cache_root=${DOCKER_BUILD_CACHE_DIR:?DOCKER_BUILD_CACHE_DIR is required}
if [[ ! "$app" =~ ^[a-z0-9-]+$ || "$cache_root" != /* || "$cache_root" == / ]]; then
  echo 'Invalid build cache path or application name' >&2
  exit 2
fi

cache_dir="$cache_root/$app"
next_cache_dir="$cache_root/$app-new"
build_args=(
  --file "$dockerfile"
  --tag "$image"
  --load
  --cache-to "type=local,dest=$next_cache_dir,mode=max"
)

if [[ -f "$cache_dir/index.json" ]]; then
  build_args+=(--cache-from "type=local,src=$cache_dir")
fi

rm -rf "$next_cache_dir"
docker buildx build "${build_args[@]}" "$@" "$context"
rm -rf "$cache_dir"
mv "$next_cache_dir" "$cache_dir"
docker image ls "$image" --format '{{.Repository}}:{{.Tag}} {{.Size}}'
