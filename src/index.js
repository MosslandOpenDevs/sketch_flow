import express from "express";
import cron from "node-cron";
import { config, buildCronExpression } from "./config.js";
import { fetchAndStore } from "./fetcher.js";
import { readItems } from "./storage.js";
import { feeds } from "./feeds.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/feeds", (req, res) => {
  res.json(feeds);
});

app.get("/items", (req, res) => {
  try {
    const category = req.query.category;
    const items = readItems();
    const filtered = category ? items.filter(i => i.category === category) : items;
    res.json(filtered);
  } catch (err) {
    console.error("GET /items failed", err);
    res.status(500).json({ error: "failed to read items" });
  }
});

app.post("/fetch", async (req, res) => {
  if (config.fetchToken && req.get("x-fetch-token") !== config.fetchToken) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const result = await fetchAndStore();
    res.json(result);
  } catch (err) {
    console.error("POST /fetch failed", err);
    res.status(500).json({ error: err.message });
  }
});

const cronExpr = buildCronExpression(config.fetchEveryMinutes);
if (cron.validate(cronExpr)) {
  cron.schedule(cronExpr, async () => {
    try {
      await fetchAndStore();
    } catch (err) {
      console.error("Scheduled fetch failed", err.message);
    }
  });
} else {
  console.error(`Invalid cron expression "${cronExpr}", scheduled fetch disabled`);
}

app.listen(config.port, () => {
  console.log(`Server running on :${config.port}`);
  console.log(`LLM provider: ${config.llmProvider}`);
  if (config.llmProvider === "lmstudio") {
    console.log(`LM Studio: ${config.lmstudio.url} (model: ${config.lmstudio.model})`);
  } else {
    console.log(`Gemini model: ${config.geminiModel} (key: ${config.geminiApiKey ? "set" : "NOT SET"})`);
  }
  console.log(`Fetch schedule: ${cronExpr} (every ${config.fetchEveryMinutes} min, max ${config.maxItemsPerFetch} items/run)`);
});

// Safety nets so a stray rejection/exception logs instead of silently killing
// the process.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

// Initial fetch on startup
fetchAndStore()
  .then((result) => {
    console.log(`Initial fetch complete. newCount=${result.newCount}`);
  })
  .catch((err) => {
    console.error("Initial fetch failed", err.message);
  });
