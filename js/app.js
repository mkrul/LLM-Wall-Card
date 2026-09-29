function formatUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "";
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

const VIEW_KEY = "llm-wall-card-view";
let view = "sheet";

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "news" ? "news" : "sheet";
  } catch (error) {
    return "sheet";
  }
}

function writeView(next) {
  try {
    localStorage.setItem(VIEW_KEY, next);
  } catch (error) {
    return;
  }
}

function setToggle(next) {
  const sheetButton = document.getElementById("view-sheet");
  const newsButton = document.getElementById("view-news");
  if (sheetButton) {
    sheetButton.setAttribute("aria-pressed", next === "sheet" ? "true" : "false");
  }
  if (newsButton) {
    newsButton.setAttribute("aria-pressed", next === "news" ? "true" : "false");
  }
}

function showStamp() {
  const updatedAt = document.getElementById("updated-at");
  if (!updatedAt) {
    return;
  }
  updatedAt.classList.remove("is-error");
  if (view === "news") {
    updatedAt.textContent = window.NEWS && window.NEWS.updatedAt
      ? `Last updated: ${formatUpdatedAt(window.NEWS.updatedAt)}`
      : "";
    return;
  }
  const card = window.CARD;
  if (!card || !Array.isArray(card.jobs)) {
    updatedAt.textContent = "No card data";
    return;
  }
  const staleCount = card.jobs.filter((job) => job.stale).length;
  const stamped = `Last updated: ${formatUpdatedAt(card.updatedAt)}`;
  updatedAt.textContent = staleCount ? `${stamped} · ${staleCount} stale` : stamped;
}

function applyView() {
  const jobsEl = document.getElementById("jobs");
  const news = document.getElementById("news");
  const sheet = view !== "news";
  if (jobsEl) {
    jobsEl.hidden = !sheet;
  }
  if (news) {
    news.hidden = sheet;
  }
  const voice = document.getElementById("voice");
  const speed = document.getElementById("speed");
  if (voice) {
    voice.hidden = sheet;
  }
  if (speed) {
    speed.hidden = sheet;
  }
  setToggle(view);
  showStamp();
  const refresh = document.getElementById("refresh");
  if (refresh && !refresh.classList.contains("is-busy")) {
    refresh.setAttribute("aria-label", refreshLabel());
  }
}

function refreshLabel() {
  return view === "news" ? "Refresh the news feed" : "Refresh the cheat sheet";
}

function refreshCurrent() {
  const button = document.getElementById("refresh");
  if (button && button.disabled) {
    return;
  }
  const handler = tipHandler();
  if (!handler) {
    window.setRefreshState("idle", "Refreshing runs in the LLM Wall Card app.");
    return;
  }
  window.setRefreshState("busy", "");
  handler.postMessage({ refresh: view === "news" ? "news" : "sheet" });
}

let newsRefreshing = false;

window.setRefreshState = function (state, message) {
  const button = document.getElementById("refresh");
  const updatedAt = document.getElementById("updated-at");
  const busy = state === "busy";
  newsRefreshing = busy && view === "news";
  paintNewsRefresh();
  if (button) {
    button.disabled = busy;
    button.classList.toggle("is-busy", busy);
    button.setAttribute("aria-label", busy ? "Refreshing" : refreshLabel());
  }
  if (busy) {
    if (updatedAt) {
      updatedAt.classList.remove("is-error");
    }
    return;
  }
  if (message && updatedAt) {
    updatedAt.textContent = message;
    updatedAt.classList.add("is-error");
    return;
  }
  if (updatedAt) {
    updatedAt.classList.remove("is-error");
  }
  showStamp();
};

function paintNewsRefresh() {
  const news = document.getElementById("news");
  if (news) {
    news.classList.toggle("is-refreshing", newsRefreshing);
  }
  document.querySelectorAll("#news-list button").forEach((button) => {
    button.disabled = newsRefreshing;
  });
}

