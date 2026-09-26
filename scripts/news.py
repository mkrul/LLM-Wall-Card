#!/usr/bin/env python3
import datetime
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import refresh

ROOT = Path(__file__).resolve().parent.parent
NEWS_PATH = ROOT / "data" / "news.js"
KEY_PATH = Path.home() / ".config" / "llm-cheat-sheet" / "openrouter.key"
CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
FEED_TIMEOUT = 20
MODEL_TIMEOUT = 60
MAX_ITEMS = 5
WINDOW_HOURS = 72
BACKUP_HOURS = 24 * 7

FEEDS = (
    ("The Verge", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"),
    ("TechCrunch", "https://techcrunch.com/category/artificial-intelligence/feed/"),
    ("OpenAI", "https://openai.com/news/rss.xml"),
    ("Google", "https://blog.google/technology/ai/rss/"),
    ("Simon Willison", "https://simonwillison.net/atom/everything/"),
    ("MIT Technology Review", "https://www.technologyreview.com/feed/"),
    ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/technology-lab"),
    ("Hugging Face", "https://huggingface.co/blog/feed.xml"),
    ("Mistral", "https://mistral.ai/news/rss"),
    ("Qwen", "https://qwenlm.github.io/blog/index.xml"),
    ("Ollama", "https://ollama.com/blog/rss.xml"),
    ("Interconnects", "https://www.interconnects.ai/feed"),
    ("Together", "https://www.together.ai/blog/rss.xml"),
    ("Ahead of AI", "https://magazine.sebastianraschka.com/feed"),
)

OPEN_SOURCES = {
    "Hugging Face",
    "Mistral",
    "Qwen",
    "Ollama",
    "Interconnects",
    "Together",
    "Ahead of AI",
}

ATOM = "{http://www.w3.org/2005/Atom}"
MODEL_WORDS = (
    "llm",
    "gpt",
    "chatgpt",
    "claude",
    "gemini",
    "grok",
    "openai",
    "anthropic",
    "deepseek",
    "qwen",
    "kimi",
    "mistral",
    "llama",
    "llama.cpp",
    "codex",
    "copilot",
    "deepmind",
    "gemma",
    "phi",
    "olmo",
    "glm",
    "nemotron",
    "huggingface",
    "hugging face",
    "ollama",
    "language model",
    "foundation model",
    "ai model",
    "ai agent",
    "chatbot",
)
SKIP_WORDS = (
    "customer story",
    "case study",
    "webinar",
    "newsletter",
    "roundup",
    "how to",
)
SUMMARY_JOB = {
    "match": "google/gemini-3",
    "require": "flash",
    "exclude": ["image", "lite"],
    "label": "Gemini 3.8 Flash",
    "why": "",
    "tasks": [],
}


def load_key():
    env = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if env:
        return env
    try:
        return KEY_PATH.read_text().strip()
    except OSError:
        return ""


def fetch_bytes(url, timeout):
    request = urllib.request.Request(url, headers={"User-Agent": "llm-cheat-sheet/1.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def plain(value):
    text = re.sub(r"<[^>]+>", " ", value or "")
    return " ".join(html.unescape(text).split())


def clean_summary(item):
    text = plain(item["summary"])
    title = plain(item["title"])
    for _ in range(2):
        text = re.sub(r"^(Tool|Link|Quote|Note):\s*", "", text, flags=re.I)
        if text.lower().startswith(title.lower()):
            text = text[len(title) :].strip(" :-")
    return text


def first_sentence(text):
    text = plain(text)
    if len(text) < 40:
        return ""
    match = re.search(r"[.!?](?:\s|$)", text)
    sentence = text[: match.start() + 1].strip() if match and match.start() >= 40 else text
    if len(sentence) <= 170:
        return sentence
    comma = sentence.find(", ")
    if 60 <= comma <= 160:
        return sentence[:comma] + "."
    return sentence[:160].rsplit(" ", 1)[0] + "."


def child_text(element, *tags):
    for tag in tags:
        node = element.find(tag)
        if node is not None and node.text:
            return plain(node.text)
    return ""


def child_link(element):
    for tag in (f"{ATOM}link", "link"):
        for node in element.findall(tag):
            href = node.attrib.get("href") or plain(node.text)
            if href.startswith("http"):
                return href
    return ""


def parse_when(value):
    value = (value or "").strip()
    if not value:
        return None
    try:
        when = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            when = parsedate_to_datetime(value)
        except (TypeError, ValueError, IndexError):
            return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=datetime.timezone.utc)
    return when.astimezone()


def entry_summary(element):
    for tag in (f"{ATOM}summary", f"{ATOM}content", "description", "{http://purl.org/rss/1.0/modules/content/}encoded"):
        node = element.find(tag)
        if node is not None and (node.text or node.tail):
            return plain("".join(node.itertext()))
    return ""


def parse_feed(source, url):
    root = ET.fromstring(fetch_bytes(url, FEED_TIMEOUT))
    nodes = root.findall(f"{ATOM}entry") or root.findall(".//item")
    items = []
    for node in nodes:
        title = child_text(node, f"{ATOM}title", "title")
        link = child_link(node)
        when = parse_when(
            child_text(node, f"{ATOM}published", f"{ATOM}updated", "pubDate", "date")
        )
        if not title or not link or when is None:
            continue
        items.append(
            {
                "title": title,
                "url": link,
                "source": source,
                "published": when,
                "summary": entry_summary(node),
            }
        )
    return items


def has_word(text, word):
    if " " in word:
        return word in text
    return re.search(rf"\b{re.escape(word)}\b", text) is not None


def is_customer_story(item):
    if item["source"] != "OpenAI":
        return False
    title = item["title"]
    if re.search(r"\b(introducing|announce|launch|release|update)\b", title, re.I):
        return False
    if re.match(r"^(OpenAI|ChatGPT|GPT-\d|Sora|Codex)\b", title):
        return False
    return True


def score_item(item, now):
    title = item["title"].lower()
    blob = f"{title} {item['summary'].lower()}"
    if any(word in blob for word in SKIP_WORDS):
        return None
    if "/podcast/" in item["url"] or title.startswith("quoting ") or title.startswith("note on "):
        return None
    if is_customer_story(item):
        return None
    model_hit = any(has_word(blob, word) for word in MODEL_WORDS)
    ai_hit = bool(re.search(r"\bai\b|artificial intelligence|generative ai", blob))
    open_topic = item["source"] in OPEN_SOURCES and bool(
        re.search(r"\bmodels?\b|open[- ](?:source|weight)", blob)
    )
    if not model_hit and not ai_hit and not open_topic:
        return None
    age_hours = (now - item["published"]).total_seconds() / 3600
    if age_hours < 0 or age_hours > BACKUP_HOURS:
        return None
    score = 0
    if any(has_word(title, word) for word in MODEL_WORDS) or re.search(
        r"open[- ](?:source|weight|model)s?", title
    ):
        score += 5
    elif model_hit:
        score += 2
    if ai_hit:
        score += 1
    if age_hours <= 48:
        score += 3
    elif age_hours <= WINDOW_HOURS:
        score += 2
    else:
        score -= 3
    if "playground" not in title and re.search(
        r"\b(?:gpt|gemini|claude|opus|llama|qwen|grok|kimi|mistral|gemma|glm|nemotron|phi|deepseek)[- ]?\d",
        title,
    ):
        score += 3
    if re.search(r"\b(unsecured|breach|leak|lawsuit|sues|ipo|ban)\b", title):
        score += 2
    if item["source"] in OPEN_SOURCES and re.search(r"open[- ](?:source|weight|model)s?", blob):
        score += 2
    if not first_sentence(clean_summary(item)):
        score -= 4
    return score


def choose_reports(items, now):
    ranked = []
    seen = set()
    for item in items:
        key = re.sub(r"[^a-z0-9]+", " ", item["title"].lower()).strip()
        if key in seen:
            continue
        value = score_item(item, now)
        if value is None:
            continue
        seen.add(key)
        ranked.append((value, item))
    ranked.sort(key=lambda pair: (pair[0], pair[1]["published"]), reverse=True)
    fresh = [pair for pair in ranked if (now - pair[1]["published"]).total_seconds() <= WINDOW_HOURS * 3600]
    pool = fresh if len(fresh) >= MAX_ITEMS else ranked
    pool = keep_one_open_model(pool, ranked, now)
    return [item for _, item in pool[:12]]


def keep_one_open_model(pool, ranked, now):
    if any(item["source"] in OPEN_SOURCES for _, item in pool[:MAX_ITEMS]):
        return pool
    best = None
    for score, item in ranked:
        age_hours = (now - item["published"]).total_seconds() / 3600
        if item["source"] not in OPEN_SOURCES or age_hours > BACKUP_HOURS or score < 4:
            continue
        if not first_sentence(clean_summary(item)):
            continue
        best = (score, item)
        break
    if best is None:
        return pool
    rest = [pair for pair in pool if pair[1]["url"] != best[1]["url"]]
    return rest[: MAX_ITEMS - 1] + [best] + rest[MAX_ITEMS - 1 :]


def summary_model():
    try:
        jobs = refresh.load_families()
    except SystemExit:
        jobs = []
    for job in jobs:
        if job.get("id") == "fast-cheap-work":
            spec = {
                "match": job["match"],
                "require": job.get("require"),
                "exclude": job.get("exclude") or [],
                "label": job["label"],
                "why": "",
                "tasks": [],
            }
            break
    else:
        spec = SUMMARY_JOB
    try:
        catalog = refresh.fetch_catalog()
    except SystemExit:
        return spec["label"], "", True
    row = refresh.pick_latest(catalog, spec)
    if row is None:
        return spec["label"], "", True
    return refresh.display_name(row, spec["label"]), row["id"], False


def model_details(model_id, reports, key):
    payload = {
        "model": model_id,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You choose the daily AI news for a developer cheat sheet. "
                    "Use only the reports given to you. Do not add events, numbers, or names that are not in that report. "
                    "Pick at most 5 reports. Prefer model releases, outages, security incidents, lawsuits, and policy changes. "
                    "Skip ads, customer stories, and tips. "
                    "For each pick, write one plain sentence about what happened. "
                    "Do not use specialist shorthand. "
                    'Return JSON only: {"items":[{"url":"<exact url from the report>","detail":"<one sentence>"}]}'
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    [
                        {
                            "title": item["title"],
                            "source": item["source"],
                            "url": item["url"],
                            "published": item["published"].isoformat(timespec="seconds"),
                            "summary": clean_summary(item)[:700],
                        }
                        for item in reports
                    ]
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
    raw = fetch_bytes_request(request, MODEL_TIMEOUT)
    body = json.loads(raw)
    text = body["choices"][0]["message"]["content"]
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    parsed = json.loads(text)
    rows = parsed.get("items") if isinstance(parsed, dict) else None
    if not isinstance(rows, list):
        raise ValueError("model json")
    by_url = {item["url"]: item for item in reports}
    chosen = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        item = by_url.get(row.get("url") or "")
        detail = plain(row.get("detail") or "")
        if item is None or len(detail) < 20:
            continue
        chosen.append((item, detail))
        if len(chosen) == MAX_ITEMS:
            break
    if len(chosen) < 3:
        raise ValueError("model picks")
    return chosen


def fetch_bytes_request(request, timeout):
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def source_details(reports):
    chosen = []
    for item in reports[:MAX_ITEMS]:
        detail = first_sentence(clean_summary(item))
        if detail.lower() == item["title"].lower():
            detail = ""
        chosen.append((item, detail))
    return chosen


def write_news(payload):
    body = "window.NEWS = " + json.dumps(payload, indent=2) + ";\n"
    tmp = NEWS_PATH.with_suffix(".js.tmp")
    tmp.write_text(body)
    os.replace(tmp, NEWS_PATH)


def main():
    now = datetime.datetime.now().astimezone()
    reports = []
    for source, url in FEEDS:
        try:
            reports.extend(parse_feed(source, url))
        except (OSError, urllib.error.URLError, ValueError) as error:
            print(f"feed {source}: {error}", file=sys.stderr)
    picked = choose_reports(reports, now)
    if not picked:
        print("news: no recent reports, kept the previous list", file=sys.stderr)
        raise SystemExit(0 if NEWS_PATH.exists() else 1)
    model_name, model_id, stale = summary_model()
    key = load_key()
    used_model = False
    if key and model_id and not stale:
        try:
            chosen = model_details(model_id, picked, key)
            used_model = True
        except (OSError, urllib.error.URLError, ValueError, KeyError, json.JSONDecodeError) as error:
            print(f"model: {error}", file=sys.stderr)
            chosen = source_details(picked)
    else:
        if not key:
            print("news: no OpenRouter key, so the sentences stay in the publications' own words", file=sys.stderr)
        chosen = source_details(picked)
    payload = {
        "updatedAt": now.isoformat(timespec="seconds"),
        "model": model_name if used_model else "",
        "modelId": model_id if used_model else "",
        "items": [
            {
                "title": item["title"],
                "detail": detail,
                "source": item["source"],
                "url": item["url"],
                "published": item["published"].isoformat(timespec="seconds"),
            }
            for item, detail in chosen
        ],
    }
    write_news(payload)
    print(f"news: {len(payload['items'])} items" + (f" via {model_name}" if used_model else ""))


if __name__ == "__main__":
    main()
