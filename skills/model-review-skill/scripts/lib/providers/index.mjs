import * as claude from "./claude.mjs";
import * as deepseek from "./deepseek.mjs";
import * as gemini from "./gemini.mjs";
import * as openaiCompatible from "./openai-compatible.mjs";

export const providerRegistry = {
  claude,
  deepseek,
  gemini,
  openai: openaiCompatible,
  "openai-compatible": openaiCompatible,
};
