#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_CONFIG_PATH, loadConfig } from "./lib/config.mjs";
import { providerRegistry } from "./lib/providers/index.mjs";
import { prepareContext, runReview } from "./lib/runner.mjs";

const TASKS = new Set(["code-review", "plan-review", "architecture-review", "bug-diagnosis", "test-design"]);

export function parseArgs(argv) {
  const result = { providers: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--help") return { help: true, providers: [] };
    if (key === "--include-untracked") { result.includeUntracked = true; continue; }
    const value = argv[++index];
    if (!value) throw new Error(`missing value for ${key}`);
    if (key === "--provider") result.providers.push(value);
    else if (key === "--task") result.task = value;
    else if (key === "--scope") result.scope = value;
    else if (key === "--base") result.base = value;
    else if (key === "--config") result.config = value;
    else if (key === "--input") result.input = value;
    else if (key === "--output") result.output = value;
    else throw new Error(`unknown argument: ${key}`);
  }
  return result;
}

function usage() {
  return "Usage: review.mjs --task <profile> [--provider <name>] [--scope working-tree|branch] [--base <ref>] [--config <path>] [--input <path>] [--output <path>] [--include-untracked]";
}

export async function main(argv = process.argv.slice(2), { cwd = process.cwd(), registry = providerRegistry } = {}) {
  const args = parseArgs(argv);
  if (args.help) return { help: usage() };
  if (!TASKS.has(args.task)) throw new Error(`unknown or missing task: ${args.task ?? "<missing>"}`);
  const loaded = await loadConfig(args.config ?? DEFAULT_CONFIG_PATH, { cwd });
  const config = loaded.value;
  const scope = args.input ? "input" : (args.scope ?? "working-tree");
  const base = args.base ?? config.baseBranch;
  const includeUntracked = args.includeUntracked ?? config.includeUntracked;
  const context = await prepareContext({ cwd, input: args.input, scope, base, includeUntracked, maxChars: config.limits.maxContextChars });
  const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const profile = await readFile(path.join(skillRoot, "references", "profiles", `${args.task}.md`), "utf8");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const output = args.output ?? path.join(cwd, ".codex", "reviews", `${args.task}-${stamp}.json`);
  const result = await runReview({ task: args.task, profile, config, providerNames: args.providers, registry, context, scope, base, output });
  return { output: path.resolve(output), result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then((value) => {
    if (value.help) console.log(value.help);
    else console.log(JSON.stringify({ output: value.output, providers: value.result.providers.map((item) => item.provider) }));
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
