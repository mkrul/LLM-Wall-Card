# LLM Cheat Sheet

Desktop cheat sheet for which AI model to use for which job.

A 400×700 window you park on a second monitor. Each row is a job in bold, the current best model under it, and one plain line about when to use it. Hover a row and the tooltip slides out to the right with the other strong models for that job.

## Requirements

- macOS
- Python 3
- Xcode Command Line Tools (`swiftc`) to rebuild the app

## Start it

Double-click **LLM Cheat Sheet** on your Desktop.

If that shortcut is missing:

```bash
./scripts/make-desktop-app.sh
```

That builds `LLM Cheat Sheet.app` in this folder and puts a shortcut on your Desktop.

You can also run:

```bash
./launch.sh
```

Opening the card also refreshes the model names. A weekly job does the same every Sunday at 7:00 so you do not have to.

## What a refresh does

`scripts/refresh.py` asks [OpenRouter](https://openrouter.ai/api/v1/models) for the current catalog and picks the latest model that matches each job in `data/families.json`.

It updates the model name. It does not rewrite the job titles or the “why” lines. Those stay yours.

If OpenRouter is down, the last good card still opens.

The Sunday job is installed by `scripts/install-weekly-refresh.sh`. `make-desktop-app.sh` runs that for you.

## Change the jobs

Edit `data/families.json`. Each job looks like this:

```json
{
  "id": "brainstorming",
  "job": "Brainstorming",
  "match": "anthropic/claude-opus",
  "label": "Claude Opus 5",
  "why": "Names, pitches, and half-formed product ideas",
  "tasks": [
    "Product names and taglines",
    "Pitch angles and positioning"
  ]
}
```

| Field | Purpose |
|---|---|
| `job` | Bold line on the card. The thing you want to do. |
| `why` | One plain sentence under the model. |
| `match` | OpenRouter id prefix used to find the latest model. |
| `require` | Optional substring the id must contain. |
| `exclude` | Optional substrings to skip (`:batch` is always skipped). |
| `label` | Fallback name if no catalog match is found. |
| `also` | Optional extra models for the hover list. Same fields as above. |
| `tasks` | Concrete jobs that model is good at. Shown in the hover list. |

Then run `python3 scripts/refresh.py`, or just open the card again.


## Layout

```
launch.sh                 opens the app
macos/App.swift           native window
LLM Cheat Sheet.app       built app
assets/icon.icns          Dock icon
index.html                the card
css/card.css
js/app.js
data/families.json        jobs you edit
data/card-data.js         last resolved card (written by refresh)
scripts/refresh.py
scripts/install-weekly-refresh.sh
scripts/make-desktop-app.sh
```
