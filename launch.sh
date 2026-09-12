#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
python3 "$ROOT/scripts/refresh.py" || true
URL="file://${ROOT}/index.html"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROMIUM="/Applications/Chromium.app/Contents/MacOS/Chromium"
BRAVE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
if [[ -x "$CHROME" ]]; then
  exec "$CHROME" --app="$URL" --window-size=400,700
elif [[ -x "$CHROMIUM" ]]; then
  exec "$CHROMIUM" --app="$URL" --window-size=400,700
elif [[ -x "$BRAVE" ]]; then
  exec "$BRAVE" --app="$URL" --window-size=400,700
else
  open "$URL"
fi
