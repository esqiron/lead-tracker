import "server-only";

// Voice assistant settings. Speech runs through ElevenLabs; the assistant
// itself runs on whichever LLM key the deployment provides. The feature stays
// hidden unless both halves are configured.

export type LlmProvider = "anthropic" | "openai" | "google";

const LLM_KEYS: Record<LlmProvider, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  google: process.env.GEMINI_API_KEY,
};

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  anthropic: "claude-opus-5-5",
  openai: "gpt-5.5",
  google: "gemini-3.5-flash",
};

export type VoiceConfig = {
  elevenLabsKey: string;
  voiceId: string;
  ttsModel: string;
  sttModel: string;
  provider: LlmProvider;
  llmKey: string;
  model: string;
};

function pickProvider(): LlmProvider | null {
  const wanted = process.env.VOICE_LLM_PROVIDER?.trim().toLowerCase();
  if (wanted === "anthropic" || wanted === "claude") return LLM_KEYS.anthropic ? "anthropic" : null;
  if (wanted === "openai") return LLM_KEYS.openai ? "openai" : null;
  if (wanted === "google" || wanted === "gemini") return LLM_KEYS.google ? "google" : null;
  // Not set: the first key present wins.
  return (["anthropic", "openai", "google"] as const).find((p) => LLM_KEYS[p]) ?? null;
}

export function voiceConfig(): VoiceConfig | null {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const provider = pickProvider();
  if (!elevenLabsKey || !provider) return null;
  return {
    elevenLabsKey,
    // "George", one of the ElevenLabs default voices available on every account.
    voiceId: process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb",
    ttsModel: process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5",
    sttModel: process.env.ELEVENLABS_STT_MODEL || "scribe_v2",
    provider,
    llmKey: LLM_KEYS[provider]!,
    model: process.env.VOICE_LLM_MODEL || DEFAULT_MODELS[provider],
  };
}

export function voiceEnabled() {
  return voiceConfig() !== null;
}
