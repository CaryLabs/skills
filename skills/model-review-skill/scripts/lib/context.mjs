import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const SENSITIVE_NAMES = new Set([
  ".secret",
  ".secrets",
  "secret",
  "secrets",
  "credential",
  "credentials",
  "private_key",
  "id_rsa",
  "model-review.local.json",
]);
const SENSITIVE_PREFIXES = [".env.", "secret.", "secrets.", "credential.", "credentials."];
const SENSITIVE_SUFFIXES = [".pem", ".p12", ".pfx", ".key"];

function defaultGit(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).trimEnd();
}

export function isSensitivePath(filePath) {
  const normalized = filePath.replaceAll("\\", "/").toLowerCase();
  return normalized.split("/").some((part) =>
    part === ".env"
    || SENSITIVE_NAMES.has(part)
    || SENSITIVE_PREFIXES.some((prefix) => part.startsWith(prefix))
    || SENSITIVE_SUFFIXES.some((suffix) => part.endsWith(suffix)),
  );
}

function lines(value) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export async function collectContext({
  cwd = process.cwd(),
  scope = "working-tree",
  base = "main",
  includeUntracked = false,
  maxChars = 120_000,
  git = defaultGit,
  read = (file) => readFile(file, "utf8"),
} = {}) {
  let text = "";
  let included = [];
  let uncovered = [];
  const excluded = [];

  if (scope === "branch") {
    included = lines(git(["diff", "--name-only", `${base}...HEAD`], cwd));
    text = git(["diff", "--no-ext-diff", `${base}...HEAD`], cwd);
  } else if (scope === "working-tree") {
    const stagedNames = lines(git(["diff", "--cached", "--name-only"], cwd));
    const unstagedNames = lines(git(["diff", "--name-only"], cwd));
    const untracked = lines(git(["ls-files", "--others", "--exclude-standard"], cwd));
    included = [...new Set([...stagedNames, ...unstagedNames])];
    uncovered = untracked;
    if (untracked.length && !includeUntracked) {
      const error = new Error(`untracked files are not covered: ${untracked.join(", ")}`);
      error.code = "UNCOVERED_UNTRACKED";
      error.coverage = { included, excluded, uncovered, truncated: false };
      throw error;
    }
    text = [git(["diff", "--cached", "--no-ext-diff"], cwd), git(["diff", "--no-ext-diff"], cwd)].filter(Boolean).join("\n");
    if (includeUntracked) {
      for (const file of untracked) {
        if (isSensitivePath(file)) {
          excluded.push(file);
          continue;
        }
        const content = await read(path.join(cwd, file));
        text += `\n--- /dev/null\n+++ b/${file.replaceAll("\\", "/")}\n${content}`;
        included.push(file);
      }
      uncovered = [];
    }
  } else {
    throw new Error(`unsupported scope: ${scope}`);
  }

  const sensitive = included.filter(isSensitivePath);
  if (sensitive.length) throw new Error(`sensitive paths cannot be reviewed: ${sensitive.join(", ")}`);
  if (!text.trim()) throw new Error("review context is empty");
  const truncated = text.length > maxChars;
  const bounded = truncated ? text.slice(0, maxChars) : text;
  return { text: bounded, coverage: { included: [...new Set(included)], excluded, uncovered, truncated } };
}
