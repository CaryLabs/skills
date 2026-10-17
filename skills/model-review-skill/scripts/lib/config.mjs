import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_CONFIG_PATH = ".codex/model-review.local.json";

function defaultGit(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function requireStringMap(value, label) {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  for (const [key, item] of Object.entries(value)) {
    requireString(key, `${label} key`);
    requireString(item, `${label}.${key}`);
  }
}

export function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("config must be a JSON object");
  const providers = config.providers;
  if (!providers || typeof providers !== "object" || Array.isArray(providers)) throw new Error("config.providers must be an object");
  const defaultProvider = requireString(config.defaultProvider, "config.defaultProvider");
  if (!providers[defaultProvider]) throw new Error(`default provider '${defaultProvider}' is not configured`);

  for (const [name, provider] of Object.entries(providers)) {
    if (!provider || typeof provider !== "object" || Array.isArray(provider)) throw new Error(`provider '${name}' must be an object`);
    const type = requireString(provider.type ?? name, `provider '${name}'.type`);
    requireString(provider.baseUrl, `provider '${name}'.baseUrl`);
    requireString(provider.model, `provider '${name}'.model`);
    const authType = provider.auth?.type ?? "bearer";
    if (provider.auth !== undefined && (!provider.auth || typeof provider.auth !== "object" || Array.isArray(provider.auth))) {
      throw new Error(`provider '${name}'.auth must be an object`);
    }
    if (!["bearer", "api-key", "none"].includes(authType)) throw new Error(`provider '${name}'.auth.type is invalid`);
    if (authType !== "none") requireString(provider.apiKey, `provider '${name}'.apiKey`);
    if (provider.auth?.header !== undefined) requireString(provider.auth.header, `provider '${name}'.auth.header`);
    if (provider.auth?.prefix !== undefined && typeof provider.auth.prefix !== "string") throw new Error(`provider '${name}'.auth.prefix must be a string`);
    requireStringMap(provider.headers, `provider '${name}'.headers`);
    if (provider.extraBody !== undefined && (!provider.extraBody || typeof provider.extraBody !== "object" || Array.isArray(provider.extraBody))) {
      throw new Error(`provider '${name}'.extraBody must be an object`);
    }
    for (const field of ["endpointPath", "responsePath", "usagePath"]) {
      if (provider[field] !== undefined) requireString(provider[field], `provider '${name}'.${field}`);
    }
    if (provider.jsonMode !== undefined && typeof provider.jsonMode !== "boolean") throw new Error(`provider '${name}'.jsonMode must be a boolean`);
    if (type !== "openai-compatible" && type !== "openai" && authType === "none") {
      throw new Error(`provider '${name}' only supports auth.type 'none' with an OpenAI-compatible provider`);
    }
  }

  const limits = config.limits ?? {};
  const maxContextChars = limits.maxContextChars ?? 120_000;
  const timeoutMs = limits.timeoutMs ?? 60_000;
  if (!Number.isInteger(maxContextChars) || maxContextChars < 1_000) throw new Error("limits.maxContextChars must be an integer >= 1000");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000) throw new Error("limits.timeoutMs must be an integer >= 1000");

  return {
    ...config,
    defaultProvider,
    baseBranch: config.baseBranch ?? "main",
    includeUntracked: config.includeUntracked === true,
    limits: { maxContextChars, timeoutMs },
    providers,
  };
}

export function assertConfigIsLocal(configPath, { cwd = process.cwd(), git = defaultGit } = {}) {
  const absolute = path.resolve(cwd, configPath);
  let root;
  try {
    root = path.resolve(git(["rev-parse", "--show-toplevel"], cwd));
  } catch {
    return absolute;
  }

  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return absolute;
  const gitPath = relative.split(path.sep).join("/");
  try {
    git(["ls-files", "--error-unmatch", "--", gitPath], root);
    throw new Error(`refusing tracked credential config: ${gitPath}`);
  } catch (error) {
    if (String(error?.message ?? "").startsWith("refusing tracked")) throw error;
  }
  try {
    git(["check-ignore", "--quiet", "--", gitPath], root);
  } catch {
    throw new Error(`credential config must be ignored by Git: ${gitPath}`);
  }
  return absolute;
}

export async function loadConfig(configPath = DEFAULT_CONFIG_PATH, options = {}) {
  const absolute = assertConfigIsLocal(configPath, options);
  const source = await readFile(absolute, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`invalid JSON config: ${error.message}`);
  }
  return { path: absolute, value: validateConfig(parsed) };
}
