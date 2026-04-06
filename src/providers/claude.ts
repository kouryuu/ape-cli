import type { LLMProvider, ChatCompletionParams } from "./types.js";

export class ClaudeProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.anthropic.com/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: 4096,
        temperature: params.temperature,
        system: params.systemPrompt,
        messages: [
          { role: "user", content: params.userMessage },
          { role: "assistant", content: "{" },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ||
          `API error: ${response.status}`
      );
    }

    const data = await response.json();
    const text = data.content[0].text;
    return "{" + text;
  }
}
