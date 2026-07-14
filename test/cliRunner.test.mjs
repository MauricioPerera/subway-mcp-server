import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../dist/services/cliRunner.js";

test("runCli: captures stdout and exit code 0", async () => {
  const result = await runCli("node", ["-e", "console.log('hello')"], { timeoutMs: 5000 });
  assert.equal(result.stdout.trim(), "hello");
  assert.equal(result.exitCode, 0);
  assert.equal(result.timedOut, false);
});

test("runCli: captures stderr and a non-zero exit code", async () => {
  const result = await runCli("node", ["-e", "console.error('oops'); process.exit(2)"], { timeoutMs: 5000 });
  assert.match(result.stderr, /oops/);
  assert.equal(result.exitCode, 2);
});

test("runCli: runs in the requested cwd", async () => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "subway-test-")));
  try {
    const result = await runCli("node", ["-e", "console.log(process.cwd())"], { cwd: dir, timeoutMs: 5000 });
    const reportedCwd = await realpath(result.stdout.trim());
    assert.equal(reportedCwd, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("runCli: kills the process and reports timedOut on timeout", async () => {
  const result = await runCli("node", ["-e", "setTimeout(() => {}, 5000)"], { timeoutMs: 300 });
  assert.equal(result.timedOut, true);
});

test("runCli: reports a spawnError for a nonexistent command", async () => {
  const result = await runCli("this-binary-does-not-exist-xyz", [], { timeoutMs: 3000 });
  assert.equal(result.exitCode, null);
  assert.ok(result.spawnError);
});
