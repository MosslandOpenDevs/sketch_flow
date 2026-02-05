const listEl = document.getElementById("list");
const categoryEl = document.getElementById("category");
const langEl = document.getElementById("lang");
const summaryModeEl = document.getElementById("summaryMode");
const perPageEl = document.getElementById("perPage");
const searchEl = document.getElementById("search");
const sourceEl = document.getElementById("source");
const sortEl = document.getElementById("sort");
const statusEl = document.getElementById("status");
const fetchBtn = document.getElementById("fetchBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");

let allItems = [];
let page = 1;

async function loadItems() {
  const category = categoryEl.value;
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`/items${qs}`);
  allItems = await res.json();
  page = 1;
  hydrateSourceFilter();
  render();
}

function render() {
  const lang = langEl.value;
  const summaryMode = summaryModeEl.value;
  const perPage = Number(perPageEl.value);
  const search = searchEl.value.trim().toLowerCase();
  const source = sourceEl.value;
  const sort = sortEl.value;

  let items = [...allItems];

  if (search) {
    items = items.filter((i) => {
      const text = `${i.title} ${i.contentSnippet ?? ""} ${i.summary?.ko ?? ""} ${i.summary?.en ?? ""}`.toLowerCase();
      return text.includes(search);
    });
  }

  if (source) {
    items = items.filter((i) => i.source === source);
  }

  items.sort((a, b) => {
    if (sort === "title") return (a.title || "").localeCompare(b.title || "");
    if (sort === "source") return (a.source || "").localeCompare(b.source || "");
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return sort === "oldest" ? da - db : db - da;
  });

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * perPage;
  items = items.slice(start, start + perPage);

  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = "<div class=\"card\">데이터가 없습니다.</div>";
    pageInfo.textContent = "1 / 1";
    return;
  }

  for (const item of items) {
    const el = document.createElement("article");
    el.className = "card";
    const pub = item.pubDate ? new Date(item.pubDate).toLocaleString() : "";
    const summaryFull = item.summary?.[lang] || item.contentSnippet || "";
    const summary = summaryMode === "short" ? shorten(summaryFull) : summaryFull;
    const discussion = item.discussion?.[lang] || item.discussion?.output || "";

    el.innerHTML = `
      <h3><a href="${item.link}" target="_blank" rel="noreferrer">${item.title}</a></h3>
      <div class="meta">
        <span class="badge">${item.category}</span>
        <span>${item.source}</span>
        <span>${pub}</span>
      </div>
      <div class="summary">${summary}</div>
      <div class="details">
        ${discussion ? `
          <button class="discussion-toggle" data-action="toggle-discussion">토론 펼치기</button>
          <div class="discussion collapsed">${discussion}</div>
        ` : ""}
      </div>
    `;

    el.addEventListener("click", (e) => {
      const target = e.target;
      if (target.tagName.toLowerCase() === "a") return;
      if (target.dataset?.action === "toggle-discussion") return;
      el.classList.toggle("expanded");
    });

    const toggle = el.querySelector("[data-action='toggle-discussion']");
    if (toggle) {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const discussionEl = el.querySelector(".discussion");
        const isCollapsed = discussionEl.classList.toggle("collapsed");
        toggle.textContent = isCollapsed ? "토론 펼치기" : "토론 접기";
      });
    }

    listEl.appendChild(el);
  }

  pageInfo.textContent = `${page} / ${totalPages}`;
}

categoryEl.addEventListener("change", loadItems);
langEl.addEventListener("change", render);
summaryModeEl.addEventListener("change", render);
perPageEl.addEventListener("change", () => {
  page = 1;
  render();
});
searchEl.addEventListener("input", () => {
  page = 1;
  render();
});
sourceEl.addEventListener("change", () => {
  page = 1;
  render();
});
sortEl.addEventListener("change", render);

prevBtn.addEventListener("click", () => {
  if (page > 1) {
    page -= 1;
    render();
  }
});

nextBtn.addEventListener("click", () => {
  const perPage = Number(perPageEl.value);
  const totalPages = Math.max(1, Math.ceil(allItems.length / perPage));
  if (page < totalPages) {
    page += 1;
    render();
  }
});

fetchBtn.addEventListener("click", async () => {
  statusEl.textContent = "수집중...";
  try {
    const res = await fetch("/fetch", { method: "POST" });
    const result = await res.json();
    statusEl.textContent = `완료 (신규 ${result.newCount})`;
    await loadItems();
  } catch (err) {
    statusEl.textContent = "실패";
  }
});

loadItems();

function hydrateSourceFilter() {
  const sources = Array.from(new Set(allItems.map((i) => i.source).filter(Boolean))).sort();
  const current = sourceEl.value;
  sourceEl.innerHTML = "<option value=\"\">전체</option>";
  for (const s of sources) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sourceEl.appendChild(opt);
  }
  sourceEl.value = sources.includes(current) ? current : "";
}

function shorten(text) {
  if (!text) return "";
  const parts = text.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ");
}
