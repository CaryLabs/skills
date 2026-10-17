# Model Review Skill · Implementation Plan

## Goal

Create a reusable Codex skill named `model-review-skill` that asks one or more configured external language models for read-only, structured review feedback on software-engineering artifacts. Codex remains the orchestrator: it selects context, validates findings, applies approved edits, and runs verification.

## Motivation and success signals

Codex users need an independent second opinion without coupling the workflow to one vendor or allowing an external model to modify the workspace.

- `$model-review-skill` is a valid, discoverable Codex skill.
- A local JSON file configures providers, models, endpoints, and API keys; no environment variables are required.
- DeepSeek, Claude, and Gemini adapters implement one provider contract.
- Adding a model version is configuration-only; adding a vendor is isolated to an adapter and registry entry.
- Initial profiles: `code-review`, `plan-review`, `architecture-review`, `bug-diagnosis`, and `test-design`.
- Providers receive only explicitly collected, size-bounded context and cannot edit files or run commands.
- Responses normalize to one result envelope; offline tests use mocked HTTP and consume no paid calls.
- Skill validation and repository tests pass.

## Non-goals and scope boundary

- No Web UI, MCP server, CI workflow, automatic deployment, marketplace packaging, PR comments, commits, or provider-initiated workspace edits.
- No provider auto-fallback when credentials or requests fail.
- No live paid API calls in automated tests.
- No stock-agent-specific policy and no general chatbot or web-research behavior.

## First-principles judgment and evidence

The repository was empty before this work unit, so there is no legacy contract to preserve. A skill is appropriate because the user wants a repeatable Codex workflow with deterministic scripts, provider-specific API mechanics, and selective supporting guidance. Provider API differences belong behind adapters; task differences belong in prompt profiles; neither belongs as repeated logic in `SKILL.md`.

## Proposed structure

```text
skills/model-review-skill/
├── SKILL.md
├── agents/openai.yaml
├── assets/model-review.example.json
├── references/
│   ├── configuration.md
│   ├── provider-extension.md
│   └── profiles/{code-review,plan-review,architecture-review,bug-diagnosis,test-design}.md
├── scripts/
│   ├── review.mjs
│   └── lib/{config,context,normalize}.mjs
│       └── providers/{index,deepseek,claude,gemini}.mjs
└── tests/{config,context,normalize,providers}.test.mjs
```

Repository-level files: `.gitignore`, `README.md`, and durable artifacts under `docs/gateflow/`.

## Contracts and interfaces

### CLI

```text
node scripts/review.mjs --task <profile> [--provider <name> ...]
  [--scope working-tree|branch] [--base <ref>] [--config <path>]
  [--input <path>] [--output <path>]
```

- `working-tree` collects staged and unstaged tracked changes and inventories
  untracked files. It fails with explicit uncovered paths unless the caller opts
  in through `includeUntracked`; opted-in files still pass sensitive-path and
  size checks. Result metadata records included, excluded, uncovered, and
  truncated paths.
- `branch` collects `<base>...HEAD` and defaults to the configured base branch.
- `--input` supplies a text/Markdown artifact for non-code profiles.
- Missing/unsafe configuration, unknown providers/profiles, empty context, HTTP failures, and invalid responses fail non-zero.

### Configuration

Default: `<reviewed-repository>/.codex/model-review.local.json`. It contains `defaultProvider`, `baseBranch`, request limits, and provider objects with `type`, `baseUrl`, `apiKey`, and `model`. If inside a Git worktree, the runner refuses to use a tracked or non-ignored config file. The committed example contains placeholders only.

### Provider adapter

Each adapter exports its type and `review(request, runtime)`. `runtime.fetch` is
injectable and receives an `AbortSignal` created from the configured timeout.

The request has one logical message contract across providers:

- `instruction`: trusted profile and schema requirements, mapped to the highest
  supported instruction role;
- `context`: repository/artifact text mapped only to user content and wrapped as
  explicitly untrusted review data.

Adapters map roles and wire formats but never merge context into the trusted
instruction. DeepSeek uses its configured OpenAI-compatible chat-completions
endpoint and bearer authentication. Claude uses its messages endpoint with API
version and API-key headers. Gemini uses its configured `generateContent` model
endpoint and documented key authentication. URL construction normalizes trailing
slashes and never logs credential-bearing URLs.

