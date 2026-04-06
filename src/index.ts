#!/usr/bin/env bun

import { OpenAIProvider } from "./providers/openai.js";
import { ClaudeProvider } from "./providers/claude.js";
import type { LLMProvider } from "./providers/types.js";
import type { RankedVariant } from "./types.js";
import { generateVariants, scoreVariants } from "./pipeline.js";
import { formatPretty, formatJson } from "./format.js";

const HELP = `
🦍 ape — APE-inspired prompt improvement CLI

USAGE
  echo "your prompt" | ape [flags]
  cat prompt.txt | ape [flags]

FLAGS
  --provider <openai|claude>   API provider (auto-detected from env vars)
  --model <name>               Model name (default: gpt-4o-mini / claude-sonnet-4-20250514)
  --base-url <url>             Override API base URL
  --count <n>                  Number of variants to generate (default: 5)
  --json                       Output machine-readable JSON
  --verbose                    Show full scored table with colors and bars
  --single                     Output only the highest-scoring variant
  --help                       Show this help

ENVIRONMENT
  OPENAI_API_KEY               Required for --provider openai
  ANTHROPIC_API_KEY            Required for --provider claude

  Keys are loaded from (in priority order):
    1. Environment variables
    2. ~/.config/ape/.env

  One-time setup:
    mkdir -p ~/.config/ape
    echo "OPENAI_API_KEY=sk-..." > ~/.config/ape/.env
    chmod 600 ~/.config/ape/.env

EXAMPLES
  echo "Summarize this article" | ape              # all improved variants, plain text
  echo "Summarize this article" | ape --single      # best variant only
  echo "Write a poem" | ape --verbose               # full scored table with colors
  echo "Explain X" | ape --json | jq '.[0].text'    # JSON output
  echo "Help me" | ape --base-url http://localhost:11434/v1

AI SKILL USAGE
  An AI agent can invoke this tool to self-improve a user's prompt:
  echo "user prompt" | ape --json --single
  Or simply: echo "user prompt" | ape --single
`.trim();

function parseArgs(argv: string[]): {
  provider?: string;
  model?: string;
  baseUrl?: string;
  count: number;
  json: boolean;
  verbose: boolean;
  single: boolean;
  help: boolean;
} {
  const args = argv.slice(2);
  const result = { count: 5, json: false, verbose: false, single: false, help: false } as {
    provider?: string;
    model?: string;
    baseUrl?: string;
    count: number;
    json: boolean;
    verbose: boolean;
    single: boolean;
    help: boolean;
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--provider":
        result.provider = args[++i];
        break;
      case "--model":
        result.model = args[++i];
        break;
      case "--base-url":
        result.baseUrl = args[++i];
        break;
      case "--count":
        result.count = parseInt(args[++i], 10);
        break;
      case "--json":
        result.json = true;
        break;
      case "--verbose":
      case "-v":
        result.verbose = true;
        break;
      case "--single":
        result.single = true;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
      default:
        process.stderr.write(`Unknown flag: ${args[i]}\n`);
        process.exit(1);
    }
  }

  return result;
}

function resolveProvider(flags: {
  provider?: string;
  model?: string;
  baseUrl?: string;
}): { provider: LLMProvider; model: string } {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let providerName = flags.provider;

  if (!providerName) {
    if (openaiKey) providerName = "openai";
    else if (anthropicKey) providerName = "claude";
    else {
      process.stderr.write(
        "Error: No API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY,\nor create ~/.config/ape/.env with your key.\n"
      );
      process.exit(1);
    }
  }

  if (providerName === "openai") {
    const key = openaiKey;
    if (!key) {
      process.stderr.write("Error: OPENAI_API_KEY is not set.\n");
      process.exit(1);
    }
    return {
      provider: new OpenAIProvider(key, flags.baseUrl),
      model: flags.model || "gpt-4o-mini",
    };
  }

  if (providerName === "claude") {
    const key = anthropicKey;
    if (!key) {
      process.stderr.write("Error: ANTHROPIC_API_KEY is not set.\n");
      process.exit(1);
    }
    return {
      provider: new ClaudeProvider(key, flags.baseUrl),
      model: flags.model || "claude-sonnet-4-20250514",
    };
  }

  process.stderr.write(
    `Error: Unknown provider "${providerName}". Use "openai" or "claude".\n`
  );
  process.exit(1);
}

async function loadConfigEnv(): Promise<void> {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  if (!home) return;

  const configPath = `${home}/.config/ape/.env`;
  try {
    const text = await Bun.file(configPath).text();
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Config file doesn't exist — that's fine
  }
}

async function main() {
  const flags = parseArgs(Bun.argv);

  if (flags.help) {
    process.stdout.write(HELP + "\n");
    process.exit(0);
  }

  await loadConfigEnv();

  const input = (await Bun.stdin.text()).trim();

  if (!input) {
    process.stderr.write(
      "Error: No prompt provided. Pipe a prompt via stdin.\n"
    );
    process.exit(1);
  }

  const { provider, model } = resolveProvider(flags);

  const variants = await generateVariants(provider, input, model, flags.count);
  const scored = await scoreVariants(provider, input, variants, model);

  const ranked: RankedVariant[] = scored
    .sort((a, b) => b.overall - a.overall)
    .map((v, i) => ({ ...v, rank: i + 1 }));

  const results = flags.single ? ranked.slice(0, 1) : ranked;

  if (flags.json) {
    process.stdout.write(formatJson(results));
  } else if (flags.verbose) {
    process.stdout.write(formatPretty(results));
  } else {
    process.stdout.write(results.map((r) => r.text).join("\n") + "\n");
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
