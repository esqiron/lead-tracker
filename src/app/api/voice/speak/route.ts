import { getContext } from "@/lib/auth";
import { allowed } from "@/lib/rate-limit";
import { voiceConfig } from "@/lib/voice/config";
import { speak } from "@/lib/voice/elevenlabs";

// The assistant's reply as streamed MP3. Kept server-side so the ElevenLabs
// key never reaches the browser.
export async function POST(request: Request) {
  const cfg = voiceConfig();
  if (!cfg) return new Response(null, { status: 404 });
  const ctx = await getContext();
  if (!ctx?.org) return new Response(null, { status: 401 });
  if (!(await allowed({ key: ["voice-speak", ctx.user.id], max: 60, per: 600 }))) return new Response(null, { status: 429 });

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1200) : "";
  if (!text) return new Response(null, { status: 400 });

  try {
    const upstream = await speak(cfg, text);
    return new Response(upstream.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Voice synthesis failed", e);
    return new Response(null, { status: 502 });
  }
}
