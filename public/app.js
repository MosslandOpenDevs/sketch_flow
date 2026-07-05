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
// UI state kept outside the DOM so it survives re-renders (lang/sort/search/paging
// all rebuild listEl.innerHTML). Keyed by a stable per-item id.
const expandedCards = new Set();
const openDiscussions = new Set();

function itemKey(item) {
  return item.link || item.title || "";
}

// Untrusted feed content and LLM output must never be interpolated into HTML raw.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

// Only allow http/https links; block javascript:/data: and other schemes.
function safeUrl(url) {
  const s = String(url ?? "").trim();
  return /^https?:\/\//i.test(s) ? s : "#";
}

async function loadItems() {
  const category = categoryEl.value;
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`/items${qs}`);
  allItems = await res.json();
  page = 1;
  hydrateSourceFilter();
  render();
}

// Filtering + sorting shared by render() and the pager so page counts stay
// consistent with what is actually displayed.
function getVisibleItems() {
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

  return items;
}

function totalPagesFor(count, perPage) {
  return Math.max(1, Math.ceil(count / perPage));
}

function render() {
  const lang = langEl.value;
  const summaryMode = summaryModeEl.value;
  const perPage = Number(perPageEl.value);

  const items = getVisibleItems();
  const totalPages = totalPagesFor(items.length, perPage);
  if (page > totalPages) page = totalPages;
  if (page < 1) page = 1;

  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  listEl.innerHTML = "";
  if (!pageItems.length) {
    listEl.innerHTML = "<div class=\"card\">데이터가 없습니다.</div>";
    pageInfo.textContent = "1 / 1";
    return;
  }

  for (const item of pageItems) {
    const key = itemKey(item);
    const isExpanded = expandedCards.has(key);
    const isDiscussionOpen = openDiscussions.has(key);

    const el = document.createElement("article");
    el.className = isExpanded ? "card expanded" : "card";

    const pub = item.pubDate ? new Date(item.pubDate).toLocaleString() : "";
    const summaryFull = getSafeText(item.summary, lang) || item.contentSnippet || "";
    const summary = summaryMode === "short" ? shorten(summaryFull) : summaryFull;
    const discussion = getSafeText(item.discussion, lang);

    el.innerHTML = `
      <h3><a href="${escapeHtml(safeUrl(item.link))}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></h3>
      <div class="meta">
        <span class="badge">${escapeHtml(item.category)}</span>
        <span>${escapeHtml(item.source)}</span>
        <span>${escapeHtml(pub)}</span>
      </div>
      <div class="summary">${escapeHtml(summary)}</div>
      <div class="details">
        ${discussion ? `
          <button class="discussion-toggle" data-action="toggle-discussion">${isDiscussionOpen ? "토론 접기" : "토론 펼치기"}</button>
          <div class="discussion${isDiscussionOpen ? "" : " collapsed"}">${escapeHtml(discussion)}</div>
        ` : ""}
      </div>
    `;

    el.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      if (e.target.closest("[data-action='toggle-discussion']")) return;
      const nowExpanded = el.classList.toggle("expanded");
      if (nowExpanded) expandedCards.add(key);
      else expandedCards.delete(key);
    });

    const toggle = el.querySelector("[data-action='toggle-discussion']");
    if (toggle) {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const discussionEl = el.querySelector(".discussion");
        const isCollapsed = discussionEl.classList.toggle("collapsed");
        if (isCollapsed) openDiscussions.delete(key);
        else openDiscussions.add(key);
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
sortEl.addEventListener("change", () => {
  page = 1;
  render();
});

prevBtn.addEventListener("click", () => {
  if (page > 1) {
    page -= 1;
    render();
  }
});

nextBtn.addEventListener("click", () => {
  const perPage = Number(perPageEl.value);
  const totalPages = totalPagesFor(getVisibleItems().length, perPage);
  if (page < totalPages) {
    page += 1;
    render();
  }
});

const FETCH_TOKEN_KEY = "sketchflow_fetch_token";

function postFetch() {
  const token = localStorage.getItem(FETCH_TOKEN_KEY) || "";
  return fetch("/fetch", {
    method: "POST",
    headers: token ? { "x-fetch-token": token } : {}
  });
}

fetchBtn.addEventListener("click", async () => {
  statusEl.textContent = "수집중...";
  try {
    let res = await postFetch();
    // If the server requires a token (FETCH_TOKEN is set), prompt once and retry.
    if (res.status === 401) {
      const token = prompt("이 서버는 수집에 토큰이 필요합니다. FETCH_TOKEN 값을 입력하세요:");
      if (token) {
        localStorage.setItem(FETCH_TOKEN_KEY, token);
        res = await postFetch();
      }
    }
    if (!res.ok) throw new Error(`status ${res.status}`);
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

function getSafeText(field, lang) {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang] || "";
}

function shorten(text) {
  if (!text) return "";
  const parts = text.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ");
}
