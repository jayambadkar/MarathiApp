#!/usr/bin/env bash
# MarathiTutor Android — one-time setup + debug APK build.
# Run in YOUR OWN terminal (needs network):  cd mobile && ./setup.sh
set -e
cd "$(dirname "$0")"

export ANDROID_HOME="$HOME/Library/Android/sdk"

# Pinned JDK 17 (no sudo, no Homebrew): Temurin, fetched once into mobile/.jdk
if [ ! -x .jdk/Contents/Home/bin/java ]; then
  echo "Fetching Temurin JDK 17 (one-time)…"
  rm -rf .jdk && mkdir -p .jdk
  curl -sSL -o /tmp/mt-jdk17.tar.gz \
    "https://api.adoptium.net/v3/binary/latest/17/ga/mac/aarch64/jdk/hotspot/normal/eclipse"
  tar xzf /tmp/mt-jdk17.tar.gz -C .jdk --strip-components=1
  rm /tmp/mt-jdk17.tar.gz
fi
export JAVA_HOME="$PWD/.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
java -version 2>&1 | head -n 1

npm install
npx -y react-native-asset   # link Baloo2 font into the Android app

cd android
./gradlew assembleDebug

APK="app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "APK ready: mobile/android/$APK"
echo "Install: connect your phone (USB debugging on) and run:"
echo "  $ANDROID_HOME/platform-tools/adb install -r $APK"
echo "…or copy the APK to your phone and tap it (allow unknown apps)."
