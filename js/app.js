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
    li.addEventListener("mouseenter", () => showTooltip(li, picks));
    li.addEventListener("mouseleave", scheduleHideTooltip);
    fragment.appendChild(li);
  });
  jobsEl.replaceChildren(fragment);
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

function buildTooltip(picks) {
  const tip = document.createElement("div");
  const heading = document.createElement("div");
  heading.className = "tooltip-heading";
  heading.textContent = "Best for this";
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

function setTipSpace(open) {
  const handler = tipHandler();
  if (handler) {
    handler.postMessage({ open: !!open });
    return;
  }
  const height = window.outerHeight || 700;
  window.resizeTo(open ? CARD_WIDTH + TIP_GAP + TIP_WIDTH : CARD_WIDTH, height);
}

function showTooltip(li, picks) {
  cancelHideTooltip();
  const tip = tooltipRoot();
  const next = buildTooltip(picks);
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
  renderCard(window.CARD);
  setTipSpace(false);
});
