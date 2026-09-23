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

const VIEW_KEY = "llm-cheat-sheet-view";
let view = "jobs";

function readView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "models" ? "models" : "jobs";
  } catch (error) {
    return "jobs";
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
  const jobsButton = document.getElementById("view-jobs");
  const modelsButton = document.getElementById("view-models");
  if (jobsButton) {
    jobsButton.setAttribute("aria-pressed", next === "jobs" ? "true" : "false");
  }
  if (modelsButton) {
    modelsButton.setAttribute("aria-pressed", next === "models" ? "true" : "false");
  }
}

function modelsFrom(jobs) {
  const groups = [];
  const indexByKey = new Map();
  jobs.forEach((job) => {
    const key = job.modelId || job.model || "";
    let group = indexByKey.get(key);
    if (!group) {
      group = { model: job.model || "", stale: true, strengths: [] };
      indexByKey.set(key, group);
      groups.push(group);
    }
    group.stale = group.stale && !!job.stale;
    group.strengths.push(job);
  });
  return groups;
}

function renderCard(card) {
  const updatedAt = document.getElementById("updated-at");
  const jobsEl = document.getElementById("jobs");
  if (!card || !Array.isArray(card.jobs)) {
    updatedAt.textContent = "No card data";
    jobsEl.replaceChildren();
    return;
  }
  const staleCount = card.jobs.filter((job) => job.stale).length;
  const stamped = `Last updated: ${formatUpdatedAt(card.updatedAt)}`;
  updatedAt.textContent = staleCount ? `${stamped} · ${staleCount} stale` : stamped;
  if (view === "models") {
    renderModels(card.jobs, jobsEl);
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

function renderModels(jobs, jobsEl) {
  const fragment = document.createDocumentFragment();
  modelsFrom(jobs).forEach((group) => {
    const li = document.createElement("li");
    if (group.stale) {
      li.className = "stale";
    }
    const title = document.createElement("div");
    title.className = "job";
    title.textContent = group.model;
    if (group.stale) {
      const mark = document.createElement("span");
      mark.className = "stale-mark";
      mark.textContent = " STALE";
      title.appendChild(mark);
    }
    li.appendChild(title);
    group.strengths.forEach((job) => {
      const block = document.createElement("div");
      block.className = "strength";
      const jobLine = document.createElement("div");
      jobLine.className = "model";
      jobLine.textContent = job.job || "";
      if (job.stale && !group.stale) {
        const mark = document.createElement("span");
        mark.className = "stale-mark";
        mark.textContent = " STALE";
        jobLine.appendChild(mark);
      }
      const whyLine = document.createElement("div");
      whyLine.className = "why";
      whyLine.textContent = job.why || "";
      block.append(jobLine, whyLine);
      li.appendChild(block);
    });
    const picks = group.strengths.map((job) => ({
      model: job.job,
      why: job.why,
      tasks: job.tasks
    }));
    li.addEventListener("mouseenter", () => showTooltip(li, picks, "Good at"));
    li.addEventListener("mouseleave", scheduleHideTooltip);
    fragment.appendChild(li);
  });
  jobsEl.replaceChildren(fragment);
}

function chooseView(next) {
  view = next;
  writeView(next);
  hideTooltip();
  setToggle(next);
  renderCard(window.CARD);
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
  return Math.ceil(pad + header.offsetHeight + headerGap + jobs.offsetHeight) + 8;
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
  const jobsButton = document.getElementById("view-jobs");
  const modelsButton = document.getElementById("view-models");
  if (jobsButton) {
    jobsButton.addEventListener("click", () => chooseView("jobs"));
  }
  if (modelsButton) {
    modelsButton.addEventListener("click", () => chooseView("models"));
  }
  renderCard(window.CARD);
  setTipSpace(false);
  requestAnimationFrame(() => requestAnimationFrame(fitWindowToContent));
});
