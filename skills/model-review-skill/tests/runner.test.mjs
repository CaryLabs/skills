import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runReview } from "../scripts/lib/runner.mjs";

test("runs an end-to-end review through an injected provider", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "model-review-runner-"));
  const output = path.join(directory, "result.json");
  let request;
  const registry = {
    mock: {
      async review(value) {
        request = value;
        return { text: '{"summary":"one issue","items":[{"severity":"high","title":"Bug","evidence":"line 1","recommendation":"fix it"}]}' };
      },
    },
  };
  const config = {
    defaultProvider: "local",
    baseBranch: "main",
    limits: { timeoutMs: 1_000, maxContextChars: 10_000 },
    providers: { local: { type: "mock", baseUrl: "https://example.test", apiKey: "secret", model: "mock-model" } },
  };
  const context = { text: "diff --git a/a b/a", coverage: { included: ["a"], excluded: [], uncovered: [], truncated: false } };
  const result = await runReview({ task: "code-review", profile: "Review correctness.", config, registry, context, output, now: () => new Date("2026-01-01T00:00:00Z") });
  assert.equal(result.providers[0].items[0].title, "Bug");
  assert.equal(request.messages.instruction.includes(context.text), false);
  assert.equal(JSON.parse(await readFile(output, "utf8")).metadata.generatedAt, "2026-01-01T00:00:00.000Z");
});
