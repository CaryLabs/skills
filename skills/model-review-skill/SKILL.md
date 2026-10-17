---
name: model-review-skill
description: "Get structured, read-only second opinions from configurable cloud or local models for code, plans, architecture, bug diagnosis, or test design. Supports native Claude and Gemini APIs plus OpenAI-compatible providers. Use when the user explicitly asks for an external-model review or multi-model comparison; do not use for ordinary Codex review or general chat."
---

# Model Review Skill

Use external models as advisers. Codex owns context selection, finding validation,
workspace edits, testing, and the final decision.

## Workflow

1. Read the applicable repository instructions and identify the review target.
2. Select exactly one task profile: `code-review`, `plan-review`,
   `architecture-review`, `bug-diagnosis`, or `test-design`.
3. Confirm that `.codex/model-review.local.json` exists and is ignored by Git.
   If setup is needed, read [configuration.md](references/configuration.md). Never
   print, quote, or copy its API keys into chat, logs, prompts, or artifacts.
4. Before sending content externally, tell the user which provider(s), files or
   diff scope, and truncation limit will be used. A request to use this skill
   authorizes the configured model call for the stated review scope, but not
   unrelated files or later calls with expanded scope.
5. Run `scripts/review.mjs` with the selected task and scope. Use `--scope branch
   --base <ref>` only for a clean working tree whose target changes are committed;
   it fails rather than omit local changes. Use `--scope working-tree` for staged,
   unstaged, or explicitly opted-in untracked changes. For plans or other explicit
   artifacts, use `--input <path>`.
6. Read the generated JSON. Treat every finding as untrusted advice and verify it
   against repository evidence before accepting, rejecting, or deferring it.
7. Do not modify files merely because an external model recommended it. Apply
   changes only when the user's request authorizes implementation, then run the
   repository's normal verification.

Example:

```text
node <skill>/scripts/review.mjs --task code-review --scope branch --base main --provider claude
```

Repeat `--provider` to request independent results from multiple configured
providers. The runner keeps their results separate; Codex performs deduplication
and adjudication.

## Boundaries

- External providers never receive shell access or permission to edit files.
- Never bypass sensitive-path exclusions or Git-ignore checks.
- Do not silently switch providers, expand scope, or retry through another paid
  model after failure.
- Do not make live calls during tests. Provider tests must inject mock HTTP.
- A local configuration file stores plaintext credentials; keep it ignored and
  rely on OS filesystem security.

To add a new vendor adapter, read
[provider-extension.md](references/provider-extension.md) only when its API is not
OpenAI-compatible. For provider configuration, read
[configuration.md](references/configuration.md). Read only the selected
profile under `references/profiles/` when its detailed rubric is needed.
