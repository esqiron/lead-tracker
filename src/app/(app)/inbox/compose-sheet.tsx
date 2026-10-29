"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, cx, Input, Select, Textarea } from "@/components/ui";
import { companyFromDomain, parseSignature } from "@/lib/signature";
import { findSimilar, searchPeople, startConversation, type PersonMatch, type Similar } from "./actions";

export type ComposeOptions = {
  members: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  currentUserId: string;
  currency: string;
};

const FIRST_TYPES = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "note", label: "Note" },
] as const;
const OUTCOMES = ["Reached", "Left voicemail", "No answer"];
const BASES = [
  { value: "legitimate_interest", label: "Legitimate interest" },
  { value: "consent", label: "Consent" },
  { value: "contract", label: "Contract" },
] as const;

type Person = { firstName: string; lastName: string; email: string; phone: string; title: string };
const EMPTY_PERSON: Person = { firstName: "", lastName: "", email: "", phone: "", title: "" };

// Local wall-clock date + 09:00, as a datetime-local value.
function dayAt9(daysAhead: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}
function nextMonday() {
  const day = new Date().getDay();
  return dayAt9(((8 - day) % 7) || 7);
}
export const DUE_CHOICES = [
  { label: "Tomorrow", value: () => dayAt9(1) },
  { label: "In 3 days", value: () => dayAt9(3) },
  { label: "Next week", value: () => nextMonday() },
];

