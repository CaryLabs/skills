import { endpoint, postJson } from "./http.mjs";

export const type = "openai-compatible";

function getPath(value, path) {
  return path.split(".").reduce((current, part) => {
    if (current == null) return undefined;
    const key = /^\d+$/.test(part) ? Number(part) : part;
    return current[key];
  }, value);
}

function extractText(value) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return undefined;
  const text = value
    .map((part) => typeof part === "string" ? part : part?.text)
    .filter((part) => typeof part === "string")
    .join("");
  return text || undefined;
}

function buildHeaders(config) {
  const headers = { ...(config.headers ?? {}) };
  const auth = config.auth ?? {};
  const authType = auth.type ?? "bearer";
  if (authType === "none") return headers;
  const header = auth.header ?? (authType === "api-key" ? "api-key" : "authorization");
  const prefix = auth.prefix ?? (authType === "bearer" ? "Bearer " : "");
  headers[header] = `${prefix}${config.apiKey}`;
  return headers;
}

export async function review(request, runtime = {}) {
  const config = request.config;
  const body = {
    ...(config.extraBody ?? {}),
    model: config.model,
    messages: [
      { role: "system", content: request.messages.instruction },
      { role: "user", content: request.messages.context },
    ],
    stream: false,
  };
  if (config.jsonMode === true) body.response_format = { type: "json_object" };

  const data = await postJson({
    url: endpoint(config.baseUrl, config.endpointPath ?? "/chat/completions"),
    headers: buildHeaders(config),
    timeoutMs: request.timeoutMs,
    body,
  }, runtime);
  const text = extractText(getPath(data, config.responsePath ?? "choices.0.message.content"));
  if (typeof text !== "string" || !text.trim()) throw new Error("OpenAI-compatible provider returned empty content");
  const usage = getPath(data, config.usagePath ?? "usage");
  return { text, usage: usage && typeof usage === "object" ? usage : {} };
}
