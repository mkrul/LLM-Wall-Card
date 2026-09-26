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
  setToggle(view);
  showStamp();
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
      li.appendChild(button);
      li.addEventListener("click", () => openLink(item.url));
    }
    fragment.appendChild(li);
  });
  list.replaceChildren(fragment);
  paintSpeech();
}

let speechURL = "";
let speechState = "idle";

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

function toggleSpeech(item) {
  const handler = tipHandler();
  if (!handler) {
    window.setSpeechState(item.url, "idle", "Listening runs in the LLM Wall Card app.");
    return;
  }
  handler.postMessage({
    speak: {
      url: item.url,
      title: item.title || "",
      detail: item.detail || ""
    }
  });
}

window.setSpeechState = function (url, state, message) {
  speechURL = state === "idle" ? "" : url;
  speechState = state;
  const note = document.getElementById("news-speak-note");
  if (note) {
    note.textContent = message || "";
  }
  paintSpeech();
};

function paintSpeech() {
  document.querySelectorAll(".news-speak").forEach((button) => {
    const active = button.dataset.url === speechURL && speechState !== "idle";
    button.classList.toggle("is-loading", active && speechState === "loading");
    button.classList.toggle("is-playing", active && speechState === "playing");
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active && speechState === "playing") {
      button.setAttribute("aria-label", "Stop reading");
    } else if (active && speechState === "loading") {
      button.setAttribute("aria-label", "Preparing audio");
    } else {
      button.setAttribute("aria-label", "Listen to this article");
    }
  });
}

function openLink(url) {
  const handler = tipHandler();
  if (handler) {
    handler.postMessage({ url });
    return;
  }
  window.open(url, "_blank", "noopener");
}

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
  renderCard(window.CARD);
  renderNews(window.NEWS);
  applyView();
  setTipSpace(false);
  requestAnimationFrame(() => requestAnimationFrame(fitWindowToContent));
});
