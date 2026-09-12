#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/LLM Cheat Sheet.app"
if [[ ! -d "$APP" ]]; then
  echo "Missing $APP. Run ./scripts/make-desktop-app.sh first." >&2
  exit 1
fi
open "$APP"
