import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeJsonAtomic } from "../scripts/lib/output.mjs";

test("writes JSON atomically", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "model-review-"));
  const target = path.join(directory, "reviews", "result.json");
  await writeJsonAtomic(target, { ok: true });
  assert.deepEqual(JSON.parse(await readFile(target, "utf8")), { ok: true });
});
