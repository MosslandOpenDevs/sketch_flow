import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "../src/llm.js";

test("extracts JSON from a ```json fenced block", () => {
  const raw = 'here you go:\n```json\n{"summary":{"ko":"안녕"}}\n```\nthanks';
  assert.equal(extractJson(raw), '{"summary":{"ko":"안녕"}}');
});

test("extracts JSON from a bare ``` fenced block", () => {
  const raw = '```\n{"a":1}\n```';
  assert.equal(extractJson(raw), '{"a":1}');
});

test("extracts the outermost brace block when unfenced", () => {
  const raw = 'noise {"a":1,"b":{"c":2}} trailing';
  assert.equal(extractJson(raw), '{"a":1,"b":{"c":2}}');
});

test("returns trimmed raw when no JSON is present", () => {
  assert.equal(extractJson("  just text  "), "just text");
});

test("output parses back to the original object", () => {
  const raw = '```json\n{"summary":{"ko":"요약","en":"summary"},"discussion":{"ko":"","en":""}}\n```';
  const parsed = JSON.parse(extractJson(raw));
  assert.equal(parsed.summary.en, "summary");
  assert.equal(parsed.discussion.ko, "");
});