function renderCard(card) {
  const jobsEl = document.getElementById("jobs");
  if (!jobsEl) {
    return;
  }
  if (!card || !Array.isArray(card.jobs)) {
    jobsEl.replaceChildren();
    return;
  }
  const fragment = document.createDocumentFragment();
  card.jobs.forEach((job) => {
    const li = document.createElement("li");
    if (job.stale) {
      li.className = "stale";
    }
    const jobLine = document.createElement("div");
    jobLine.className = "job";
    jobLine.textContent = job.job || "";
    const modelLine = document.createElement("div");
    modelLine.className = "model";
    modelLine.textContent = job.model || "";
    if (job.stale) {
      const mark = document.createElement("span");
      mark.className = "stale-mark";
      mark.textContent = " STALE";
      modelLine.appendChild(mark);
    }
    const whyLine = document.createElement("div");
    whyLine.className = "why";
    whyLine.textContent = job.why || "";
    const picks = [
      {
        model: job.model,
        why: job.why,
        tasks: job.tasks,
        stale: job.stale
      },
      ...((job.also || []).filter((item) => item && item.model))
    ];
    li.append(jobLine, modelLine, whyLine);
    li.addEventListener("mouseenter", () => showTooltip(li, picks, "Best for this"));
    li.addEventListener("mouseleave", scheduleHideTooltip);
    fragment.appendChild(li);
  });
  jobsEl.replaceChildren(fragment);
}

function chooseView(next) {
  view = next === "news" ? "news" : "sheet";
  writeView(view);
  hideTooltip();
  applyView();
  requestAnimationFrame(() => requestAnimationFrame(fitWindowToContent));
}

function tooltipRoot() {
  let tip = document.getElementById("tooltip");
  if (tip) {
    return tip;
  }
  tip = document.createElement("div");
  tip.id = "tooltip";
  tip.className = "tooltip";
  tip.addEventListener("mouseenter", cancelHideTooltip);
  tip.addEventListener("mouseleave", scheduleHideTooltip);
  document.body.appendChild(tip);
  return tip;
}

function buildTooltip(picks, headingText) {
  const tip = document.createElement("div");
  const heading = document.createElement("div");
  heading.className = "tooltip-heading";
  heading.textContent = headingText || "Best for this";
  tip.appendChild(heading);
  picks.forEach((pick) => {
    const row = document.createElement("div");
    row.className = "tooltip-row";
    const name = document.createElement("div");
    name.className = "tooltip-model";
    name.textContent = pick.model || "";
    const tasks = Array.isArray(pick.tasks) && pick.tasks.length
      ? pick.tasks
      : (pick.why ? [pick.why] : []);
    const list = document.createElement("ul");
    list.className = "tooltip-tasks";
    tasks.forEach((task) => {
      const item = document.createElement("li");
      item.textContent = task;
      list.appendChild(item);
    });
    row.append(name, list);
    tip.appendChild(row);
  });
  return tip;
}

const CARD_WIDTH = 400;
const TIP_WIDTH = 320;
const TIP_GAP = 8;

let hideTimer = 0;

function tipHandler() {
  return window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.card;
}

