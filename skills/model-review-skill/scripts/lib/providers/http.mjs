const ERROR_BODY_LIMIT = 500;

export function endpoint(baseUrl, suffix) {
  const base = baseUrl.replace(/\/+$/, "");
  return base.endsWith(suffix) ? base : `${base}${suffix}`;
}

export async function postJson({ url, headers, body, timeoutMs }, runtime = {}) {
  const fetchFn = runtime.fetch ?? globalThis.fetch;
  if (typeof fetchFn !== "function") throw new Error("fetch is not available");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      const bounded = text.replace(/\s+/g, " ").slice(0, ERROR_BODY_LIMIT);
      throw new Error(`provider HTTP ${response.status}${bounded ? `: ${bounded}` : ""}`);
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`provider returned malformed JSON: ${error.message}`);
    }
  } catch (error) {
    if (error?.name === "AbortError") throw new Error(`provider request timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
