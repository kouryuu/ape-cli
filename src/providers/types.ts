export interface ChatCompletionParams {
  model: string;
  temperature: number;
  systemPrompt: string;
  userMessage: string;
}

export interface LLMProvider {
  chatCompletion(params: ChatCompletionParams): Promise<string>;
}

export interface ProviderConfig {
  provider: "openai" | "claude";
  apiKey: string;
  baseUrl: string;
  model: string;
}
