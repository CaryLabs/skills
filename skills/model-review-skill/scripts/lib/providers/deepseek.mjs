import { endpoint, postJson } from "./http.mjs";

export const type = "deepseek";

export async function review(request, runtime = {}) {
  const data = await postJson({
    url: endpoint(request.config.baseUrl, "/chat/completions"),
    headers: { authorization: `Bearer ${request.config.apiKey}` },
    timeoutMs: request.timeoutMs,
    body: {
      model: request.config.model,
      messages: [
        { role: "system", content: request.messages.instruction },
        { role: "user", content: request.messages.context },
      ],
      response_format: { type: "json_object" },
      stream: false,
    },
  }, runtime);
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("DeepSeek returned empty content");
  return { text, usage: data.usage ?? {} };
}
