#!/usr/bin/env bash
# Build the Lumin Chess debug APK.
# Sets the JDK + Android SDK paths inline so you don't have to export them.
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▸ Refreshing www/"
node scripts/copy-web.js

echo "▸ Syncing Capacitor"
npx --no-install cap sync android > /dev/null

echo "▸ Building debug APK (gradle)"
cd android
./gradlew --no-daemon -q assembleDebug

APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
echo "✓ Built $APK ($(du -h "$APK" | cut -f1))"