function renderNews(news) {
  const credit = document.getElementById("news-by");
  const list = document.getElementById("news-list");
  const items = news && Array.isArray(news.items) ? news.items : [];
  if (!credit || !list) {
    return;
  }
  credit.textContent = news && news.model ? `Written by ${news.model}` : "";
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "news-empty";
    empty.textContent = "No reports yet.";
    list.replaceChildren(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const li = document.createElement("li");
    if (item.url) {
      li.dataset.url = item.url;
    }
    const copy = document.createElement("div");
    copy.className = "news-copy";
    const title = document.createElement("div");
    title.className = "news-title";
    title.textContent = item.title || "";
    copy.appendChild(title);
    if (item.detail) {
      const detail = document.createElement("div");
      detail.className = "news-detail";
      detail.textContent = item.detail;
      copy.appendChild(detail);
    }
    const source = document.createElement("div");
    source.className = "news-source";
    source.textContent = item.source || "";
    copy.appendChild(source);
    li.appendChild(copy);
    if (item.url) {
      const actions = document.createElement("div");
      actions.className = "news-actions";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "news-speak";
      button.dataset.url = item.url;
      button.setAttribute("aria-label", "Listen to this article");
      button.appendChild(speakerIcon());
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSpeech(item);
      });
      const pause = document.createElement("button");
      pause.type = "button";
      pause.className = "news-pause";
      pause.dataset.url = item.url;
      pause.setAttribute("aria-label", "Pause reading");
      pause.appendChild(pauseIcon());
      pause.appendChild(resumeIcon());
      pause.addEventListener("click", (event) => {
        event.stopPropagation();
        pauseSpeech(item);
      });
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "news-cancel";
      cancel.dataset.url = item.url;
      cancel.setAttribute("aria-label", "Cancel audio");
      cancel.appendChild(cancelIcon());
      cancel.addEventListener("click", (event) => {
        event.stopPropagation();
        cancelSpeech(item);
      });
      const extra = document.createElement("div");
      extra.className = "news-extra";
      extra.append(pause, cancel);
      const controls = document.createElement("div");
      controls.className = "news-controls";
      controls.append(button, extra);
      const progress = document.createElement("div");
      progress.className = "news-progress";
      progress.dataset.url = item.url;
      progress.hidden = true;
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", "100");
      progress.setAttribute("aria-valuenow", "0");
      progress.setAttribute("aria-label", "Playback position");
      progress.appendChild(document.createElement("span"));
      actions.append(controls, progress);
      li.appendChild(actions);
      li.addEventListener("click", () => openLink(item.url));
    }
    fragment.appendChild(li);
  });
  list.replaceChildren(fragment);
  paintSeen();
  paintSpeech();
}

let speechURL = "";
let speechState = "idle";
let speechProgress = 0;

function speakerIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
  body.setAttribute("fill", "currentColor");
  body.setAttribute("d", "M3 9v6h4l5 4V5L7 9H3z");
  const wave = document.createElementNS("http://www.w3.org/2000/svg", "path");
  wave.setAttribute("fill", "none");
  wave.setAttribute("stroke", "currentColor");
  wave.setAttribute("stroke-width", "2");
  wave.setAttribute("d", "M16.5 8.5a5 5 0 010 7");
  svg.append(body, wave);
  return svg;
}

function pauseIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("is-pause");
  const left = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  left.setAttribute("x", "6");
  left.setAttribute("y", "5");
  left.setAttribute("width", "4");
  left.setAttribute("height", "14");
  left.setAttribute("rx", "1");
  left.setAttribute("fill", "currentColor");
  const right = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  right.setAttribute("x", "14");
  right.setAttribute("y", "5");
  right.setAttribute("width", "4");
  right.setAttribute("height", "14");
  right.setAttribute("rx", "1");
  right.setAttribute("fill", "currentColor");
  svg.append(left, right);
  return svg;
}

function resumeIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("is-resume");
  const triangle = document.createElementNS("http://www.w3.org/2000/svg", "path");
  triangle.setAttribute("fill", "currentColor");
  triangle.setAttribute("d", "M8 5v14l11-7z");
  svg.appendChild(triangle);
  return svg;
}

function cancelIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  ring.setAttribute("cx", "12");
  ring.setAttribute("cy", "12");
  ring.setAttribute("r", "8");
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "currentColor");
  ring.setAttribute("stroke-width", "2");
  const slash = document.createElementNS("http://www.w3.org/2000/svg", "path");
  slash.setAttribute("fill", "none");
  slash.setAttribute("stroke", "currentColor");
  slash.setAttribute("stroke-width", "2");
  slash.setAttribute("stroke-linecap", "round");
  slash.setAttribute("d", "M7.2 16.8L16.8 7.2");
  svg.append(ring, slash);
  return svg;
}