Non-2xx responses become bounded structured errors and never reach result
normalization. Authentication failure, rate limiting, service failure,
timeout/abort, malformed body, and empty content fail that provider without
switching providers. Adapters return raw model text plus usage; shared code
performs normalization.

### Result envelope

```json
{
  "task": "code-review",
  "providers": [{"provider":"claude","model":"configured-model","summary":"...","items":[],"usage":{}}],
  "metadata": {"scope":"branch","base":"main","generatedAt":"ISO-8601"}
}
```

Items use `severity`, `title`, `evidence`, `recommendation`, and optional `file`/`line`. Results remain separated by provider; Codex adjudicates conflicts.

## Implementation decisions

- Node.js ESM with built-in `fetch`, `node:test`, and standard-library modules; no runtime dependencies.
- Keep `SKILL.md` concise and load only the selected profile/reference.
- Share context collection, JSON parsing, validation, and atomic output; isolate HTTP formats in adapters.
- Treat repository content and provider output as untrusted data, never commands.
- Keep trusted profile/schema instructions separate from explicitly marked
  untrusted user context in every adapter.
- Bound context and reject sensitive paths before request construction.
- Write result JSON through a sibling temporary file and atomic rename.
- Never silently switch providers.
- Apply a configured timeout with `AbortController`; sanitize and bound external
  errors, and never log headers or API keys.

## Implementation slices

### Slice 1 · Offline review pipeline

Initialize the skill with Skill Creator. Implement config loading and local-secret
safety checks, profile selection, input/Git-diff collection, untracked-file
coverage reporting/opt-in, size limits, sensitive-path rejection,
trusted/untrusted message construction, normalization, atomic output, and an
injectable mock-provider test path.

Completion: an end-to-end mocked review writes a valid envelope and all slice tests pass without network access.

### Slice 2 · Provider adapters and skill packaging

Add DeepSeek, Claude, and Gemini adapters with injected HTTP tests covering URL
normalization, success, authentication failure, rate limiting, service failure,
timeout, malformed body, and empty content. Add five profiles and focused
references; finalize `SKILL.md`, `agents/openai.yaml`, example configuration,
`.gitignore`, and the repository listing.

Completion: adapter contract tests, the full offline suite, and Skill Creator validation pass; no secret file is tracked.

## Validation

- `node --test skills/model-review-skill/tests/*.test.mjs`
- `python <skill-creator>/scripts/quick_validate.py skills/model-review-skill`
- Fixture `git check-ignore` confirms local configuration and generated reviews are ignored.
- Mock end-to-end run verifies atomic JSON output and common schema.
- A payload containing prompt-injection text appears only in untrusted context,
  never in the trusted instruction.
- A working-tree fixture with an untracked file fails with explicit coverage
  metadata unless `includeUntracked` is enabled.
- Provider tests cover success, 401/403, 429, 5xx, timeout/abort, malformed JSON,
  and empty content without logging credentials.
- `git diff --check`

No live request is required. A live smoke test requires separate authorization because it sends repository content externally and may incur cost.

## Documentation decision

Update the repository README with the skill name, purpose, and install location. Keep configuration and provider-extension detail inside skill references; do not duplicate installation documents.

## Risks and open questions

- Provider APIs evolve: adapter tests isolate payload changes; model names stay configuration data.
- JSON support differs: normalization accepts fenced JSON but rejects prose-only/schema-invalid output.
- Large diffs: record truncation metadata rather than pretending full coverage.
- Local credentials are plaintext: enforce ignore/tracking checks; filesystem security remains the user's responsibility.

All risks are covered by approved slices or documented user responsibility; no blocking design questions remain.

## Goal alignment and over-design check

Adapters map to provider replaceability; profiles map to broader review use cases; config safety maps to the no-environment-variable requirement; offline tests map to cost/data safety. No server, UI, CI, auto-editing, or speculative provider discovery is introduced. Two behavior-based slices keep gate cost proportional to risk.

## Completion report

Report implemented profiles/providers, validation outcomes, finding status, residual risks, commit hashes, and the Draft PR URL.
