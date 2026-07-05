import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.env.DATA_DIR ?? "data");
const itemsPath = path.join(dataDir, "items.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(itemsPath)) fs.writeFileSync(itemsPath, "[]", "utf8");
}

export function readItems() {
  ensureDataDir();
  const raw = fs.readFileSync(itemsPath, "utf8");
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // Corrupt or partially-written file: back it up so it can be inspected,
    // then recover with an empty list instead of crashing every reader.
    console.error(`[storage] items.json 파싱 실패, 초기화합니다: ${err.message}`);
    try {
      fs.renameSync(itemsPath, `${itemsPath}.corrupt-${Date.now()}`);
    } catch {
      // best effort
    }
    fs.writeFileSync(itemsPath, "[]", "utf8");
    return [];
  }
}

export function writeItems(items) {
  ensureDataDir();
  // Atomic write: serialize to a temp file, then rename over the target so a
  // crash mid-write never leaves items.json truncated.
  const tmpPath = `${itemsPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2), "utf8");
  fs.renameSync(tmpPath, itemsPath);
}
