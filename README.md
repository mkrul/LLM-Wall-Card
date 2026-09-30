# LLM Wall Card

Desktop card for which AI model to use for which job, the latest published scores for those models, and a short news feed.

The card stays 500 wide and 564 tall on **Cheat sheet**, **Benchmarks**, and **News feed**. Anything past that scrolls. The first time it opens, it sits at the top left of your tallest screen. After you move it, it stays there, including after the computer sleeps. Switching views does not move the window or change its height. If the screen is shorter than the card, the card shrinks to fit.

**Cheat sheet** lists each job in bold, the current best model under it, and one plain sentence about when to use it. Hover a row and the tooltip slides out to the right. **Benchmarks** lists each of those models once, with the price, the speed, and a plain line about where it stands among the models on the card. **News feed** replaces that list with current reports about models and AI. Click a headline to open it. The sentences are meant to be readable without insider shorthand.

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

The refresh icon beside the last-updated line reloads the view you are on. On the cheat sheet it asks OpenRouter for the current model names. On Benchmarks it loads the latest published scores. On the news feed it gathers the day's reports. If the cheat sheet is already more than a week old when you open the card, that update runs then too. If the benchmark file is already more than a day old, it updates then too. If the news file is already more than 20 hours old, it updates then too. An open window reloads when any of those files changes.

## What a refresh does

`scripts/refresh.py` asks [OpenRouter](https://openrouter.ai/api/v1/models) for the current catalog and picks the latest model that matches each job in `data/families.json`.

It updates the model name. It does not rewrite the job titles or the “why” lines. Those stay yours. Edit them in `data/families.json` when the advice goes stale.

If OpenRouter is down, the last good card still opens. Use the refresh icon on the cheat sheet to run this again.

## Benchmarks

`scripts/benchmarks.py` reads the language leaderboard published by [Artificial Analysis](https://artificialanalysis.ai/leaderboards/models). It keeps one row for each model on the cheat sheet, in the order that model first appears there. The gold line says where that model stands among the others on the card: best for coding, hard questions, long documents, office work, questions about pictures, or following instructions. The gray line is the published price and speed. Click a row to open that model. The Artificial Analysis name under the tabs opens the leaderboard. Both of those addresses are written again on every refresh.

When a model is published in more than one reasoning effort, the row uses the strongest published effort, and says so in plain words when that effort is not the maximum. Image models and other names with no language comparison say so.

The prices, speeds, and comparisons come from their published numbers. The card does not invent them. If the leaderboard cannot be read, the last good list stays. Use the refresh icon on Benchmarks to run this again. The open window then loads that new file instead of a cached copy.

## AI news

`scripts/news.py` reads public reports from The Verge, TechCrunch, OpenAI, Google, Simon Willison, MIT Technology Review, and Ars Technica. For open models it also reads Hugging Face, Mistral, Qwen, Ollama, Interconnects, Together, and Ahead of AI. It keeps items about models and AI from the last few days, and holds one slot for an open-model report from the past week when the rest of the list would otherwise leave that out.

The sentences are written by the model on the **Fast and low cost** row (Gemini Flash, unless a newer match replaces it). That row is for a pile of short summaries, which is what a daily news pass is. It does not use the models kept for hard coding or long documents.

That write step needs an OpenRouter key in `~/.config/llm-cheat-sheet/openrouter.key`, or in the `OPENROUTER_API_KEY` environment variable. One line, the key only. Without it, the headlines and the publications' own sentences still update every day. The card does not invent news.

Use the refresh icon on the news feed to run this again.

The speaker at the right of a story reads that article aloud. Audio is made only when you click that speaker, through your ElevenLabs account. Clicking the speaker while it is playing stops it. Clicking it while it is paused starts it again. While the audio is being made, a circle with a slash appears beside the speaker and cancels that request. While it is playing, a pause button appears there and holds the playback. Click the bar under the speaker, or drag along it, to move to another point in the clip. That works while it is playing and while it is paused. A later click on a story you have already heard replays the saved audio and does not call ElevenLabs again, unless the voice or the speed has changed. Playback continues while another app is in front, as long as this card is still open.

On the News feed, a voice menu and a speed field sit to the right of the Cheat sheet / Benchmarks / News feed switch. On the cheat sheet and on Benchmarks that slot stays empty, so the tabs do not grow. The menu lists your voices, shared voices, and standard voices, by name only. The speed runs from 0.7 to 1.2. The chosen voice is saved in `~/.config/llm-cheat-sheet/elevenlabs.voice`. The speed is saved in `~/.config/llm-cheat-sheet/elevenlabs.speed`.

Put the ElevenLabs key on one line in `~/.config/llm-cheat-sheet/elevenlabs.key`, or in the `ELEVENLABS_API_KEY` environment variable. Do not paste the key into the chat. Speaking needs the Text to Speech permission. The voice menu also needs Voices read on that same key. If the menu cannot load, speaking still works with the saved voice. If no voice has been saved, the card uses a standard reading voice.

Before it speaks, the card takes the article text from the page. The OpenAI model on the **Many short tasks** row then drops advertisements, subscription lines, related stories, and other page material, and keeps the article’s own wording. It does not add facts or shorten the story. That step needs an OpenAI key in `~/.config/llm-cheat-sheet/openai.key`, or in the `OPENAI_API_KEY` environment variable. Without that key, it reads the page text it gathered. A very long article is cut off after about 40,000 characters. This listening step is separate from the daily news sentences, which still use OpenRouter.

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
data/benchmarks.js        last published scores (written daily)
data/news.js              last news list (written daily)
scripts/refresh.py
scripts/benchmarks.py
scripts/news.py
scripts/speak.py           reads one article aloud when its speaker is clicked
scripts/voices.py          lists ElevenLabs voices for the News feed menu
scripts/catch-up.py       runs news if it is stale, and the card if it is a week old
scripts/install-weekly-refresh.sh  old Sunday timer, no longer installed
scripts/install-daily-news.sh    old morning timer, no longer installed
scripts/make-desktop-app.sh
```
