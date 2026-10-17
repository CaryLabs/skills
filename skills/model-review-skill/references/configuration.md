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
