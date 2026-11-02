import { getContext } from "@/lib/auth";
import { allowed } from "@/lib/rate-limit";
import { voiceConfig } from "@/lib/voice/config";
import { transcribe } from "@/lib/voice/elevenlabs";
import { runAgent, type Turn } from "@/lib/voice/llm";
import { buildTools, systemPrompt, type TurnEffects } from "@/lib/voice/tools";

// One exchange with the voice assistant: audio (or typed text) and the
// conversation so far in; the transcript, the spoken reply and what changed out.

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
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
  const cfg = voiceConfig();
  if (!cfg) return Response.json({ error: "Voice isn't set up on this server." }, { status: 404 });
  const ctx = await getContext();
  if (!ctx) return Response.json({ error: "Sign in again." }, { status: 401 });
  if (!ctx.org || !ctx.role) return Response.json({ error: "No organization." }, { status: 403 });
  const org = ctx.org;

  if (!(await allowed({ key: ["voice", ctx.user.id], max: 40, per: 600 }))) {
    return Response.json({ error: "That's a lot of requests. Give it a few minutes." }, { status: 429 });
  }

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
  if (!text) return Response.json({ transcript: "", reply: "I didn't catch that.", changed: false, links: [] });

  const effects: TurnEffects = { changed: false, links: [] };
  try {
    const { tools, stages, canEdit } = await buildTools({ ...ctx, org }, effects);
    const history = [...readHistory(form.get("history")), { role: "user" as const, text }];
    const reply = await runAgent(cfg, systemPrompt({ ...ctx, org }, stages, canEdit), history, tools);
    return Response.json({ transcript: text, reply: reply || "Done.", ...effects });
  } catch (e) {
    console.error("Voice assistant failed", e);
    return Response.json(
      { transcript: text, reply: "Sorry, something went wrong on my side.", ...effects, error: "The assistant failed." },
      { status: 502 },
    );
  }
}
