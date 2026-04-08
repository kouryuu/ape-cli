# 🦍 ape

**Your prompts, evolved.** A CLI tool that uses LLMs to automatically improve your prompts — inspired by the [Automatic Prompt Engineer (APE)](https://arxiv.org/abs/2211.01910) paper.

> _"Large Language Models Are Human-Level Prompt Engineers"_
> — Zhou et al., ICLR 2023

---

## 🐒 What is this?

`ape` takes a prompt you've written, generates multiple improved variants using an LLM, scores each variant on clarity, specificity, and effectiveness, then ranks them best-to-worst. It's the APE paper's **generate → score → select** pipeline in your terminal.

**Three stages, two API calls:**

1. 🧬 **Generate** — An LLM produces N improved variants of your prompt (high temperature for diversity)
2. 🏆 **Score** — The same LLM judges each variant on 3 criteria (low temperature for consistency)
3. 📊 **Rank** — Results sorted by overall score, displayed with color-coded ratings

### The APE Connection

The original APE paper (Zhou et al., ICLR 2023) framed prompt optimization as _natural language program synthesis_ — a black-box optimization problem where LLMs both propose candidate instructions and evaluate them. APE achieved human-level or better performance on 24/24 Instruction Induction tasks and famously discovered _"Let's work this out in a step by step way to be sure we have the right answer"_ — beating the hand-crafted _"Let's think step by step"_ CoT prompt.

This CLI implements a simplified version of that pipeline, adapted for interactive use. Instead of execution accuracy on test pairs, we use multi-criteria LLM-as-judge scoring — making it work for any prompt, not just those with known answers.

---

## 🦧 AI Skill Usage

This tool is designed to be invoked by AI agents as a **prompt improvement skill**. When an AI receives a user's prompt, it can shell out to improve it before responding:

```bash
# AI agent calls this, parses JSON, uses the top-ranked variant
echo "summarize this article for me" | ape --json --count 3
```

The `--json` flag outputs machine-readable results that an AI can parse to:
- **Pick** the highest-scoring variant as the improved prompt
- **Present** multiple options to the user for selection
- **Explain** why the improved prompt is better using the scoring criteria

Pipe-in, pipe-out, zero interactivity — a composable Unix tool for AI agent workflows.

---

## 🔧 Installation

Requires [Bun](https://bun.sh) runtime.

```bash
# Run directly without installing
bunx ape-cli --help

# Or install globally
bun install -g ape-cli

# Or clone and link locally
git clone https://github.com/kouryuu/ape-cli.git && cd ape-cli
bun install
bun link
```

Now you can use `ape` anywhere.

---

## 🚀 Usage

```bash
# Basic usage — pipe in a prompt
echo "Summarize this article" | ape

# Read from a file
cat prompt.txt | ape

# Generate 3 variants using Claude
echo "Write a poem about space" | ape --provider claude --count 3

# JSON output for scripting / AI skill usage
echo "Explain quantum computing" | ape --json

# Use with OpenRouter
echo "Help me debug" | ape --base-url https://openrouter.ai/api/v1 --model openai/gpt-4o

# Use with local Ollama
echo "Translate this" | ape --base-url http://localhost:11434/v1 --model llama3

# Extract just the top prompt
echo "My prompt" | ape --json | jq -r '.[0].text'
```

---

## 🏴‍☠️ Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--provider` | auto-detect | `openai` or `claude`. Auto-detected from env vars. |
| `--model` | `gpt-4o-mini` / `claude-sonnet-4-20250514` | Model for generation and scoring |
| `--base-url` | provider default | Override API base URL |
| `--count` | `5` | Number of variants to generate |
| `--json` | `false` | Machine-readable JSON output |
| `--help` | — | Show usage |

---

## 🔑 Environment Variables

| Variable | Provider | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | `openai` | OpenAI (or compatible) API key |
| `ANTHROPIC_API_KEY` | `claude` | Anthropic Claude API key |

**Auto-detection:** If no `--provider` is specified, the CLI checks which key is set. If both are set, defaults to `openai`.

---

## 📦 Provider Compatibility

| Provider | `--provider` | `--base-url` | Notes |
|----------|-------------|-------------|-------|
| OpenAI | `openai` | _(default)_ | Uses `OPENAI_API_KEY` |
| Claude | `claude` | _(default)_ | Uses `ANTHROPIC_API_KEY` |
| OpenRouter | `openai` | `https://openrouter.ai/api/v1` | Set `OPENAI_API_KEY` to your OpenRouter key |
| Ollama | `openai` | `http://localhost:11434/v1` | No API key needed (set dummy value) |
| Any OpenAI-compatible | `openai` | `<your-url>` | Works with any compatible endpoint |

---

## 📋 Output Formats

### Pretty Mode (default)

```
✦ Prompt Improver — 5 variants generated and scored

  #1  ██████████████████░░  8.7/10
  ┃ You are an expert summarizer. Given the following article, produce a...
  ┃
  ┃ Clarity: 9  Specificity: 8  Effectiveness: 9
  ┃ Feedback: Added role assignment and output format constraints
  ┃ Changes: Assigned expert role, added structured output requirement
  ┗━━━
```

### JSON Mode (`--json`)

```json
[
  {
    "rank": 1,
    "text": "You are an expert summarizer...",
    "reasoning": "Added role assignment and structured output",
    "scores": { "clarity": 9, "specificity": 8, "effectiveness": 9 },
    "overall": 8.7,
    "feedback": "Clear role and format guidance"
  }
]
```

---

## 🧪 Testing

```bash
bun test
```

Tests use mocked LLM providers — no API key required.

---

## 📜 Citation

This tool is inspired by:

```bibtex
@inproceedings{zhou2023large,
  title={Large Language Models are Human-Level Prompt Engineers},
  author={Zhou, Yongchao and Muresanu, Andrei Ioan and Han, Ziwen and Paster, Keiran and Pitis, Silviu and Chan, Harris and Ba, Jimmy},
  booktitle={ICLR},
  year={2023}
}
```

---

## 🦍 Zero Dependencies

This CLI has **zero runtime dependencies**. Everything is built on Bun built-ins:
- `fetch` for API calls
- `Bun.stdin` for input
- `Bun.argv` for arg parsing
- Raw ANSI escape codes for colors

Dev dependencies (`typescript`, `@types/bun`) are only used for type-checking.

---

## 📄 License

[MIT](./LICENSE) © 2025 Rodrigo Reyes

---

_Built with 🍌 by an ape who believes your prompts deserve better._
