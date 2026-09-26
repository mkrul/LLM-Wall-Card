# LLM Wall Card

Desktop card for which AI model to use for which job, and a short news feed.

A narrow window on your tallest screen, tall enough for five jobs. The rest of the list scrolls. **Cheat sheet** lists each job in bold, the current best model under it, and one plain sentence about when to use it. Hover a row and the tooltip slides out to the right. **News feed** replaces that list with current reports about models and AI. Click a headline to open it. The sentences are meant to be readable without insider shorthand.

## Requirements

- macOS
- Python 3
- Xcode Command Line Tools (`swiftc`) to rebuild the app

## Start it

Double-click **LLM Wall Card** on your Desktop.

If that shortcut is missing:

```bash
./scripts/make-desktop-app.sh
```

That builds `LLM Wall Card.app` in this folder and puts a shortcut on your Desktop.

You can also run:

```bash
./launch.sh
```

The job list updates weekly, every Sunday at 7:00. If the card is already more than a week old when you open it, that update runs then too.

The news feed updates every day at 7:15. If that file is already more than 20 hours old when you open the card, it updates then too. An open window reloads when either file changes.

## What a refresh does

`scripts/refresh.py` asks [OpenRouter](https://openrouter.ai/api/v1/models) for the current catalog and picks the latest model that matches each job in `data/families.json`.

It updates the model name. It does not rewrite the job titles or the “why” lines. Those stay yours. Edit them in `data/families.json` when the advice goes stale.

If OpenRouter is down, the last good card still opens.

The Sunday job is installed by `scripts/install-weekly-refresh.sh`. `make-desktop-app.sh` runs that for you.

## AI news

`scripts/news.py` reads public reports from The Verge, TechCrunch, OpenAI, Google, Simon Willison, MIT Technology Review, and Ars Technica. For open models it also reads Hugging Face, Mistral, Qwen, Ollama, Interconnects, Together, and Ahead of AI. It keeps items about models and AI from the last few days, and holds one slot for an open-model report from the past week when the rest of the list would otherwise leave that out.

The sentences are written by the model on the **Fast and low cost** row (Gemini Flash, unless a newer match replaces it). That row is for a pile of short summaries, which is what a daily news pass is. It does not use the models kept for hard coding or long documents.

That write step needs an OpenRouter key in `~/.config/llm-cheat-sheet/openrouter.key`, or in the `OPENROUTER_API_KEY` environment variable. One line, the key only. Without it, the headlines and the publications' own sentences still update every day. The card does not invent news.

The daily job is installed by `scripts/install-daily-news.sh`.

The speaker at the right of a story reads that article aloud. Audio is made only when you click that speaker, through your ElevenLabs account. A second click on the same story stops it. Clicking it again later replays the saved audio and does not call ElevenLabs a second time. Playback continues while another app is in front, as long as this card is still open.

Put the ElevenLabs key on one line in `~/.config/llm-cheat-sheet/elevenlabs.key`. Do not paste the key into the chat. A different voice can go on one line in `~/.config/llm-cheat-sheet/elevenlabs.voice`, using the voice id from the ElevenLabs voice list. If that file is missing, the card uses a standard reading voice. A long article plays about the first twenty minutes.

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

Write the `why` lines and `tasks` in plain sentences. If a word only makes sense to someone who already knows the model scene, replace it.

Then run `python3 scripts/refresh.py`. Opening the card updates the model names if the list is already more than a week old.


## Layout

```
launch.sh                 opens the app
macos/App.swift           native window
LLM Wall Card.app          built app
assets/icon.icns          Dock icon
index.html                the card
css/card.css
js/app.js
data/families.json        jobs you edit
data/card-data.js         last resolved card (written weekly)
data/news.js              last news list (written daily)
scripts/refresh.py
scripts/news.py
scripts/speak.py           reads one article aloud when its speaker is clicked
scripts/catch-up.py       runs news if it is stale, and the card if it is a week old
scripts/install-weekly-refresh.sh
scripts/install-daily-news.sh
scripts/make-desktop-app.sh
```
