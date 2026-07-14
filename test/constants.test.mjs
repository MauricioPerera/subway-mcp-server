import { test } from "node:test";
import assert from "node:assert/strict";
import { truncate, CHARACTER_LIMIT } from "../dist/constants.js";

test("truncate: leaves short text untouched", () => {
  const { text, truncated } = truncate("hello");
  assert.equal(text, "hello");
  assert.equal(truncated, false);
});

test("truncate: cuts text past the limit and flags it", () => {
  const long = "x".repeat(CHARACTER_LIMIT + 100);
  const { text, truncated } = truncate(long);
  assert.equal(truncated, true);
  assert.ok(text.length < long.length);
  assert.ok(text.includes("truncated"));
});

test("truncate: respects a custom limit", () => {
  const { text, truncated } = truncate("abcdefghij", 5);
  assert.equal(truncated, true);
  assert.ok(text.startsWith("abcde"));
});