function toggleSpeech(item) {
  if (newsRefreshing) {
    return;
  }
  const handler = tipHandler();
  if (!handler) {
    window.setSpeechState(item.url, "idle", "Listening runs in the LLM Wall Card app.");
    return;
  }
  const same = speechURL === item.url;
  if (!same || speechState === "idle") {
    window.setSpeechState(item.url, "loading", "");
  }
  handler.postMessage({
    speak: {
      url: item.url,
      title: item.title || "",
      detail: item.detail || ""
    }
  });
}

function pauseSpeech(item) {
  if (newsRefreshing) {
    return;
  }
  if (speechURL !== item.url || (speechState !== "playing" && speechState !== "paused")) {
    return;
  }
  const handler = tipHandler();
  if (!handler) {
    window.setSpeechState(item.url, speechState === "playing" ? "paused" : "playing", "");
    return;
  }
  handler.postMessage({ pause: item.url });
}

function cancelSpeech(item) {
  if (newsRefreshing) {
    return;
  }
  if (speechURL !== item.url || speechState !== "loading") {
    return;
  }
  const handler = tipHandler();
  if (!handler) {
    window.setSpeechState(item.url, "idle", "");
    return;
  }
  handler.postMessage({ cancel: item.url });
}

window.setSpeechState = function (url, state, message) {
  speechURL = state === "idle" ? "" : url;
  speechState = state;
  if (state === "idle" || state === "loading") {
    speechProgress = 0;
  }
  const note = document.getElementById("news-speak-note");
  if (note) {
    note.textContent = message || "";
  }
  paintSpeech();
  if (state === "playing") {
    markSeen(url);
  }
};

function paintSpeech() {
  document.querySelectorAll(".news-speak").forEach((button) => {
    const active = button.dataset.url === speechURL && speechState !== "idle";
    const loading = active && speechState === "loading";
    button.classList.toggle("is-playing", active && speechState === "playing");
    button.classList.toggle("is-loading", loading);
    button.setAttribute("aria-busy", loading ? "true" : "false");
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (loading) {
      button.setAttribute("aria-label", "Preparing the audio");
      button.title = "Preparing the audio";
    } else if (active && speechState === "playing") {
      button.removeAttribute("title");
      button.setAttribute("aria-label", "Stop reading");
    } else if (active && speechState === "paused") {
      button.removeAttribute("title");
      button.setAttribute("aria-label", "Resume reading");
    } else {
      button.removeAttribute("title");
      button.setAttribute("aria-label", "Listen to this article");
    }
  });
  document.querySelectorAll(".news-pause").forEach((button) => {
    const playing = button.dataset.url === speechURL && speechState === "playing";
    const paused = button.dataset.url === speechURL && speechState === "paused";
    button.classList.toggle("is-shown", playing || paused);
    button.classList.toggle("is-paused", paused);
    button.tabIndex = playing || paused ? 0 : -1;
    button.setAttribute("aria-label", paused ? "Resume reading" : "Pause reading");
  });
  document.querySelectorAll(".news-cancel").forEach((button) => {
    const loading = button.dataset.url === speechURL && speechState === "loading";
    button.classList.toggle("is-shown", loading);
    button.tabIndex = loading ? 0 : -1;
  });
  paintProgress();
}

window.setSpeechProgress = function (url, fraction) {
  if (url !== speechURL) {
    return;
  }
  const value = Number(fraction);
  if (!Number.isFinite(value)) {
    return;
  }
  speechProgress = Math.min(1, Math.max(0, value));
  paintProgress();
};

function paintProgress() {
  const listening = speechState === "playing" || speechState === "paused";
  document.querySelectorAll(".news-progress").forEach((bar) => {
    const active = listening && bar.dataset.url === speechURL;
    bar.hidden = !active;
    const percent = active ? Math.round(speechProgress * 1000) / 10 : 0;
    bar.setAttribute("aria-valuenow", String(Math.round(percent)));
    const fill = bar.firstElementChild;
    if (fill) {
      fill.style.width = `${percent}%`;
    }
  });
}

