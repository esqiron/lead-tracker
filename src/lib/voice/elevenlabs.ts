import "server-only";
import type { VoiceConfig } from "@/lib/voice/config";

const API = "https://api.elevenlabs.io/v1";

export async function transcribe(cfg: VoiceConfig, audio: Blob): Promise<string> {
  const form = new FormData();
  // Browsers record WebM/Opus, Safari MP4/AAC; the name tells them apart.
  form.append("file", audio, audio instanceof File ? audio.name : "speech.webm");
  form.append("model_id", cfg.sttModel);
  // Background noise and laughter tags would only confuse the assistant.
  form.append("tag_audio_events", "false");
  const res = await fetch(`${API}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": cfg.elevenLabsKey },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs speech-to-text failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

// Streams MP3 back as it's generated, so playback starts before the whole
// reply is synthesized.
export async function speak(cfg: VoiceConfig, text: string): Promise<Response> {
  const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(cfg.voiceId)}/stream?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": cfg.elevenLabsKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: cfg.ttsModel }),
  });
  if (!res.ok || !res.body) throw new Error(`ElevenLabs text-to-speech failed (${res.status}): ${await res.text()}`);
  return res;
}
