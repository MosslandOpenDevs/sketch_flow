import express from "express";
import cron from "node-cron";
import { config } from "./config.js";
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
  const category = req.query.category;
  const items = readItems();
  const filtered = category ? items.filter(i => i.category === category) : items;
  res.json(filtered);
});

app.post("/fetch", async (req, res) => {
  const result = await fetchAndStore();
  res.json(result);
});

const cronExpr = `*/${config.fetchEveryMinutes} * * * *`;
cron.schedule(cronExpr, async () => {
  try {
    await fetchAndStore();
  } catch (err) {
    console.error("Scheduled fetch failed", err.message);
  }
});

app.listen(config.port, () => {
  console.log(`Server running on :${config.port}`);
});

// Initial fetch on startup
fetchAndStore()
  .then((result) => {
    console.log(`Initial fetch complete. newCount=${result.newCount}`);
  })
  .catch((err) => {
    console.error("Initial fetch failed", err.message);
  });