function voiceLabel(name) {
  const clean = String(name || "").replace(/\s+/g, " ").trim();
  const label = clean.split(/\s+(?:—|–|-|\|)\s+/)[0].trim();
  return (label || clean).slice(0, 40);
}

function applySpeed(payload) {
  const speed = document.getElementById("speed");
  if (!speed || !payload || typeof payload.speed !== "number" || !Number.isFinite(payload.speed)) {
    return;
  }
  const shown = Math.min(1.2, Math.max(0.7, Math.round(payload.speed * 10) / 10));
  speed.value = shown.toFixed(1);
}

function chooseSpeed(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return;
  }
  const speed = Math.min(1.2, Math.max(0.7, Math.round(value * 10) / 10));
  const field = document.getElementById("speed");
  if (field) {
    field.value = speed.toFixed(1);
  }
  const handler = tipHandler();
  if (handler) {
    handler.postMessage({ speed });
  }
}

function chooseVoice(id) {
  if (!id) {
    return;
  }
  const handler = tipHandler();
  if (handler) {
    handler.postMessage({ voice: id });
  }
}

window.setVoices = function (payload) {
  applySpeed(payload);
  const select = document.getElementById("voice");
  if (!select || !payload) {
    return;
  }
  const voices = Array.isArray(payload.voices) ? payload.voices : [];
  select.replaceChildren();
  if (payload.error) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = payload.error;
    select.appendChild(option);
    select.disabled = true;
    select.title = payload.error === "Needs Voices read"
      ? "Edit this ElevenLabs key and turn on Voices read. Then reopen the card."
      : payload.error;
    return;
  }
  select.disabled = false;
  select.title = "Reading voice";
  const groups = [
    ["yours", "Your voices"],
    ["shared", "Shared voices"],
    ["standard", "Standard voices"]
  ];
  groups.forEach(([kind, label]) => {
    const rows = voices.filter((voice) => voice.kind === kind && voice.id && voice.name);
    if (!rows.length) {
      return;
    }
    const group = document.createElement("optgroup");
    group.label = label;
    rows.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.id;
      option.textContent = voiceLabel(voice.name);
      group.appendChild(option);
    });
    select.appendChild(group);
  });
  if (!select.options.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No voices found";
    select.appendChild(option);
    select.disabled = true;
    return;
  }
  const known = new Set([...select.options].map((option) => option.value));
  if (payload.selected && !known.has(payload.selected)) {
    const option = document.createElement("option");
    option.value = payload.selected;
    option.textContent = "Saved voice";
    select.insertBefore(option, select.firstChild);
  }
  if (payload.selected && [...select.options].some((option) => option.value === payload.selected)) {
    select.value = payload.selected;
  }
};

function openLink(url) {
  if (newsRefreshing) {
    return;
  }
  markSeen(url);
  const handler = tipHandler();
  if (handler) {
    handler.postMessage({ url });
    return;
  }
  window.open(url, "_blank", "noopener");
}

const SEEN_KEY = "llm-wall-card-seen";
const seenStories = new Set();

function loadSeen() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return;
    }
    parsed.forEach((url) => {
      if (typeof url === "string" && url) {
        seenStories.add(url);
      }
    });
  } catch (error) {
    return;
  }
}

function markSeen(url) {
  if (!url || seenStories.has(url)) {
    return;
  }
  seenStories.add(url);
  const rows = [...seenStories].slice(-300);
  seenStories.clear();
  rows.forEach((row) => seenStories.add(row));
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(rows));
  } catch (error) {
    seenStories.add(url);
  }
  paintSeen();
}

function paintSeen() {
  document.querySelectorAll("#news-list li").forEach((row) => {
    row.classList.toggle("is-seen", !!(row.dataset.url && seenStories.has(row.dataset.url)));
  });
}

