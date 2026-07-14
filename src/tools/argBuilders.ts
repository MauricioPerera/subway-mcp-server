import type { DelegateInput } from "../schemas/delegate.js";

export function buildCodexArgs(params: DelegateInput, tmpFile: string): string[] {
  const args = ["exec", "--skip-git-repo-check", "-o", tmpFile];
  if (params.auto_approve) args.push("--dangerously-bypass-approvals-and-sandbox");
  if (params.model) args.push("-m", params.model);
  args.push(params.prompt);
  return args;
}

export function buildClaudeArgs(params: DelegateInput): string[] {
  const args = ["-p", "--output-format", "json"];
  if (params.auto_approve) args.push("--dangerously-skip-permissions");
  if (params.model) args.push("--model", params.model);
  args.push(params.prompt);
  return args;
}

export function buildAgyArgs(params: DelegateInput): string[] {
  const args = ["-p", params.prompt];
  if (params.auto_approve) args.push("--dangerously-skip-permissions");
  if (params.model) args.push("--model", params.model);
  return args;
}

/** Extracts the `result` field from `claude -p --output-format json` stdout, or null if unparseable. */
export function parseClaudeStdout(stdout: string): string | null {
  try {
    const parsed = JSON.parse(stdout);
    return typeof parsed.result === "string" ? parsed.result : null;
  } catch {
    return null;
  }
}
