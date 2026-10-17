import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { main, parseArgs } from "../scripts/review.mjs";

test("parses repeated providers and review scope", () => {
  const args = parseArgs(["--task", "code-review", "--provider", "claude", "--provider", "gemini", "--scope", "branch", "--base", "main"]);
  assert.deepEqual(args.providers, ["claude", "gemini"]);
  assert.equal(args.scope, "branch");
  assert.equal(args.base, "main");
});

test("rejects unknown and incomplete arguments", () => {
  assert.throws(() => parseArgs(["--unknown", "x"]), /unknown argument/);
  assert.throws(() => parseArgs(["--task"]), /missing value/);
});

test("runs the public CLI main path offline in a Git repository", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "model-review-cli-"));
  execFileSync("git", ["init"], { cwd, stdio: "ignore" });
  await mkdir(path.join(cwd, ".codex"), { recursive: true });
  await writeFile(path.join(cwd, ".gitignore"), ".codex/model-review.local.json\n.codex/reviews/\n", "utf8");
  await writeFile(path.join(cwd, "plan.md"), "Review this implementation plan.", "utf8");
  await writeFile(path.join(cwd, ".codex", "model-review.local.json"), JSON.stringify({
    defaultProvider: "local",
    baseBranch: "main",
    limits: { maxContextChars: 10_000, timeoutMs: 1_000 },
    providers: { local: { type: "mock", baseUrl: "https://example.test", apiKey: "local-only", model: "mock-model" } },
  }), "utf8");
  const output = path.join(cwd, ".codex", "reviews", "result.json");
  const registry = {
    mock: {
      async review(request) {
        assert.match(request.messages.instruction, /implementation plan/i);
        return { text: '{"summary":"reviewed","items":[]}' };
      },
    },
  };
  const value = await main([
    "--task", "plan-review",
    "--provider", "local",
    "--config", ".codex/model-review.local.json",
    "--input", "plan.md",
    "--output", output,
  ], { cwd, registry });
  const written = JSON.parse(await readFile(value.output, "utf8"));
  assert.equal(written.task, "plan-review");
  assert.equal(written.providers[0].provider, "local");
  assert.deepEqual(written.metadata.coverage.included, ["plan.md"]);
});
