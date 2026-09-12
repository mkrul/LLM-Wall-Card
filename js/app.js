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
  const status = document.getElementById("status");
  if (!card || !Array.isArray(card.jobs)) {
    updatedAt.textContent = "";
    jobsEl.replaceChildren();
    status.textContent = "No card data";
    return;
  }
  updatedAt.textContent = formatUpdatedAt(card.updatedAt);
  const staleCount = card.jobs.filter((job) => job.stale).length;
  status.textContent = staleCount ? `${staleCount} stale` : "";
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
    li.append(jobLine, modelLine, whyLine);
    fragment.appendChild(li);
  });
  jobsEl.replaceChildren(fragment);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCard(window.CARD);
  document.getElementById("reload").addEventListener("click", () => {
    location.reload();
  });
});
