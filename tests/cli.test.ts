import { describe, test, expect } from "bun:test";
import { resolve } from "path";

const CLI_PATH = resolve(import.meta.dir, "../src/index.ts");

function runCLI(
  args: string[] = [],
  options: { stdin?: string; env?: Record<string, string> } = {}
) {
  const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], {
    stdin: options.stdin !== undefined ? new Blob([options.stdin]) : undefined,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      ...options.env,
    },
  });

  return proc;
}

async function runCLIToCompletion(
  args: string[] = [],
  options: { stdin?: string; env?: Record<string, string> } = {}
) {
  const proc = runCLI(args, options);
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

describe("CLI", () => {
  test("--help prints usage and exits 0", async () => {
    const { stdout, exitCode } = await runCLIToCompletion(["--help"], {
      stdin: "",
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("prompt-improver");
    expect(stdout).toContain("USAGE");
    expect(stdout).toContain("FLAGS");
    expect(stdout).toContain("--provider");
    expect(stdout).toContain("--model");
    expect(stdout).toContain("--base-url");
    expect(stdout).toContain("--count");
    expect(stdout).toContain("--json");
    expect(stdout).toContain("ENVIRONMENT");
    expect(stdout).toContain("OPENAI_API_KEY");
    expect(stdout).toContain("ANTHROPIC_API_KEY");
  });

  test("-h also prints usage", async () => {
    const { stdout, exitCode } = await runCLIToCompletion(["-h"], {
      stdin: "",
    });

    expect(exitCode).toBe(0);
    expect(stdout).toContain("prompt-improver");
  });

  test("missing API key exits 1 with error", async () => {
    const { stderr, exitCode } = await runCLIToCompletion([], {
      stdin: "test prompt",
      env: { OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" },
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain("No API key found");
  });

  test("empty stdin exits 1 with error", async () => {
    const { stderr, exitCode } = await runCLIToCompletion([], {
      stdin: "",
      env: { OPENAI_API_KEY: "sk-test" },
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain("No prompt provided");
  });

  test("unknown flag exits 1 with error", async () => {
    const { stderr, exitCode } = await runCLIToCompletion(["--bogus"], {
      stdin: "",
      env: { OPENAI_API_KEY: "sk-test" },
    });

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Unknown flag");
  });
});
