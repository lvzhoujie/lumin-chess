#!/usr/bin/env bash
# Build the production release artifacts:
#   - lumin-chess-release.aab  (upload this to Google Play Console)
#   - lumin-chess-release.apk  (sideloadable signed APK for testing)
# Both are signed with the upload keystore in android/keystore/.
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f android/keystore.properties ]]; then
  echo "✕ android/keystore.properties not found — signing config missing."
  exit 1
fi
if [[ ! -f android/keystore/upload-keystore.jks ]]; then
  echo "✕ android/keystore/upload-keystore.jks not found — keystore missing."
  exit 1
fi

echo "▸ Refreshing www/"
node scripts/copy-web.js

echo "▸ Syncing Capacitor"
npx --no-install cap sync android > /dev/null

echo "▸ Building release AAB + signed APK (R8 + resource shrink)"
cd android
./gradlew --no-daemon -q bundleRelease assembleRelease

AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
cp "$AAB" "$ROOT/lumin-chess-release.aab"
cp "$APK" "$ROOT/lumin-chess-release.apk"

echo "✓ Built:"
echo "    $ROOT/lumin-chess-release.aab   ($(du -h "$ROOT/lumin-chess-release.aab" | cut -f1))  ← upload this to Play Console"
echo "    $ROOT/lumin-chess-release.apk   ($(du -h "$ROOT/lumin-chess-release.apk" | cut -f1))  ← sideload for testing"
