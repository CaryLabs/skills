import { endpoint, postJson } from "./http.mjs";

export const type = "gemini";

export async function review(request, runtime = {}) {
  const modelPath = `/models/${encodeURIComponent(request.config.model)}:generateContent`;
  const data = await postJson({
    url: endpoint(request.config.baseUrl, modelPath),
    headers: { "x-goog-api-key": request.config.apiKey },
    timeoutMs: request.timeoutMs,
    body: {
      systemInstruction: { parts: [{ text: request.messages.instruction }] },
      contents: [{ role: "user", parts: [{ text: request.messages.context }] }],
      generationConfig: { responseMimeType: "application/json" },
    },
  }, runtime);
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text).filter(Boolean).join("\n");
  if (typeof text !== "string" || !text.trim()) throw new Error("Gemini returned empty content");
  return { text, usage: data.usageMetadata ?? {} };
}