loadSeen();

const VISIBLE_TASKS = 5;

function contentHeight() {
  const card = document.querySelector(".card");
  const header = document.querySelector("header");
  const jobs = document.getElementById("jobs");
  if (!card || !header || !jobs) {
    return 0;
  }
  const cardStyle = getComputedStyle(card);
  const pad = (parseFloat(cardStyle.paddingTop) || 0) + (parseFloat(cardStyle.paddingBottom) || 0);
  const headerGap = parseFloat(getComputedStyle(header).marginBottom) || 0;
  let bodyHeight = 0;
  const news = document.getElementById("news");
  if (news && !news.hidden) {
    bodyHeight = news.offsetHeight + (parseFloat(getComputedStyle(news).marginTop) || 0);
  } else {
    const rows = jobs.querySelectorAll("li");
    const count = Math.min(VISIBLE_TASKS, rows.length);
    for (let index = 0; index < count; index += 1) {
      bodyHeight += rows[index].offsetHeight;
    }
  }
  return Math.ceil(pad + header.offsetHeight + headerGap + bodyHeight);
}

function fitWindowToContent() {
  const height = contentHeight();
  const handler = tipHandler();
  if (!height || !handler) {
    return;
  }
  handler.postMessage({ fit: height });
}

function setTipSpace(open) {
  const handler = tipHandler();
  if (handler) {
    handler.postMessage({ open: !!open });
    return;
  }
  const height = window.outerHeight || 1100;
  window.resizeTo(open ? CARD_WIDTH + TIP_GAP + TIP_WIDTH : CARD_WIDTH, height);
}

function showTooltip(li, picks, headingText) {
  cancelHideTooltip();
  const tip = tooltipRoot();
  const next = buildTooltip(picks, headingText);
  tip.replaceChildren(...next.childNodes);
  setTipSpace(true);
  tip.classList.add("is-open");
  tip.style.width = `${TIP_WIDTH}px`;
  tip.style.left = `${CARD_WIDTH + TIP_GAP}px`;
  const row = li.getBoundingClientRect();
  const tipHeight = tip.offsetHeight;
  const maxTop = Math.max(8, window.innerHeight - tipHeight - 8);
  let top = row.top;
  if (top > maxTop) {
    top = maxTop;
  }
  if (top < 8) {
    top = 8;
  }
  tip.style.top = `${top}px`;
}

function hideTooltip() {
  const tip = document.getElementById("tooltip");
  if (tip) {
    tip.classList.remove("is-open");
  }
  setTipSpace(false);
}

function cancelHideTooltip() {
  window.clearTimeout(hideTimer);
}

function scheduleHideTooltip() {
  cancelHideTooltip();
  hideTimer = window.setTimeout(hideTooltip, 120);
}

document.addEventListener("DOMContentLoaded", () => {
  view = readView();
  setToggle(view);
  const sheetButton = document.getElementById("view-sheet");
  const newsButton = document.getElementById("view-news");
  if (sheetButton) {
    sheetButton.addEventListener("click", () => chooseView("sheet"));
  }
  if (newsButton) {
    newsButton.addEventListener("click", () => chooseView("news"));
  }
  const refresh = document.getElementById("refresh");
  if (refresh) {
    refresh.addEventListener("click", refreshCurrent);
  }
  const voice = document.getElementById("voice");
  if (voice) {
    voice.addEventListener("change", () => chooseVoice(voice.value));
  }
  const speed = document.getElementById("speed");
  if (speed) {
    speed.addEventListener("change", () => chooseSpeed(speed.value));
  }
  renderCard(window.CARD);
  renderNews(window.NEWS);
  applyView();
  setTipSpace(false);
  const handler = tipHandler();
  if (handler) {
    handler.postMessage({ voices: true });
  }
  requestAnimationFrame(() => requestAnimationFrame(fitWindowToContent));
});
