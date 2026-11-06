#!/usr/bin/env bash
# Build the web app and upload it to the server.
# Usage: ./deploy-web.sh [--dry-run]   (--dry-run lists what would change, uploads nothing)
#
# Settings come from the environment or .env.deploy (ignored by git):
#   DEPLOY_TARGET=user@host:/path/to/2du/build/web   required, rsync destination
#   DEPLOY_URL=https://2du.example.com               optional, checks the live build afterwards
set -euo pipefail
cd -- "$(dirname -- "$0")"

dry_run=()
if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=(--dry-run --itemize-changes)
elif [[ $# -gt 0 ]]; then
  echo "Usage: ./deploy-web.sh [--dry-run]" >&2
  exit 2
fi

if [[ -f .env.deploy ]]; then
  # shellcheck disable=SC1091
  source .env.deploy
fi
if [[ -z "${DEPLOY_TARGET:-}" ]]; then
  echo "Set DEPLOY_TARGET, e.g. in .env.deploy: DEPLOY_TARGET=user@host:/path/to/2du/build/web" >&2
  exit 1
fi
# The upload deletes whatever is not in the build, so refuse top-level or relative paths.
if [[ ! "${DEPLOY_TARGET#*:}" =~ ^/[^/]+/[^/]+ ]]; then
  echo "DEPLOY_TARGET needs an absolute path to a dedicated web directory: $DEPLOY_TARGET" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Warning: uncommitted changes will be included in this build." >&2
fi

bun run build:web

# Pages and sw.js go last: they point at the hashed bundles, which must already be there.
rsync -az "${dry_run[@]}" --exclude='*.html' --exclude='/sw.js' build/web/ "${DEPLOY_TARGET%/}/"
rsync -az "${dry_run[@]}" --delete-delay build/web/ "${DEPLOY_TARGET%/}/"

if [[ ${#dry_run[@]} -gt 0 ]]; then
  echo "Dry run: nothing was uploaded."
  exit 0
fi

version="$(grep -o '"version":"[0-9a-f]*"' build/web/sw.js)"
echo "Uploaded build $version"
if [[ -n "${DEPLOY_URL:-}" ]]; then
  if curl -fsS "${DEPLOY_URL%/}/sw.js" | grep -q "$version"; then
    echo "Live: ${DEPLOY_URL%/} is serving this build."
  else
    echo "${DEPLOY_URL%/}/sw.js is not serving this build. Check the server or its cache." >&2
    exit 1
  fi
fi
