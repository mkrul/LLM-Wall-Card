#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/LLM Wall.app"
DESKTOP="$HOME/Desktop"
osacompile -o "$APP" <<'APPLESCRIPT'
set bundlePath to POSIX path of (path to me)
set projectRoot to do shell script "dirname " & quoted form of bundlePath
set launchPath to projectRoot & "/launch.sh"
do shell script "/bin/zsh " & quoted form of launchPath & " >/dev/null 2>&1 &"
APPLESCRIPT
/usr/libexec/PlistBuddy -c "Set :CFBundleName LLM Wall" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName LLM Wall" "$APP/Contents/Info.plist" || /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string LLM Wall" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :LSUIElement true" "$APP/Contents/Info.plist" || /usr/libexec/PlistBuddy -c "Add :LSUIElement bool true" "$APP/Contents/Info.plist"
ln -sfn "$APP" "$DESKTOP/LLM Wall.app"
