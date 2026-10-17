# Configuration

Create `.codex/model-review.local.json` in the repository being reviewed by
copying `assets/model-review.example.json`. Add these rules to that repository's
`.gitignore` before inserting credentials:

```gitignore
.codex/model-review.local.json
.codex/reviews/
```

The runner refuses a configuration file that Git tracks or does not ignore.
Credentials remain plaintext on disk: restrict filesystem access and never paste
the file into chat. `defaultProvider` selects the provider used when no
`--provider` flag is passed. Change `model` to adopt a new model from the same
vendor without changing code.

Use `includeUntracked: false` unless the user explicitly wants untracked file
contents sent externally. With the default, the runner stops and lists uncovered
untracked paths instead of silently claiming full coverage.

Provider endpoints and model identifiers can change. Use the current official
provider documentation and account availability; do not infer or silently
substitute a model.

## Provider types

Use the native `claude`, `gemini`, or `deepseek` types for their documented APIs.
Use `openai-compatible` for any cloud gateway or local server that implements an
OpenAI-style Chat Completions endpoint. The alias `openai` is also accepted.

Common compatible services include OpenAI, Azure OpenAI, OpenRouter, Groq,
Mistral, xAI, Qwen-compatible gateways, Moonshot-compatible gateways, and local
servers such as Ollama, LM Studio, or vLLM. Compatibility depends on the exact
endpoint and account version, so copy URLs and model IDs from that provider's
current documentation rather than relying on this list.

Minimal bearer-token configuration:

```json
{
  "type": "openai-compatible",
  "baseUrl": "https://provider.example/v1",
  "apiKey": "replace-locally",
  "model": "provider-model-id"
}
```

The generic type supports these optional fields:

- `endpointPath`: defaults to `/chat/completions` and may include a query string.
- `auth.type`: `bearer` (default), `api-key`, or `none` for a local endpoint.
- `auth.header`: override the authentication header name.
- `auth.prefix`: override the value prefix; use an empty string for a raw key.
- `headers`: additional static request headers.
- `extraBody`: additional request-body fields. It cannot replace the protected
  model, messages, or streaming fields constructed by the runner.
- `jsonMode`: when `true`, requests OpenAI JSON-object response format. Leave it
  `false` when a provider does not implement that option.
- `responsePath`: dot path to model text; defaults to
  `choices.0.message.content`.
- `usagePath`: dot path to usage metadata; defaults to `usage`.

Unauthenticated local example:

```json
{
  "type": "openai-compatible",
  "baseUrl": "http://localhost:11434/v1",
  "model": "local-model-name",
  "auth": { "type": "none" }
}
```

The runner never guesses a vendor configuration, silently falls back to another
provider, or inserts credentials into a URL. If a provider is not compatible
with this request/response shape, add a native adapter instead.
