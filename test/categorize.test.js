import { test } from "node:test";
import assert from "node:assert/strict";
import { categorizeItem } from "../src/categorize.js";

test("empty text falls back to 개발 아이디어", () => {
  assert.equal(categorizeItem({ title: "", contentSnippet: "" }), "개발 아이디어");
});

test("issue keywords win", () => {
  assert.equal(
    categorizeItem({ title: "Critical security vulnerability disclosed", contentSnippet: "" }),
    "개발 이슈/논쟁"
  );
});

test("tool keywords win", () => {
  assert.equal(
    categorizeItem({ title: "New framework release", contentSnippet: "beta launch" }),
    "새 도구/제품"
  );
});

test("idea keywords win", () => {
  assert.equal(
    categorizeItem({ title: "A design proposal", contentSnippet: "architecture concept" }),
    "개발 아이디어"
  );
});

test("idea wins a tie against issue and tool", () => {
  // one keyword from each category -> tie; idea is checked first and should win.
  const category = categorizeItem({
    title: "idea security release",
    contentSnippet: ""
  });
  assert.equal(category, "개발 아이디어");
});

test("Korean keywords are matched", () => {
  assert.equal(categorizeItem({ title: "보안 취약점 발견", contentSnippet: "" }), "개발 이슈/논쟁");
});
