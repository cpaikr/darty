import { afterEach, describe, expect, test } from "bun:test";

import {
  fetchOpenAiChatCompletion,
  MAX_OPENAI_RETRY_DELAY_MS,
  openAiRetryDelayMs,
  parseRetryAfterMs,
} from "./openai-chat.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("OpenAI eval transport resilience", () => {
  test("parses and bounds Retry-After delay-seconds and HTTP dates", () => {
    expect(parseRetryAfterMs("2")).toBe(2_000);
    expect(parseRetryAfterMs("999999")).toBe(MAX_OPENAI_RETRY_DELAY_MS);
    expect(
      parseRetryAfterMs(
        "Wed, 21 Oct 2015 07:28:00 GMT",
        Date.parse("Wed, 21 Oct 2015 07:27:59 GMT"),
      ),
    ).toBe(1_000);
    expect(parseRetryAfterMs("not-a-delay")).toBeUndefined();
  });

  test("uses Retry-After when present and bounds exponential fallback", () => {
    expect(openAiRetryDelayMs(0, "0")).toBe(0);
    expect(openAiRetryDelayMs(1, "999999")).toBe(MAX_OPENAI_RETRY_DELAY_MS);
    expect(openAiRetryDelayMs(0)).toBe(750);
  });

  test("honors a zero Retry-After while retrying a rate-limited response", async () => {
    let attempts = 0;
    globalThis.fetch = (async (
      _input: string | URL | Request,
      _init?: RequestInit,
    ) => {
      attempts += 1;
      return attempts === 1
        ? new Response("busy", {
            headers: { "Retry-After": "0" },
            status: 429,
          })
        : new Response("ok", { status: 200 });
    }) as typeof globalThis.fetch;

    await expect(
      fetchOpenAiChatCompletion({
        apiKey: "test-key",
        body: {},
        maxAttempts: 2,
        requestTimeoutMs: 100,
      }),
    ).resolves.toBe("ok");
    expect(attempts).toBe(2);
  });

  test("aborts a hung fetch attempt at the configured timeout", async () => {
    let observedSignal: AbortSignal | undefined;
    globalThis.fetch = ((
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      observedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      });
    }) as typeof globalThis.fetch;

    await expect(
      fetchOpenAiChatCompletion({
        apiKey: "test-key",
        body: {},
        maxAttempts: 1,
        requestTimeoutMs: 5,
      }),
    ).rejects.toThrow("timed out after 5ms");
    expect(observedSignal?.aborted).toBe(true);
  });
});

test("tool-free responses cannot silently discard unexpected tool calls", async () => {
  const { callOpenAi, ModelResponseError } = await import("./openai-chat.ts");
  globalThis.fetch = (async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ choices: [{ message: {
    content: '{"pass":true,"score":5,"reasons":[]}',
    tool_calls: [{ id: "unexpected", type: "function", function: { name: "run_darty_cli", arguments: "{}" } }],
  } }] }))) as typeof fetch;
  await expect(callOpenAi({ apiKey: "fake", model: "fake", messages: [], tools: [], toolNames: new Set<string>() })).rejects.toBeInstanceOf(ModelResponseError);
});
