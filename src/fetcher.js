import Parser from "rss-parser";
import { feeds } from "./feeds.js";
import { categorizeItem } from "./categorize.js";
import { readItems, writeItems } from "./storage.js";
import { summarizeAndDiscuss } from "./llm.js";

const parser = new Parser({
  headers: { "User-Agent": "feed-insight-service/0.1" }
});

export async function fetchAndStore() {
  const startTime = Date.now();
  console.log(`\n[fetch] === 피드 수집 시작 ===`);

  let items = readItems();
  console.log(`[fetch] 기존 아이템: ${items.length}개`);
  const seen = new Set(items.map(i => i.link));

  let newCount = 0;

  for (const feed of feeds) {
    try {
      console.log(`[fetch] 피드 파싱 중: ${feed.name} (${feed.url})`);
      const res = await parser.parseURL(feed.url);
      const unseen = (res.items ?? []).filter(i => i.link && !seen.has(i.link));
      console.log(`[fetch]   -> ${feed.name}: 전체 ${res.items?.length ?? 0}개, 새 항목 ${unseen.length}개`);

      for (const item of unseen) {
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
        const ai = await summarizeAndDiscuss({
          title: base.title,
          snippet: base.contentSnippet,
          includeDiscussion
        });
        const llmElapsed = ((Date.now() - llmStart) / 1000).toFixed(1);
        console.log(`[llm]   -> 완료 (${llmElapsed}s, model: ${ai.model})`);

        base.summary = ai.summary;
        base.discussion = ai.discussion;
        base.aiModel = ai.model;

        items = [base, ...items].slice(0, 500);
        writeItems(items);
        newCount++;
        seen.add(item.link);
        console.log(`[fetch] 저장: "${base.title.slice(0, 40)}" (누적 새 항목: ${newCount}개, 총: ${items.length}개)`);
      }
    } catch (err) {
      console.error(`[fetch] 피드 실패: ${feed.name}`, err.message);
    }
  }

  if (newCount === 0) {
    console.log(`[fetch] 새 항목 없음`);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[fetch] === 수집 완료 (${totalElapsed}s) ===\n`);

  return { newCount };
}
