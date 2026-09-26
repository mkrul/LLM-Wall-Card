#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/LLM Wall Card.app"
DESKTOP="$HOME/Desktop"
BIN="$APP/Contents/MacOS/LLM Wall Card"
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"

rm -rf "$APP" "$ROOT/LLM Cheat Sheet.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

swiftc -O -framework Cocoa -framework WebKit -o "$BIN" "$ROOT/macos/App.swift"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>LLM Wall Card</string>
	<key>CFBundleExecutable</key>
	<string>LLM Wall Card</string>
	<key>CFBundleIconFile</key>
	<string>AppIcon</string>
	<key>CFBundleIdentifier</key>
	<string>com.llmcheatsheet.card</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>LLM Wall Card</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSMinimumSystemVersion</key>
	<string>11.0</string>
	<key>NSHighResolutionCapable</key>
	<true/>
	<key>NSPrincipalClass</key>
	<string>NSApplication</string>
</dict>
</plist>
PLIST

printf 'APPL????' > "$APP/Contents/PkgInfo"
cp "$ROOT/assets/icon.icns" "$APP/Contents/Resources/AppIcon.icns"
codesign --force --deep -s - "$APP"
touch "$APP"
"$LSREGISTER" -f "$APP" >/dev/null 2>&1 || true
rm -f "$DESKTOP/LLM Wall.app" "$DESKTOP/LLM Cheat Sheet.app"
ln -sfn "$APP" "$DESKTOP/LLM Wall Card.app"
"$ROOT/scripts/install-weekly-refresh.sh"
"$ROOT/scripts/install-daily-news.sh"
