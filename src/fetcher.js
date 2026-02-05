import Parser from "rss-parser";
import { feeds } from "./feeds.js";
import { categorizeItem } from "./categorize.js";
import { readItems, writeItems } from "./storage.js";
import { summarizeAndDiscuss } from "./gemini.js";

const parser = new Parser({
  headers: { "User-Agent": "feed-insight-service/0.1" }
});

export async function fetchAndStore() {
  const existing = readItems();
  const seen = new Set(existing.map(i => i.link));

  const newItems = [];

  for (const feed of feeds) {
    try {
      const res = await parser.parseURL(feed.url);
      for (const item of res.items ?? []) {
        if (!item.link || seen.has(item.link)) continue;

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
        const ai = await summarizeAndDiscuss({
          title: base.title,
          snippet: base.contentSnippet,
          includeDiscussion
        });

        base.summary = ai.summary;
        base.discussion = ai.discussion;
        base.aiModel = ai.model;

        newItems.push(base);
        seen.add(item.link);
      }
    } catch (err) {
      console.error(`Feed fetch failed: ${feed.name}`, err.message);
    }
  }

  if (newItems.length > 0) {
    const merged = [...newItems, ...existing].slice(0, 500);
    writeItems(merged);
  }

  return { newCount: newItems.length };
}
