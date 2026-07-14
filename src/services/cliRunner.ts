import { spawn } from "node:child_process";

export interface CliRunOptions {
  cwd?: string;
  timeoutMs: number;
}

export interface CliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  spawnError?: string;
}

/**
 * Runs a CLI binary non-interactively and collects its output.
 * stdin is ignored so CLIs that peek at stdin (e.g. `codex exec`) don't block waiting for EOF.
 */
export async function runCli(
  command: string,
  args: string[],
  options: CliRunOptions
): Promise<CliRunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: null, timedOut, spawnError: err.message });
    });

    child.on("close", (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code, timedOut });
    });
  });
}
