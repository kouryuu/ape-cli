import { describe, test, expect } from "bun:test";
import type { LLMProvider, ChatCompletionParams } from "../src/providers/types.js";
import { generateVariants, scoreVariants } from "../src/pipeline.js";

class MockProvider implements LLMProvider {
  private responses: string[];
  private callIndex = 0;
  public calls: ChatCompletionParams[] = [];

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    this.calls.push(params);
    return this.responses[this.callIndex++] || "{}";
  }
}

const MOCK_GENERATE_RESPONSE = JSON.stringify({
  variants: [
    { text: "Improved prompt A", reasoning: "Added specificity" },
    { text: "Improved prompt B", reasoning: "Added role assignment" },
    { text: "Improved prompt C", reasoning: "Added output format" },
  ],
});

const MOCK_SCORE_RESPONSE = JSON.stringify({
  scores: [
    { clarity: 9, specificity: 8, effectiveness: 9, feedback: "Very clear" },
    { clarity: 7, specificity: 7, effectiveness: 6, feedback: "Good but vague" },
    { clarity: 8, specificity: 9, effectiveness: 8, feedback: "Well structured" },
  ],
});

describe("generateVariants", () => {
  test("parses mock response into PromptVariant[]", async () => {
    const provider = new MockProvider([MOCK_GENERATE_RESPONSE]);
    const variants = await generateVariants(provider, "test prompt", "gpt-4o-mini", 3);

    expect(variants).toHaveLength(3);
    expect(variants[0].text).toBe("Improved prompt A");
    expect(variants[0].reasoning).toBe("Added specificity");
    expect(variants[2].text).toBe("Improved prompt C");
  });

  test("passes correct parameters to provider", async () => {
    const provider = new MockProvider([MOCK_GENERATE_RESPONSE]);
    await generateVariants(provider, "my prompt", "gpt-4o-mini", 5);

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].model).toBe("gpt-4o-mini");
    expect(provider.calls[0].temperature).toBe(0.9);
    expect(provider.calls[0].userMessage).toContain("my prompt");
    expect(provider.calls[0].userMessage).toContain("5");
  });

  test("throws on invalid JSON response", async () => {
    const provider = new MockProvider(["not json"]);
    expect(generateVariants(provider, "test", "gpt-4o-mini", 3)).rejects.toThrow();
  });
});

describe("scoreVariants", () => {
  const variants = [
    { text: "Improved prompt A", reasoning: "Added specificity" },
    { text: "Improved prompt B", reasoning: "Added role assignment" },
    { text: "Improved prompt C", reasoning: "Added output format" },
  ];

  test("merges scores with variants correctly", async () => {
    const provider = new MockProvider([MOCK_SCORE_RESPONSE]);
    const scored = await scoreVariants(provider, "original", variants, "gpt-4o-mini");

    expect(scored).toHaveLength(3);
    expect(scored[0].text).toBe("Improved prompt A");
    expect(scored[0].scores.clarity).toBe(9);
    expect(scored[0].scores.specificity).toBe(8);
    expect(scored[0].scores.effectiveness).toBe(9);
    expect(scored[0].feedback).toBe("Very clear");
  });

  test("computes overall score correctly", async () => {
    const provider = new MockProvider([MOCK_SCORE_RESPONSE]);
    const scored = await scoreVariants(provider, "original", variants, "gpt-4o-mini");

    // (9 + 8 + 9) / 3 = 8.666... → 8.7
    expect(scored[0].overall).toBe(8.7);
    // (7 + 7 + 6) / 3 = 6.666... → 6.7
    expect(scored[1].overall).toBe(6.7);
    // (8 + 9 + 8) / 3 = 8.333... → 8.3
    expect(scored[2].overall).toBe(8.3);
  });

  test("uses fallback scores when fewer scores than variants", async () => {
    const partialScores = JSON.stringify({
      scores: [
        { clarity: 9, specificity: 8, effectiveness: 9, feedback: "Good" },
      ],
    });
    const provider = new MockProvider([partialScores]);
    const scored = await scoreVariants(provider, "original", variants, "gpt-4o-mini");

    expect(scored[0].scores.clarity).toBe(9);
    // Variants without scores get fallback {5, 5, 5}
    expect(scored[1].scores.clarity).toBe(5);
    expect(scored[1].scores.specificity).toBe(5);
    expect(scored[1].scores.effectiveness).toBe(5);
    expect(scored[1].overall).toBe(5);
    expect(scored[2].overall).toBe(5);
  });

  test("passes correct parameters to provider", async () => {
    const provider = new MockProvider([MOCK_SCORE_RESPONSE]);
    await scoreVariants(provider, "original prompt", variants, "gpt-4o-mini");

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].model).toBe("gpt-4o-mini");
    expect(provider.calls[0].temperature).toBe(0.3);
    expect(provider.calls[0].userMessage).toContain("original prompt");
    expect(provider.calls[0].userMessage).toContain("Variant 1");
    expect(provider.calls[0].userMessage).toContain("Variant 3");
  });
});

describe("full pipeline", () => {
  test("generate + score + sort produces ranked results", async () => {
    const provider = new MockProvider([MOCK_GENERATE_RESPONSE, MOCK_SCORE_RESPONSE]);

    const variants = await generateVariants(provider, "test", "gpt-4o-mini", 3);
    const scored = await scoreVariants(provider, "test", variants, "gpt-4o-mini");
    const ranked = scored
      .sort((a, b) => b.overall - a.overall)
      .map((v, i) => ({ ...v, rank: i + 1 }));

    expect(ranked[0].overall).toBe(8.7);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].overall).toBe(8.3);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].overall).toBe(6.7);
    expect(ranked[2].rank).toBe(3);
  });
});
