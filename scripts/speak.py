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
SPEED_PATH = Path.home() / ".config" / "llm-cheat-sheet" / "elevenlabs.speed"
CACHE_DIR = Path.home() / "Library" / "Caches" / "llm-wall-card" / "speech"
SPEECH_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice}"
DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"
MODEL_ID = "eleven_turbo_v2_5"
SPEED_MIN = 0.7
SPEED_MAX = 1.2
TEXT_LIMIT = 40000
CHUNK_LIMIT = 9000
FETCH_TIMEOUT = 20
SPEECH_TIMEOUT = 120
SKIP_TAGS = {"script", "style", "nav", "footer", "header", "form", "noscript", "svg", "button", "iframe"}
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
COLLECT_TAGS = {"p", "li", "h2", "h3", "h4", "blockquote", "figcaption"}
OPENAI_KEY_PATH = Path.home() / ".config" / "llm-cheat-sheet" / "openai.key"
CHAT_URL = "https://api.openai.com/v1/chat/completions"
CLEAN_ID = "listen-clean-3"


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


def load_speed():
    try:
        value = round(float(SPEED_PATH.read_text().strip()), 1)
    except (OSError, ValueError):
        return 1.0
    return min(SPEED_MAX, max(SPEED_MIN, value))


def load_openai_key():
    env = os.environ.get("OPENAI_API_KEY", "").strip()
    if env:
        return env
    try:
        return OPENAI_KEY_PATH.read_text().strip()
    except OSError:
        return ""


def cheap_model_id():
    path = Path(__file__).resolve().parent.parent / "data" / "card-data.js"
    try:
        text = path.read_text()
    except OSError:
        return "gpt-6-luna"
    match = re.search(r'"id": "high-volume-grunt-work".*?"modelId": "(openai/[^"]+)"', text, re.S)
    if not match:
        return "gpt-6-luna"
    return match.group(1).split("/", 1)[1]


def plain(value):
    return " ".join(html.unescape(value or "").split())


class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.frames = []
        self.article_depth = 0
        self.block = None
        self.block_depth = 0
        self.buf = []
        self.rows = []

    def blocked(self):
        return bool(self.frames) and self.frames[-1][0]

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in VOID_TAGS:
            return
        blocked = self.blocked() or tag in SKIP_TAGS
        counted = tag == "article" and not blocked
        self.frames.append((blocked, counted))
        if counted:
            self.article_depth += 1
        if self.block == tag:
            self.block_depth += 1
        elif self.block is None and tag in COLLECT_TAGS and not blocked:
            self.block = tag
            self.block_depth = 1
            self.buf = []

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in VOID_TAGS:
            return
        in_article = self.article_depth > 0
        if self.block == tag:
            self.block_depth -= 1
            if self.block_depth <= 0:
                text = plain("".join(self.buf))
                if len(text) >= 8:
                    self.rows.append((in_article, text))
                self.block = None
                self.buf = []
        counted = False
        if self.frames:
            _, counted = self.frames.pop()
        if counted and self.article_depth:
            self.article_depth -= 1

    def handle_data(self, data):
        if self.block and not self.blocked():
            self.buf.append(data)


def article_text(page):
    parser = ArticleParser()
    try:
        parser.feed(page)
        parser.close()
    except Exception:
        return ""
    inside = [text for is_inside, text in parser.rows if is_inside]
    inside_text = "\n\n".join(inside)
    if len(inside_text) >= 200:
        return inside_text
    return "\n\n".join(text for _, text in parser.rows)


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


def paragraphs(value):
    text = html.unescape(str(value or "")).replace("\r\n", "\n").replace("\r", "\n")
    blocks = [" ".join(line.split()) for line in re.split(r"\n+", text)]
    return "\n\n".join(block for block in blocks if block)


def polish_for_listening(title, detail, body):
    key = load_openai_key()
    if not key or len(body) < 80:
        return body
    payload = {
        "model": cheap_model_id(),
        "max_completion_tokens": 16000,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You prepare one news article so it can be read aloud. "
                    "The page text includes the article and leftover page material. "
                    "Keep every paragraph that belongs to the article, from the beginning of the story through the end. "
                    "Delete advertisements, subscription offers, related stories, share prompts, author biographies, and sentences about the website itself. "
                    "Keep the article's own wording. Do not add facts, names, or numbers. Do not summarize. Do not shorten the article. Do not repeat the title. "
                    "If you are unsure whether a sentence belongs to the article, keep it. "
                    "Return plain paragraphs only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Title: {plain(title)}\n\n"
                    f"Publication sentence: {plain(detail)}\n\n"
                    f"Page text:\n{body[:TEXT_LIMIT]}"
                ),
            },
        ],
    }
    request = urllib.request.Request(
        CHAT_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            raw = response.read()
    except (OSError, urllib.error.URLError, TimeoutError):
        return body
    try:
        message = json.loads(raw)["choices"][0]["message"]
        content = message.get("content")
    except (KeyError, IndexError, TypeError, json.JSONDecodeError):
        return body
    if message.get("refusal") or not content:
        return body
    if isinstance(content, list):
        content = "\n".join(
            part.get("text", "") if isinstance(part, dict) else str(part) for part in content
        )
    text = paragraphs(content)
    text = re.sub(r"^(here is|cleaned article|article text)\b[:\s-]*", "", text, flags=re.I).strip()
    if len(text) < 40 or len(text) > len(body) + 400:
        return body
    if re.match(r"(?i)^i(?:'m| am) sorry\b|^as an ai\b", text):
        return body
    return text


def spoken_text(url, title, detail):
    body = ""
    try:
        body = article_text(fetch_page(url))
    except (OSError, urllib.error.URLError, ValueError):
        body = ""
    if body:
        body = polish_for_listening(title, detail, body)
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


def synthesize(text, key, voice, speed):
    payload = {"text": text, "model_id": MODEL_ID}
    if abs(speed - 1.0) >= 0.05:
        payload["voice_settings"] = {"speed": speed}
    request = urllib.request.Request(
        SPEECH_URL.format(voice=voice) + "?output_format=mp3_44100_128",
        data=json.dumps(payload).encode(),
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


def cache_path(url, voice, speed):
    digest = hashlib.sha256(f"{voice}\n{MODEL_ID}\n{speed:.1f}\n{CLEAN_ID}\n{url}".encode()).hexdigest()
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
    speed = load_speed()
    path = cache_path(url, voice, speed)
    if path.is_file() and path.stat().st_size > 1000:
        print(path)
        return
    text = spoken_text(url, request.get("title") or "", request.get("detail") or "")
    if len(text) < 20:
        raise SystemExit("Could not read that article.")
    audio = b""
    for piece in chunks(text):
        audio += synthesize(piece, key, voice, speed)
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
