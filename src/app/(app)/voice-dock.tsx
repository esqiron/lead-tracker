"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cx } from "@/components/ui";

// The voice assistant: a mic in the corner that opens a small conversation.
// Speech is recorded here, transcribed and answered on the server
// (/api/voice/turn), and the reply is read back (/api/voice/speak).

type Turn = { role: "user" | "assistant"; text: string; links?: { label: string; href: string }[] };
type Status = "idle" | "listening" | "thinking" | "speaking";

// Stop after this much quiet once someone has spoken; give up if nobody
// starts talking at all.
const SILENCE_MS = 1300;
const NO_SPEECH_MS = 7000;
const MAX_RECORDING_MS = 45_000;
const SPEECH_LEVEL = 0.025;

const SUGGESTIONS = ["What needs a reply today?", "How's this month looking?", "Log a call with…"];

export function VoiceDock() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [muted, setMuted] = useState(readMuted);
  const [level, setLevel] = useState(0);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  // Bumped whenever a new exchange starts or everything stops; async work
  // from an older exchange checks it and bails.
  const epoch = useRef(0);
  const turnsRef = useRef<Turn[]>([]);
  // A change the assistant proposed (marking a deal won or lost), sent back so
  // the user's "yes" in the next turn can confirm it.
  const pending = useRef<string | null>(null);
  const mutedRef = useRef(muted);
  const listRef = useRef<HTMLDivElement>(null);
  // send() and listen() call each other; this breaks the cycle.
  const listenRef = useRef<(followUp?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, status]);

  const stopAudio = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
  }, []);

  const releaseMic = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const stopEverything = useCallback(() => {
    epoch.current += 1;
    if (recorder.current?.state === "recording") recorder.current.stop();
    releaseMic();
    stopAudio();
    setStatus("idle");
  }, [releaseMic, stopAudio]);

  // Reads a reply aloud; resolves when playback ends (or fails).
  const say = useCallback(
    async (text: string, token: string | undefined, mine: number) => {
      if (mutedRef.current || epoch.current !== mine || !token) return;
      setStatus("speaking");
      try {
        const res = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, token }) });
        if (!res.ok || epoch.current !== mine) return;
        const url = URL.createObjectURL(await res.blob());
        const player = new Audio(url);
        audio.current = player;
        await new Promise<void>((resolve) => {
          player.onended = player.onerror = player.onpause = () => resolve();
          player.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
      } finally {
        audio.current = null;
      }
    },
    [],
  );

  const send = useCallback(
    async (input: { audio?: Blob; text?: string }, viaVoice: boolean) => {
      const mine = epoch.current;
      setStatus("thinking");
      setError(null);
      const body = new FormData();
      if (input.text) body.append("text", input.text);
      if (input.audio) body.append("audio", input.audio, input.audio.type.includes("mp4") ? "speech.mp4" : "speech.webm");
      body.append("history", JSON.stringify(turnsRef.current.map(({ role, text }) => ({ role, text }))));
      if (pending.current) body.append("pending", pending.current);
      pending.current = null;
      if (input.text) setTurns((t) => [...t, { role: "user", text: input.text! }]);

      let data: { transcript?: string; reply?: string; speakToken?: string; pending?: string | null; changed?: boolean; links?: Turn["links"]; error?: string };
      try {
        const res = await fetch("/api/voice/turn", { method: "POST", body });
        data = await res.json();
        if (!res.ok && !data.reply) throw new Error(data.error ?? "Something went wrong.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setStatus("idle");
        return;
      }
      if (epoch.current !== mine) return;
      if (input.audio && data.transcript) setTurns((t) => [...t, { role: "user", text: data.transcript! }]);
      const reply = data.reply ?? "";
      pending.current = data.pending ?? null;
      setTurns((t) => [...t, { role: "assistant", text: reply, links: data.links }]);
      if (data.changed) router.refresh();
      await say(reply, data.speakToken, mine);
      if (epoch.current !== mine) return;
      setStatus("idle");
      // Spoken conversations keep going hands-free until there's silence.
      if (viaVoice && data.transcript && !mutedRef.current) void listenRef.current(true);
    },
    [router, say],
  );

  const listen = useCallback(
    async (followUp = false) => {
      const mine = ++epoch.current;
      stopAudio();
      setError(null);
      let mic: MediaStream;
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        setError("Microphone blocked. Allow it in the browser, or type below.");
        setStatus("idle");
        return;
      }
      if (epoch.current !== mine) {
        mic.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = mic;
      const rec = new MediaRecorder(mic);
      recorder.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

      // Voice activity: watch the input level to know when they've finished.
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(mic).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const started = performance.now();
      let heard = false;
      let lastSound = started;
      let frame = 0;
      const tick = () => {
        if (rec.state !== "recording") return;
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
        setLevel(Math.min(1, rms * 12));
        const now = performance.now();
        if (rms > SPEECH_LEVEL) {
          heard = true;
          lastSound = now;
        }
        if ((heard && now - lastSound > SILENCE_MS) || (!heard && now - started > NO_SPEECH_MS) || now - started > MAX_RECORDING_MS) {
          rec.stop();
          return;
        }
        frame = requestAnimationFrame(tick);
      };

      rec.onstop = () => {
        cancelAnimationFrame(frame);
        void ctx.close();
        releaseMic();
        setLevel(0);
        recorder.current = null;
        if (epoch.current !== mine) return;
        if (!heard) {
          setStatus("idle");
          if (!followUp) setError("I didn't hear anything.");
          return;
        }
        void send({ audio: new Blob(chunks, { type: rec.mimeType }) }, true);
      };

      rec.start();
      setStatus("listening");
      frame = requestAnimationFrame(tick);
    },
    [releaseMic, send, stopAudio],
  );

  useEffect(() => {
    listenRef.current = listen;
  }, [listen]);

  // The main button: start listening, finish early, or interrupt the reply.
  function onMic() {
    if (status === "listening") {
      recorder.current?.stop();
      return;
    }
    if (status === "thinking") return;
    void listen();
  }

  function onOpen() {
    setOpen(true);
    void listen();
  }

  function onClose() {
    stopEverything();
    setOpen(false);
  }

  function onType(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || status === "thinking") return;
    stopEverything();
    setDraft("");
    void send({ text }, false);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    if (next) stopAudio();
    try {
      localStorage.setItem("voice-muted", next ? "1" : "0");
    } catch {
      // Not remembered; fine.
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // onClose only touches refs and stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => stopEverything(), [stopEverything]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="Talk to the assistant"
        title="Talk to the assistant"
        className="fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_14px_30px_-12px_rgba(11,116,128,0.9)] transition-transform duration-300 ease-studio hover:scale-105 hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:right-6 sm:bottom-6 dark:text-zinc-950"
      >
        <MicIcon className="size-6" />
      </button>
    );
  }

  const statusLabel = { idle: "Tap the mic and speak", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking… tap to interrupt" }[status];

  return (
    <section
      aria-label="Voice assistant"
      className="fixed inset-x-2 bottom-2 z-30 flex max-h-[70vh] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_18px_44px_-12px_rgba(16,24,40,0.35)] ring-1 ring-hairline sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 dark:bg-zinc-900"
    >
      <header className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <h2 className="font-display text-sm font-semibold">Assistant</h2>
        <div className="ml-auto flex items-center gap-1">
          {turns.length ? (
            <button type="button" onClick={() => (stopEverything(), setTurns([]), setError(null), (pending.current = null))} className="rounded-full px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
              New chat
            </button>
          ) : null}
          <IconButton label={muted ? "Read replies aloud" : "Don't read replies aloud"} onClick={toggleMute}>
            {muted ? <SpeakerOffIcon className="size-4" /> : <SpeakerIcon className="size-4" />}
          </IconButton>
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon className="size-4" />
          </IconButton>
        </div>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {turns.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">Ask about your deals, log a follow-up or start a new lead. For example:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => (s.endsWith("…") ? setDraft(s.slice(0, -1) + " ") : (stopEverything(), void send({ text: s }, false)))}
                  className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent-ink transition-colors hover:bg-accent/15"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t, i) => (
            <div key={i} className={cx("flex flex-col gap-1.5", t.role === "user" ? "items-end" : "items-start")}>
              <p
                className={cx(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                  t.role === "user" ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "bg-accent-soft text-accent-ink",
                )}
              >
                {t.text}
              </p>
              {t.links?.length ? (
                <div className="flex max-w-[85%] flex-wrap gap-1.5">
                  {t.links.slice(0, 3).map((l) => (
                    <Link key={l.href} href={l.href} className="rounded-full px-2.5 py-0.5 text-xs text-accent ring-1 ring-hairline hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      Open {l.label} →
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      </div>

      <div className="space-y-3 border-t border-hairline px-4 pt-3 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={status === "speaking" ? () => void listen() : onMic}
            disabled={status === "thinking"}
            aria-label={status === "listening" ? "Stop listening" : "Speak"}
            className={cx(
              "relative flex size-12 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ease-studio focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60",
              status === "listening" ? "bg-red-500 text-white" : "bg-accent text-white hover:bg-accent-hover dark:text-zinc-950",
            )}
          >
            {status === "listening" ? (
              <span aria-hidden className="absolute inset-0 rounded-full bg-red-500/30" style={{ transform: `scale(${1 + level * 0.6})` }} />
            ) : null}
            {status === "thinking" ? <Spinner className="size-5" /> : status === "listening" ? <StopIcon className="relative size-4" /> : <MicIcon className="size-5" />}
          </button>
          <p className="text-sm text-zinc-500" role="status">
            {statusLabel}
          </p>
        </div>
        <form onSubmit={onType} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Or type here"
            aria-label="Message the assistant"
            className="h-9 min-w-0 flex-1 rounded-full border border-zinc-200 bg-white px-3.5 text-sm placeholder:text-zinc-400 focus:border-accent focus:ring-3 focus:ring-accent/15 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
          />
          <button type="submit" disabled={!draft.trim() || status === "thinking"} className="h-9 rounded-full px-3.5 text-sm font-medium text-accent hover:bg-accent-soft disabled:opacity-40">
            Send
          </button>
        </form>
      </div>
    </section>
  );
}

function readMuted() {
  try {
    return typeof window !== "undefined" && localStorage.getItem("voice-muted") === "1";
  } catch {
    return false;
  }
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex size-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
      {children}
    </button>
  );
}

const svg = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24", "aria-hidden": true } as const;

function MicIcon({ className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M4 9.5h3l4.5-4v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

function SpeakerOffIcon({ className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M4 9.5h3l4.5-4v13l-4.5-4H4z" />
      <path d="m16 9.5 5 5m0-5-5 5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cx("animate-spin", className)}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
