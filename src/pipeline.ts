import type { LLMProvider } from "./providers/types.js";
import type { PromptVariant, ScoredVariant } from "./types.js";

export async function generateVariants(
  provider: LLMProvider,
  originalPrompt: string,
  model: string,
  count: number
): Promise<PromptVariant[]> {
  const content = await provider.chatCompletion({
    model,
    temperature: 0.9,
    systemPrompt: `You are an expert prompt engineer. Your job is to improve prompts for large language models.
Given a user's prompt, generate ${count} improved variants. Each variant should be a meaningfully different improvement.
Consider: clarity, specificity, structure, context-setting, output format guidance, role assignment, and constraint specification.

Respond with JSON in this exact format:
{
  "variants": [
    { "text": "the improved prompt", "reasoning": "brief explanation of what was improved" }
  ]
}`,
    userMessage: `Improve this prompt by generating ${count} better variants:\n\n${originalPrompt}`,
  });

  const parsed = JSON.parse(content);
  return parsed.variants as PromptVariant[];
}

export async function scoreVariants(
  provider: LLMProvider,
  originalPrompt: string,
  variants: PromptVariant[],
  model: string
): Promise<ScoredVariant[]> {
  const variantList = variants
    .map((v, i) => `--- Variant ${i + 1} ---\n${v.text}`)
    .join("\n\n");

  const content = await provider.chatCompletion({
    model,
    temperature: 0.3,
    systemPrompt: `You are an expert prompt evaluator. Score each prompt variant on a 1-10 scale for:
- clarity: How clear and unambiguous is the prompt?
- specificity: How specific and detailed is the prompt about what it wants?
- effectiveness: How likely is this prompt to produce a high-quality response from an LLM?

Also provide a brief feedback sentence for each variant.

Respond with JSON in this exact format:
{
  "scores": [
    {
      "clarity": 8,
      "specificity": 7,
      "effectiveness": 9,
      "feedback": "Brief feedback here"
    }
  ]
}`,
    userMessage: `Original prompt:\n${originalPrompt}\n\nRate these improved variants:\n\n${variantList}`,
  });

  const parsed = JSON.parse(content);

  return variants.map((variant, i) => {
    const s = parsed.scores[i] || {
      clarity: 5,
      specificity: 5,
      effectiveness: 5,
      feedback: "",
    };
    return {
      ...variant,
      scores: {
        clarity: s.clarity,
        specificity: s.specificity,
        effectiveness: s.effectiveness,
      },
      overall:
        Math.round(((s.clarity + s.specificity + s.effectiveness) / 3) * 10) /
        10,
      feedback: s.feedback || "",
    };
  });
}
