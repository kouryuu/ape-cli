import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { OpenAIProvider } from "../src/providers/openai.js";
import { ClaudeProvider } from "../src/providers/claude.js";

const originalFetch = globalThis.fetch;

function mockFetch(responseBody: object, status: number = 200) {
  const fn = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify(responseBody), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    )
  );
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("OpenAIProvider", () => {
  test("sends correct request shape", async () => {
    const fetchMock = mockFetch({
      choices: [{ message: { content: '{"result": "ok"}' } }],
    });

    const provider = new OpenAIProvider("sk-test-key", "https://api.openai.com/v1");
    await provider.chatCompletion({
      model: "gpt-4o-mini",
      temperature: 0.9,
      systemPrompt: "You are helpful",
      userMessage: "Hello",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(options.method).toBe("POST");

    const headers = options.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test-key");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(options.body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.temperature).toBe(0.9);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
  });

  test("parses choices[0].message.content", async () => {
    mockFetch({
      choices: [{ message: { content: '{"variants": []}' } }],
    });

    const provider = new OpenAIProvider("sk-test");
    const result = await provider.chatCompletion({
      model: "gpt-4o-mini",
      temperature: 0.5,
      systemPrompt: "sys",
      userMessage: "user",
    });

    expect(result).toBe('{"variants": []}');
  });

  test("throws on non-2xx with error message", async () => {
    mockFetch({ error: { message: "Invalid API key" } }, 401);

    const provider = new OpenAIProvider("bad-key");
    expect(
      provider.chatCompletion({
        model: "gpt-4o-mini",
        temperature: 0.5,
        systemPrompt: "sys",
        userMessage: "user",
      })
    ).rejects.toThrow("Invalid API key");
  });

  test("throws generic error when no error message in response", async () => {
    mockFetch({}, 500);

    const provider = new OpenAIProvider("sk-test");
    expect(
      provider.chatCompletion({
        model: "gpt-4o-mini",
        temperature: 0.5,
        systemPrompt: "sys",
        userMessage: "user",
      })
    ).rejects.toThrow("API error: 500");
  });

  test("strips trailing slashes from base URL", async () => {
    const fetchMock = mockFetch({
      choices: [{ message: { content: '{}' } }],
    });

    const provider = new OpenAIProvider("sk-test", "https://api.example.com/v1///");
    await provider.chatCompletion({
      model: "m",
      temperature: 0,
      systemPrompt: "s",
      userMessage: "u",
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/completions");
  });

  test("uses default base URL when none provided", async () => {
    const fetchMock = mockFetch({
      choices: [{ message: { content: '{}' } }],
    });

    const provider = new OpenAIProvider("sk-test");
    await provider.chatCompletion({
      model: "m",
      temperature: 0,
      systemPrompt: "s",
      userMessage: "u",
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
  });

  test("handles non-JSON error response body gracefully", async () => {
    const fn = mock(() =>
      Promise.resolve(
        new Response("Internal Server Error", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        })
      )
    );
    globalThis.fetch = fn as unknown as typeof fetch;

    const provider = new OpenAIProvider("sk-test");
    expect(
      provider.chatCompletion({
        model: "m",
        temperature: 0,
        systemPrompt: "s",
        userMessage: "u",
      })
    ).rejects.toThrow("API error: 500");
  });
});

describe("ClaudeProvider", () => {
  test("sends correct request shape", async () => {
    const fetchMock = mockFetch({
      content: [{ text: '"result": "ok"}' }],
    });

    const provider = new ClaudeProvider("sk-ant-test", "https://api.anthropic.com/v1");
    await provider.chatCompletion({
      model: "claude-sonnet-4-20250514",
      temperature: 0.3,
      systemPrompt: "You are helpful",
      userMessage: "Hello",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(options.method).toBe("POST");

    const headers = options.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");

    const body = JSON.parse(options.body as string);
    expect(body.model).toBe("claude-sonnet-4-20250514");
    expect(body.temperature).toBe(0.3);
    expect(body.system).toBe("You are helpful");
    expect(body.max_tokens).toBe(4096);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[1]).toEqual({ role: "assistant", content: "{" });
  });

  test("prepends { to response content for JSON prefill", async () => {
    mockFetch({
      content: [{ text: '"variants": []}' }],
    });

    const provider = new ClaudeProvider("sk-ant-test");
    const result = await provider.chatCompletion({
      model: "claude-sonnet-4-20250514",
      temperature: 0.5,
      systemPrompt: "sys",
      userMessage: "user",
    });

    expect(result).toBe('{"variants": []}');
  });

  test("throws on non-2xx with error message", async () => {
    mockFetch({ error: { message: "Invalid API key" } }, 401);

    const provider = new ClaudeProvider("bad-key");
    expect(
      provider.chatCompletion({
        model: "claude-sonnet-4-20250514",
        temperature: 0.5,
        systemPrompt: "sys",
        userMessage: "user",
      })
    ).rejects.toThrow("Invalid API key");
  });

  test("throws generic error when no error message in response", async () => {
    mockFetch({}, 503);

    const provider = new ClaudeProvider("sk-ant-test");
    expect(
      provider.chatCompletion({
        model: "claude-sonnet-4-20250514",
        temperature: 0.5,
        systemPrompt: "sys",
        userMessage: "user",
      })
    ).rejects.toThrow("API error: 503");
  });

  test("uses default base URL when none provided", async () => {
    const fetchMock = mockFetch({
      content: [{ text: '"ok": true}' }],
    });

    const provider = new ClaudeProvider("sk-ant-test");
    await provider.chatCompletion({
      model: "claude-sonnet-4-20250514",
      temperature: 0.5,
      systemPrompt: "sys",
      userMessage: "user",
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
  });

  test("strips trailing slashes from base URL", async () => {
    const fetchMock = mockFetch({
      content: [{ text: '"ok": true}' }],
    });

    const provider = new ClaudeProvider("sk-ant-test", "https://custom.api.com/v1//");
    await provider.chatCompletion({
      model: "m",
      temperature: 0,
      systemPrompt: "s",
      userMessage: "u",
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://custom.api.com/v1/messages");
  });
});
