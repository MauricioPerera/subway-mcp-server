import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCodexArgs,
  buildClaudeArgs,
  buildAgyArgs,
  parseClaudeStdout
} from "../dist/tools/argBuilders.js";

const base = {
  prompt: "do the thing",
  timeout_seconds: 600,
  auto_approve: false
};

test("buildCodexArgs: minimal params", () => {
  const args = buildCodexArgs(base, "C:/tmp/out.txt");
  assert.deepEqual(args, ["exec", "--skip-git-repo-check", "-o", "C:/tmp/out.txt", "do the thing"]);
});

test("buildCodexArgs: auto_approve adds bypass flag", () => {
  const args = buildCodexArgs({ ...base, auto_approve: true }, "C:/tmp/out.txt");
  assert.ok(args.includes("--dangerously-bypass-approvals-and-sandbox"));
});

test("buildCodexArgs: model adds -m flag before the prompt", () => {
  const args = buildCodexArgs({ ...base, model: "gpt-5.6-luna" }, "C:/tmp/out.txt");
  assert.deepEqual(args.slice(-3), ["-m", "gpt-5.6-luna", "do the thing"]);
});

test("buildCodexArgs: prompt is always the last argument", () => {
  const args = buildCodexArgs({ ...base, auto_approve: true, model: "x" }, "C:/tmp/out.txt");
  assert.equal(args.at(-1), "do the thing");
});

test("buildClaudeArgs: minimal params", () => {
  const args = buildClaudeArgs(base);
  assert.deepEqual(args, ["-p", "--output-format", "json", "do the thing"]);
});

test("buildClaudeArgs: auto_approve adds skip-permissions flag", () => {
  const args = buildClaudeArgs({ ...base, auto_approve: true });
  assert.ok(args.includes("--dangerously-skip-permissions"));
});

test("buildClaudeArgs: model adds --model flag", () => {
  const args = buildClaudeArgs({ ...base, model: "claude-opus-4-8" });
  assert.ok(args.includes("--model"));
  assert.equal(args[args.indexOf("--model") + 1], "claude-opus-4-8");
});

test("buildAgyArgs: minimal params keeps prompt right after -p", () => {
  const args = buildAgyArgs(base);
  assert.deepEqual(args, ["-p", "do the thing"]);
});

test("buildAgyArgs: auto_approve and model both appended", () => {
  const args = buildAgyArgs({ ...base, auto_approve: true, model: "m1" });
  assert.deepEqual(args, ["-p", "do the thing", "--dangerously-skip-permissions", "--model", "m1"]);
});

test("parseClaudeStdout: extracts result field from valid JSON", () => {
  const stdout = JSON.stringify({ type: "result", result: "PONG" });
  assert.equal(parseClaudeStdout(stdout), "PONG");
});

test("parseClaudeStdout: returns null on invalid JSON", () => {
  assert.equal(parseClaudeStdout("not json"), null);
});

test("parseClaudeStdout: returns null when result field is missing or not a string", () => {
  assert.equal(parseClaudeStdout(JSON.stringify({ result: 42 })), null);
  assert.equal(parseClaudeStdout(JSON.stringify({ other: "field" })), null);
});
