import Parser from "rss-parser";
import { feeds } from "./feeds.js";
import { categorizeItem } from "./categorize.js";
import { readItems, writeItems } from "./storage.js";
import { summarizeAndDiscuss } from "./llm.js";
import { config } from "./config.js";

const MAX_STORED_ITEMS = 500;

const parser = new Parser({
  headers: { "User-Agent": "sketchflow/0.1" }
});

// Single-flight guard: cron, startup, and POST /fetch all call fetchAndStore().
// Running two at once would each hold a private snapshot of items.json and the
// last writer would silently clobber the other's new items. While a fetch is in
// flight, additional callers share (await) the same run instead of racing.
let inFlight = null;

export function fetchAndStore() {
  if (inFlight) return inFlight;
  inFlight = runFetch().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runFetch() {
  const startTime = Date.now();
  console.log(`\n[fetch] === 피드 수집 시작 ===`);

  let items = readItems();
  console.log(`[fetch] 기존 아이템: ${items.length}개`);
  const seen = new Set(items.map(i => i.link).filter(Boolean));

  let newCount = 0;
  const limit = config.maxItemsPerFetch;
  let capped = false;

  for (const feed of feeds) {
    if (capped) break;
    try {
      console.log(`[fetch] 피드 파싱 중: ${feed.name} (${feed.url})`);
      const res = await parser.parseURL(feed.url);
      const unseen = (res.items ?? []).filter(i => i.link && !seen.has(i.link));
      console.log(`[fetch]   -> ${feed.name}: 전체 ${res.items?.length ?? 0}개, 새 항목 ${unseen.length}개`);

      for (const item of unseen) {
        if (newCount >= limit) {
          console.log(`[fetch] 이번 실행 상한(${limit}개) 도달, 나머지는 다음 주기에 수집합니다.`);
          capped = true;
          break;
        }
        // Mark as seen up front so a failure below does not reprocess it.
        seen.add(item.link);

        const category = categorizeItem(item);
        const base = {
          source: feed.name,
          title: item.title ?? "",
          link: item.link,
          pubDate: item.pubDate ?? null,
          contentSnippet: item.contentSnippet ?? "",
          category,
          createdAt: new Date().toISOString()
        };

        const includeDiscussion = category === "개발 아이디어";
        console.log(`[llm] 요약 요청: "${base.title.slice(0, 60)}" (카테고리: ${category}, 토론: ${includeDiscussion ? "예" : "아니오"})`);

        const llmStart = Date.now();
        let ai;
        try {
          ai = await summarizeAndDiscuss({
            title: base.title,
            snippet: base.contentSnippet,
            includeDiscussion
          });
        } catch (err) {
          console.error(`[llm]   -> 실패, 요약 없이 저장: ${err.message}`);
          ai = { model: "error", summary: { ko: "", en: "" }, discussion: { ko: "", en: "" } };
        }
        const llmElapsed = ((Date.now() - llmStart) / 1000).toFixed(1);
        console.log(`[llm]   -> 완료 (${llmElapsed}s, model: ${ai.model})`);

        base.summary = ai.summary;
        base.discussion = ai.discussion;
        base.aiModel = ai.model;

        // Newest first. Persist after each item so expensive LLM output survives
        // a crash/restart; the list is pruned once at the end to avoid dropping
        // (and thus un-deduping) items mid-run.
        items.unshift(base);
        newCount++;
        writeItems(items);
        console.log(`[fetch] 저장: "${base.title.slice(0, 40)}" (누적 새 항목: ${newCount}개, 총: ${items.length}개)`);
      }
    } catch (err) {
      console.error(`[fetch] 피드 실패: ${feed.name}`, err.message);
    }
  }

  if (items.length > MAX_STORED_ITEMS) {
    items = items.slice(0, MAX_STORED_ITEMS);
    writeItems(items);
  }

  if (newCount === 0) {
    console.log(`[fetch] 새 항목 없음`);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[fetch] === 수집 완료 (${totalElapsed}s) ===\n`);

  return { newCount };
}
