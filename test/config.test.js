import { test } from "node:test";
import assert from "node:assert/strict";
import cron from "node-cron";
import { toPositiveNumber, buildCronExpression } from "../src/config.js";

test("toPositiveNumber returns parsed value when valid", () => {
  assert.equal(toPositiveNumber("30", 60), 30);
});

test("toPositiveNumber falls back on non-numeric", () => {
  assert.equal(toPositiveNumber("abc", 60), 60);
  assert.equal(toPositiveNumber(undefined, 60), 60);
  assert.equal(toPositiveNumber("", 60), 60);
});

test("toPositiveNumber enforces min/max", () => {
  assert.equal(toPositiveNumber("0", 60, { min: 1 }), 60);
  assert.equal(toPositiveNumber("70000", 3000, { min: 1, max: 65535 }), 3000);
  assert.equal(toPositiveNumber("0", 0.3, { min: 0, max: 2 }), 0);
});

test("toPositiveNumber floors when integer:true", () => {
  assert.equal(toPositiveNumber("1.5", 60, { min: 1, integer: true }), 1);
  assert.equal(toPositiveNumber("30.7", 60, { min: 1, integer: true }), 30);
  assert.equal(toPositiveNumber("1.5", 60, { min: 1 }), 1.5);
});

test("buildCronExpression handles sub-hour intervals", () => {
  assert.equal(buildCronExpression(15), "*/15 * * * *");
  assert.equal(buildCronExpression(30), "*/30 * * * *");
});

test("buildCronExpression handles whole-hour intervals", () => {
  assert.equal(buildCronExpression(60), "0 */1 * * *");
  assert.equal(buildCronExpression(120), "0 */2 * * *");
  assert.equal(buildCronExpression(1440), "0 0 * * *");
});

test("buildCronExpression rounds non-divisor intervals above an hour", () => {
  assert.equal(buildCronExpression(90), "0 */2 * * *");
});

test("buildCronExpression falls back for invalid input", () => {
  assert.equal(buildCronExpression(0), "0 * * * *");
  assert.equal(buildCronExpression(NaN), "0 * * * *");
});

test("buildCronExpression floors fractional minutes to a valid expression", () => {
  assert.equal(buildCronExpression(1.5), "*/1 * * * *");
  assert.equal(buildCronExpression(30.7), "*/30 * * * *");
});

test("every buildCronExpression output is a valid cron expression", () => {
  for (const minutes of [1, 1.5, 5, 15, 30, 30.7, 45, 59, 60, 90, 90.5, 120, 720, 1440]) {
    const expr = buildCronExpression(minutes);
    assert.ok(cron.validate(expr), `expected "${expr}" (from ${minutes}) to be valid`);
  }
});