export function ComposeSheet({ open, onClose, options, prefill }: { open: boolean; onClose: () => void; options: ComposeOptions; prefill?: PersonMatch | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<PersonMatch[]>([]);
  const [existing, setExisting] = useState<PersonMatch | null>(prefill ?? null);
  const [creating, setCreating] = useState(false);
  const [person, setPerson] = useState<Person>(EMPTY_PERSON);
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [similar, setSimilar] = useState<Similar | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [filled, setFilled] = useState<{ count: number; before: { person: Person; company: string; website: string } } | null>(null);

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState(options.stages[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(options.currentUserId);
  const [sourceId, setSourceId] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [firstType, setFirstType] = useState<(typeof FIRST_TYPES)[number]["value"]>("call");
  const [firstBody, setFirstBody] = useState("");
  const [outcome, setOutcome] = useState("");
  const [direction, setDirection] = useState("outbound");
  const [nextBody, setNextBody] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [basis, setBasis] = useState<string>("legitimate_interest");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // showModal focuses the first button; start in "With" instead.
      el.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  // People search for "With".
  useEffect(() => {
    if (existing || creating || query.trim().length < 2) return;
    const t = setTimeout(() => searchPeople(query).then(setMatches), 180);
    return () => clearTimeout(t);
  }, [query, existing, creating]);

  const checkDuplicates = (next: Person, knownCompany = company) => {
    if (!next.email && !(next.firstName && next.lastName)) return setSimilar(null);
    findSimilar({ firstName: next.firstName, lastName: next.lastName, email: next.email }).then((s) => {
      setSimilar(s);
      // Company from the email domain, when nothing was typed yet.
      if (!knownCompany && next.email.includes("@")) {
        const domain = next.email.split("@")[1];
        if (s.company) setCompany(s.company.name);
        else if (!/^(gmail|googlemail|outlook|hotmail|yahoo|icloud|proton|protonmail|gmx|live)\./.test(domain)) {
          setCompany(companyFromDomain(domain));
          setWebsite(`https://${domain}`);
        }
      }
    });
  };

  const startCreating = () => {
    const [firstName = "", ...rest] = query.trim().split(/\s+/);
    const isMail = query.includes("@");
    const next = { ...EMPTY_PERSON, firstName: isMail ? "" : firstName, lastName: isMail ? "" : rest.join(" "), email: isMail ? query.trim() : "" };
    setPerson(next);
    setCreating(true);
    setMatches([]);
  };

  const applyPaste = (text: string) => {
    const p = parseSignature(text);
    const before = { person, company, website };
    const next = {
      firstName: p.firstName ?? person.firstName,
      lastName: p.lastName ?? person.lastName,
      email: p.email ?? person.email,
      phone: p.phone ?? person.phone,
      title: p.title ?? person.title,
    };
    const count = [p.firstName, p.lastName, p.email, p.phone, p.title, p.company, p.website].filter(Boolean).length;
    if (!count) return;
    setCreating(true);
    setExisting(null);
    setPerson(next);
    if (p.company) setCompany(p.company);
    if (p.website) setWebsite(p.website);
    setFilled({ count, before });
    setPasteOpen(false);
    checkDuplicates(next, p.company ?? company);
  };

  const close = () => {
    onClose();
  };

  const submit = () => {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await startConversation({
        contactId: existing?.id,
        person: existing ? undefined : { ...person, lawfulBasis: basis },
        company: existing ? undefined : company,
        companyWebsite: existing ? undefined : website,
        title,
        value,
        stageId,
        ownerId,
        sourceId,
        closeDate,
        first: { type: firstType, body: firstBody, direction: firstType === "email" || firstType === "call" ? direction : undefined, outcome: firstType === "call" ? outcome : undefined },
        next: { body: nextBody, due: nextBody ? nextDue : "" },
      });
      if (result.error) return setError(result.error);
      if (result.fieldErrors) return setFieldErrors(result.fieldErrors);
      onClose();
      const params = new URLSearchParams({ started: result.leadId! });
      if (result.createdContactId) params.set("person", result.createdContactId);
      if (result.createdCompanyId) params.set("company", result.createdCompanyId);
      router.push(`${result.path}?${params}`);
    });
  };

  const chip = (on: boolean) =>
    cx(
      "rounded-full px-3 py-1 text-sm transition-colors",
      on ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
    );
  const err = (key: string) => (fieldErrors[key] ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors[key]}</p> : null);
  const label = "mb-1 block text-xs font-medium text-zinc-500";

  return (
    <dialog
      ref={dialog}
      onClose={close}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          submit();
        }
      }}
      aria-labelledby="compose-title"
      className="m-auto max-h-[92dvh] w-[min(100%-2rem,60rem)] overflow-hidden rounded-3xl bg-white p-0 text-zinc-900 shadow-2xl ring-1 ring-hairline backdrop:bg-zinc-900/30 backdrop:backdrop-blur-sm dark:bg-zinc-900 dark:text-zinc-100"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex max-h-[92dvh] flex-col"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div>
            <h2 id="compose-title" className="font-display text-2xl font-semibold tracking-tight">
              New conversation
            </h2>
            <p className="text-sm text-zinc-500">Who it&apos;s with, what it&apos;s about, what happened.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          {error ? (
            <div className="mb-3">
              <Alert>{error}</Alert>
            </div>
          ) : null}
          {filled ? (
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-2.5 text-sm text-accent-ink">
              <span className="flex-1">
                <b className="font-medium">Filled {filled.count} fields from what you pasted.</b> Check them before saving.
              </span>
              <button
                type="button"
                className="font-medium underline"
                onClick={() => {
                  setPerson(filled.before.person);
                  setCompany(filled.before.company);
                  setWebsite(filled.before.website);
                  setFilled(null);
                }}
              >
                Undo
              </button>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-4">
              <div>
                <span className={label}>With</span>
                {existing ? (
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-accent/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{existing.name}</span>
                      <span className="block truncate text-xs text-zinc-500">{[existing.title, existing.company].filter(Boolean).join(" · ") || existing.email}</span>
                    </span>
                    <button type="button" className="text-sm text-accent hover:underline" onClick={() => setExisting(null)}>
                      Change
                    </button>
                  </div>
                ) : creating ? (
                  <div className="space-y-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-hairline dark:bg-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink">New person</span>
                      <button
                        type="button"
                        className="text-xs text-zinc-500 hover:underline"
                        onClick={() => {
                          setCreating(false);
                          setSimilar(null);
                        }}
                      >
                        Search instead
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input aria-label="First name" placeholder="First name" value={person.firstName} onChange={(e) => setPerson({ ...person, firstName: e.target.value })} onBlur={() => checkDuplicates(person)} autoFocus />
                      <Input aria-label="Last name" placeholder="Last name" value={person.lastName} onChange={(e) => setPerson({ ...person, lastName: e.target.value })} onBlur={() => checkDuplicates(person)} />
                      <Input aria-label="Email" type="email" placeholder="Email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} onBlur={() => checkDuplicates(person)} className="col-span-2 w-full" />
                      <Input aria-label="Title" placeholder="Title (optional)" value={person.title} onChange={(e) => setPerson({ ...person, title: e.target.value })} />
                      <Input aria-label="Phone" placeholder="Phone (optional)" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
                      <Input aria-label="Company" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} className="col-span-2 w-full" />
                    </div>
                    {err("with")}
                    {err("email")}
                    {similar?.emailMatch ? (
                      <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        {similar.emailMatch.name} already has this email.{" "}
                        <button type="button" className="font-medium underline" onClick={() => { setExisting(similar.emailMatch); setCreating(false); setSimilar(null); }}>
                          Use them instead
                        </button>
                      </div>
                    ) : similar?.nameMatches.length ? (
                      <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                        Someone called {similar.nameMatches[0].name} is already in People{similar.nameMatches[0].company ? ` (${similar.nameMatches[0].company})` : ""}.{" "}
                        <button type="button" className="font-medium underline" onClick={() => { setExisting(similar.nameMatches[0]); setCreating(false); setSimilar(null); }}>
                          Same person?
                        </button>
                      </div>
                    ) : similar ? (
                      <p className="text-xs text-accent-ink">✓ Nobody with this name or email is in People yet.</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      aria-label="With"
                      placeholder="Search people, or type a new name or email"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      data-autofocus
                    />
                    {query.trim().length >= 2 ? (
                      <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl bg-white py-1 shadow-lg ring-1 ring-hairline dark:bg-zinc-900">
                        {matches.map((m) => (
                          <li key={m.id}>
                            <button type="button" onClick={() => { setExisting(m); setQuery(""); setMatches([]); }} className="block w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800">
                              <span className="block text-sm font-medium">{m.name}</span>
                              <span className="block text-xs text-zinc-500">{[m.title, m.company, m.email].filter(Boolean).join(" · ")}</span>
                            </button>
                          </li>
                        ))}
                        <li>
                          <button type="button" onClick={startCreating} className="block w-full px-3 py-2 text-left text-sm text-accent hover:bg-zinc-50 dark:hover:bg-zinc-800">
                            + Add “{query.trim()}” as a new person
                          </button>
                        </li>
                      </ul>
                    ) : null}
                    {err("with")}
                  </div>
                )}
                {!existing ? (
                  pasteOpen ? (
                    <Textarea
                      className="mt-2"
                      rows={4}
                      autoFocus
                      aria-label="Pasted signature or email"
                      placeholder="Paste an email signature or a forwarded email"
                      onPaste={(e) => {
                        const text = e.clipboardData.getData("text");
                        setTimeout(() => applyPaste(text), 0);
                      }}
                      onBlur={(e) => e.target.value && applyPaste(e.target.value)}
                    />
                  ) : (
                    <button type="button" onClick={() => setPasteOpen(true)} className="mt-2 text-xs text-zinc-500 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100">
                      Paste a signature or forwarded email to fill this in
                    </button>
                  )
                ) : null}
              </div>

              <div>
                <label htmlFor="cs-title" className={label}>
                  About
                </label>
                <Input
                  id="cs-title"
                  placeholder="e.g. Passenger booking app"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  // With the person already picked, start here.
                  data-autofocus={existing ? "" : undefined}
                />
                {err("title")}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="cs-value" className={label}>
                    Value <span className="font-normal text-zinc-400">optional</span>
                  </label>
                  <Input id="cs-value" inputMode="decimal" placeholder={options.currency} value={value} onChange={(e) => setValue(e.target.value)} />
                  {err("value")}
                </div>
                <div>
                  <label htmlFor="cs-stage" className={label}>
                    Stage
                  </label>
                  <Select id="cs-stage" value={stageId} onChange={(e) => setStageId(e.target.value)}>
                    {options.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="cs-owner" className={label}>
                    Owner
                  </label>
                  <Select id="cs-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                    {options.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id === options.currentUserId ? `${m.name} (you)` : m.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="cs-close" className={label}>
                    Close date <span className="font-normal text-zinc-400">optional</span>
                  </label>
                  <Input id="cs-close" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="cs-source" className={label}>
                    Source <span className="font-normal text-zinc-400">optional</span>
                  </label>
                  <Select id="cs-source" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                    <option value="">—</option>
                    {options.sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <span className={label}>
                  What happened? <span className="font-normal text-zinc-400">optional</span>
                </span>
                <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Type">
                  {FIRST_TYPES.map((t) => (
                    <button key={t.value} type="button" aria-pressed={firstType === t.value} className={chip(firstType === t.value)} onClick={() => setFirstType(t.value)}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <Textarea rows={4} aria-label="What happened" placeholder="A call, an email, a meeting or a note. It becomes the first entry in the thread." value={firstBody} onChange={(e) => setFirstBody(e.target.value)} />
                {firstType === "call" || firstType === "email" ? (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {firstType === "call"
                      ? OUTCOMES.map((o) => (
                          <button key={o} type="button" aria-pressed={outcome === o} className={chip(outcome === o)} onClick={() => setOutcome(outcome === o ? "" : o)}>
                            {o}
                          </button>
                        ))
                      : [
                          { v: "outbound", l: "I sent it" },
                          { v: "inbound", l: "They sent it" },
                        ].map((d) => (
                          <button key={d.v} type="button" aria-pressed={direction === d.v} className={chip(direction === d.v)} onClick={() => setDirection(d.v)}>
                            {d.l}
                          </button>
                        ))}
                  </div>
                ) : null}
              </div>
              <div>
                <label htmlFor="cs-next" className={label}>
                  Next step <span className="font-normal text-zinc-400">optional</span>
                </label>
                <Input id="cs-next" placeholder="e.g. Send the proposal" value={nextBody} onChange={(e) => setNextBody(e.target.value)} />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {DUE_CHOICES.map((c) => {
                    const v = c.value();
                    return (
                      <button key={c.label} type="button" aria-pressed={nextDue === v} className={chip(nextDue === v)} onClick={() => setNextDue(nextDue === v ? "" : v)}>
                        {c.label}
                      </button>
                    );
                  })}
                  <Input type="datetime-local" aria-label="Pick a due date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className="h-8 w-auto text-xs" />
                </div>
              </div>
              {!existing ? (
                <div>
                  <span className={label}>Lawful basis</span>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lawful basis">
                    {BASES.map((b) => (
                      <button key={b.value} type="button" aria-pressed={basis === b.value} className={chip(basis === b.value)} onClick={() => setBasis(b.value)}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">Legitimate interest fits a business contact you met. Shown on their page under Privacy.</p>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-hairline px-6 py-3">
          <p className="flex-1 text-xs text-zinc-500">
            Only <b className="font-medium text-zinc-700 dark:text-zinc-300">With</b> and <b className="font-medium text-zinc-700 dark:text-zinc-300">About</b> are required.
          </p>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Starting…" : "Start conversation"}
            <kbd className="hidden rounded bg-white/20 px-1 text-[10px] sm:inline">⌘↵</kbd>
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
