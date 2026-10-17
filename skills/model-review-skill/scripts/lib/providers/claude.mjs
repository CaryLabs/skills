import { endpoint, postJson } from "./http.mjs";

export const type = "claude";

export async function review(request, runtime = {}) {
  const data = await postJson({
    url: endpoint(request.config.baseUrl, "/messages"),
    headers: {
      "x-api-key": request.config.apiKey,
      "anthropic-version": request.config.apiVersion ?? "2023-06-01",
    },
    timeoutMs: request.timeoutMs,
    body: {
      model: request.config.model,
      max_tokens: request.config.maxTokens ?? 4096,
      system: request.messages.instruction,
      messages: [{ role: "user", content: request.messages.context }],
    },
  }, runtime);
  const text = data?.content?.filter((part) => part?.type === "text").map((part) => part.text).join("\n");
  if (typeof text !== "string" || !text.trim()) throw new Error("Claude returned empty content");
  return { text, usage: data.usage ?? {} };
}
