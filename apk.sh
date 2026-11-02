#!/usr/bin/env bash
# Convert an .aab into a universal APK and install it if a device is connected.
# Usage: ./apk.sh [path/to/app.aab]   (default: newest .aab in build/out/ or the repo root)
set -euo pipefail
cd -- "$(dirname -- "$0")"
mkdir -p build/out

if [[ $# -gt 0 ]]; then
  aab="$1"
else
  # `eas build --local` without --output drops build-<timestamp>.aab in the repo root.
  aab="$(ls -t build/out/*.aab ./build-*.aab 2>/dev/null | head -n1 || true)"
fi
if [[ -z "${aab:-}" || ! -f "$aab" ]]; then
  echo "No .aab found. Build one first (see README) or pass a path." >&2
  exit 1
fi
echo "Using $aab ($(date -r "$aab" '+%Y-%m-%d %H:%M'))"

apks="build/out/$(basename "${aab%.aab}").apks"
rm -f build/out/universal.apk
java -jar build/tools/bundletool.jar build-apks \
  --bundle="$aab" --output="$apks" --mode=universal --overwrite
unzip -oj "$apks" universal.apk -d build/out
touch build/out/universal.apk
echo "APK: build/out/universal.apk"

if command -v adb >/dev/null && adb get-state >/dev/null 2>&1; then
  adb install -r build/out/universal.apk
fi
