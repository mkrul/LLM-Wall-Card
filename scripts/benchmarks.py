#!/usr/bin/env python3
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CARD_PATH = ROOT / "data" / "card-data.js"
BENCH_PATH = ROOT / "data" / "benchmarks.js"
LEADERBOARD_URL = "https://artificialanalysis.ai/leaderboards/models"
TIMEOUT_SECONDS = 40

TRAITS = (
    ("coding", "terminalBench40"),
    ("hard questions", "hle"),
    ("long documents", "lcr"),
    ("office work", "gdpvalNormalized"),
    ("questions about pictures", "mmmuPro"),
    ("following instructions", "ifbench"),
)

EFFORTS = {
    "xhigh": "Extra high effort",
    "high": "High effort",
    "medium": "Medium effort",
    "low": "Low effort",
    "non-reasoning": "Without extra reasoning",
}


def load_card():
    try:
        text = CARD_PATH.read_text()
        start = text.find("{")
        end = text.rfind("}")
        payload = json.loads(text[start : end + 1])
    except (OSError, ValueError, json.JSONDecodeError) as error:
        raise SystemExit(f"benchmarks: {error}") from error
    jobs = payload.get("jobs") if isinstance(payload, dict) else None
    if not isinstance(jobs, list):
        raise SystemExit("benchmarks: cheat sheet has no models")
    rows = []
    seen = {}
    for job in jobs:
        if not isinstance(job, dict):
            continue
        picks = [job, *(job.get("also") or [])]
        for pick in picks:
            if not isinstance(pick, dict):
                continue
            name = str(pick.get("model") or "").strip()
            model_id = str(pick.get("modelId") or "").strip()
            if not name:
                continue
            key = model_id or name
            stale = bool(pick.get("stale"))
            if key in seen:
                if not stale:
                    rows[seen[key]]["stale"] = False
                continue
            seen[key] = len(rows)
            rows.append({"model": name, "modelId": model_id, "stale": stale})
    if not rows:
        raise SystemExit("benchmarks: cheat sheet has no models")
    return rows


