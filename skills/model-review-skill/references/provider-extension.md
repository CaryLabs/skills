# Adding a Provider

First check whether the vendor supports an OpenAI-compatible Chat Completions
endpoint. If it does, configure `type: "openai-compatible"`; no code change is
needed. Add a native adapter only for an incompatible protocol or when native
semantics are required.

Add one module under `scripts/lib/providers/` and register it in `index.mjs`.
The module exports `type` and `review(request, runtime)`.

Preserve these invariants:

- Map `request.messages.instruction` to the provider's trusted instruction role.
- Map `request.messages.context` only to user content. Never merge it into the
  trusted instruction.
- Use `runtime.fetch` through `postJson()` so tests remain offline and timeout,
  bounded errors, and malformed JSON behavior stay consistent.
- Return `{ text, usage }`; reject empty model content.
- Never log headers, keys, credential-bearing URLs, or raw repository context.
- Do not implement cross-provider fallback.

Add mocked tests for request roles, authentication placement, successful content
extraction, 401/403, 429, 5xx, timeout, malformed JSON, and empty content.
