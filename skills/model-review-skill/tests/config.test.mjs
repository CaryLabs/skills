import assert from "node:assert/strict";
import test from "node:test";
import { assertConfigIsLocal, validateConfig } from "../scripts/lib/config.mjs";

const valid = {
  defaultProvider: "mock",
  providers: { mock: { type: "mock", baseUrl: "https://example.test", apiKey: "local-key", model: "reviewer" } },
};

test("validates and defaults configuration", () => {
  const result = validateConfig(valid);
  assert.equal(result.baseBranch, "main");
  assert.equal(result.limits.timeoutMs, 60_000);
});

test("accepts unauthenticated OpenAI-compatible local providers", () => {
  const result = validateConfig({
    defaultProvider: "local",
    providers: {
      local: { type: "openai-compatible", baseUrl: "http://localhost:11434/v1", model: "local-model", auth: { type: "none" } },
    },
  });
  assert.equal(result.providers.local.auth.type, "none");
});

test("rejects missing credentials unless generic auth is disabled", () => {
  assert.throws(() => validateConfig({
    defaultProvider: "remote",
    providers: { remote: { type: "openai-compatible", baseUrl: "https://example.test/v1", model: "model" } },
  }), /apiKey/);
  assert.throws(() => validateConfig({
    defaultProvider: "claude",
    providers: { claude: { type: "claude", baseUrl: "https://example.test/v1", model: "model", auth: { type: "none" } } },
  }), /only supports auth.type 'none'/);
});

test("rejects a tracked credential config", () => {
  const git = (args) => {
    if (args[0] === "rev-parse") return "C:/repo";
    if (args[0] === "ls-files") return ".codex/model-review.local.json";
    throw new Error("unexpected");
  };
  assert.throws(() => assertConfigIsLocal(".codex/model-review.local.json", { cwd: "C:/repo", git }), /tracked credential/);
});

test("accepts an ignored, untracked credential config", () => {
  const git = (args) => {
    if (args[0] === "rev-parse") return "C:/repo";
    if (args[0] === "ls-files") throw new Error("not tracked");
    if (args[0] === "check-ignore") return "";
    throw new Error("unexpected");
  };
  assert.match(assertConfigIsLocal(".codex/model-review.local.json", { cwd: "C:/repo", git }), /model-review\.local\.json$/);
});
