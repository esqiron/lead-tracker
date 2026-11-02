import { getContext } from "@/lib/auth";
import { withinRateLimit } from "@/lib/rate-limit";
import { voiceConfig } from "@/lib/voice/config";
import { speak } from "@/lib/voice/elevenlabs";
import { sameOrigin } from "@/lib/voice/origin";
import { checkSpeakToken } from "@/lib/voice/tokens";

// The assistant's reply as streamed MP3. Kept server-side so the ElevenLabs
// key never reaches the browser. Only replies /api/voice/turn just gave this
// user (it signs each one), so this isn't a general text-to-speech service.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const cfg = voiceConfig();
  if (!cfg) return new Response(null, { status: 404 });
  const ctx = await getContext();
  if (!ctx?.org) return new Response(null, { status: 401 });
  if (!(await withinRateLimit(["voice-speak", ctx.user.id], 60, 600, { failClosed: true }))) return new Response(null, { status: 429 });

  const body = (await request.json().catch(() => null)) as { text?: unknown; token?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text || text.length > 4000 || !checkSpeakToken(ctx.user.id, text, body?.token)) return new Response(null, { status: 400 });

  try {
    const upstream = await speak(cfg, text.trim().slice(0, 1200));
    return new Response(upstream.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Voice synthesis failed", e);
    return new Response(null, { status: 502 });
  }
}
