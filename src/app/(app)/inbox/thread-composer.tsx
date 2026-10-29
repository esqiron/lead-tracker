"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, cx, Input, Select } from "@/components/ui";
import { logToThread, undoStartConversation } from "./actions";
import { DUE_CHOICES } from "./compose-sheet";

type Stage = { id: string; name: string; is_won: boolean; is_lost: boolean };

// Logging is typing: "/" picks what kind of entry this is.
const COMMANDS = [
  { cmd: "note", label: "Note", hint: "Something to remember", action: "Add note" },
  { cmd: "call", label: "Call", hint: "Log a call and how it went", action: "Log call" },
  { cmd: "email", label: "Email", hint: "An email you sent or got", action: "Log email" },
  { cmd: "meeting", label: "Meeting", hint: "What was said", action: "Log meeting" },
  { cmd: "task", label: "Task", hint: "Set the next step", action: "Set next step" },
  { cmd: "move", label: "Move", hint: "Move the deal to another stage", action: "Move deal" },
  { cmd: "lost", label: "Lost", hint: "Mark the deal lost, with a reason", action: "Mark lost" },
] as const;
type Command = (typeof COMMANDS)[number]["cmd"];
const OUTCOMES = ["Reached", "Left voicemail", "No answer"];

export function ThreadComposer({
  leadId,
  stages,
  stageId,
  nextStep,
  members,
  currentUserId,
  contactFirstName,
}: {
  leadId: string;
  stages: Stage[];
  stageId: string;
  nextStep: { id: string; body: string } | null;
  members: { id: string; name: string }[];
  currentUserId: string;
  contactFirstName: string | null;
}) {
  const [mode, setMode] = useState<Command>("note");
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState("");
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState(currentUserId);
  const [moveTo, setMoveTo] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [suggestMove, setSuggestMove] = useState(false);
  const [completeNext, setCompleteNext] = useState(false);
  const [nextBody, setNextBody] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [menuIndex, setMenuIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);

  const open = stages.filter((s) => !s.is_won && !s.is_lost);
  const current = stages.find((s) => s.id === stageId);
  const nextStage = current && !current.is_won && !current.is_lost ? open[open.findIndex((s) => s.id === stageId) + 1] : undefined;
  const lost = stages.find((s) => s.is_lost);
  const command = COMMANDS.find((c) => c.cmd === mode)!;
  const logging = mode === "note" || mode === "call" || mode === "email" || mode === "meeting";

  // "/ca" at the start of the box filters the command menu.
  const slash = body.match(/^\/(\w*)$/);
  const menu = slash ? COMMANDS.filter((c) => c.cmd.startsWith(slash[1].toLowerCase())) : [];

  const pick = (cmd: Command) => {
    setMode(cmd);
    setBody("");
    setMenuIndex(0);
    if (cmd === "move") setMoveTo(nextStage?.id ?? open[0]?.id ?? "");
    box.current?.focus();
  };

  const reset = () => {
    setBody("");
    setOutcome("");
    setDue("");
    setMoveTo("");
    setLostReason("");
    setSuggestMove(false);
    setCompleteNext(false);
    setNextBody("");
    setNextDue("");
    setMode("note");
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await logToThread({
        leadId,
        type: logging ? mode : mode === "task" ? "task" : "note",
        body,
        direction: mode === "email" || mode === "call" ? direction : undefined,
        outcome: mode === "call" ? outcome : undefined,
        due: mode === "task" ? due : undefined,
        assignedTo: mode === "task" ? assignee : undefined,
        moveToStageId: mode === "move" ? moveTo : mode === "lost" ? lost?.id : logging && suggestMove ? nextStage?.id : undefined,
        lostReason: mode === "lost" ? lostReason : undefined,
        completeTaskId: logging && completeNext ? nextStep?.id : undefined,
        next: logging ? { body: nextBody, due: nextBody ? nextDue : "" } : undefined,
      });
      if (result.error) setError(result.error);
      else reset();
    });
  };

  const chip = (on: boolean) =>
    cx(
      "rounded-full px-2.5 py-1 text-xs transition-colors",
      on ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
    );

  const placeholder =
    mode === "note"
      ? `Write a note, or type / to log a call, an email or a task`
      : mode === "call"
        ? `What was said on the call${contactFirstName ? ` with ${contactFirstName}` : ""}?`
        : mode === "email"
          ? "What the email said, in a line or two"
          : mode === "meeting"
            ? "Meeting notes"
            : mode === "task"
              ? "What needs to happen next?"
              : mode === "move"
                ? "Why it moved (optional)"
                : "Anything to add (optional)";

  return (
    <div
      className="relative rounded-2xl bg-white ring-1 ring-hairline focus-within:ring-accent/40 dark:bg-zinc-900"
      onKeyDown={(e) => {
        // ⌘↵ from any field in the composer.
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          submit();
        }
      }}
    >
      {menu.length ? (
        <ul role="listbox" aria-label="Commands" className="absolute bottom-full left-2 z-10 mb-2 w-72 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-hairline dark:bg-zinc-900">
          {menu.map((c, i) => (
            <li key={c.cmd} role="option" aria-selected={i === menuIndex}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c.cmd);
                }}
                className={cx("flex w-full items-baseline gap-2 rounded-xl px-3 py-2 text-left", i === menuIndex ? "bg-accent-soft" : "hover:bg-zinc-50 dark:hover:bg-zinc-800")}
              >
                <span className="font-mono text-sm text-accent-ink">/{c.cmd}</span>
                <span className="text-xs text-zinc-500">{c.hint}</span>
              </button>
            </li>
          ))}
          <li className="px-3 pt-1 text-[11px] text-zinc-400">↑↓ to choose · Enter to pick</li>
        </ul>
      ) : null}

      {error ? (
        <div className="p-2 pb-0">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {mode !== "note" ? (
        <div className="flex items-center gap-2 px-3 pt-2.5">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-xs text-accent-ink">/{mode}</span>
          <button type="button" onClick={() => setMode("note")} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            back to note
          </button>
        </div>
      ) : null}

      <textarea
        ref={box}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setMenuIndex(0);
        }}
        onKeyDown={(e) => {
          if (menu.length) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setMenuIndex((i) => (i + (e.key === "ArrowDown" ? 1 : menu.length - 1)) % menu.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              pick(menu[menuIndex].cmd);
              return;
            }
          }
        }}
        rows={2}
        maxLength={5000}
        aria-label={command.label}
        placeholder={placeholder}
        className="block w-full resize-none bg-transparent px-3 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none"
      />

      <div className="space-y-2 px-3 pb-2">
        {mode === "call" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {OUTCOMES.map((o) => (
              <button key={o} type="button" aria-pressed={outcome === o} className={chip(outcome === o)} onClick={() => setOutcome(outcome === o ? "" : o)}>
                {o}
              </button>
            ))}
            <span className="mx-1 text-zinc-300">|</span>
            <button type="button" aria-pressed={direction === "inbound"} className={chip(direction === "inbound")} onClick={() => setDirection(direction === "inbound" ? "outbound" : "inbound")}>
              They called
            </button>
          </div>
        ) : null}
        {mode === "email" ? (
          <div className="flex gap-1.5">
            <button type="button" aria-pressed={direction === "outbound"} className={chip(direction === "outbound")} onClick={() => setDirection("outbound")}>
              I sent it
            </button>
            <button type="button" aria-pressed={direction === "inbound"} className={chip(direction === "inbound")} onClick={() => setDirection("inbound")}>
              They sent it
            </button>
          </div>
        ) : null}
        {mode === "task" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {DUE_CHOICES.map((c) => {
              const v = c.value();
              return (
                <button key={c.label} type="button" aria-pressed={due === v} className={chip(due === v)} onClick={() => setDue(due === v ? "" : v)}>
                  {c.label}
                </button>
              );
            })}
            <Input type="datetime-local" aria-label="Due" value={due} onChange={(e) => setDue(e.target.value)} className="h-7 w-auto text-xs" />
            <Select aria-label="Assigned to" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-7 w-auto text-xs">
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === currentUserId ? "Me" : m.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {mode === "move" ? (
          <Select aria-label="Move to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="h-8 w-auto text-xs">
            {stages
              .filter((s) => !s.is_lost && s.id !== stageId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
        ) : null}
        {mode === "lost" ? <Input aria-label="Reason" placeholder="Why was it lost? e.g. went with another agency" value={lostReason} onChange={(e) => setLostReason(e.target.value)} className="h-8 text-xs" /> : null}

        {logging && mode !== "note" ? (
          <div className="space-y-1.5 rounded-xl bg-zinc-50 p-2.5 text-xs dark:bg-zinc-800/60">
            <p className="font-medium text-zinc-500">Also, based on this {mode}</p>
            {nextStage ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={suggestMove} onChange={(e) => setSuggestMove(e.target.checked)} className="accent-[var(--accent)]" />
                Move to <b className="font-medium">{nextStage.name}</b>
              </label>
            ) : null}
            {nextStep ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={completeNext} onChange={(e) => setCompleteNext(e.target.checked)} className="accent-[var(--accent)]" />
                <span className="truncate">
                  Done: <span className="text-zinc-600 dark:text-zinc-300">{nextStep.body}</span>
                </span>
              </label>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
              <Input aria-label="Next step" placeholder="Next step (optional)" value={nextBody} onChange={(e) => setNextBody(e.target.value)} className="h-7 min-w-40 flex-1 text-xs" />
              {nextBody
                ? DUE_CHOICES.map((c) => {
                    const v = c.value();
                    return (
                      <button key={c.label} type="button" aria-pressed={nextDue === v} className={chip(nextDue === v)} onClick={() => setNextDue(nextDue === v ? "" : v)}>
                        {c.label}
                      </button>
                    );
                  })
                : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          {COMMANDS.filter((c) => c.cmd !== mode).map((c) => (
            <button key={c.cmd} type="button" onClick={() => pick(c.cmd)} className="rounded-full px-1.5 py-0.5 font-mono text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
              /{c.cmd}
            </button>
          ))}
          <Button type="button" onClick={submit} disabled={pending} className="ml-auto h-9">
            {pending ? "Saving…" : command.action}
            <kbd className="hidden rounded bg-white/20 px-1 text-[10px] sm:inline">⌘↵</kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Shown once after "Start conversation", with a way back.
export function StartedToast({ leadId, personId, companyId, backHref }: { leadId: string; personId?: string; companyId?: string; backHref: string }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
      <span className="flex-1">
        <b className="font-medium">Conversation started.</b> {personId ? "The person was added to People." : ""}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await undoStartConversation(leadId, personId, companyId);
            if (!result.error) router.push(backHref);
          })
        }
        className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25 dark:bg-zinc-900/10"
      >
        {pending ? "Undoing…" : "Undo"}
      </button>
      <button type="button" onClick={() => setHidden(true)} aria-label="Dismiss" className="text-white/60 hover:text-white dark:text-zinc-500">
        ✕
      </button>
    </div>
  );
}
