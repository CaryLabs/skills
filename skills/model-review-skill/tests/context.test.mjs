import assert from "node:assert/strict";
import test from "node:test";
import { collectContext, isSensitivePath } from "../scripts/lib/context.mjs";

function gitFixture(map) {
  return (args) => map[args.join(" ")] ?? "";
}

test("reports uncovered untracked files", async () => {
  const git = gitFixture({ "ls-files --others --exclude-standard": "new-file.mjs" });
  await assert.rejects(() => collectContext({ git }), (error) => error.code === "UNCOVERED_UNTRACKED" && error.coverage.uncovered[0] === "new-file.mjs");
});

for (const [label, status] of [
  ["staged", "A  staged.mjs"],
  ["unstaged", " M unstaged.mjs"],
  ["untracked", "?? untracked.mjs"],
]) {
  test(`branch scope rejects a dirty tree with ${label} changes`, async () => {
    const git = gitFixture({ "status --porcelain --untracked-files=normal": status });
    await assert.rejects(
      () => collectContext({ git, scope: "branch" }),
      (error) => error.code === "UNCOVERED_WORKTREE" && error.coverage.uncovered.length === 1,
    );
  });
}

test("branch scope reviews committed changes when the tree is clean", async () => {
  const git = gitFixture({
    "status --porcelain --untracked-files=normal": "",
    "diff --name-only main...HEAD": "src/change.mjs",
    "diff --no-ext-diff main...HEAD": "diff --git a/src/change.mjs b/src/change.mjs",
  });
  const result = await collectContext({ git, scope: "branch", base: "main" });
  assert.deepEqual(result.coverage.included, ["src/change.mjs"]);
});

test("includes opted-in untracked files and records truncation", async () => {
  const git = gitFixture({ "ls-files --others --exclude-standard": "new-file.mjs" });
  const result = await collectContext({ git, includeUntracked: true, maxChars: 10, read: async () => "export default 1;" });
  assert.equal(result.coverage.truncated, true);
  assert.deepEqual(result.coverage.included, ["new-file.mjs"]);
});

test("recognizes sensitive paths", () => {
  assert.equal(isSensitivePath("config/.env.production"), true);
  assert.equal(isSensitivePath("secrets/provider.json"), true);
  assert.equal(isSensitivePath("certs/client.pem"), true);
  assert.equal(isSensitivePath("src/index.mjs"), false);
});

test("never reads an opted-in sensitive untracked file", async () => {
  const git = gitFixture({ "ls-files --others --exclude-standard": "secrets/provider.json\nsrc/new.mjs" });
  const reads = [];
  const result = await collectContext({
    git,
    includeUntracked: true,
    read: async (file) => {
      reads.push(file);
      return "export default true;";
    },
  });
  assert.equal(reads.length, 1);
  assert.match(reads[0], /src[\\/]new\.mjs$/);
  assert.deepEqual(result.coverage.excluded, ["secrets/provider.json"]);
});
