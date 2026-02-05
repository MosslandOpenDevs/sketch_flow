import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("data");
const itemsPath = path.join(dataDir, "items.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(itemsPath)) fs.writeFileSync(itemsPath, "[]", "utf8");
}

export function readItems() {
  ensureDataDir();
  const raw = fs.readFileSync(itemsPath, "utf8");
  return JSON.parse(raw);
}

export function writeItems(items) {
  ensureDataDir();
  fs.writeFileSync(itemsPath, JSON.stringify(items, null, 2), "utf8");
}
