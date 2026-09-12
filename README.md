# LLM Wall

Desktop cheat sheet for which AI model to use for which job.

A 400×700 window you park on a second monitor. Each row is a job in bold, the current best model under it, and one plain line about when to use it.

## Requirements

- macOS
- Python 3
- Chrome, Chromium, or Brave (Chrome first)

## Start it

Double-click **LLM Wall** on your Desktop.

If that shortcut is missing:

```bash
./scripts/make-desktop-app.sh
```

That builds `LLM Wall.app` in this folder and puts a shortcut on your Desktop.

You can also run:

```bash
./launch.sh
```

Both refresh the model names, then open the card.

## What a refresh does

`scripts/refresh.py` asks [OpenRouter](https://openrouter.ai/api/v1/models) for the current catalog and picks the latest model that matches each job in `data/families.json`.

It updates the model name. It does not rewrite the job titles or the “why” lines. Those stay yours.

If OpenRouter is down, the last good card still opens.

Manual refresh:

```bash
python3 scripts/refresh.py
```

Then hit **Reload** in the window, or launch again.

## Change the jobs

Edit `data/families.json`. Each job looks like this:

```json
{
  "id": "brainstorming",
  "job": "Brainstorming",
  "match": "anthropic/claude-opus",
  "label": "Claude Opus 5",
  "why": "New ideas and messy exploration"
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

Then run `python3 scripts/refresh.py` and reload the card.


## Layout

```
launch.sh                 opens the window
index.html                the card
css/card.css
js/app.js
data/families.json        jobs you edit
data/card-data.js         last resolved card (written by refresh)
scripts/refresh.py
scripts/make-desktop-app.sh
```
