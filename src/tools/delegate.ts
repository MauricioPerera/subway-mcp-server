import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runCli } from "../services/cliRunner.js";
import { DelegateInputSchema, type DelegateInput } from "../schemas/delegate.js";
import { truncate } from "../constants.js";
import { buildCodexArgs, buildClaudeArgs, buildAgyArgs, parseClaudeStdout } from "./argBuilders.js";

const DelegateOutputSchema = {
  success: z.boolean().describe("True if the sub-agent process exited with code 0 and did not time out."),
  final_message: z.string().describe("The sub-agent's final response text."),
  exit_code: z.number().nullable().describe("Process exit code, or null if the process could not be spawned."),
  timed_out: z.boolean().describe("True if the process was killed after exceeding timeout_seconds."),
  stderr: z.string().optional().describe("Captured stderr, included only when the run was not successful.")
};

interface DelegateResult {
  success: boolean;
  finalMessage: string;
  exitCode: number | null;
  timedOut: boolean;
  stderr?: string;
}

function toToolResponse(result: DelegateResult) {
  const output = {
    success: result.success,
    final_message: truncate(result.finalMessage).text,
    exit_code: result.exitCode,
    timed_out: result.timedOut,
    ...(!result.success && result.stderr ? { stderr: truncate(result.stderr, 5000).text } : {})
  };
  return {
    content: [{ type: "text" as const, text: output.final_message }],
    structuredContent: output
  };
}

async function runCodex(params: DelegateInput): Promise<DelegateResult> {
  const tmpFile = join(tmpdir(), `codex-last-${randomUUID()}.txt`);
  const args = buildCodexArgs(params, tmpFile);

  const result = await runCli("codex", args, {
    cwd: params.cwd,
    timeoutMs: params.timeout_seconds * 1000
  });

  let finalMessage = "";
  try {
    finalMessage = (await readFile(tmpFile, "utf-8")).trim();
  } catch {
    finalMessage = result.stdout.trim() || result.spawnError || "(no output)";
  } finally {
    unlink(tmpFile).catch(() => {});
  }

  return {
    success: result.exitCode === 0 && !result.timedOut,
    finalMessage,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stderr: result.stderr || result.spawnError
  };
}

async function runClaude(params: DelegateInput): Promise<DelegateResult> {
  const args = buildClaudeArgs(params);

  const result = await runCli("claude", args, {
    cwd: params.cwd,
    timeoutMs: params.timeout_seconds * 1000
  });

  const finalMessage = parseClaudeStdout(result.stdout) ?? result.stdout.trim();

  return {
    success: result.exitCode === 0 && !result.timedOut,
    finalMessage: finalMessage || result.spawnError || "(no output)",
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stderr: result.stderr || result.spawnError
  };
}

async function runAgy(params: DelegateInput): Promise<DelegateResult> {
  const args = buildAgyArgs(params);

  const result = await runCli("agy", args, {
    cwd: params.cwd,
    timeoutMs: params.timeout_seconds * 1000
  });

  return {
    success: result.exitCode === 0 && !result.timedOut,
    finalMessage: result.stdout.trim() || result.spawnError || "(no output)",
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    stderr: result.stderr || result.spawnError
  };
}

export function registerDelegateTools(server: McpServer): void {
  server.registerTool(
    "delegate_to_codex",
    {
      title: "Delegate task to Codex CLI",
      description: `Runs OpenAI's Codex CLI non-interactively (\`codex exec\`) to execute a coding task and returns its final message.

Args:
  - prompt (string, required): task instructions for Codex
  - cwd (string, optional): absolute working directory for the task
  - model (string, optional): model override (e.g. "gpt-5.6-luna")
  - timeout_seconds (number, optional, default 600): kill the process after this many seconds
  - auto_approve (boolean, optional, default false): bypass Codex's shell/edit approval prompts. Without this, tasks that need to run a command or edit a file will fail immediately since there is no terminal to approve from.

Returns structured JSON: { success, final_message, exit_code, timed_out, stderr? }.

Error Handling:
  - success=false with a non-zero exit_code and stderr populated means Codex reported an error (e.g. auth, invalid model, sandbox denial)
  - timed_out=true means the task exceeded timeout_seconds and was killed`,
      inputSchema: DelegateInputSchema.shape,
      outputSchema: DelegateOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: DelegateInput) => toToolResponse(await runCodex(params))
  );

  server.registerTool(
    "delegate_to_claude",
    {
      title: "Delegate task to Claude Code CLI",
      description: `Runs Claude Code non-interactively (\`claude -p --output-format json\`) to execute a task and returns its final message.

Args:
  - prompt (string, required): task instructions for Claude
  - cwd (string, optional): absolute working directory for the task
  - model (string, optional): model override (e.g. "claude-opus-4-8")
  - timeout_seconds (number, optional, default 600): kill the process after this many seconds
  - auto_approve (boolean, optional, default false): bypass Claude's tool-permission prompts (--dangerously-skip-permissions). Without this, tasks that need to use tools will fail immediately since there is no terminal to approve from.

Returns structured JSON: { success, final_message, exit_code, timed_out, stderr? }.

Error Handling:
  - success=false with a non-zero exit_code and stderr populated means the CLI reported an error (e.g. auth, invalid model)
  - timed_out=true means the task exceeded timeout_seconds and was killed`,
      inputSchema: DelegateInputSchema.shape,
      outputSchema: DelegateOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: DelegateInput) => toToolResponse(await runClaude(params))
  );

  server.registerTool(
    "delegate_to_agy",
    {
      title: "Delegate task to Antigravity (agy) CLI",
      description: `Runs the Antigravity CLI non-interactively (\`agy -p\`) to execute a task and returns its response.

Args:
  - prompt (string, required): task instructions for the agy agent
  - cwd (string, optional): absolute working directory for the task
  - model (string, optional): model override
  - timeout_seconds (number, optional, default 600): kill the process after this many seconds
  - auto_approve (boolean, optional, default false): bypass agy's tool-permission prompts (--dangerously-skip-permissions). Without this, tasks that need to use tools will fail immediately since there is no terminal to approve from.

Returns structured JSON: { success, final_message, exit_code, timed_out, stderr? }. Note: agy has no JSON output mode, so final_message is the raw trimmed stdout.

Error Handling:
  - success=false with a non-zero exit_code and stderr populated means the CLI reported an error
  - timed_out=true means the task exceeded timeout_seconds and was killed`,
      inputSchema: DelegateInputSchema.shape,
      outputSchema: DelegateOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: DelegateInput) => toToolResponse(await runAgy(params))
  );
}
