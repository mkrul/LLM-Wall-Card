#!/usr/bin/env python3
import datetime
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NEWS_PATH = ROOT / "data" / "news.js"
CARD_PATH = ROOT / "data" / "card-data.js"
NEWS_HOURS = 20
CARD_HOURS = 24 * 7


def age_hours(path):
    try:
        text = path.read_text()
        start = text.find("{")
        end = text.rfind("}")
        payload = json.loads(text[start : end + 1])
        updated = datetime.datetime.fromisoformat(payload["updatedAt"])
    except (OSError, ValueError, KeyError, json.JSONDecodeError):
        return None
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=datetime.timezone.utc)
    return (datetime.datetime.now().astimezone() - updated.astimezone()).total_seconds() / 3600


def run(script):
    subprocess.run([sys.executable, str(ROOT / "scripts" / script)], cwd=ROOT, check=False)


def main():
    news_age = age_hours(NEWS_PATH)
    if news_age is None or news_age >= NEWS_HOURS:
        run("news.py")
    card_age = age_hours(CARD_PATH)
    if card_age is None or card_age >= CARD_HOURS:
        run("refresh.py")


if __name__ == "__main__":
    main()
