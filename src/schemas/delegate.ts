import { z } from "zod";
import { DEFAULT_TIMEOUT_SECONDS, MAX_TIMEOUT_SECONDS, MIN_TIMEOUT_SECONDS } from "../constants.js";

export const DelegateInputSchema = z.object({
  prompt: z.string()
    .min(1, "prompt must not be empty")
    .describe("Task instructions for the sub-agent to execute, exactly as it should receive them."),
  cwd: z.string()
    .optional()
    .describe("Absolute path to the working directory the sub-agent should operate in. Defaults to this MCP server's own working directory if omitted."),
  model: z.string()
    .optional()
    .describe("Model override for this run (e.g. 'gpt-5.6-luna', 'claude-opus-4-8'). Omit to use the CLI's own configured default."),
  timeout_seconds: z.number()
    .int()
    .min(MIN_TIMEOUT_SECONDS)
    .max(MAX_TIMEOUT_SECONDS)
    .default(DEFAULT_TIMEOUT_SECONDS)
    .describe(`How long to wait for the sub-agent to finish, in seconds (${MIN_TIMEOUT_SECONDS}-${MAX_TIMEOUT_SECONDS}, default ${DEFAULT_TIMEOUT_SECONDS}). The process is killed if it runs longer.`),
  auto_approve: z.boolean()
    .default(false)
    .describe("Bypass the sub-agent's interactive tool-permission prompts (shell commands, file edits, etc). This call has no terminal attached, so without auto_approve most non-trivial tasks will fail immediately the first time the sub-agent needs to use a tool. Set true when you trust the task to run unattended.")
}).strict();

export type DelegateInput = z.infer<typeof DelegateInputSchema>;
