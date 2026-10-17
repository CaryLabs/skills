import assert from "node:assert/strict";
import test from "node:test";
import * as claude from "../scripts/lib/providers/claude.mjs";
import * as deepseek from "../scripts/lib/providers/deepseek.mjs";
import * as gemini from "../scripts/lib/providers/gemini.mjs";
import { postJson } from "../scripts/lib/providers/http.mjs";

const messages = { instruction: "trusted rubric", context: "untrusted code" };

function response(body, status = 200) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

test("DeepSeek preserves role separation and extracts content", async () => {
  let call;
  const result = await deepseek.review({ config: { baseUrl: "https://api.example/v1/", apiKey: "key", model: "model" }, messages, timeoutMs: 1000 }, {
    fetch: async (url, options) => {
      call = { url, options, body: JSON.parse(options.body) };
      return response({ choices: [{ message: { content: '{"summary":"ok","items":[]}' } }], usage: { total_tokens: 2 } });
    },
  });
  assert.equal(call.url, "https://api.example/v1/chat/completions");
  assert.equal(call.options.headers.authorization, "Bearer key");
  assert.deepEqual(call.body.messages.map((item) => item.role), ["system", "user"]);
  assert.match(result.text, /"summary"/);
});

test("Claude sends versioned headers and extracts text blocks", async () => {
  let call;
  const result = await claude.review({ config: { baseUrl: "https://api.example/v1", apiKey: "key", model: "model" }, messages, timeoutMs: 1000 }, {
    fetch: async (url, options) => {
      call = { url, options, body: JSON.parse(options.body) };
      return response({ content: [{ type: "text", text: '{"summary":"ok","items":[]}' }], usage: { input_tokens: 1 } });
    },
  });
  assert.equal(call.url, "https://api.example/v1/messages");
  assert.equal(call.options.headers["x-api-key"], "key");
  assert.equal(call.body.system, messages.instruction);
  assert.equal(result.usage.input_tokens, 1);
});

test("Gemini keeps trusted and untrusted text in separate fields", async () => {
  let call;
  const result = await gemini.review({ config: { baseUrl: "https://api.example/v1beta", apiKey: "key", model: "model name" }, messages, timeoutMs: 1000 }, {
    fetch: async (url, options) => {
      call = { url, body: JSON.parse(options.body) };
      return response({ candidates: [{ content: { parts: [{ text: '{"summary":"ok","items":[]}' }] } }], usageMetadata: { totalTokenCount: 2 } });
    },
  });
  assert.match(call.url, /models\/model%20name:generateContent$/);
  assert.equal(call.body.systemInstruction.parts[0].text, messages.instruction);
});

test("Gemini authenticates with a header instead of a credential-bearing URL", async () => {
  let call;
  await gemini.review({ config: { baseUrl: "https://api.example/v1beta", apiKey: "private-key", model: "model" }, messages, timeoutMs: 1000 }, {
    fetch: async (url, options) => {
      call = { url, options };
      return response({ candidates: [{ content: { parts: [{ text: '{"summary":"ok","items":[]}' }] } }] });
    },
  });
  assert.equal(call.url.includes("private-key"), false);
  assert.equal(call.options.headers["x-goog-api-key"], "private-key");
});

test("Gemini keeps trusted and untrusted payloads separate", async () => {
  let call;
  const result = await gemini.review({ config: { baseUrl: "https://api.example/v1beta", apiKey: "key", model: "model" }, messages, timeoutMs: 1000 }, {
    fetch: async (_url, options) => {
      call = { body: JSON.parse(options.body) };
      return response({ candidates: [{ content: { parts: [{ text: '{"summary":"ok","items":[]}' }] } }], usageMetadata: { totalTokenCount: 2 } });
    },
  });
  assert.equal(call.body.systemInstruction.parts[0].text, messages.instruction);
  assert.equal(call.body.contents[0].parts[0].text, messages.context);
  assert.equal(result.usage.totalTokenCount, 2);
});

test("HTTP errors are bounded and malformed JSON fails", async () => {
  await assert.rejects(
    () => postJson({ url: "https://example.test", headers: {}, body: {}, timeoutMs: 1000 }, { fetch: async () => response("x".repeat(1000), 429) }),
    (error) => error.message.startsWith("provider HTTP 429:") && error.message.length < 550,
  );
  await assert.rejects(
    () => postJson({ url: "https://example.test", headers: {}, body: {}, timeoutMs: 1000 }, { fetch: async () => response("not-json") }),
    /malformed JSON/,
  );
});

test("timeouts abort the provider request", async () => {
  const fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  });
  await assert.rejects(
    () => postJson({ url: "https://example.test", headers: {}, body: {}, timeoutMs: 5 }, { fetch }),
    /timed out after 5ms/,
  );
});

test("all adapters reject empty content", async () => {
  await assert.rejects(() => deepseek.review({ config: { baseUrl: "https://x", apiKey: "k", model: "m" }, messages, timeoutMs: 1000 }, { fetch: async () => response({ choices: [] }) }), /empty content/);
  await assert.rejects(() => claude.review({ config: { baseUrl: "https://x", apiKey: "k", model: "m" }, messages, timeoutMs: 1000 }, { fetch: async () => response({ content: [] }) }), /empty content/);
  await assert.rejects(() => gemini.review({ config: { baseUrl: "https://x", apiKey: "k", model: "m" }, messages, timeoutMs: 1000 }, { fetch: async () => response({ candidates: [] }) }), /empty content/);
});
