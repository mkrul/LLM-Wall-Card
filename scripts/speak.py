#!/usr/bin/env python3
import hashlib
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

KEY_PATH = Path.home() / ".config" / "llm-cheat-sheet" / "elevenlabs.key"
VOICE_PATH = Path.home() / ".config" / "llm-cheat-sheet" / "elevenlabs.voice"
CACHE_DIR = Path.home() / "Library" / "Caches" / "llm-wall-card" / "speech"
SPEECH_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice}"
DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"
MODEL_ID = "eleven_turbo_v2_5"
TEXT_LIMIT = 20000
CHUNK_LIMIT = 9000
FETCH_TIMEOUT = 20
SPEECH_TIMEOUT = 120
SKIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "form", "noscript", "svg", "button", "iframe"}


def load_key():
    env = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if env:
        return env
    try:
        return KEY_PATH.read_text().strip()
    except OSError:
        return ""


def load_voice():
    try:
        voice = VOICE_PATH.read_text().strip()
    except OSError:
        voice = ""
    return voice or DEFAULT_VOICE


def plain(value):
    return " ".join(html.unescape(value or "").split())


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip_depth = 0
        self.article_depth = 0
        self.seen_article = False
        self.in_p = False
        self.buf = []
        self.rows = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in SKIP_TAGS:
            self.skip_depth += 1
            return
        if tag == "article":
            self.article_depth += 1
            self.seen_article = True
        if tag == "p" and self.skip_depth == 0:
            self.in_p = True
            self.buf = []

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in SKIP_TAGS and self.skip_depth:
            self.skip_depth = max(0, self.skip_depth - 1)
            return
        if tag == "article" and self.article_depth:
            self.article_depth -= 1
        if tag == "p" and self.in_p:
            text = plain("".join(self.buf))
            if len(text) >= 80:
                self.rows.append((self.article_depth > 0, text))
            self.in_p = False
            self.buf = []

    def handle_data(self, data):
        if self.skip_depth == 0 and self.in_p:
            self.buf.append(data)


def article_text(page):
    parser = ArticleParser()
    try:
        parser.feed(page)
        parser.close()
    except Exception:
        return ""
    rows = [text for inside, text in parser.rows if inside] if parser.seen_article else []
    if len(rows) < 2:
        rows = [text for _, text in parser.rows]
    return "\n\n".join(rows)


def fetch_page(url):
    request = urllib.request.Request(url, headers={"User-Agent": "llm-wall-card/1.0"})
    with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT) as response:
        content_type = response.headers.get("Content-Type", "")
        if "html" not in content_type and "text" not in content_type and content_type:
            return ""
        raw = response.read(1_500_000)
    charset = "utf-8"
    match = re.search(r"charset=([\w-]+)", content_type or "", re.I)
    if match:
        charset = match.group(1)
    return raw.decode(charset, "replace")


def clip(text):
    text = text.strip()
    if len(text) <= TEXT_LIMIT:
        return text
    cut = text[:TEXT_LIMIT]
    end = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "))
    if end > int(TEXT_LIMIT * 0.6):
        return cut[: end + 1].strip()
    return cut.strip()


def spoken_text(url, title, detail):
    body = ""
    try:
        body = article_text(fetch_page(url))
    except (OSError, urllib.error.URLError, ValueError):
        body = ""
    parts = [plain(title)]
    if body:
        parts.append(body)
    elif plain(detail):
        parts.append(plain(detail))
    return clip("\n\n".join(part for part in parts if part))


def chunks(text):
    if len(text) <= CHUNK_LIMIT:
        return [text]
    pieces = []
    rest = text
    while rest:
        if len(rest) <= CHUNK_LIMIT:
            pieces.append(rest)
            break
        cut = rest[:CHUNK_LIMIT]
        end = max(cut.rfind("\n\n"), cut.rfind(". "))
        if end < int(CHUNK_LIMIT * 0.5):
            end = CHUNK_LIMIT
        else:
            end = end + (2 if rest[end : end + 2] == "\n\n" else 1)
        pieces.append(rest[:end].strip())
        rest = rest[end:].strip()
    return [piece for piece in pieces if piece]


def synthesize(text, key, voice):
    payload = json.dumps({"text": text, "model_id": MODEL_ID}).encode()
    request = urllib.request.Request(
        SPEECH_URL.format(voice=voice) + "?output_format=mp3_44100_128",
        data=payload,
        headers={
            "xi-api-key": key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=SPEECH_TIMEOUT) as response:
            audio = response.read()
            kind = response.headers.get("Content-Type", "")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        message = "ElevenLabs could not make the audio."
        try:
            parsed = json.loads(detail)
            nested = parsed.get("detail")
            if isinstance(nested, dict) and nested.get("message"):
                message = str(nested["message"])
            elif isinstance(nested, str):
                message = nested
        except json.JSONDecodeError:
            pass
        raise SystemExit(message) from error
    if not audio or "audio" not in kind and not audio.startswith(b"ID3") and not audio.startswith(b"\xff"):
        raise SystemExit("ElevenLabs did not return audio.")
    return audio


def cache_path(url, voice):
    digest = hashlib.sha256(f"{voice}\n{MODEL_ID}\n{url}".encode()).hexdigest()
    return CACHE_DIR / f"{digest}.mp3"


def write_audio(path, audio):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".mp3.part")
    tmp.write_bytes(audio)
    os.replace(tmp, path)


def main():
    try:
        request = json.load(sys.stdin)
    except json.JSONDecodeError as error:
        raise SystemExit(f"request: {error}") from error
    url = str(request.get("url") or "")
    if not url.startswith("http"):
        raise SystemExit("That story has no article link.")
    key = load_key()
    if not key:
        raise SystemExit(
            "Add your ElevenLabs key as one line in ~/.config/llm-cheat-sheet/elevenlabs.key"
        )
    voice = load_voice()
    path = cache_path(url, voice)
    if path.is_file() and path.stat().st_size > 1000:
        print(path)
        return
    text = spoken_text(url, request.get("title") or "", request.get("detail") or "")
    if len(text) < 20:
        raise SystemExit("Could not read that article.")
    audio = b""
    for piece in chunks(text):
        audio += synthesize(piece, key, voice)
    write_audio(path, audio)
    print(path)


if __name__ == "__main__":
    try:
        main()
    except SystemExit as error:
        message = error.code if isinstance(error.code, str) else "Could not play that article."
        if message:
            print(message, file=sys.stderr)
        raise SystemExit(1) from error
    except urllib.error.URLError as error:
        print("Could not reach ElevenLabs.", file=sys.stderr)
        raise SystemExit(1) from error
