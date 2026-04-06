import type { RankedVariant } from "./types.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const VIOLET = "\x1b[35m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

function scoreColor(score: number): string {
  if (score >= 8) return GREEN;
  if (score >= 6) return YELLOW;
  return RED;
}

function bar(score: number, width: number = 20): string {
  const filled = Math.round((score / 10) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export function formatPretty(results: RankedVariant[]): string {
  const lines: string[] = [];

  lines.push(
    `\n${VIOLET}${BOLD}✦ Prompt Improver${RESET} — ${results.length} variants generated and scored\n`
  );

  for (const r of results) {
    const color = scoreColor(r.overall);

    lines.push(
      `  ${VIOLET}${BOLD}#${r.rank}${RESET}  ${color}${bar(r.overall)}${RESET}  ${BOLD}${r.overall.toFixed(1)}/10${RESET}`
    );
    lines.push(`  ${DIM}┃${RESET} ${r.text}`);
    lines.push(`  ${DIM}┃${RESET}`);
    lines.push(
      `  ${DIM}┃${RESET} ${scoreColor(r.scores.clarity)}Clarity: ${r.scores.clarity}${RESET}  ${scoreColor(r.scores.specificity)}Specificity: ${r.scores.specificity}${RESET}  ${scoreColor(r.scores.effectiveness)}Effectiveness: ${r.scores.effectiveness}${RESET}`
    );
    lines.push(`  ${DIM}┃${RESET} Feedback: ${r.feedback}`);
    lines.push(`  ${DIM}┃${RESET} Changes: ${r.reasoning}`);
    lines.push(`  ${DIM}┗━━━${RESET}\n`);
  }

  return lines.join("\n") + "\n";
}

export function formatJson(results: RankedVariant[]): string {
  return JSON.stringify(results, null, 2) + "\n";
}
