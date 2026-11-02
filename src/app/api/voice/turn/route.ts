import { getContext } from "@/lib/auth";
import { withinRateLimit } from "@/lib/rate-limit";
import { voiceConfig } from "@/lib/voice/config";
import { transcribe } from "@/lib/voice/elevenlabs";
import { runAgent, type Turn } from "@/lib/voice/llm";
import { sameOrigin } from "@/lib/voice/origin";
import { pendingToken, readPendingToken, speakToken } from "@/lib/voice/tokens";
import { buildTools, systemPrompt, type TurnEffects } from "@/lib/voice/tools";

// One exchange with the voice assistant: audio (or typed text) and the
// conversation so far in; the transcript, the spoken reply and what changed out.

// The dock stops recording after 45 seconds, well under 1 MB of Opus.
// Transcription is billed by duration, so the cap keeps one request cheap.
const MAX_AUDIO_BYTES = 1024 * 1024;
const MAX_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;
const MAX_HISTORY = 16;

function readHistory(raw: FormDataEntryValue | null): Turn[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is Turn => (t?.role === "user" || t?.role === "assistant") && typeof t.text === "string" && t.text.trim() !== "")
      .slice(-MAX_HISTORY)
      .map((t) => ({ role: t.role, text: t.text.slice(0, 2000) }));
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Not allowed." }, { status: 403 });
  const cfg = voiceConfig();
  if (!cfg) return Response.json({ error: "Voice isn't set up on this server." }, { status: 404 });
  const ctx = await getContext();
  if (!ctx) return Response.json({ error: "Sign in again." }, { status: 401 });
  if (!ctx.org || !ctx.role) return Response.json({ error: "No organization." }, { status: 403 });
  const org = ctx.org;

  // Every request spends the operator's credits, so the limit holds even if the limiter is down.
  if (!(await withinRateLimit(["voice", ctx.user.id], 40, 600, { failClosed: true }))) {
    return Response.json({ error: "That's a lot of requests. Give it a few minutes." }, { status: 429 });
  }
  const length = Number(request.headers.get("content-length"));
  if (!length || length > MAX_BODY_BYTES) return Response.json({ error: "That recording is too long." }, { status: 413 });

  const form = await request.formData();
  const audio = form.get("audio");
  let text = typeof form.get("text") === "string" ? String(form.get("text")).trim().slice(0, 2000) : "";
  try {
    if (!text && audio instanceof Blob) {
      if (audio.size > MAX_AUDIO_BYTES) return Response.json({ error: "That recording is too long." }, { status: 413 });
      text = await transcribe(cfg, audio);
    }
  } catch (e) {
    console.error("Voice transcription failed", e);
    return Response.json({ error: "Couldn't transcribe that. Try again." }, { status: 502 });
  }
  if (!text) {
    const reply = "I didn't catch that.";
    return Response.json({ transcript: "", reply, speakToken: speakToken(ctx.user.id, reply), changed: false, links: [] });
  }

  const effects: TurnEffects = { changed: false, links: [] };
  // A change proposed in an earlier turn, which the user may be confirming now.
  const confirmed = readPendingToken(ctx.user.id, form.get("pending"));
  const respond = (reply: string, init?: ResponseInit, extra?: Record<string, unknown>) =>
    Response.json(
      {
        transcript: text,
        reply,
        speakToken: speakToken(ctx.user.id, reply),
        changed: effects.changed,
        links: effects.links,
        pending: effects.pending ? pendingToken(ctx.user.id, effects.pending) : null,
        ...extra,
      },
      init,
    );
  try {
    const { tools, stages, canEdit } = await buildTools({ ...ctx, org }, effects, confirmed);
    const history = [...readHistory(form.get("history")), { role: "user" as const, text }];
    const reply = await runAgent(cfg, systemPrompt({ ...ctx, org }, stages, canEdit), history, tools);
    return respond(reply || "Done.");
  } catch (e) {
    console.error("Voice assistant failed", e);
    return respond("Sorry, something went wrong on my side.", { status: 502 }, { error: "The assistant failed." });
  }
}
