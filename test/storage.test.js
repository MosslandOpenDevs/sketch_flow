import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Point storage at an isolated temp dir before importing it.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sketchflow-storage-"));
process.env.DATA_DIR = tmpDir;
const itemsPath = path.join(tmpDir, "items.json");

const { readItems, writeItems } = await import("../src/storage.js");

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("read on a fresh dir returns an empty array", () => {
  assert.deepEqual(readItems(), []);
});

test("write then read round-trips", () => {
  const items = [{ link: "https://a", title: "A" }];
  writeItems(items);
  assert.deepEqual(readItems(), items);
});

test("corrupt JSON recovers to [] and backs up the file", () => {
  fs.writeFileSync(itemsPath, "{ this is not valid json", "utf8");
  assert.deepEqual(readItems(), []);
  const backups = fs.readdirSync(tmpDir).filter((f) => f.includes("corrupt"));
  assert.ok(backups.length >= 1, "expected a .corrupt backup to be created");
});

test("non-array JSON is treated as empty", () => {
  fs.writeFileSync(itemsPath, JSON.stringify({ not: "an array" }), "utf8");
  assert.deepEqual(readItems(), []);
});

test("write leaves no leftover temp file", () => {
  writeItems([{ link: "https://b" }]);
  const temps = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".tmp"));
  assert.equal(temps.length, 0);
});