def fetch_leaderboard():
    request = urllib.request.Request(
        LEADERBOARD_URL,
        headers={
            "User-Agent": "llm-wall-card/1.0",
            "Accept": "text/html",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise SystemExit(f"benchmarks: HTTP {response.status}")
            return response.read().decode("utf-8")
    except (urllib.error.URLError, TimeoutError, UnicodeDecodeError) as error:
        raise SystemExit(f"benchmarks: {error}") from error


def decode_payloads(html):
    marker = 'self.__next_f.push([1,"'
    start = 0
    chunks = []
    escapes = {"n": "\n", "r": "\r", "t": "\t", '"': '"', "\\": "\\"}
    while True:
        index = html.find(marker, start)
        if index < 0:
            break
        cursor = index + len(marker)
        chars = []
        while cursor < len(html):
            char = html[cursor]
            if char == "\\":
                nxt = html[cursor + 1 : cursor + 2]
                if nxt == "u" and cursor + 6 <= len(html):
                    try:
                        chars.append(chr(int(html[cursor + 2 : cursor + 6], 16)))
                    except ValueError:
                        chars.append(html[cursor + 2 : cursor + 6])
                    cursor += 6
                    continue
                chars.append(escapes.get(nxt, nxt))
                cursor += 2
                continue
            if char == '"':
                break
            chars.append(char)
            cursor += 1
        chunks.append("".join(chars))
        start = cursor + 1
    return "\n".join(chunks)


def leaderboard_models(html):
    blob = decode_payloads(html)
    key = blob.find('{"models":[')
    if key < 0:
        raise SystemExit("benchmarks: could not read the leaderboard")
    try:
        payload, _ = json.JSONDecoder().raw_decode(blob, key)
    except json.JSONDecodeError as error:
        raise SystemExit("benchmarks: could not read the leaderboard") from error
    rows = payload.get("models") if isinstance(payload, dict) else None
    if not isinstance(rows, list) or not rows:
        raise SystemExit("benchmarks: could not read the leaderboard")
    version = ""
    found = re.search(r"Intelligence Index v([0-9]+(?:\.[0-9]+)*)", blob)
    if found:
        version = found.group(1)
    return [row for row in rows if isinstance(row, dict) and row.get("slug")], version


def norm(value):
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def base_name(row):
    label = str(row.get("shortName") or row.get("name") or "")
    return re.sub(r"\s*\([^)]*\)\s*$", "", label).strip()


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def effort_rank(row):
    label = str(row.get("shortName") or row.get("name") or "").lower()
    if "non-reasoning" in label:
        return 0
    if "(low" in label:
        return 1
    if "(medium" in label:
        return 2
    if "xhigh" in label:
        return 4
    if "(high" in label:
        return 3
    if "(max" in label:
        return 5
    return 4


def choose_row(rows):
    def sort_key(row):
        index = row.get("intelligenceIndex")
        index_value = float(index) if is_number(index) else -1.0
        fresh = 0 if row.get("deprecated") else 1
        return (effort_rank(row), fresh, index_value)

    return max(rows, key=sort_key)


def variant_label(row):
    label = str(row.get("shortName") or row.get("name") or "")
    match = re.search(r"\(([^)]+)\)\s*$", label)
    if not match:
        return ""
    text = match.group(1).lower()
    if "non-reasoning" in text:
        return "non-reasoning"
    if "xhigh" in text:
        return "xhigh"
    if re.search(r"\bhigh\b", text):
        return "high"
    if "medium" in text:
        return "medium"
    if re.search(r"\blow\b", text):
        return "low"
    return ""


def row_key(item):
    return item["modelId"] or item["model"]


def join_traits(names):
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + ", and " + names[-1]


def trait_tables(paired):
    tables = []
    for label, field in TRAITS:
        values = {}
        for item, row in paired:
            if row is None:
                continue
            value = row.get(field)
            if is_number(value):
                values[row_key(item)] = float(value)
        tables.append((label, values))
    return tables


def comparison_sentence(key, tables):
    leads = []
    close = []
    for label, values in tables:
        if key not in values or len(values) < 2:
            continue
        mine = values[key]
        best = max(values.values())
        if round(mine * 100) >= round(best * 100):
            others = [value for other, value in values.items() if other != key]
            second = max(others) if others else mine
            leads.append((best - second, label))
        elif best - mine <= 0.05:
            close.append((best - mine, label))
    if leads:
        leads.sort(key=lambda item: item[0], reverse=True)
        return f"Best of these for {join_traits([label for _, label in leads[:3]])}."
    if close:
        close.sort(key=lambda item: item[0])
        return f"Close to the best of these for {join_traits([label for _, label in close[:2]])}."
    return ""


def blended_price(row):
    if row is None:
        return None
    incoming = row.get("price1mInputTokens")
    outgoing = row.get("price1mOutputTokens")
    if is_number(incoming) and is_number(outgoing):
        return (3 * float(incoming) + float(outgoing)) / 4
    if is_number(incoming):
        return float(incoming)
    if is_number(outgoing):
        return float(outgoing)
    return None


def speed_value(row):
    if row is None:
        return None
    speed = row.get("medianOutputTokensPerSecond")
    if is_number(speed) and float(speed) > 0:
        return float(speed)
    return None


def cents(value):
    return int(float(value) * 100 + 0.5)


def money(value):
    number = float(value)
    if number >= 10 and abs(number - round(number)) < 0.05:
        return f"${number:.0f}"
    if number < 1:
        return f"${number:.2f}"
    text = f"{number:.2f}".rstrip("0").rstrip(".")
    return f"${text}"


def detail_line(row):
    if row is None:
        return ""
    parts = []
    effort = EFFORTS.get(variant_label(row))
    if effort:
        parts.append(effort)
    incoming = row.get("price1mInputTokens")
    outgoing = row.get("price1mOutputTokens")
    if is_number(incoming) and is_number(outgoing):
        parts.append(f"{money(incoming)} in and {money(outgoing)} out per million tokens")
    elif is_number(incoming):
        parts.append(f"{money(incoming)} per million tokens in")
    elif is_number(outgoing):
        parts.append(f"{money(outgoing)} per million tokens out")
    speed = row.get("medianOutputTokensPerSecond")
    if is_number(speed):
        per_second = int(float(speed) + 0.5)
        if per_second > 0:
            unit = "token" if per_second == 1 else "tokens"
            parts.append(f"{per_second} {unit} a second")
    return ". ".join(parts) + ("." if parts else "")


def model_url(row):
    if row is None:
        return ""
    slug = str(row.get("slug") or "")
    if re.fullmatch(r"[A-Za-z0-9._-]+", slug):
        return f"https://artificialanalysis.ai/models/{slug}"
    return ""


def index_by_name(leaderboard):
    groups = {}
    for row in leaderboard:
        key = norm(base_name(row))
        if not key:
            continue
        groups.setdefault(key, []).append(row)
    return {key: choose_row(rows) for key, rows in groups.items()}


def standing_sentence(item, match, tables, cheapest, fastest):
    if match is None:
        return ""
    parts = []
    quality = comparison_sentence(row_key(item), tables)
    if quality:
        parts.append(quality)
    price = blended_price(match)
    if price is not None and cheapest is not None and cents(price) <= cents(cheapest):
        parts.append("Lowest price of these.")
    speed = speed_value(match)
    if speed is not None and fastest is not None and int(speed + 0.5) >= int(fastest + 0.5):
        parts.append("Fastest of these.")
    return " ".join(parts)


def build_models(card_rows, by_name):
    paired = [(item, by_name.get(norm(item["model"]))) for item in card_rows]
    tables = trait_tables(paired)
    prices = [price for _, row in paired if (price := blended_price(row)) is not None]
    speeds = [speed for _, row in paired if (speed := speed_value(row)) is not None]
    cheapest = min(prices) if prices else None
    fastest = max(speeds) if speeds else None
    models = []
    for item, match in paired:
        models.append(
            {
                "model": item["model"],
                "modelId": item["modelId"],
                "stale": item["stale"],
                "url": model_url(match),
                "summary": standing_sentence(item, match, tables, cheapest, fastest),
                "detail": detail_line(match),
            }
        )
    return models


def write_benchmarks(payload):
    body = "window.BENCHMARKS = " + json.dumps(payload, indent=2) + ";\n"
    tmp = BENCH_PATH.with_suffix(".js.tmp")
    tmp.write_text(body)
    os.replace(tmp, BENCH_PATH)


def main():
    try:
        card_rows = load_card()
        html = fetch_leaderboard()
        leaderboard, version = leaderboard_models(html)
    except SystemExit as error:
        message = error.code if isinstance(error.code, str) else str(error)
        print(message, file=sys.stderr)
        raise SystemExit(1) from error
    models = build_models(card_rows, index_by_name(leaderboard))
    payload = {
        "updatedAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": "Artificial Analysis",
        "indexVersion": version,
        "sourceUrl": LEADERBOARD_URL,
        "models": models,
    }
    write_benchmarks(payload)
    scored = sum(1 for item in models if item["summary"] or item["detail"])
    print(f"benchmarks: {scored} of {len(models)} models")


if __name__ == "__main__":
    main()
