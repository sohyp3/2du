#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
aab="${1:-build/out/2du-1.0.1.aab}"
apks="build/out/$(basename "${aab%.aab}").apks"
mkdir -p build/out
java -jar build/tools/bundletool.jar build-apks \
  --bundle="$aab" --output="$apks" --mode=universal --overwrite
unzip -oj "$apks" universal.apk -d build/out
if command -v adb >/dev/null && adb get-state >/dev/null 2>&1; then
  adb install -r build/out/universal.apk
fi
