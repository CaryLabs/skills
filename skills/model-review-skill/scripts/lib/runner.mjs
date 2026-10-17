import { readFile } from "node:fs/promises";
import path from "node:path";
import { collectContext, isSensitivePath } from "./context.mjs";
import { buildMessages, normalizeProviderResult } from "./normalize.mjs";
import { writeJsonAtomic } from "./output.mjs";

export async function loadExplicitInput(inputPath, { cwd = process.cwd(), maxChars = 120_000, read = readFile } = {}) {
  const absolute = path.resolve(cwd, inputPath);
  if (isSensitivePath(path.relative(cwd, absolute))) throw new Error(`sensitive input path cannot be reviewed: ${inputPath}`);
  const source = await read(absolute, "utf8");
  if (!source.trim()) throw new Error("review input is empty");
  const truncated = source.length > maxChars;
  return {
    text: truncated ? source.slice(0, maxChars) : source,
    coverage: { included: [inputPath], excluded: [], uncovered: [], truncated },
  };
}

export async function runReview({
  task,
  profile,
  config,
  providerNames,
  registry,
  context,
  scope = "working-tree",
  base = config.baseBranch,
  output,
  now = () => new Date(),
  runtime = {},
}) {
  if (!task || !profile) throw new Error("task and profile are required");
  const selected = providerNames?.length ? providerNames : [config.defaultProvider];
  const messages = buildMessages(profile, context.text);
  const results = [];

  for (const name of selected) {
    const providerConfig = config.providers[name];
    if (!providerConfig) throw new Error(`provider '${name}' is not configured`);
    const type = providerConfig.type ?? name;
    const adapter = registry[type];
    if (!adapter) throw new Error(`provider type '${type}' is not supported`);
    const raw = await adapter.review(
      { provider: name, config: providerConfig, messages, timeoutMs: config.limits.timeoutMs },
      runtime,
    );
    results.push({
      ...normalizeProviderResult(raw.text, { provider: name, model: providerConfig.model }),
      usage: raw.usage ?? {},
    });
  }

  const envelope = {
    task,
    providers: results,
    metadata: {
      scope,
      base,
      generatedAt: now().toISOString(),
      coverage: context.coverage,
    },
  };
  if (output) await writeJsonAtomic(output, envelope);
  return envelope;
}

export async function prepareContext(options) {
  if (options.input) return loadExplicitInput(options.input, options);
  return collectContext(options);
}
