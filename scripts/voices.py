#!/usr/bin/env python3
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

KEY_PATH = Path.home() / ".config" / "llm-cheat-sheet" / "elevenlabs.key"
VOICE_PATH = Path.home() / ".config" / "llm-cheat-sheet" / "elevenlabs.voice"
SPEED_PATH = Path.home() / ".config" / "llm-cheat-sheet" / "elevenlabs.speed"
VOICES_URL = "https://api.elevenlabs.io/v2/voices"
DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"
SPEED_MIN = 0.5
SPEED_MAX = 2.0
KINDS = (
    ("personal", "yours"),
    ("workspace", "shared"),
    ("default", "standard"),
)
RANK = {"yours": 0, "shared": 1, "standard": 2}


def load_key():
    env = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if env:
        return env
    try:
        return KEY_PATH.read_text().strip()
    except OSError:
        return ""


def load_selected():
    try:
        voice = VOICE_PATH.read_text().strip()
    except OSError:
        voice = ""
    return voice or DEFAULT_VOICE


def load_speed():
    try:
        value = round(float(SPEED_PATH.read_text().strip()), 1)
    except (OSError, ValueError):
        return 1.0
    if value < SPEED_MIN or value > SPEED_MAX:
        return 1.0
    return value


def display_name(value):
    name = " ".join(str(value or "").split())
    for sep in (" — ", " – ", " - ", " | "):
        if sep in name:
            name = name.split(sep, 1)[0].strip()
            break
    return (name or "Voice")[:40]


def emit(payload):
    payload["speed"] = load_speed()
    print(json.dumps(payload, ensure_ascii=False))


def failure_message(body):
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return "Could not load voices."
    nested = parsed.get("detail")
    if isinstance(nested, dict):
        status = str(nested.get("status") or "")
        text = str(nested.get("message") or "")
        if status == "missing_permissions" or "voices_read" in text:
            return "Needs Voices read"
    return "Could not load voices."


def fetch_page(key, voice_type, token):
    query = {
        "page_size": "100",
        "voice_type": voice_type,
        "sort": "name",
        "sort_direction": "asc",
        "include_total_count": "false",
    }
    if token:
        query["next_page_token"] = token
    request = urllib.request.Request(
        VOICES_URL + "?" + urllib.parse.urlencode(query),
        headers={
            "xi-api-key": key,
            "Accept": "application/json",
            "User-Agent": "llm-wall-card/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise SystemExit(failure_message(detail)) from error
    except urllib.error.URLError as error:
        raise SystemExit("Could not reach ElevenLabs.") from error


def collect(key):
    found = []
    seen = set()
    for voice_type, kind in KINDS:
        token = ""
        for _ in range(3):
            page = fetch_page(key, voice_type, token)
            for voice in page.get("voices") or []:
                voice_id = str(voice.get("voice_id") or "").strip()
                if not voice_id or voice_id in seen:
                    continue
                seen.add(voice_id)
                name = display_name(voice.get("name") or voice_id)
                found.append({"id": voice_id, "name": name, "kind": kind})
            if not page.get("has_more") or not page.get("next_page_token"):
                break
            token = str(page.get("next_page_token") or "")
            if not token:
                break
    found.sort(key=lambda item: (RANK.get(item["kind"], 9), item["name"].casefold()))
    return found


def main():
    selected = load_selected()
    key = load_key()
    if not key:
        emit({"voices": [], "selected": selected, "error": "Add ElevenLabs key"})
        return
    voices = collect(key)
    emit({"voices": voices, "selected": selected, "error": ""})


if __name__ == "__main__":
    try:
        main()
    except SystemExit as error:
        message = error.code if isinstance(error.code, str) else "Could not load voices."
        emit({"voices": [], "selected": load_selected(), "error": message or "Could not load voices."})
