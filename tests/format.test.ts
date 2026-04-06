import { describe, test, expect } from "bun:test";
import { formatPretty, formatJson } from "../src/format.js";
import type { RankedVariant } from "../src/types.js";

const MOCK_RESULTS: RankedVariant[] = [
  {
    rank: 1,
    text: "You are an expert summarizer. Summarize the article in 3 bullet points.",
    reasoning: "Added role and format constraints",
    scores: { clarity: 9, specificity: 8, effectiveness: 9 },
    overall: 8.7,
    feedback: "Clear and specific",
  },
  {
    rank: 2,
    text: "Summarize the key points of this article concisely.",
    reasoning: "Improved specificity",
    scores: { clarity: 7, specificity: 7, effectiveness: 6 },
    overall: 6.7,
    feedback: "Good but could be more specific",
  },
  {
    rank: 3,
    text: "Give me a summary",
    reasoning: "Minimal improvement",
    scores: { clarity: 4, specificity: 3, effectiveness: 4 },
    overall: 3.7,
    feedback: "Too vague",
  },
];

describe("formatJson", () => {
  test("returns valid JSON array", () => {
    const output = formatJson(MOCK_RESULTS);
    const parsed = JSON.parse(output);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
  });

  test("preserves all fields with correct values", () => {
    const output = formatJson(MOCK_RESULTS);
    const parsed = JSON.parse(output);

    expect(parsed[0].rank).toBe(1);
    expect(parsed[0].text).toBe(
      "You are an expert summarizer. Summarize the article in 3 bullet points."
    );
    expect(parsed[0].scores.clarity).toBe(9);
    expect(parsed[0].overall).toBe(8.7);
    expect(parsed[0].feedback).toBe("Clear and specific");
    expect(parsed[0].reasoning).toBe("Added role and format constraints");
  });

  test("maintains rank ordering", () => {
    const output = formatJson(MOCK_RESULTS);
    const parsed = JSON.parse(output);

    expect(parsed[0].rank).toBe(1);
    expect(parsed[1].rank).toBe(2);
    expect(parsed[2].rank).toBe(3);
  });
});

describe("formatPretty", () => {
  test("includes header with variant count", () => {
    const output = formatPretty(MOCK_RESULTS);
    expect(output).toContain("Prompt Improver");
    expect(output).toContain("3 variants generated and scored");
  });

  test("includes rank numbers", () => {
    const output = formatPretty(MOCK_RESULTS);
    expect(output).toContain("#1");
    expect(output).toContain("#2");
    expect(output).toContain("#3");
  });

  test("includes bar charts", () => {
    const output = formatPretty(MOCK_RESULTS);
    expect(output).toContain("█");
    expect(output).toContain("░");
  });

  test("includes score values", () => {
    const output = formatPretty(MOCK_RESULTS);
    expect(output).toContain("8.7/10");
    expect(output).toContain("6.7/10");
    expect(output).toContain("3.7/10");
  });

  test("includes individual criteria scores", () => {
    const output = formatPretty(MOCK_RESULTS);
    expect(output).toContain("Clarity: 9");
    expect(output).toContain("Specificity: 8");
    expect(output).toContain("Effectiveness: 9");
  });

  test("includes box-drawing characters", () => {
    const output = formatPretty(MOCK_RESULTS);
    expect(output).toContain("┃");
    expect(output).toContain("┗━━━");
  });

  test("includes feedback and reasoning", () => {
    const output = formatPretty(MOCK_RESULTS);
    expect(output).toContain("Clear and specific");
    expect(output).toContain("Added role and format constraints");
  });

  test("uses green ANSI code for high scores (≥8)", () => {
    const output = formatPretty(MOCK_RESULTS);
    // Green escape code should appear for score 8.7
    expect(output).toContain("\x1b[32m");
  });

  test("uses yellow ANSI code for medium scores (6-7)", () => {
    const output = formatPretty(MOCK_RESULTS);
    // Yellow escape code should appear for score 6.7
    expect(output).toContain("\x1b[33m");
  });

  test("uses red ANSI code for low scores (<6)", () => {
    const output = formatPretty(MOCK_RESULTS);
    // Red escape code should appear for score 3.7
    expect(output).toContain("\x1b[31m");
  });
});
