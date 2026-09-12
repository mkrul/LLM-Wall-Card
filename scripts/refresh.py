#!/usr/bin/env python3
import datetime
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FAMILIES_PATH = ROOT / "data" / "families.json"
CARD_PATH = ROOT / "data" / "card-data.js"
CATALOG_URL = "https://openrouter.ai/api/v1/models"
TIMEOUT_SECONDS = 20
NAME_PREFIXES = (
    "Anthropic: ",
    "OpenAI: ",
    "Google: ",
    "SpaceXAI: ",
    "DeepSeek: ",
    "MoonshotAI: ",
)


def load_families():
    try:
        payload = json.loads(FAMILIES_PATH.read_text())
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f"families: {error}") from error
    jobs = payload.get("jobs") if isinstance(payload, dict) else None
    if not isinstance(jobs, list) or not jobs:
        raise SystemExit("families: jobs must be a non-empty list")
    required = {"id", "job", "match", "label", "why", "tasks"}
    alt_required = {"match", "label", "why", "tasks"}
    for index, job in enumerate(jobs):
        if not isinstance(job, dict) or not required.issubset(job):
            raise SystemExit(f"families: job {index} missing keys")
        validate_match_fields(job, f"job {index}")
        also = job.get("also") or []
        if not isinstance(also, list):
            raise SystemExit(f"families: job {index} also must be a list")
        for alt_index, alt in enumerate(also):
            if not isinstance(alt, dict) or not alt_required.issubset(alt):
                raise SystemExit(f"families: job {index} also {alt_index} missing keys")
            validate_match_fields(alt, f"job {index} also {alt_index}")
    return jobs


def validate_match_fields(item, label):
    if "exclude" in item and not isinstance(item["exclude"], list):
        raise SystemExit(f"families: {label} exclude must be a list")
    if "require" in item and not isinstance(item["require"], str):
        raise SystemExit(f"families: {label} require must be a string")
    tasks = item.get("tasks")
    if not isinstance(tasks, list) or not tasks or not all(isinstance(task, str) and task.strip() for task in tasks):
        raise SystemExit(f"families: {label} tasks must be a non-empty list of strings")


def fetch_catalog():
    request = urllib.request.Request(
        CATALOG_URL,
        headers={"User-Agent": "llm-wall-card/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise SystemExit(f"catalog: HTTP {response.status}")
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError) as error:
        raise SystemExit(f"catalog: {error}") from error
    rows = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        raise SystemExit("catalog: data must be a list")
    return [row for row in rows if isinstance(row, dict) and row.get("id")]


def is_skipped(model_id, extra_exclude):
    if model_id.startswith("~") or ":batch" in model_id:
        return True
    return any(token in model_id for token in extra_exclude)


def matches(model_id, job):
    if not model_id.startswith(job["match"]):
        return False
    require = job.get("require")
    if require and require not in model_id:
        return False
    return not is_skipped(model_id, job.get("exclude") or [])


def pick_latest(catalog, job):
    candidates = [row for row in catalog if matches(row["id"], job)]
    if not candidates:
        return None
    return max(candidates, key=lambda row: row.get("created") or 0)


def display_name(row, fallback):
    name = (row or {}).get("name") or ""
    for prefix in NAME_PREFIXES:
        if name.startswith(prefix):
            name = name[len(prefix) :]
            break
    if "(" in name and name.endswith(")"):
        inner = name[name.rfind("(") + 1 : -1].strip()
        if inner:
            name = inner
    parts = name.split()
    if len(parts) > 1 and parts[-1].isdigit() and len(parts[-1]) == 4:
        name = " ".join(parts[:-1])
    return name or fallback


def resolve_pick(spec, catalog):
    row = pick_latest(catalog, spec)
    if row is None:
        return {
            "model": spec["label"],
            "modelId": spec["match"],
            "why": spec["why"],
            "tasks": spec["tasks"],
            "stale": True,
        }, spec["match"]
    return {
        "model": display_name(row, spec["label"]),
        "modelId": row["id"],
        "why": spec["why"],
        "tasks": spec["tasks"],
        "stale": False,
    }, None


def resolve_card(jobs, catalog):
    resolved = []
    stale_ids = []
    for job in jobs:
        primary, stale_id = resolve_pick(job, catalog)
        if stale_id:
            stale_ids.append(stale_id)
        also = []
        for alt in job.get("also") or []:
            item, alt_stale = resolve_pick(alt, catalog)
            if alt_stale:
                stale_ids.append(alt_stale)
            also.append(item)
        resolved.append(
            {
                "id": job["id"],
                "job": job["job"],
                "model": primary["model"],
                "modelId": primary["modelId"],
                "why": primary["why"],
                "tasks": primary["tasks"],
                "stale": primary["stale"],
                "also": also,
            }
        )
    return {
        "updatedAt": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": "openrouter",
        "jobs": resolved,
    }, stale_ids


def write_card(card):
    body = "window.CARD = " + json.dumps(card, indent=2) + ";\n"
    tmp = CARD_PATH.with_suffix(".js.tmp")
    tmp.write_text(body)
    os.replace(tmp, CARD_PATH)


def main():
    try:
        jobs = load_families()
        catalog = fetch_catalog()
    except SystemExit as error:
        message = error.code if isinstance(error.code, str) else str(error)
        print(message, file=sys.stderr)
        raise SystemExit(1) from error
    card, stale_ids = resolve_card(jobs, catalog)
    write_card(card)
    if stale_ids:
        print("stale: " + ",".join(stale_ids))
        raise SystemExit(2)
    print("ok")


if __name__ == "__main__":
    main()
