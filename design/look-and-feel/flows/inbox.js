// Inbox + review — the chosen direction. Threads (every lead is a conversation in an
// inbox) merged with Weekly review (a short guided ritual, one deal at a time). The
// review is a folder in the inbox and runs inside each deal's thread, and every answer
// is written back into that thread. Studio look. Story: Ana's Monday to Wednesday.
(function () {
  const MON = "2026-10-26";
  const TUE = "2026-10-27";
  const WED = "2026-10-28";
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const toUTC = (iso) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);
  const dow = (iso) => DOW[new Date(toUTC(iso)).getUTCDay()];
  const first = (name) => String(name || "").split(" ")[0];

  const I = {
    search: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="M13 13l3.5 3.5"/></svg>`,
    plus: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11"/></svg>`,
    out: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4.5H5.5a1 1 0 00-1 1v9a1 1 0 001 1H8M12 7l3 3-3 3M15 10H8"/></svg>`,
    arrowR: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M11 6l4 4-4 4"/></svg>`,
    back: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15 10H5M9 6l-4 4 4 4"/></svg>`,
    check: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3L15 6.5"/></svg>`,
    chev: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 8l4 4 4-4"/></svg>`,
    reply: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 5L4 9.5 8.5 14"/><path d="M4.5 9.5h6.5a5 5 0 015 5v1"/></svg>`,
    wait: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.6"/></svg>`,
    cold: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v14M4 6.5l12 7M16 6.5l-12 7"/><path d="M8 4.5l2 1.5 2-1.5M8 15.5l2-1.5 2 1.5"/></svg>`,
    won: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 4h7v3.5a3.5 3.5 0 01-7 0z"/><path d="M6.5 5.5H4.5a2 2 0 002 3M13.5 5.5h2a2 2 0 01-2 3M10 11v3M7 16h6"/></svg>`,
    stage: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="5" width="3.5" height="10" rx="1"/><rect x="8.25" y="5" width="3.5" height="7" rx="1"/><rect x="13.5" y="5" width="3.5" height="4.5" rx="1"/></svg>`,
    people: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="7.5" r="2.8"/><path d="M3.5 15.5c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4"/><path d="M13 5.2a2.6 2.6 0 010 5M14.5 11.8c1.2.5 2 1.8 2.3 3.7"/></svg>`,
    person: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="7.5" r="3"/><path d="M4.5 16c.7-2.8 2.8-4.3 5.5-4.3s4.8 1.5 5.5 4.3"/></svg>`,
    call: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 3.5l2 3.5-1.6 1.4a8 8 0 004.7 4.7L13 11.5l3.5 2-.7 2.3c-.2.6-.8 1-1.4.9C8.6 16 4 11.4 3.3 5.6c-.1-.6.3-1.2.9-1.4z"/></svg>`,
    note: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 3.5h6l3 3v10h-9z"/><path d="M8 10h4.5M8 13h4.5"/></svg>`,
    email: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="5" width="14" height="10.5" rx="2"/><path d="M3.5 6l6.5 5 6.5-5"/></svg>`,
    meeting: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/></svg>`,
    task: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="3"/><path d="M7 10.2l2 2 4-4.2"/></svg>`,
    move: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M12 6l4 4-4 4"/></svg>`,
    lost: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M7.5 7.5l5 5M12.5 7.5l-5 5"/></svg>`,
    flag: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 17V3.5M5 4h9l-2 3.2 2 3.3H5"/></svg>`,
    globe: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M3.5 10h13M10 3.5c2 2 2 11 0 13M10 3.5c-2 2-2 11 0 13"/></svg>`,
    review: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10a6 6 0 11-1.8-4.3"/><path d="M16.2 3.8v2.6h-2.6"/><path d="M7.3 10.2l1.9 1.9 3.6-3.8"/></svg>`,
    push: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3M8 12.5h4.5M11 11l1.5 1.5L11 14"/></svg>`,
    pause: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 5.5v9M12.5 5.5v9"/></svg>`,
    forward: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.5 5l4.5 4.5-4.5 4.5"/><path d="M16 9.5H9a5 5 0 00-5 5v1"/></svg>`,
    copy: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="2"/><path d="M13 7V5.5a1.5 1.5 0 00-1.5-1.5h-6A1.5 1.5 0 004 5.5v6A1.5 1.5 0 005.5 13H7"/></svg>`,
    shield: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3l5.5 2v4.5c0 3.5-2.4 6-5.5 7.5-3.1-1.5-5.5-4-5.5-7.5V5z"/></svg>`,
    compose: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16l1-4 8.5-8.5a2.1 2.1 0 013 3L8 15z"/><path d="M12 5l3 3"/></svg>`,
    upload: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 13V4M6.5 7.5L10 4l3.5 3.5"/><path d="M4 13v2.5h12V13"/></svg>`,
    link: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 11.5l3-3"/><path d="M9 6l1.5-1.5a3 3 0 014.2 4.2L13 10.5M11 14l-1.5 1.5a3 3 0 01-4.2-4.2L7 9.5"/></svg>`,
    company: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.5" y="3.5" width="11" height="13" rx="1.5"/><path d="M7.5 7h1M11.5 7h1M7.5 10h1M11.5 10h1M8.5 16.5v-3h3v3"/></svg>`,
    paste: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4.5" width="10" height="12" rx="2"/><path d="M8 4.5V3h4v1.5"/><path d="M7.5 9h5M7.5 12h3"/></svg>`,
    x: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8"/></svg>`,
  };
  const ic = (k, cls = "") => `<span class="st-i ${cls}">${I[k]}</span>`;
  const NAV = ["Inbox", "People", "Pipeline", "Reports", "Settings"];

  // ---------- review plan (same rules as the Weekly review concept) ----------
  // A deal needs a look when its close date has passed, nobody has touched it in 14+ days,
  // or nobody owns it. Order: furthest stage first, then biggest first.
  const stageIdx = (id) => Number(id.slice(1));
  function plan(d) {
    const open = d.leads.filter((l) => l.status === "open");
    const needs = (l) => l.overdue || d.touch[l.id].days >= 14 || !l.owner;
    const order = (a, b) => stageIdx(b.stageId) - stageIdx(a.stageId) || b.amount - a.amount;
    const attention = open.filter(needs).sort(order);
    const fine = open.filter((l) => !needs(l)).sort(order);
    return { open, attention, fine, all: attention.concat(fine) };
  }
  function reasons(l, d, h) {
    const t = d.touch[l.id];
    const out = [];
    if (l.overdue) out.push(`<span class="rv-why is-date">${ic("wait")}Close date passed · ${h.esc(h.day(l.closeDate))}</span>`);
    if (t.days >= 14) out.push(`<span class="rv-why">${t.days} days since last touch</span>`);
    if (!l.owner) out.push(`<span class="rv-why">No owner</span>`);
    return out.join("");
  }
  // What Wednesday's review decided.
  const DEC = {
    l8: { label: "Kept · next step Thu 29 Oct" },
    l9: { label: "Lost · Timing", lost: true },
    l5: { label: "Kept · follow-up Mon 2 Nov" },
    l6: { closeDate: "2027-01-15" },
    l3: { owner: "Priya Nair", closeDate: "2026-12-15" },
  };
  const weighted = (list, h, over = {}) =>
    list.reduce((s, l) => ((over[l.id] || {}).lost ? s : s + (l.amount * h.stage(l.stageId).probability) / 100), 0);

  // ---------- time helpers (each screen has its own "now") ----------
  function when(iso, now, h) {
    const n = diffDays(iso, now);
    if (n === 0) return "Today";
    if (n === 1) return "Yesterday";
    if (n < 7) return dow(iso);
    return h.esc(h.day(iso));
  }
  function dueChip(iso, now, h) {
    if (!iso) return `<span class="th-due is-none">No date</span>`;
    const n = diffDays(now, iso);
    if (n < 0) return `<span class="th-due is-late">${-n} day${n === -1 ? "" : "s"} late</span>`;
    if (n === 0) return `<span class="th-due is-today">Today</span>`;
    if (n === 1) return `<span class="th-due">Tomorrow</span>`;
    return `<span class="th-due">${dow(iso)} ${h.esc(h.day(iso))}</span>`;
  }
  const dayline = (iso, now, h) => `<div class="th-day"><span>${iso.slice(0, 10) === now ? "Today · " : ""}${dow(iso)} ${h.esc(h.day(iso))}</span></div>`;
  const avatar = (name, h, cls = "is-xs") =>
    name ? `<span class="st-av ${cls}" title="${h.esc(name)}">${h.esc(h.initials(name))}</span>` : `<span class="st-av ${cls} is-empty" title="Unassigned"></span>`;

  // ---------- chrome ----------
  function chrome(d, h, o, body) {
    const e = h.esc;
    const nav =
      o.center ||
      `<nav class="st-nav" aria-label="Main">${NAV.map((n) => {
        const on = n === o.nav;
        return `<a href="#" class="${on ? "is-on" : ""}"${on ? ' aria-current="page"' : ""}>${e(n)}${n === "Inbox" && o.badge ? `<span class="th-navn">${o.badge}</span>` : ""}</a>`;
      }).join("")}</nav>`;
    return `
<header class="st-top">
  <a class="st-brand" href="#"><span class="st-mark" aria-hidden="true"><i></i></span><span>Lead Tracker</span></a>
  ${nav}
  <div class="st-who">
    <span class="st-org"><i aria-hidden="true"></i>${e(d.org.name)}</span>
    <span class="st-user"><span class="st-av is-sm">${e(h.initials(d.viewer.name))}</span><span class="st-user-t"><b>${e(d.viewer.name)}</b><small>${e(d.viewer.role)}</small></span></span>
    <a class="st-iconbtn" href="#" aria-label="Sign out" title="Sign out">${I.out}</a>
  </div>
</header>
<main class="st-main th-main">${body}</main>`;
  }

  // ---------- sidebar: the review entry, smart folders, views ----------
  const FOLDERS = [
    { id: "reply", name: "Needs reply", rule: "Your move is next", icon: "reply" },
    { id: "waiting", name: "Waiting on them", rule: "Their move, nothing due", icon: "wait" },
    { id: "cold", name: "Going cold", rule: "No touch in 14+ days", icon: "cold" },
    { id: "won", name: "Won", rule: "Closed this month", icon: "won" },
  ];
  function ticks(d, state, pos) {
    const p = plan(d);
    return p.all
      .map((x, i) => {
        if (state === "done") return `<i class="is-done"></i>`;
        if (state === "progress") return `<i class="${i < pos ? "is-done" : i === pos ? "is-now" : i < p.attention.length ? "is-look" : ""}"></i>`;
        return `<i class="${i < p.attention.length ? "is-look" : ""}"></i>`;
      })
      .join("");
  }
  // Same rail on every screen; only the counts and the review's state move with the story.
  const DAYS = {
    mon: { n: { reply: 4, waiting: 2, cold: 4, won: 2, stage: 10 }, open: 220700, openN: 10 },
    monPm: { n: { reply: 5, waiting: 2, cold: 4, won: 2, stage: 11 }, open: 244700, openN: 11 },
    monNew: { n: { reply: 5, waiting: 3, cold: 4, won: 2, stage: 12 }, open: 282700, openN: 12 },
    tue: { n: { reply: 5, waiting: 3, cold: 4, won: 2, stage: 12 }, open: 247900, openN: 12 },
    wed: { n: { reply: 5, waiting: 3, cold: 4, won: 2, stage: 12 }, open: 247900, openN: 12 },
    after: { n: { reply: 5, waiting: 3, cold: 3, won: 2, stage: 11 }, open: 241500, openN: 11 },
  };
  const REV = {
    due: { state: "due", sub: "Due today · 5 need a look", tag: "6 min" },
    waiting: { state: "due", sub: "Due Monday · 5 need a look", tag: "6 min" },
    progress: { state: "progress", sub: "4 of 12 · 2 left that need a look", tag: "", pos: 3 },
    done: { state: "done", sub: "Done today · 3 changed", tag: "" },
  };
  function side(d, h, o) {
    const e = h.esc;
    const day = DAYS[o.day];
    const r = REV[o.rev];
    const on = o.active === "review";
    const rev = `<a href="#" class="ib-rev is-${r.state}${on ? " is-on" : ""}"${on ? ' aria-current="page"' : ""}>
        <span class="ib-rev-ic">${ic(r.state === "done" ? "check" : "review")}</span>
        <b>Weekly review</b>
        ${r.tag ? `<span class="ib-rev-tag">${r.tag}</span>` : "<span></span>"}
        <small>${r.sub}</small>
        <span class="ib-ticks" aria-hidden="true">${ticks(d, r.state, r.pos)}</span>
      </a>`;
    const li = (f) => `<li class="${f.id === o.active ? "is-on" : ""}${f.id === "won" ? " is-won" : ""}">
        ${ic(f.icon)}<span class="th-f-t"><b>${e(f.name)}</b><small>${e(f.rule)}</small></span><span class="th-f-n">${day.n[f.id]}</span></li>`;
    return `<aside class="th-side" aria-label="Inbox">
      <a href="#" class="th-new${o.menu ? " is-open" : ""}"${o.menu ? ' aria-expanded="true"' : ""}>${ic("plus")}New<kbd>C</kbd></a>
      ${o.menu || ""}
      ${rev}
      <p class="th-side-h">Folders</p>
      <ul class="th-folders">${FOLDERS.map(li).join("")}</ul>
      <p class="th-side-h">Views</p>
      <ul class="th-folders is-views">
        <li class="${o.active === "stage" ? "is-on" : ""}">${ic("stage")}<span class="th-f-t"><b>By stage</b><small>The pipeline, as conversations</small></span><span class="th-f-n">${day.n.stage}</span></li>
        <li>${ic("people")}<span class="th-f-t"><b>By owner</b><small>Who owes what</small></span></li>
      </ul>
      <div class="th-pipe">
        <span>Open pipeline</span>
        <b>${e(h.money(day.open))}</b>
        <small>${day.openN} open conversations</small>
      </div>
    </aside>`;
  }

  // ---------- thread list ----------
  function R(d, id, over = {}) {
    const l = d.leads.find((x) => x.id === id);
    const t = d.touch[id] || {};
    return { id, contact: l.contact, company: l.company, title: l.title, stageId: l.stageId, amount: l.amount, owner: l.owner, closeDate: l.closeDate, last: t.last, next: t.next, due: t.nextDue, via: t.via, ...over };
  }
  function row(h, r, now) {
    const e = h.esc;
    const st = h.stage(r.stageId);
    return `<li class="th-row${r.sel ? " is-sel" : ""}${r.unread ? " is-unread" : ""}">
      <span class="st-av">${e(h.initials(r.contact))}</span>
      <div class="th-row-b">
        <div class="th-row-t"><b>${e(r.contact)}</b><span class="th-co">${e(r.company)}</span><time>${r.time ? e(r.time) : when(r.last, now, h)}</time></div>
        <p class="th-row-l">${e(r.title)}</p>
        ${r.owner
          ? `<p class="th-row-n">${ic("arrowR")}<span>${e(r.next)}</span>${dueChip(r.due, now, h)}</p>`
          : `<p class="th-row-n is-unowned">${ic("person")}<span>Nobody owns this yet</span></p>`}
        <div class="th-row-f"><span class="th-stage">${e(st.name)}</span><span class="th-amt">${e(h.money(r.amount))}</span>${r.isNew ? `<span class="ib-new">New · via ${e(r.via)}</span>` : ""}<span class="ib-own">${avatar(r.owner, h)}</span></div>
      </div>
    </li>`;
  }
  function list(h, rows, now, o = {}) {
    const title = o.title || "Needs reply";
    return `<section class="th-list" aria-label="${title}">
      <div class="th-list-h"><h2>${title}</h2><span class="th-sort">Everyone's${ic("chev")}</span></div>
      <div class="th-search">${ic("search")}Search conversations<kbd>/</kbd></div>
      <a href="#" class="ib-start">${ic("compose")}<span>Start a conversation</span><small>with someone new or in People</small></a>
      <ul>${rows.map((r) => row(h, r, now)).join("")}</ul>
      ${o.foot || `<p class="th-list-f">The other folders are one click away. Nothing is lost by being out of this one.</p>`}
    </section>`;
  }

  // ---------- thread pieces ----------
  function head(h, r, o = {}) {
    const e = h.esc;
    const st = h.stage(o.stageId || r.stageId);
    let close;
    if (!r.closeDate || o.noClose) close = `<small>No close date yet</small>`;
    else if (o.closeLate) close = `<small class="ib-late">Close date passed · ${e(h.day(r.closeDate))}</small>`;
    else close = `<small>Closes ${dow(r.closeDate)} ${e(h.day(r.closeDate))}</small>`;
    return `<div class="th-head">
        <span class="st-av th-av-lg">${e(h.initials(r.contact))}</span>
        <div class="th-head-t"><h2>${e(r.title)}</h2><p>${e(r.contact)} · ${e(r.company)}</p></div>
        <div class="th-deal">${avatar(r.owner, h)}<span class="th-stage is-ink">${e(st.name)}</span><b>${e(h.money(r.amount))}</b>${close}</div>
      </div>${o.bar || ""}`;
  }
  const owe = (h, next, due, now) =>
    `<div class="th-owe${diffDays(now, due) < 0 ? " is-late" : ""}">${ic("flag")}<span><b>Your move:</b> ${h.esc(next)}</span>${dueChip(due, now, h)}<a href="#" class="th-mini">Mark done</a></div>`;
  const chan = (label, also, h) => `<span class="ib-ch">${ic(label === "Email" ? "email" : "note")}Logged ${label.toLowerCase()}${also ? ` · also in ${h.esc(also)}` : ""}</span>`;
  const FORM = `<span class="st-src">${ic("globe")}via Website form · unverified</span>`;
  function bubble(h, m, o = {}) {
    const e = h.esc;
    const who = m.dir === "in" ? m.from : first(m.from);
    const meta = m.channel === "Website form" ? FORM : chan(m.channel, o.also, h);
    return `<div class="th-msg is-${m.dir}">
      <div class="th-msg-h"><b>${e(who)}</b>${meta}<time>${e(m.at.slice(11, 16))}</time></div>
      <p>${e(m.body)}</p>
    </div>`;
  }
  const logCard = (h, type, label, by, time, body) =>
    `<div class="th-log"><span class="th-log-ic">${ic(type)}</span><div><div class="th-log-h"><b>${label}</b><span>by ${h.esc(by)}</span><time>${h.esc(time)}</time></div><p>${h.esc(body)}</p></div></div>`;
  const sys = (inner, cls = "") => `<div class="th-sys${cls ? " " + cls : ""}">${inner}</div>`;
  const moved = (h, who, from, to, time) =>
    sys(`${ic("move")}<span>${h.esc(first(who))} moved this from</span><span class="th-chip">${h.esc(from)}</span><span>to</span><span class="th-chip is-to">${h.esc(to)}</span>${time ? `<time>· ${h.esc(time)}</time>` : ""}`);
  const earlier = (n, text) => `<div class="th-earlier">${ic("chev")}<b>${n} earlier</b><span>${text}</span></div>`;
  // A review answer, written into the thread as a small system event.
  const reviewed = (h, inner, time) =>
    `<div class="ib-revev">${ic("review")}<b>Reviewed by Ana</b>${inner}<time>${h.esc(time)}</time></div>`;

  const SLASH = [
    { k: "call", d: "Log a call: outcome and what was said" },
    { k: "note", d: "Add a note for the team" },
    { k: "email", d: "Log an email you sent or got" },
    { k: "task", d: "Give someone a to-do with a date" },
    { k: "move", d: "Move the deal to another stage" },
    { k: "lost", d: "Mark lost, with a reason" },
  ];
  const SLASH_IC = { call: "call", note: "note", email: "email", task: "task", move: "move", lost: "lost" };
  function composer(placeholder, after = "") {
    return `<div class="th-comp">
      <div class="th-comp-in">${placeholder}</div>
      <div class="th-comp-f">
        <span class="th-slashes">${SLASH.map((s) => `<span>${ic(SLASH_IC[s.k])}/${s.k}</span>`).join("")}</span>
        <a href="#" class="st-btn is-ink is-sm">Add note<span class="st-btn-ic">${I.arrowR}</span></a>
      </div>
    </div>${after}`;
  }
  const inboxShell = (sideHtml, coreCls, inner, style = "") =>
    `<div class="th-shell">${sideHtml}<div class="st-shell"><div class="st-core th-core ${coreCls}"${style ? ` style="${style}"` : ""}>${inner}</div></div></div>`;

  const PROTO = "Walk Ioana through the dispatch prototype";

  // ---------- Monday afternoon: Marta's form lead (screen 2, and the inbox behind screens 3–5) ----------
  function martaScene(d, h, o = {}) {
    const e = h.esc;
    const now = MON;
    const c = d.contacts.find((x) => x.name === "Marta Kowalska");
    const consent = d.detail.contact.privacy.consent.text;
    const marta = R(d, "l1", { owner: "", last: MON, time: "14:22", unread: !o.read, isNew: true, sel: !o.noSel, via: "Website form" });
    const rows = [marta, R(d, "l7", { last: "2026-10-25" }), R(d, "l11", { last: "2026-10-25", next: PROTO, due: TUE }), R(d, "l2"), R(d, "l15")];
    const bar = `<div class="th-owe is-unowned">${ic("person")}<span class="ib-uo"><b>Nobody owns this yet</b><small>Form leads wait here until someone takes them</small></span>
      <a href="#" class="th-mini">Assign to…${ic("chev")}</a>
      <a href="#" class="st-btn is-primary is-sm">Take it<span class="st-btn-ic">${I.check}</span></a></div>`;
    const form = `<div class="ib-form">
        <div class="ib-form-h"><b>${e(c.name)}</b>${FORM}<span>“Contact us” form</span><time>14:22</time></div>
        <p class="ib-form-msg">We run 14 warehouses and our ops dashboard is a weekly spreadsheet export. We'd like a live dashboard before peak season, budget around €24k. Could we talk this week?</p>
        <dl class="ib-fields">
          <div><dt>Email</dt><dd>${e(c.email)}</dd></div>
          <div><dt>Phone</dt><dd>${e(c.phone)}</dd></div>
          <div><dt>Company</dt><dd>${e(c.company)}</dd></div>
          <div><dt>Role</dt><dd>${e(c.title)}</dd></div>
        </dl>
        <div class="ib-consent"><span class="ib-cbox">${ic("check")}</span><div><b>“${e(consent)}”</b><small>Ticked by the sender and stored with her record as consent · ${e(h.date(MON))} 14:22 · Website form</small></div></div>
        <p class="ib-unver">${ic("globe")}Unverified: anyone can fill in a public form. Check the email address before you rely on it.</p>
      </div>`;
    const msgs = `${dayline(MON, now, h)}${form}
      ${sys(`${ic("plus")}<span>New lead in <b>New</b> · €24,000 from the budget she gave · Marta added to People</span><time>· 14:22</time>`)}`;
    return `${list(h, rows, now)}
      <section class="th-thread" aria-label="Conversation">
        ${head(h, marta, { bar, noClose: true })}
        <div class="th-msgs">${msgs}</div>
        ${composer(`Log your first reply or call to Marta. Type <kbd>/</kbd> for a call, an email or a note`)}
      </section>`;
  }

  // ---------- creating a conversation ----------
  const JONAS = {
    contact: "Jonas Berg", title: "Passenger booking app", company: "Halden Ferries", role: "Head of Digital",
    email: "jonas.berg@haldenferries.no", phone: "+47 412 55 918", amount: 38000, stageId: "s1", owner: "Ana Dobre",
    source: "Event", next: "Check in if the route list hasn't arrived", due: "2026-10-30", callAt: "15:20", createdAt: "15:36",
    call: "Met Jonas at the Nordic Mobility Summit and called him today. They want to replace the passenger booking app before the 2027 season: 6 routes, Norwegian and English. He'll send the route list and current traffic numbers this week.",
  };
  const NEW_MENU = [
    { icon: "compose", t: "New conversation", d: "A deal with someone. Creates the person, company and lead in one go.", k: "C" },
    { icon: "person", t: "Add a person", d: "Someone to keep in touch with, no deal yet.", k: "P" },
    { icon: "search", t: "Log something on an existing deal", d: "Jumps to search, then the thread's reply box.", k: "L" },
    { icon: "upload", t: "Import from CSV", d: "People and leads from a spreadsheet or another CRM.", k: "I" },
    { icon: "link", t: "Share your lead form", d: "Copy the link to your hosted form. Leads land in Needs reply.", k: "F" },
  ];
  function newMenu(h) {
    return `<div class="ib-newmenu" role="menu" aria-label="New">
      <p class="ib-nm-h">Add to Lead Tracker</p>
      <ul>${NEW_MENU.map((m, i) => `<li class="${i === 0 ? "is-on" : ""}" role="menuitem">${ic(m.icon)}<span><b>${h.esc(m.t)}</b><small>${h.esc(m.d)}</small></span><kbd>${m.k}</kbd></li>`).join("")}</ul>
      <p class="ib-nm-f">Press <kbd>C</kbd> anywhere to open this menu, then a letter.</p>
    </div>`;
  }
  const fld = (label, value, o = {}) =>
    `<div class="ib-f${o.wide ? " is-wide" : ""}"><span class="ib-f-l">${label}${o.opt ? `<em>optional</em>` : ""}${o.fill ? `<i class="ib-fill" title="Filled from what you pasted"></i>` : ""}</span><span class="ib-f-v${o.empty ? " is-empty" : ""}${o.focus ? " is-focus" : ""}">${value}</span>${o.note ? `<small class="ib-f-n">${o.note}</small>` : ""}</div>`;
  function composeSheet(d, h, filled) {
    const e = h.esc;
    const J = JONAS;
    const marta = d.contacts.find((x) => x.name === "Marta Kowalska");
    const paste = filled
      ? `<div class="ib-paste is-done">${ic("check")}<span><b>Filled 5 fields from what you pasted</b> · check them. They're marked with a dot.</span><a href="#">Undo</a></div>`
      : `<div class="ib-paste">${ic("paste")}<span><b>Tip:</b> paste an email signature or a forwarded email and we'll fill these in.</span><span class="th-keys"><kbd>⌘</kbd><kbd>V</kbd></span></div>`;
    const withPart = filled
      ? `<div class="ib-with"><span class="st-av">${e(h.initials(J.contact))}</span><b>${e(J.contact)}</b><span class="ib-newtag">New person</span><a href="#">Change</a></div>
        <div class="ib-fgrid">
          ${fld("Name", e(J.contact), { fill: true })}
          ${fld("Title", e(J.role), { fill: true })}
          ${fld("Email", e(J.email), { fill: true })}
          ${fld("Phone", e(J.phone), { fill: true, opt: true })}
          ${fld("Company", `${ic("company")}${e(J.company)}`, { fill: true, wide: true, note: `Suggested from <b>haldenferries.no</b> · a new company, added with Jonas` })}
        </div>
        <p class="ib-dup">${ic("check")}<span><b>No duplicates.</b> Nobody called Jonas Berg and nobody at haldenferries.no is in People yet.</span></p>`
      : `${fld("", `${ic("search")}mar<i class="th-caret"></i>`, { focus: true })}
        <div class="ib-ac" role="listbox" aria-label="People matching mar">
          <p>In People</p>
          <ul>
            <li class="is-on" role="option" aria-selected="true">${avatar(marta.name, h, "")}<span><b><u>Mar</u>ta Kowalska</b><small>${e(marta.title)} · ${e(marta.company)} · 1 open deal</small></span><kbd>↵</kbd></li>
            <li role="option"><span class="ib-ac-plus">${ic("plus")}</span><span><b>Create “Mar…” as a new person</b><small>Add their name, email and company next</small></span></li>
          </ul>
          <p class="ib-ac-f">Searches names, emails and companies. Picking Marta adds a second deal to her conversations instead of a duplicate person.</p>
        </div>`;
    const v = (val, ph) => (filled ? val : `<span>${ph}</span>`);
    const deal = `<div class="ib-fgrid is-deal">
        ${fld("About", v(e(J.title), "What's the deal? e.g. Booking app rebuild"), { wide: true, empty: !filled })}
        ${fld("Value", v(e(h.money(J.amount)), "€ amount"), { opt: true, empty: !filled })}
        ${fld("Stage", `<span class="th-stage">New</span>`)}
        ${fld("Owner", `${avatar(d.viewer.name, h)}${e(first(d.viewer.name))} (you)`)}
        ${fld("Close date", `<span>Pick a date</span>`, { opt: true, empty: true })}
        ${fld("Source", v(e(J.source), "How they found you"), { opt: true, empty: !filled })}
      </div>`;
    const types = ["call", "email", "meeting", "note"];
    const firstEntry = `<div class="ib-chips" role="radiogroup" aria-label="Type">${types.map((t) => `<span class="${filled && t === "call" ? "is-on" : ""}">${ic(t)}${h.TYPE_LABELS[t]}</span>`).join("")}</div>
      <div class="ib-ta${filled ? "" : " is-empty"}">${filled ? e(J.call) : "A call, an email, a meeting or a note. It becomes the first entry in the thread."}</div>
      <div class="ib-nextrow">
        ${fld("Next step", v(e(J.next), "What's next, and who does it"), { opt: true, empty: !filled, wide: true })}
        <div class="th-dates" role="radiogroup" aria-label="Due">${filled
          ? `<span>Tomorrow<small>Tue 27</small></span><span class="is-on">Thu 30 Oct</span><span>Next week<small>Mon 2</small></span><span>Pick…</span>`
          : `<span>Tomorrow<small>Tue 27</small></span><span>Thu 30 Oct</span><span>Next week<small>Mon 2</small></span><span>Pick…</span>`}</div>
      </div>`;
    const basis = `<div class="ib-basis" role="radiogroup" aria-label="Lawful basis"><span class="is-on">Legitimate interest</span><span>Consent</span><span>Contract</span></div>
      <p class="ib-basis-n">Fits a business contact you met. Choose Consent if they agreed on a form, Contract once you work together. Shown on their page under Privacy.</p>`;
    return `<div class="ib-sheet" role="dialog" aria-label="New conversation">
      <div class="ib-sh-h"><div><h2>New conversation</h2><p>Who it's with, what it's about, what happened.</p></div><span class="th-keys"><kbd>Esc</kbd> close</span><a href="#" class="ib-x" aria-label="Close">${I.x}</a></div>
      ${paste}
      <div class="ib-sh-b">
        <div class="ib-col">
          <section class="ib-grp"><p class="ib-grp-h">With</p>${withPart}</section>
          <section class="ib-grp${filled ? "" : " is-later"}"><p class="ib-grp-h">About</p>${deal}</section>
        </div>
        <div class="ib-col">
          <section class="ib-grp${filled ? "" : " is-later"}"><p class="ib-grp-h">What happened?<em>optional</em></p>${firstEntry}</section>
          <section class="ib-grp${filled ? "" : " is-later"}"><p class="ib-grp-h">${ic("shield")}Lawful basis</p>${basis}</section>
        </div>
      </div>
      <div class="ib-sh-f"><span>Only <b>With</b> and <b>About</b> are required. Everything else can wait.</span>
        <a href="#" class="st-btn is-ghost is-sm">Cancel</a>
        <span class="th-keys"><kbd>⌘</kbd><kbd>↵</kbd></span>
        <a href="#" class="st-btn is-primary${filled ? "" : " is-off"}"${filled ? "" : ' aria-disabled="true"'}>Start conversation<span class="st-btn-ic">${I.arrowR}</span></a></div>
    </div>`;
  }
  const nextReview = "Mon 2 Nov, 9:00";

  // ---------- css ----------
  const css = `
.f-inbox .th-main { margin-top: 26px; }
.f-inbox ol { list-style: none; margin: 0; padding: 0; }
.f-inbox .st-nav a { display: inline-flex; align-items: center; gap: 8px; }
.f-inbox .th-navn { font: 600 11px/1 var(--st-body); padding: 3px 7px; border-radius: 999px; background: var(--st-accent); color: #fff; }
.f-inbox kbd { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 6px; font: 600 10.5px/1 var(--st-body); color: var(--st-muted); background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.1), inset 0 -1.5px 0 rgba(21,24,29,.08); }
.f-inbox .st-btn.is-ink.is-sm, .f-inbox .st-btn.is-primary.is-sm { padding-right: 4px; }
.f-inbox .st-btn.is-sm .st-btn-ic { width: 26px; height: 26px; }
.f-inbox .st-btn.is-sm .st-btn-ic svg { width: 14px; height: 14px; }
.f-inbox .st-btn .st-i { width: 15px; height: 15px; }
.f-inbox .th-shell { display: grid; grid-template-columns: 228px minmax(0, 1fr); gap: 16px; align-items: stretch; }
.f-inbox .th-core { display: grid; grid-template-columns: 372px minmax(0, 1fr); min-height: 860px; overflow: hidden; }
.f-inbox .th-core.is-one { grid-template-columns: minmax(0, 1fr); }
.f-inbox .th-core.is-review { grid-template-columns: 280px minmax(0, 1fr); }

/* rail */
.f-inbox .th-side { display: flex; flex-direction: column; gap: 6px; padding-top: 7px; min-width: 0; }
.f-inbox .th-new { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: 999px; background: var(--st-ink); color: #fff; font: 500 13.5px/1 var(--st-body); box-shadow: inset 0 1px 0 rgba(255,255,255,.16), 0 10px 22px -12px rgba(16,24,40,.7); margin-bottom: 10px; }
.f-inbox .th-new .st-i { width: 15px; height: 15px; }
.f-inbox .th-side-h { font: 500 12px/1 var(--st-body); color: var(--st-faint); padding: 12px 12px 6px; }
.f-inbox .th-folders { display: flex; flex-direction: column; gap: 2px; }
.f-inbox .th-folders li { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 16px; color: var(--st-muted); }
.f-inbox .th-folders li .st-i { width: 17px; height: 17px; }
.f-inbox .th-folders li.is-on { background: var(--st-surface); color: var(--st-ink); box-shadow: var(--st-shadow), 0 0 0 1px var(--st-hair); }
.f-inbox .th-folders li.is-on .st-i { color: var(--st-accent); }
.f-inbox .th-f-t { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.f-inbox .th-f-t b { font: 600 13.5px/1.2 var(--st-body); color: var(--st-ink); }
.f-inbox .th-f-t small { font: 400 11.5px/1.25 var(--st-body); color: var(--st-faint); }
.f-inbox .th-folders li.is-on .th-f-t small { color: var(--st-muted); }
.f-inbox .th-f-n { font: 600 12px/1 var(--st-body); color: var(--st-muted); font-variant-numeric: tabular-nums; }
.f-inbox .th-folders li.is-on .th-f-n { color: #fff; background: var(--st-ink); padding: 4px 8px; border-radius: 999px; }
.f-inbox .th-folders li.is-won .th-f-n { color: var(--st-accent); }
.f-inbox .th-pipe { margin-top: auto; padding: 16px 14px; border-radius: 20px; background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.8), 0 0 0 1px var(--st-hair); display: flex; flex-direction: column; gap: 4px; }
.f-inbox .th-pipe span { font: 500 12px var(--st-body); color: var(--st-muted); }
.f-inbox .th-pipe b { font: 600 22px/1.1 var(--st-display); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.f-inbox .th-pipe small { font: 400 11.5px/1.3 var(--st-body); color: var(--st-faint); }

/* the review entry: a folder that is a ritual. Ticks = the deals it will walk through */
.f-inbox .ib-rev { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; grid-template-rows: auto auto auto; gap: 2px 10px; align-items: center; padding: 12px 12px 13px; border-radius: 18px; background: rgba(255,255,255,.6); box-shadow: inset 0 0 0 1px rgba(255,255,255,.85), 0 0 0 1px var(--st-hair); }
.f-inbox .ib-rev-ic { grid-row: 1 / 3; width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; background: var(--st-amber-soft); color: var(--st-amber); }
.f-inbox .ib-rev-ic .st-i { width: 16px; height: 16px; }
.f-inbox .ib-rev > b { font: 600 13.5px/1.2 var(--st-body); }
.f-inbox .ib-rev > small { grid-column: 2 / -1; font: 500 11.5px/1.3 var(--st-body); color: var(--st-amber); }
.f-inbox .ib-rev-tag { font: 600 10.5px/1 var(--st-body); padding: 4px 7px; border-radius: 999px; background: rgba(21,24,29,.06); color: var(--st-muted); white-space: nowrap; }
.f-inbox .ib-ticks { grid-column: 1 / -1; display: flex; gap: 3px; margin-top: 10px; }
.f-inbox .ib-ticks i { flex: 1; height: 5px; border-radius: 999px; background: rgba(21,24,29,.1); }
.f-inbox .ib-ticks i.is-look { background: rgba(161,92,7,.5); }
.f-inbox .ib-ticks i.is-done { background: var(--st-accent); }
.f-inbox .ib-ticks i.is-now { background: var(--st-ink); flex: 2.2; }
.f-inbox .ib-rev.is-on { background: var(--st-surface); box-shadow: var(--st-shadow), 0 0 0 1.5px rgba(11,116,128,.4); }
.f-inbox .ib-rev.is-progress .ib-rev-ic { background: var(--st-ink); color: #fff; }
.f-inbox .ib-rev.is-progress > small { color: var(--st-muted); }
.f-inbox .ib-rev.is-done .ib-rev-ic { background: var(--st-accent-soft); color: var(--st-accent); }
.f-inbox .ib-rev.is-done > small { color: #0a5560; }

/* thread list */
.f-inbox .th-list, .f-inbox .ib-queue { border-right: 1px solid rgba(21,24,29,.06); background: #fafbfc; display: flex; flex-direction: column; min-width: 0; }
.f-inbox .th-list-h { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 12px; }
.f-inbox .th-list-h h2 { font: 600 20px/1.1 var(--st-display); letter-spacing: -0.025em; }
.f-inbox .th-sort { display: inline-flex; align-items: center; gap: 4px; font: 500 12px var(--st-body); color: var(--st-muted); }
.f-inbox .th-sort .st-i { width: 14px; height: 14px; }
.f-inbox .th-search { margin: 0 14px 10px; display: flex; align-items: center; gap: 9px; height: 38px; padding: 0 14px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.07); font: 400 13px var(--st-body); color: var(--st-faint); }
.f-inbox .th-search .st-i { width: 15px; height: 15px; color: var(--st-muted); }
.f-inbox .th-search kbd { margin-left: auto; }
.f-inbox .th-list ul { padding: 0 8px; display: flex; flex-direction: column; gap: 2px; }
.f-inbox .th-row { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 12px; padding: 14px 12px; border-radius: 18px; position: relative; }
.f-inbox .th-row + .th-row::before { content: ""; position: absolute; left: 58px; right: 12px; top: -1px; height: 1px; background: rgba(21,24,29,.05); }
.f-inbox .th-row .st-av { width: 34px; height: 34px; font-size: 11.5px; }
.f-inbox .th-row.is-sel { background: var(--st-surface); box-shadow: 0 0 0 1px rgba(11,116,128,.22), 0 10px 24px -16px rgba(16,24,40,.35); }
.f-inbox .th-row.is-sel::before, .f-inbox .th-row.is-sel + .th-row::before { display: none; }
.f-inbox .th-row-b { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.f-inbox .th-row-t { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.f-inbox .th-row-t b { font: 600 13.5px/1.2 var(--st-body); white-space: nowrap; }
.f-inbox .th-row.is-unread .th-row-t b::after { content: ""; display: inline-block; width: 7px; height: 7px; margin-left: 7px; border-radius: 50%; background: var(--st-accent); vertical-align: 1px; }
.f-inbox .th-co { font: 400 12px var(--st-body); color: var(--st-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.f-inbox .th-row-t time { margin-left: auto; font: 500 11.5px var(--st-body); color: var(--st-faint); white-space: nowrap; }
.f-inbox .th-row-l { font: 500 13px/1.3 var(--st-body); color: #2c313a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .th-row-n { display: flex; align-items: center; gap: 6px; font: 400 12.5px/1.3 var(--st-body); color: var(--st-muted); min-width: 0; }
.f-inbox .th-row-n > span:not(.th-due) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.f-inbox .th-row-n .st-i { width: 13px; height: 13px; color: var(--st-faint); }
.f-inbox .th-row-n.is-unowned { color: var(--st-amber); font-weight: 500; }
.f-inbox .th-row-n.is-unowned .st-i { color: var(--st-amber); }
.f-inbox .th-row-f { display: flex; align-items: center; gap: 8px; margin-top: 3px; min-width: 0; }
.f-inbox .ib-own { margin-left: auto; display: inline-flex; }
.f-inbox .ib-own .st-av, .f-inbox .st-av.is-xs { width: 22px; height: 22px; font-size: 9.5px; }
.f-inbox .ib-new { font: 500 11px/1 var(--st-body); color: #075a63; background: var(--st-accent-soft); padding: 4px 8px; border-radius: 999px; white-space: nowrap; }
.f-inbox .th-amt { font: 600 12.5px/1 var(--st-display); font-variant-numeric: tabular-nums; }
.f-inbox .th-stage { display: inline-flex; align-items: center; gap: 6px; font: 500 11.5px/1 var(--st-body); color: var(--st-muted); padding: 5px 9px; border-radius: 999px; background: #eff1f3; white-space: nowrap; }
.f-inbox .th-stage::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: rgba(21,24,29,.3); }
.f-inbox .th-stage.is-ink { background: var(--st-ink); color: #fff; }
.f-inbox .th-stage.is-ink::before { background: var(--st-accent); box-shadow: 0 0 0 2px rgba(255,255,255,.2); }
.f-inbox .th-stage.is-won { background: var(--st-accent-soft); color: #075a63; }
.f-inbox .th-stage.is-won::before { background: var(--st-accent); }
.f-inbox .th-due { flex: none; margin-left: auto; font: 500 11px/1 var(--st-body); color: var(--st-muted); padding: 4px 8px; border-radius: 999px; background: #eff1f3; white-space: nowrap; }
.f-inbox .th-due.is-late { color: var(--st-amber); background: var(--st-amber-soft); }
.f-inbox .th-due.is-today { color: #075a63; background: var(--st-accent-soft); }
.f-inbox .th-due.is-none { color: var(--st-faint); background: transparent; box-shadow: inset 0 0 0 1px rgba(21,24,29,.08); }
.f-inbox .th-list-f { margin: auto 20px 18px; padding-top: 16px; font: 400 12px/1.45 var(--st-body); color: var(--st-faint); }

/* thread */
.f-inbox .th-thread { display: flex; flex-direction: column; min-width: 0; position: relative; }
.f-inbox .th-head { display: grid; grid-template-columns: 46px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 20px 24px 16px; border-bottom: 1px solid rgba(21,24,29,.05); }
.f-inbox .th-av-lg { width: 46px; height: 46px; border-radius: 16px; font-size: 14px; background: linear-gradient(160deg, #e6f3f4, #cfe7e9); }
.f-inbox .th-head-t { min-width: 0; }
.f-inbox .th-head h2 { font: 600 21px/1.15 var(--st-display); letter-spacing: -0.025em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .th-head p { margin-top: 4px; font: 400 13px var(--st-body); color: var(--st-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .th-deal { display: grid; grid-template-columns: auto auto auto; gap: 4px 10px; align-items: center; justify-items: end; text-align: right; }
.f-inbox .th-deal b { font: 600 18px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.f-inbox .th-deal small { grid-column: 1 / -1; font: 400 12px var(--st-body); color: var(--st-faint); }
.f-inbox .th-deal small.ib-late { color: var(--st-amber); font-weight: 500; }
.f-inbox .th-owe { position: relative; display: flex; align-items: center; gap: 10px; margin: 12px 24px 0; padding: 10px 10px 10px 14px; border-radius: 16px; background: #f5f6f8; font: 400 13px/1.35 var(--st-body); color: #2c313a; }
.f-inbox .th-owe > .st-i { width: 15px; height: 15px; color: var(--st-accent); flex: none; }
.f-inbox .th-owe b { font-weight: 600; }
.f-inbox .th-owe .th-due { margin-left: auto; }
.f-inbox .th-owe.is-late { background: #fffaf2; box-shadow: inset 0 0 0 1px rgba(161,92,7,.14); }
.f-inbox .th-owe.is-late > .st-i { color: var(--st-amber); }
.f-inbox .th-owe.is-unowned { background: #fffaf2; box-shadow: inset 0 0 0 1px rgba(161,92,7,.18); }
.f-inbox .th-owe.is-unowned > .st-i { color: var(--st-amber); }
.f-inbox .ib-uo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.f-inbox .ib-uo b { font-weight: 600; }
.f-inbox .ib-uo small { font: 400 12px/1.35 var(--st-body); color: var(--st-muted); }
.f-inbox .th-owe.is-review { background: #fffaf2; box-shadow: inset 0 0 0 1px rgba(161,92,7,.16); flex-wrap: wrap; }
.f-inbox .th-owe.is-review > .st-i { color: var(--st-amber); }
.f-inbox .th-owe .rv-whys { margin: 0; }
.f-inbox .th-mini { display: inline-flex; align-items: center; gap: 6px; font: 500 12px/1 var(--st-body); padding: 8px 12px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08); white-space: nowrap; }
.f-inbox .th-mini .st-i { width: 13px; height: 13px; color: var(--st-muted); }
.f-inbox .th-msgs { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 18px 24px 20px; }
.f-inbox .th-day { display: flex; align-items: center; gap: 12px; margin: 6px 0 2px; font: 500 11.5px var(--st-body); color: var(--st-faint); }
.f-inbox .th-day::before, .f-inbox .th-day::after { content: ""; flex: 1; height: 1px; background: rgba(21,24,29,.06); }
.f-inbox .th-msg { max-width: 80%; display: flex; flex-direction: column; gap: 6px; }
.f-inbox .th-msg-h { display: flex; align-items: center; gap: 8px; font: 400 12px var(--st-body); color: var(--st-faint); flex-wrap: wrap; }
.f-inbox .th-msg-h b { font: 600 12.5px var(--st-body); color: var(--st-ink); }
.f-inbox .th-msg-h .st-src { font-size: 11.5px; padding: 3px 8px; }
.f-inbox .ib-ch { display: inline-flex; align-items: center; gap: 5px; font: 400 12px var(--st-body); color: var(--st-faint); }
.f-inbox .ib-ch .st-i { width: 13px; height: 13px; }
.f-inbox .th-msg p { padding: 12px 16px; border-radius: 20px; font: 400 14px/1.5 var(--st-body); }
.f-inbox .th-msg.is-in p { background: #f3f4f6; color: #22262d; border-top-left-radius: 6px; }
.f-inbox .th-msg.is-out { align-self: flex-end; align-items: flex-end; }
.f-inbox .th-msg.is-out p { background: var(--st-ink); color: #f4f6f8; border-top-right-radius: 6px; box-shadow: 0 10px 22px -16px rgba(16,24,40,.8); }
.f-inbox .th-log { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 12px; padding: 12px 14px; border-radius: 18px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(11,116,128,.16), 0 8px 18px -14px rgba(16,24,40,.3); }
.f-inbox .th-log-ic { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; background: var(--st-accent-soft); color: var(--st-accent); }
.f-inbox .th-log-ic .st-i { width: 15px; height: 15px; }
.f-inbox .th-log-h { display: flex; gap: 8px; align-items: baseline; font: 400 12px var(--st-body); color: var(--st-faint); }
.f-inbox .th-log-h b { font: 600 12.5px var(--st-body); color: var(--st-ink); }
.f-inbox .th-log-h time { margin-left: auto; }
.f-inbox .th-log p { margin-top: 5px; font: 400 13.5px/1.5 var(--st-body); color: #2c313a; }
.f-inbox .th-sys { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; font: 400 12.5px var(--st-body); color: var(--st-muted); padding: 2px 0; text-align: center; }
.f-inbox .th-sys .st-i { width: 14px; height: 14px; color: var(--st-faint); }
.f-inbox .th-sys.is-warn { color: var(--st-rose); }
.f-inbox .th-sys.is-warn .st-i { color: var(--st-rose); }
.f-inbox .th-sys.is-warn b { font-weight: 600; }
.f-inbox .th-chip { font: 500 12px/1 var(--st-body); padding: 5px 9px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08); color: var(--st-ink); white-space: nowrap; }
.f-inbox .th-chip.is-to { background: var(--st-ink); color: #fff; box-shadow: none; }
.f-inbox .th-sys time { color: var(--st-faint); }
.f-inbox .th-earlier { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 16px; background: #f7f8f9; box-shadow: inset 0 0 0 1px var(--st-hair); font: 400 12.5px/1.4 var(--st-body); color: var(--st-muted); }
.f-inbox .th-earlier b { font-weight: 600; color: var(--st-ink); white-space: nowrap; }
.f-inbox .th-earlier .st-i { width: 14px; height: 14px; color: var(--st-faint); }
.f-inbox .ib-quiet { display: flex; align-items: center; gap: 12px; margin: 4px 0; font: 500 12px var(--st-body); color: var(--st-amber); }
.f-inbox .ib-quiet::before, .f-inbox .ib-quiet::after { content: ""; flex: 1; border-top: 1.5px dashed rgba(161,92,7,.3); }
.f-inbox .ib-revev { align-self: center; display: inline-flex; align-items: center; flex-wrap: wrap; justify-content: center; gap: 6px 8px; padding: 8px 14px; border-radius: 14px; background: var(--st-accent-soft); box-shadow: inset 0 0 0 1px rgba(11,116,128,.14); font: 400 12.5px/1.3 var(--st-body); color: #0a5560; }
.f-inbox .ib-revev > .st-i { width: 15px; height: 15px; color: var(--st-accent); }
.f-inbox .ib-revev b { font-weight: 600; color: #075a63; }
.f-inbox .ib-revev s { color: rgba(10,85,96,.6); text-decoration-color: rgba(10,85,96,.4); }
.f-inbox .ib-revev em { font-style: normal; font-weight: 600; color: #075a63; }
.f-inbox .ib-revev time { color: rgba(10,85,96,.65); }
.f-inbox .ib-revev.is-hl { box-shadow: inset 0 0 0 1.5px rgba(11,116,128,.45), 0 0 0 5px rgba(11,116,128,.08); }

/* website form submission */
.f-inbox .ib-form { max-width: 88%; display: flex; flex-direction: column; gap: 12px; padding: 14px 16px 16px; border-radius: 6px 22px 22px 22px; background: #fffaf2; box-shadow: inset 0 0 0 1px rgba(161,92,7,.16); }
.f-inbox .ib-form-h { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font: 400 12px var(--st-body); color: var(--st-faint); }
.f-inbox .ib-form-h b { font: 600 12.5px var(--st-body); color: var(--st-ink); }
.f-inbox .ib-form-h time { margin-left: auto; }
.f-inbox .ib-form-h .st-src { font-size: 11.5px; padding: 3px 8px; }
.f-inbox .ib-form-msg { padding: 12px 16px; border-radius: 16px; background: var(--st-surface); font: 400 14px/1.5 var(--st-body); color: #22262d; box-shadow: 0 0 0 1px rgba(21,24,29,.05); }
.f-inbox .ib-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; padding: 0 4px; }
.f-inbox .ib-fields dt { font: 400 11.5px var(--st-body); color: var(--st-faint); }
.f-inbox .ib-fields dd { margin: 3px 0 0; font: 500 13px/1.3 var(--st-body); color: var(--st-ink); overflow-wrap: anywhere; }
.f-inbox .ib-consent { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 10px; align-items: start; padding: 11px 13px; border-radius: 14px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.06); }
.f-inbox .ib-cbox { width: 18px; height: 18px; border-radius: 6px; background: var(--st-accent); color: #fff; display: grid; place-items: center; margin-top: 1px; }
.f-inbox .ib-cbox .st-i { width: 12px; height: 12px; }
.f-inbox .ib-cbox svg { stroke-width: 2.2; }
.f-inbox .ib-consent b { display: block; font: 500 13px/1.4 var(--st-body); }
.f-inbox .ib-consent small { display: block; margin-top: 3px; font: 400 12px/1.4 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-unver { display: flex; align-items: center; gap: 7px; font: 400 12px/1.4 var(--st-body); color: var(--st-amber); padding: 0 4px; }
.f-inbox .ib-unver .st-i { width: 14px; height: 14px; }


/* composer */
.f-inbox .th-comp { margin: 0 20px 20px; border-radius: 22px; background: #f5f6f8; padding: 6px; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-inbox .th-comp-in { min-height: 60px; border-radius: 17px; background: var(--st-surface); padding: 14px 16px; font: 400 14px/1.5 var(--st-body); color: var(--st-faint); box-shadow: 0 0 0 1px rgba(21,24,29,.05), 0 2px 6px -3px rgba(16,24,40,.12); }
.f-inbox .th-comp-in kbd { margin: 0 2px; vertical-align: 1px; }
.f-inbox .th-comp-f { display: flex; align-items: center; gap: 8px; padding: 8px 4px 2px 6px; }
.f-inbox .th-slashes { display: flex; gap: 2px; flex-wrap: wrap; min-width: 0; }
.f-inbox .th-slashes > span { display: inline-flex; align-items: center; gap: 5px; padding: 7px 8px; border-radius: 999px; font: 500 12px/1 var(--st-body); color: var(--st-muted); }
.f-inbox .th-slashes .st-i { width: 13px; height: 13px; }
.f-inbox .th-comp-f .st-btn { margin-left: auto; flex: none; }
.f-inbox .ib-hint { display: flex; align-items: center; gap: 10px; margin: -8px 22px 18px; padding: 10px 12px; border-radius: 14px; border: 1px dashed rgba(21,24,29,.14); font: 400 12px/1.45 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-hint > .st-i { width: 15px; height: 15px; color: var(--st-faint); }
.f-inbox .ib-hint b { font-weight: 600; color: #2c313a; }
.f-inbox .ib-hint a { margin-left: auto; flex: none; font: 500 12px var(--st-body); color: var(--st-accent); white-space: nowrap; }

/* composer, mid-action */
.f-inbox .th-comp.is-active { position: relative; background: var(--st-surface); padding: 0; box-shadow: 0 0 0 1.5px rgba(11,116,128,.55), 0 0 0 6px rgba(11,116,128,.1), 0 24px 48px -24px rgba(16,24,40,.35); }
.f-inbox .th-c-top { display: flex; align-items: center; gap: 10px; padding: 14px 16px 0; flex-wrap: wrap; }
.f-inbox .th-token { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 12px 0 10px; border-radius: 999px; background: var(--st-accent); color: #fff; font: 600 12.5px/1 var(--st-body); }
.f-inbox .th-token .st-i { width: 14px; height: 14px; }
.f-inbox .th-with { font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-inbox .th-oc { margin-left: auto; flex: none; display: inline-flex; padding: 3px; border-radius: 999px; background: #f2f3f5; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-inbox .th-oc span { height: 28px; display: inline-flex; align-items: center; padding: 0 11px; border-radius: 999px; font: 500 12px/1 var(--st-body); color: var(--st-muted); }
.f-inbox .th-oc span.is-on { background: var(--st-surface); color: var(--st-ink); box-shadow: 0 1px 2px rgba(16,24,40,.08), 0 4px 10px -4px rgba(16,24,40,.14); }
.f-inbox .th-c-text { padding: 12px 16px 14px; font: 400 14.5px/1.55 var(--st-body); color: var(--st-ink); }
.f-inbox .ib-typed { display: inline-block; margin-top: 6px; padding: 1px 6px; border-radius: 6px; background: var(--st-accent-soft); color: #075a63; font-weight: 600; }
.f-inbox .th-caret { display: inline-block; width: 1.5px; height: 18px; margin-left: 2px; vertical-align: -3px; background: var(--st-accent); }
.f-inbox .th-sugg { margin: 0 8px; padding: 12px 8px 10px; border-top: 1px solid rgba(21,24,29,.06); display: flex; flex-direction: column; gap: 6px; }
.f-inbox .th-sugg-h { display: flex; align-items: center; gap: 6px; font: 500 12px var(--st-body); color: var(--st-faint); padding: 0 6px 2px; }
.f-inbox .th-sg { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 16px; background: #f6f8f9; }
.f-inbox .th-sg.is-on { background: #eef6f7; box-shadow: inset 0 0 0 1px rgba(11,116,128,.16); }
.f-inbox .th-sg.is-focus { background: var(--st-surface); box-shadow: 0 0 0 1.5px rgba(11,116,128,.45), 0 8px 18px -14px rgba(16,24,40,.35); }
.f-inbox .th-tick { width: 20px; height: 20px; border-radius: 7px; display: grid; place-items: center; background: var(--st-accent); color: #fff; }
.f-inbox .th-tick.is-off { background: var(--st-surface); box-shadow: inset 0 0 0 1.4px rgba(21,24,29,.22); }
.f-inbox .th-tick .st-i { width: 13px; height: 13px; }
.f-inbox .th-tick svg { stroke-width: 2; }
.f-inbox .th-sg-t { min-width: 0; }
.f-inbox .th-sg-t b { display: block; font: 600 13.5px/1.3 var(--st-body); }
.f-inbox .th-sg-t small { display: block; margin-top: 2px; font: 400 12px/1.35 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-acc { display: inline-flex; align-items: center; gap: 6px; font: 500 12px/1 var(--st-body); color: var(--st-muted); white-space: nowrap; }
.f-inbox .ib-acc.is-ok { color: #0a5560; }
.f-inbox .ib-acc .st-i { width: 13px; height: 13px; }
.f-inbox .th-dates { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.f-inbox .th-dates > span { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08); font: 500 12.5px/1 var(--st-body); color: #2c313a; white-space: nowrap; }
.f-inbox .th-dates small { font: 400 12px var(--st-body); color: var(--st-faint); }
.f-inbox .th-dates > span.is-on { background: var(--st-accent); color: #fff; box-shadow: 0 0 0 3px rgba(11,116,128,.14); }
.f-inbox .th-dates > span.is-on small { color: rgba(255,255,255,.8); }
.f-inbox .th-c-f { display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 18px; margin-top: 4px; border-top: 1px solid rgba(21,24,29,.06); background: #fafbfc; border-radius: 0 0 22px 22px; }
.f-inbox .th-c-f > span:first-child { font: 400 12px/1.4 var(--st-body); color: var(--st-muted); min-width: 0; }
.f-inbox .th-keys { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font: 400 12px var(--st-body); color: var(--st-faint); white-space: nowrap; }
.f-inbox .th-keys i { width: 8px; }
.f-inbox .th-c-f .st-btn { flex: none; }
/* slash menu: opens above the composer, like a chat app's command list */
.f-inbox .ib-slash { position: absolute; left: 14px; bottom: calc(100% + 10px); width: 372px; padding: 6px; border-radius: 20px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08), 0 28px 56px -18px rgba(16,24,40,.4); z-index: 4; }
.f-inbox .ib-slash-h { display: flex; align-items: center; gap: 5px; padding: 8px 10px 6px; font: 500 11.5px var(--st-body); color: var(--st-faint); }
.f-inbox .ib-slash-h span:first-child { margin-right: auto; }
.f-inbox .ib-slash-h kbd { min-width: 18px; height: 18px; font-size: 10px; }
.f-inbox .ib-slash li { display: grid; grid-template-columns: 28px 56px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 13px; font: 400 12.5px/1.3 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-slash li > .st-i { width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; background: #f2f3f5; color: var(--st-ink); padding: 6px; }
.f-inbox .ib-slash li b { font: 600 13px var(--st-body); color: var(--st-ink); }
.f-inbox .ib-slash li.is-on { background: var(--st-accent-soft); color: #0a5560; }
.f-inbox .ib-slash li.is-on > .st-i { background: var(--st-accent); color: #fff; }
.f-inbox .ib-slash li.is-on b { color: #075a63; }
.f-inbox .ib-slash li.is-used b, .f-inbox .ib-slash li.is-used { color: var(--st-faint); }
.f-inbox .ib-slash li em { font-style: normal; display: inline-flex; align-items: center; gap: 4px; font: 500 11.5px var(--st-body); color: var(--st-accent); }
.f-inbox .ib-slash li em .st-i { width: 13px; height: 13px; }

/* review: start (the folder opened) */
.f-inbox .ib-pad { padding: 26px 28px 28px; }
.f-inbox .ib-rs-h { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: end; }
.f-inbox .ib-kicker { display: inline-flex; align-items: center; gap: 8px; font: 500 12.5px var(--st-body); color: var(--st-amber); }
.f-inbox .ib-kicker .st-i { width: 16px; height: 16px; }
.f-inbox .ib-kicker.is-done { color: #0a5560; }
.f-inbox .ib-rs-h h2 { margin-top: 12px; font: 600 40px/1.05 var(--st-display); letter-spacing: -0.035em; }
.f-inbox .ib-rs-h h2 span { color: var(--st-faint); }
.f-inbox .ib-lede { margin-top: 12px; max-width: 58ch; font: 400 15px/1.55 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-lede b { color: var(--st-ink); font-weight: 600; }
.f-inbox .ib-go { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.f-inbox .ib-go-row { display: flex; align-items: center; gap: 8px; }
.f-inbox .ib-go .st-btn.is-primary.is-lg { height: 52px; padding-left: 24px; font-size: 15px; }
.f-inbox .ib-go .st-btn.is-lg .st-btn-ic { width: 40px; height: 40px; }
.f-inbox .ib-go-k { display: inline-flex; align-items: center; gap: 6px; font: 400 12.5px var(--st-body); color: var(--st-faint); }
.f-inbox .ib-rs-grid { margin-top: 26px; display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 18px; align-items: start; }
.f-inbox .ib-sec { padding: 18px 20px 20px; border-radius: 22px; background: #f7f8f9; box-shadow: inset 0 0 0 1px var(--st-hair); min-width: 0; }
.f-inbox .ib-sec.is-plain { background: transparent; box-shadow: none; padding: 4px 0 0; }
.f-inbox .ib-sec-h { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.f-inbox .ib-sec-h h3 { font: 600 16px/1.2 var(--st-display); letter-spacing: -0.015em; }
.f-inbox .ib-sec-h .st-n { font-family: var(--st-body); }
.f-inbox .ib-sec-h small { margin-left: auto; font: 400 12px var(--st-body); color: var(--st-faint); text-align: right; }
.f-inbox .ib-sec-h a { margin-left: auto; font: 500 12.5px var(--st-body); color: var(--st-accent); display: inline-flex; gap: 5px; align-items: center; }
.f-inbox .ib-sec-h a .st-i { width: 14px; height: 14px; }
.f-inbox .ib-looks { display: flex; flex-direction: column; gap: 6px; }
.f-inbox .ib-looks li { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 14px; border-radius: 18px; background: #f7f8f9; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-inbox .ib-looks li:first-child { background: var(--st-surface); box-shadow: 0 0 0 1px rgba(11,116,128,.25), 0 14px 28px -18px rgba(16,24,40,.35); }
.f-inbox .rv-num { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font: 600 12px/1 var(--st-display); color: var(--st-muted); background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08); }
.f-inbox .ib-looks li:first-child .rv-num { background: var(--st-accent); color: #fff; box-shadow: none; }
.f-inbox .ib-looks b { font: 600 14px/1.3 var(--st-body); }
.f-inbox .ib-looks p { margin-top: 3px; font: 400 12.5px/1.35 var(--st-body); color: var(--st-muted); }
.f-inbox .rv-whys { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.f-inbox .rv-why { display: inline-flex; align-items: center; gap: 5px; font: 500 11.5px/1 var(--st-body); color: var(--st-muted); padding: 5px 9px; border-radius: 999px; background: #eceef1; white-space: nowrap; }
.f-inbox .rv-why .st-i { width: 12px; height: 12px; }
.f-inbox .rv-why.is-date { color: var(--st-amber); background: var(--st-amber-soft); }
.f-inbox .rv-amt { font: 600 15px/1.2 var(--st-display); letter-spacing: -0.01em; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.f-inbox .rv-amt small { display: block; margin-top: 4px; font: 400 11.5px var(--st-body); color: var(--st-faint); letter-spacing: 0; }
.f-inbox .ib-3q { display: flex; flex-direction: column; gap: 12px; counter-reset: q; }
.f-inbox .ib-3q li { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 10px; counter-increment: q; }
.f-inbox .ib-3q li::before { content: counter(q); width: 24px; height: 24px; border-radius: 8px; display: grid; place-items: center; font: 600 12px/1 var(--st-display); background: var(--st-ink); color: #fff; }
.f-inbox .ib-3q b { display: block; font: 600 14px/1.3 var(--st-body); margin-top: 3px; }
.f-inbox .ib-3q small { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; font: 400 12.5px/1.4 var(--st-body); color: var(--st-muted); }
.f-inbox .rv-ans { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px 4px 5px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.07); font: 500 12px/1 var(--st-body); color: #2c313a; }
.f-inbox .rv-ans kbd { min-width: 18px; height: 18px; font-size: 10px; border-radius: 5px; padding: 0 4px; }
.f-inbox .ib-fine { margin-top: 10px; display: flex; flex-direction: column; }
.f-inbox .ib-fine li { display: flex; justify-content: space-between; gap: 8px; font: 400 12.5px/1.75 var(--st-body); color: #2c313a; min-width: 0; }
.f-inbox .ib-fine li span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .ib-fine li em { font-style: normal; color: var(--st-faint); font-variant-numeric: tabular-nums; white-space: nowrap; }
.f-inbox .ib-sec > p { font: 400 13px/1.5 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-sec > p b { color: var(--st-ink); font-weight: 600; }
.f-inbox .rv-now { margin-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 16px; background: var(--st-accent-soft); color: #075a63; font: 500 13px var(--st-body); }
.f-inbox .rv-now b { font: 600 18px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.f-inbox .ib-foot { margin-top: 18px; font: 400 13px/1.5 var(--st-body); color: var(--st-faint); }

/* review: in progress */
.f-inbox .rv-bar { display: flex; align-items: center; gap: 14px; padding: 6px 6px 6px 18px; border-radius: 999px; background: rgba(255,255,255,.85); box-shadow: 0 0 0 1px var(--st-hair), 0 10px 30px -12px rgba(16,24,40,.18), inset 0 1px 0 #fff; }
.f-inbox .rv-bar > b { display: inline-flex; align-items: center; gap: 8px; font: 600 13.5px/1 var(--st-body); white-space: nowrap; }
.f-inbox .rv-bar > b .st-i { width: 16px; height: 16px; color: var(--st-accent); }
.f-inbox .rv-ticks { display: flex; gap: 3px; }
.f-inbox .rv-ticks i { width: 14px; height: 6px; border-radius: 999px; background: rgba(21,24,29,.1); }
.f-inbox .rv-ticks i.is-done { background: var(--st-accent); }
.f-inbox .rv-ticks i.is-now { background: var(--st-ink); width: 26px; }
.f-inbox .rv-bar > span:not(.rv-ticks) { font: 600 13px/1 var(--st-body); color: var(--st-ink); white-space: nowrap; font-variant-numeric: tabular-nums; }
.f-inbox .rv-pause { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 6px 0 9px; border-radius: 999px; background: var(--st-ink); color: #fff; font: 500 12.5px/1 var(--st-body); }
.f-inbox .rv-pause .st-i { width: 14px; height: 14px; }
.f-inbox .rv-pause kbd { background: rgba(255,255,255,.14); color: #fff; box-shadow: none; }
.f-inbox .ib-queue .th-list-h { padding-bottom: 8px; }
.f-inbox .rv-rail { padding: 0 8px; display: flex; flex-direction: column; gap: 2px; }
.f-inbox .rv-rail h3 { font: 500 12px/1 var(--st-body); color: var(--st-faint); padding: 14px 12px 8px; }
.f-inbox .rv-ri { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 10px; align-items: start; padding: 9px 12px; border-radius: 14px; }
.f-inbox .rv-dot { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; box-shadow: inset 0 0 0 1.4px rgba(21,24,29,.18); margin-top: 1px; }
.f-inbox .rv-ri.is-done .rv-dot { background: var(--st-accent); box-shadow: none; color: #fff; }
.f-inbox .rv-ri.is-done .rv-dot .st-i { width: 12px; height: 12px; }
.f-inbox .rv-ri.is-done .rv-dot svg { stroke-width: 2.2; }
.f-inbox .rv-ri.is-now { background: var(--st-surface); box-shadow: 0 0 0 1px rgba(11,116,128,.22), 0 10px 24px -16px rgba(16,24,40,.35); }
.f-inbox .rv-ri.is-now .rv-dot { box-shadow: inset 0 0 0 6px var(--st-ink); }
.f-inbox .rv-ri b { display: block; font: 500 13px/1.3 var(--st-body); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .rv-ri.is-now b { font-weight: 600; }
.f-inbox .rv-ri small { display: block; margin-top: 2px; font: 400 11.5px/1.3 var(--st-body); color: var(--st-faint); }
.f-inbox .rv-ri.is-done small { color: #0a5560; }
.f-inbox .rv-ri.is-done small.is-lost { color: var(--st-rose); }
.f-inbox .rv-ri.is-fine { padding-block: 5px; }
.f-inbox .rv-ri.is-fine .rv-dot { width: 8px; height: 8px; margin: 5px 6px; box-shadow: none; background: rgba(21,24,29,.15); }
.f-inbox .rv-ri.is-fine b { font-weight: 400; color: var(--st-muted); }
.f-inbox .ib-queue-f { margin: auto 16px 16px; padding: 14px; border-radius: 16px; background: var(--st-accent-soft); color: #0a5560; display: flex; flex-direction: column; gap: 4px; }
.f-inbox .ib-queue-f span { font: 500 12px var(--st-body); }
.f-inbox .ib-queue-f b { font: 600 16px/1.2 var(--st-display); letter-spacing: -0.02em; color: #075a63; font-variant-numeric: tabular-nums; }
.f-inbox .ib-queue-f small { font: 400 11.5px var(--st-body); }
/* the dock: the three questions sit where the composer usually is */
.f-inbox .ib-dock { margin: 0 20px 20px; border-radius: 22px; background: var(--st-surface); box-shadow: 0 0 0 1.5px rgba(11,116,128,.55), 0 0 0 6px rgba(11,116,128,.1), 0 24px 48px -24px rgba(16,24,40,.35); }
.f-inbox .ib-dock-h { display: flex; align-items: center; gap: 10px; padding: 14px 18px 12px; border-bottom: 1px solid rgba(21,24,29,.06); }
.f-inbox .ib-dock-h > .st-i { width: 18px; height: 18px; color: var(--st-accent); }
.f-inbox .ib-dock-h b { font: 600 14.5px/1.2 var(--st-display); letter-spacing: -0.01em; }
.f-inbox .ib-dock-h span { font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-dock-h em { margin-left: auto; font: normal 500 12px var(--st-body); color: var(--st-faint); }
.f-inbox .ib-q { display: grid; grid-template-columns: 148px minmax(0, 1fr); gap: 14px; align-items: start; padding: 13px 18px; }
.f-inbox .ib-q + .ib-q { border-top: 1px solid rgba(21,24,29,.05); }
.f-inbox .ib-q-l { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 2px 9px; align-items: center; padding-top: 7px; }
.f-inbox .ib-q-l b { font: 600 13.5px/1.25 var(--st-body); }
.f-inbox .ib-q-l small { grid-column: 2; font: 400 11.5px/1.3 var(--st-body); color: var(--st-faint); }
.f-inbox .ib-qn { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font: 600 11px/1 var(--st-display); background: var(--st-ink); color: #fff; }
.f-inbox .ib-qn.is-done { background: var(--st-accent-soft); color: var(--st-accent); }
.f-inbox .ib-qn .st-i { width: 12px; height: 12px; }
.f-inbox .ib-qn svg { stroke-width: 2.2; }
.f-inbox .ib-opts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.f-inbox .ib-opt { display: flex; align-items: center; gap: 9px; height: 38px; padding: 0 12px 0 9px; border-radius: 13px; background: #f5f6f8; box-shadow: inset 0 0 0 1px var(--st-hair); font: 500 13px/1 var(--st-body); color: #2c313a; white-space: nowrap; }
.f-inbox .ib-opt.is-on { background: var(--st-ink); color: #fff; box-shadow: 0 10px 20px -12px rgba(16,24,40,.7); }
.f-inbox .ib-opt.is-on kbd { background: rgba(255,255,255,.14); color: #fff; box-shadow: none; }
.f-inbox .ib-opt.is-lost { color: var(--st-rose); }
.f-inbox .ib-picks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.f-inbox .ib-pick { position: relative; display: flex; flex-direction: column; gap: 3px; padding: 9px 26px 9px 11px; border-radius: 13px; background: #f5f6f8; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-inbox .ib-pick b { font: 600 13px/1.2 var(--st-display); white-space: nowrap; }
.f-inbox .ib-pick small { font: 400 11.5px var(--st-body); color: var(--st-muted); white-space: nowrap; }
.f-inbox .ib-pick kbd { position: absolute; top: 8px; right: 8px; min-width: 17px; height: 17px; font-size: 10px; padding: 0 3px; }
.f-inbox .ib-pick.is-on { background: var(--st-accent-soft); box-shadow: inset 0 0 0 1.5px var(--st-accent); }
.f-inbox .ib-pick.is-on b, .f-inbox .ib-pick.is-on small { color: #075a63; }
.f-inbox .rv-input { display: flex; align-items: center; height: 42px; padding: 0 14px; border-radius: 13px; background: var(--st-surface); box-shadow: 0 0 0 1.5px var(--st-accent), 0 0 0 5px rgba(11,116,128,.1); font: 400 14px var(--st-body); color: var(--st-ink); white-space: nowrap; overflow: hidden; }
.f-inbox .rv-caret { flex: none; width: 1.5px; height: 18px; background: var(--st-accent); margin-left: 1px; }
.f-inbox .ib-nx { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.f-inbox .rv-field { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px; border-radius: 999px; background: #f5f6f8; box-shadow: inset 0 0 0 1px var(--st-hair); font: 500 12.5px var(--st-body); white-space: nowrap; }
.f-inbox .rv-field small { font: 400 12px var(--st-body); color: var(--st-faint); }
.f-inbox .rv-field .st-av { width: 20px; height: 20px; font-size: 9px; }
.f-inbox .rv-was { font: 400 12px var(--st-body); color: var(--st-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.f-inbox .rv-was s { text-decoration-color: rgba(21,24,29,.3); }
.f-inbox .ib-dock-f { display: flex; align-items: center; gap: 10px; padding: 12px 12px 12px 18px; border-top: 1px solid rgba(21,24,29,.06); background: #fafbfc; border-radius: 0 0 22px 22px; }
.f-inbox .rv-delta { font: 400 12.5px/1.4 var(--st-body); color: var(--st-muted); min-width: 0; }
.f-inbox .rv-delta b { color: var(--st-ink); font-weight: 600; }
.f-inbox .ib-dock-f .st-btn.is-ghost { margin-left: auto; }
.f-inbox .rv-keys { margin-top: 14px; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px; font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-inbox .rv-keys span { display: inline-flex; align-items: center; gap: 5px; }

/* review: done */
.f-inbox .rv-tally { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 16px; }
.f-inbox .rv-tally span { font: 500 12.5px/1 var(--st-body); padding: 7px 11px; border-radius: 999px; background: #f2f3f5; color: #2c313a; }
.f-inbox .rv-tally span b { font-weight: 600; }
.f-inbox .ib-done-grid { margin-top: 22px; display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 14px; align-items: start; }
.f-inbox .ib-done-grid + .ib-done-grid { margin-top: 14px; }
.f-inbox .rv-chg { display: flex; flex-direction: column; }
.f-inbox .rv-chg li { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 12px 0; border-top: 1px solid rgba(21,24,29,.06); }
.f-inbox .rv-chg li:first-child { border-top: 0; padding-top: 2px; }
.f-inbox .rv-chg-ic { width: 34px; height: 34px; border-radius: 12px; display: grid; place-items: center; background: var(--st-surface); color: var(--st-muted); box-shadow: 0 0 0 1px var(--st-hair); }
.f-inbox .rv-chg-ic .st-i { width: 17px; height: 17px; }
.f-inbox .rv-chg-ic.is-lost { background: var(--st-rose-soft); color: var(--st-rose); box-shadow: none; }
.f-inbox .rv-chg-ic.is-date { background: var(--st-amber-soft); color: var(--st-amber); box-shadow: none; }
.f-inbox .rv-chg b { display: block; font: 600 14px/1.3 var(--st-body); }
.f-inbox .rv-chg small { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-inbox .rv-chg small .st-i { width: 13px; height: 13px; color: var(--st-faint); }
.f-inbox .rv-from { text-decoration: line-through; text-decoration-color: rgba(21,24,29,.3); color: var(--st-faint); }
.f-inbox .rv-to { font-weight: 600; color: var(--st-ink); }
.f-inbox .rv-kept { margin-top: 8px; padding: 12px 14px; border-radius: 14px; background: var(--st-surface); font: 400 12.5px/1.5 var(--st-body); color: var(--st-muted); box-shadow: 0 0 0 1px var(--st-hair); }
.f-inbox .rv-kept b { color: var(--st-ink); font-weight: 600; }
.f-inbox .rv-fc-top { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; margin-bottom: 16px; }
.f-inbox .rv-fc-top > div { padding: 12px 14px; border-radius: 16px; background: var(--st-surface); box-shadow: 0 0 0 1px var(--st-hair); }
.f-inbox .rv-fc-top > div.is-after { background: var(--st-accent-soft); box-shadow: none; }
.f-inbox .rv-fc-top small { display: block; font: 500 12px var(--st-body); color: var(--st-muted); }
.f-inbox .rv-fc-top .is-after small { color: #0a5560; }
.f-inbox .rv-fc-top b { display: block; margin-top: 6px; font: 600 22px/1 var(--st-display); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.f-inbox .rv-fc-top .is-after b { color: #075a63; }
.f-inbox .rv-fc-top > .st-i { width: 18px; height: 18px; color: var(--st-faint); }
.f-inbox .rv-bridge { display: flex; flex-direction: column; gap: 10px; }
.f-inbox .rv-br { display: grid; grid-template-columns: minmax(0, 1fr) 96px 66px; gap: 10px; align-items: center; font: 400 13px/1.35 var(--st-body); color: #2c313a; }
.f-inbox .rv-br small { display: block; font-size: 12px; color: var(--st-faint); }
.f-inbox .rv-br-bar { height: 10px; border-radius: 999px; background: #e8eaed; position: relative; }
.f-inbox .rv-br-bar i { position: absolute; top: 0; bottom: 0; border-radius: 999px; }
.f-inbox .rv-br-v { text-align: right; font: 600 13px var(--st-display); font-variant-numeric: tabular-nums; white-space: nowrap; }
.f-inbox .rv-br-v.is-neg { color: var(--st-rose); }
.f-inbox .rv-br-v.is-zero { color: var(--st-faint); font-weight: 500; }
.f-inbox .rv-note { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(21,24,29,.06); font: 400 12.5px/1.5 var(--st-body); color: var(--st-muted); }
.f-inbox .rv-note b { color: var(--st-ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.f-inbox .ib-mini { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: 18px; background: var(--st-surface); box-shadow: 0 0 0 1px var(--st-hair); }
.f-inbox .ib-mini .th-msg { max-width: 92%; }
.f-inbox .ib-mini .th-msg p { font-size: 13.5px; padding: 10px 14px; }
.f-inbox .ib-mini-h { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(21,24,29,.05); }
.f-inbox .ib-mini-h .st-av { width: 30px; height: 30px; font-size: 10.5px; border-radius: 10px; }
.f-inbox .ib-mini-h b { font: 600 14px/1.2 var(--st-display); letter-spacing: -0.01em; }
.f-inbox .ib-mini-h small { display: block; margin-top: 2px; font: 400 12px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-mini-h .th-stage { margin-left: auto; }
.f-inbox .ib-steps li { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 11px 0; border-top: 1px solid rgba(21,24,29,.06); }
.f-inbox .ib-steps li:first-child { border-top: 0; padding-top: 2px; }
.f-inbox .ib-steps .st-box { width: 18px; height: 18px; border-radius: 6px; box-shadow: inset 0 0 0 1.4px rgba(21,24,29,.22); background: var(--st-surface); margin-top: 1px; }
.f-inbox .ib-steps b { display: block; font: 500 13.5px/1.35 var(--st-body); }
.f-inbox .ib-steps small { display: flex; align-items: center; gap: 6px; margin-top: 4px; font: 400 12px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-steps .rv-d { font: 500 11.5px/1 var(--st-body); color: var(--st-muted); padding: 5px 9px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px var(--st-hair); white-space: nowrap; }
.f-inbox .ib-steps .rv-d.is-soon { color: #075a63; background: var(--st-accent-soft); box-shadow: none; }
.f-inbox .ib-steps-f { margin-top: 6px; padding-top: 12px; border-top: 1px solid rgba(21,24,29,.06); font: 400 12.5px var(--st-body); color: var(--st-muted); display: flex; justify-content: space-between; gap: 10px; }
.f-inbox .ib-steps-f b { color: var(--st-ink); font-weight: 600; }
.f-inbox .ib-steps-f a { color: var(--st-accent); font-weight: 500; white-space: nowrap; }

/* pipeline lens */
.f-inbox .th-lens-h { display: flex; align-items: flex-end; gap: 16px; }
.f-inbox .th-lens-h h2 { font: 600 26px/1.1 var(--st-display); letter-spacing: -0.03em; }
.f-inbox .th-lens-h p { margin-top: 6px; font: 400 13.5px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-lastrev { margin-left: auto; display: inline-flex; align-items: center; gap: 10px; padding: 6px 6px 6px 12px; border-radius: 999px; background: var(--st-accent-soft); color: #0a5560; font: 400 12.5px var(--st-body); white-space: nowrap; }
.f-inbox .ib-lastrev > .st-i { width: 16px; height: 16px; color: var(--st-accent); }
.f-inbox .ib-lastrev b { font-weight: 600; color: #075a63; }
.f-inbox .ib-lastrev a { padding: 7px 12px; border-radius: 999px; background: var(--st-surface); font-weight: 500; color: #075a63; box-shadow: 0 0 0 1px rgba(11,116,128,.15); }
.f-inbox .th-strip { margin-top: 22px; display: flex; gap: 6px; align-items: stretch; }
.f-inbox .th-seg { min-width: 112px; display: flex; flex-direction: column; gap: 8px; }
.f-inbox .th-seg-t { display: flex; align-items: baseline; gap: 6px; font: 600 13px/1.2 var(--st-body); white-space: nowrap; }
.f-inbox .th-seg-t small { font: 400 12px var(--st-body); color: var(--st-faint); }
.f-inbox .th-bar { height: 12px; border-radius: 999px; }
.f-inbox .th-seg-v { font: 600 17px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.f-inbox .th-seg-m { font: 400 11.5px/1.2 var(--st-body); color: var(--st-faint); white-space: nowrap; }
.f-inbox .th-won { flex: none; width: 150px; margin-left: 10px; padding: 12px 14px; border-radius: 18px; background: var(--st-accent-soft); color: #075a63; display: flex; flex-direction: column; gap: 4px; justify-content: center; }
.f-inbox .th-won span { font: 500 12px var(--st-body); }
.f-inbox .th-won b { font: 600 17px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.f-inbox .th-won small { font: 400 11.5px var(--st-body); color: #0a5560; }
.f-inbox .th-legend { margin-top: 12px; font: 400 12px var(--st-body); color: var(--st-faint); }
.f-inbox .th-groups { margin-top: 22px; display: flex; flex-direction: column; gap: 18px; }
.f-inbox .th-g-h { display: flex; align-items: center; gap: 10px; padding: 0 12px 8px; border-bottom: 1px solid rgba(21,24,29,.06); }
.f-inbox .th-g-h b { font: 600 15px/1.2 var(--st-display); letter-spacing: -0.015em; }
.f-inbox .th-g-h .th-n { font: 600 11.5px/1 var(--st-body); color: var(--st-muted); background: rgba(21,24,29,.05); padding: 4px 8px; border-radius: 999px; }
.f-inbox .th-g-h > span:last-child { margin-left: auto; font: 400 12.5px var(--st-body); color: var(--st-muted); font-variant-numeric: tabular-nums; }
.f-inbox .th-g-h > span:last-child b { font: 600 13.5px var(--st-display); color: var(--st-ink); }
.f-inbox .th-lrow { display: grid; grid-template-columns: 30px 230px minmax(0, 1fr) 96px 148px 76px; gap: 14px; align-items: center; padding: 10px 12px; border-radius: 14px; }
.f-inbox .th-lrow + .th-lrow { box-shadow: 0 -1px 0 rgba(21,24,29,.04); }
.f-inbox .th-lrow .st-av { width: 30px; height: 30px; font-size: 10.5px; }
.f-inbox .th-lrow.is-flag { background: #f5fafa; }
.f-inbox .th-lr-t { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.f-inbox .th-lr-t b { font: 600 13.5px/1.25 var(--st-body); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .th-lr-t small { font: 400 12px/1.2 var(--st-body); color: var(--st-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .th-lr-n { min-width: 0; font: 400 12.5px/1.3 var(--st-body); color: var(--st-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .th-turn { justify-self: start; display: inline-flex; align-items: center; gap: 6px; font: 500 11.5px/1 var(--st-body); padding: 5px 9px; border-radius: 999px; white-space: nowrap; }
.f-inbox .th-turn.is-reply { background: var(--st-ink); color: #fff; }
.f-inbox .th-turn.is-waiting { background: #eff1f3; color: var(--st-muted); }
.f-inbox .th-turn.is-cold { background: var(--st-amber-soft); color: var(--st-amber); }
.f-inbox .ib-flag { justify-self: start; display: inline-flex; align-items: center; gap: 5px; max-width: 100%; font: 500 11.5px/1 var(--st-body); padding: 5px 9px 5px 7px; border-radius: 999px; background: var(--st-accent-soft); color: #075a63; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .ib-flag .st-i { width: 13px; height: 13px; }
.f-inbox .ib-flag.is-none { background: transparent; color: var(--st-faint); font-weight: 400; padding-left: 0; }
.f-inbox .th-lr-a { text-align: right; font: 600 13.5px var(--st-display); font-variant-numeric: tabular-nums; }
.f-inbox .ib-closed { margin-top: 16px; display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 16px; background: #f7f8f9; font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-closed .st-i { width: 15px; height: 15px; color: var(--st-rose); }
.f-inbox .ib-closed b { color: var(--st-ink); font-weight: 600; }
.f-inbox .ib-closed s { color: var(--st-faint); text-decoration-color: rgba(180,35,69,.5); margin-left: auto; font-variant-numeric: tabular-nums; }

/* person */
.f-inbox .ib-crumb { display: inline-flex; align-items: center; gap: 8px; font: 500 12.5px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-crumb .st-i { width: 14px; height: 14px; }
.f-inbox .ib-crumb span { color: var(--st-faint); }
.f-inbox .ib-hero { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 18px; align-items: center; margin-top: 16px; padding-bottom: 20px; border-bottom: 1px solid rgba(21,24,29,.06); }
.f-inbox .ib-hero > .st-av { width: 64px; height: 64px; border-radius: 22px; font-size: 20px; background: linear-gradient(160deg, #e6f3f4, #cfe7e9); box-shadow: inset 0 1px 0 #fff, 0 0 0 1px rgba(11,116,128,.12); }
.f-inbox .ib-hero h2 { font: 600 30px/1.05 var(--st-display); letter-spacing: -0.035em; }
.f-inbox .ib-hero p { margin-top: 6px; font: 400 14px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-hero p b { color: var(--st-ink); font-weight: 500; }
.f-inbox .ib-hero .st-tags { margin-top: 8px; }
.f-inbox .ib-hero-r { display: flex; align-items: center; gap: 8px; }
.f-inbox .ib-stat { padding: 8px 14px; border-radius: 14px; background: #f5f6f8; }
.f-inbox .ib-stat.is-acc { background: var(--st-accent-soft); color: #075a63; }
.f-inbox .ib-stat small { display: block; font: 500 11.5px var(--st-body); color: inherit; opacity: .8; }
.f-inbox .ib-stat b { display: block; margin-top: 3px; font: 600 18px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.f-inbox .ib-pgrid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 28px; margin-top: 22px; align-items: start; }
.f-inbox .ib-threads { display: flex; flex-direction: column; gap: 10px; }
.f-inbox .ib-tcard { border-radius: 20px; background: #f7f8f9; box-shadow: inset 0 0 0 1px var(--st-hair); padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.f-inbox .ib-tcard.is-top { background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.07), 0 14px 28px -20px rgba(16,24,40,.35); }
.f-inbox .ib-tcard-h { display: flex; align-items: center; gap: 10px; }
.f-inbox .ib-tcard-h b { font: 600 15px/1.2 var(--st-display); letter-spacing: -0.015em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.f-inbox .ib-tcard-h .th-amt { margin-left: auto; font-size: 14px; }
.f-inbox .ib-tcard-h a { font: 500 12.5px var(--st-body); color: var(--st-accent); display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.f-inbox .ib-tcard-h a .st-i { width: 14px; height: 14px; }
.f-inbox .ib-tcard .th-owe { margin: 0; background: var(--st-surface); box-shadow: 0 0 0 1px var(--st-hair); padding: 8px 8px 8px 12px; }
.f-inbox .ib-tcard .th-owe.is-late { background: #fffaf2; box-shadow: inset 0 0 0 1px rgba(161,92,7,.14); }
.f-inbox .ib-tcard .th-msg { max-width: 90%; }
.f-inbox .ib-tcard .th-msg p { font-size: 13.5px; padding: 10px 14px; }
.f-inbox .ib-tcard .th-msg.is-in p { background: var(--st-surface); box-shadow: 0 0 0 1px var(--st-hair); }
.f-inbox .ib-tcard .th-log { box-shadow: 0 0 0 1px rgba(11,116,128,.14); }
.f-inbox .ib-tcard .th-sys { justify-content: flex-start; }
.f-inbox .ib-tcard.is-won { flex-direction: row; align-items: center; padding: 12px 16px; }
.f-inbox .ib-tcard.is-won .ib-tcard-h { flex: 1; min-width: 0; }
.f-inbox .ib-tcard.is-won small { font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-pside { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
.f-inbox .ib-pside h3 { display: flex; align-items: center; gap: 8px; font: 600 15px/1.2 var(--st-display); letter-spacing: -0.015em; margin-bottom: 12px; }
.f-inbox .ib-pside h3 .st-i { width: 16px; height: 16px; color: var(--st-muted); }
.f-inbox .ib-pside h3 small { margin-left: auto; font: 500 11px var(--st-body); letter-spacing: .08em; color: var(--st-faint); }
.f-inbox .ib-pside section + section { padding-top: 20px; border-top: 1px solid rgba(21,24,29,.06); }
.f-inbox .ib-pside .st-dl div { grid-template-columns: 86px minmax(0, 1fr); }
.f-inbox .ib-pside .st-pbtns { margin-top: 14px; }
.f-inbox .ib-pside .st-btn.is-sm { padding: 0 12px; }

/* creating: the New button, its menu, the quiet start row */
.f-inbox .th-side { position: relative; }
.f-inbox .th-new kbd { margin-left: 4px; background: rgba(255,255,255,.14); color: rgba(255,255,255,.85); box-shadow: none; }
.f-inbox .th-new.is-open { box-shadow: 0 0 0 4px rgba(11,116,128,.22), inset 0 1px 0 rgba(255,255,255,.16), 0 10px 22px -12px rgba(16,24,40,.7); }
.f-inbox .ib-newmenu { position: absolute; top: 58px; left: 0; width: 392px; padding: 6px; border-radius: 22px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08), 0 32px 64px -20px rgba(16,24,40,.45); z-index: 6; }
.f-inbox .ib-nm-h { padding: 10px 12px 6px; font: 500 11.5px var(--st-body); color: var(--st-faint); }
.f-inbox .ib-newmenu li { display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 12px; border-radius: 15px; }
.f-inbox .ib-newmenu li > .st-i { width: 32px; height: 32px; padding: 7px; border-radius: 10px; background: #f2f3f5; color: var(--st-ink); }
.f-inbox .ib-newmenu li b { display: block; font: 600 13.5px/1.25 var(--st-body); }
.f-inbox .ib-newmenu li small { display: block; margin-top: 2px; font: 400 12px/1.35 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-newmenu li.is-on { background: var(--st-accent-soft); }
.f-inbox .ib-newmenu li.is-on > .st-i { background: var(--st-accent); color: #fff; }
.f-inbox .ib-newmenu li.is-on b { color: #075a63; }
.f-inbox .ib-newmenu li.is-on small { color: #0a5560; }
.f-inbox .ib-nm-f { margin: 4px 6px 2px; padding: 10px 6px 6px; border-top: 1px solid rgba(21,24,29,.06); font: 400 12px var(--st-body); color: var(--st-faint); }
.f-inbox .ib-nm-f kbd { min-width: 18px; height: 18px; font-size: 10px; margin: 0 2px; }
.f-inbox .ib-start { display: flex; align-items: center; gap: 9px; margin: 0 14px 10px; padding: 9px 14px; border-radius: 14px; border: 1px dashed rgba(21,24,29,.14); font: 500 12.5px var(--st-body); color: var(--st-muted); white-space: nowrap; overflow: hidden; }
.f-inbox .ib-start .st-i { width: 14px; height: 14px; color: var(--st-accent); }
.f-inbox .ib-start small { font: 400 12px var(--st-body); color: var(--st-faint); overflow: hidden; text-overflow: ellipsis; }

/* compose sheet over the inbox */
.f-inbox .ib-stack { display: grid; min-height: 860px; }
.f-inbox .ib-stack > * { grid-area: 1 / 1; min-width: 0; }
.f-inbox .ib-under { display: grid; grid-template-columns: 372px minmax(0, 1fr); }
.f-inbox .ib-scrim { position: relative; z-index: 2; display: flex; justify-content: center; align-items: flex-start; padding: 26px 22px 30px; background: rgba(226,229,233,.74); backdrop-filter: blur(3px); }
.f-inbox .ib-sheet { width: 100%; max-width: 900px; border-radius: 26px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08), 0 40px 80px -30px rgba(16,24,40,.5); }
.f-inbox .ib-sh-h { display: flex; align-items: flex-start; gap: 12px; padding: 22px 22px 14px 26px; }
.f-inbox .ib-sh-h > div { flex: 1; min-width: 0; }
.f-inbox .ib-sh-h h2 { font: 600 24px/1.1 var(--st-display); letter-spacing: -0.03em; }
.f-inbox .ib-sh-h p { margin-top: 5px; font: 400 13.5px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-sh-h .th-keys { margin: 8px 4px 0 0; }
.f-inbox .ib-x { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--st-muted); background: #f2f3f5; flex: none; }
.f-inbox .ib-x svg { width: 16px; height: 16px; }
.f-inbox .ib-paste { display: flex; align-items: center; gap: 10px; margin: 0 22px 0 26px; padding: 11px 14px; border-radius: 14px; border: 1px dashed rgba(21,24,29,.16); font: 400 12.5px/1.4 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-paste > .st-i { width: 16px; height: 16px; color: var(--st-faint); }
.f-inbox .ib-paste b { font-weight: 600; color: #2c313a; }
.f-inbox .ib-paste .th-keys { margin-left: auto; }
.f-inbox .ib-paste.is-done { border: 0; background: var(--st-accent-soft); color: #0a5560; }
.f-inbox .ib-paste.is-done > .st-i { color: var(--st-accent); }
.f-inbox .ib-paste.is-done b { color: #075a63; }
.f-inbox .ib-paste a { margin-left: auto; font: 500 12.5px var(--st-body); color: #075a63; padding: 6px 11px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(11,116,128,.15); }
.f-inbox .ib-sh-b { display: grid; grid-template-columns: minmax(0, 1fr) 356px; gap: 26px; padding: 18px 22px 22px 26px; }
.f-inbox .ib-col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.f-inbox .ib-grp-h { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; font: 600 14px/1.2 var(--st-display); letter-spacing: -0.01em; }
.f-inbox .ib-grp-h .st-i { width: 15px; height: 15px; color: var(--st-muted); }
.f-inbox .ib-grp-h em, .f-inbox .ib-f-l em { font: normal 400 11.5px var(--st-body); color: var(--st-faint); letter-spacing: 0; }
.f-inbox .ib-grp.is-later { opacity: .55; }
.f-inbox .ib-fgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 12px; }
.f-inbox .ib-fgrid.is-deal { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.f-inbox .ib-f { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.f-inbox .ib-f.is-wide { grid-column: 1 / -1; }
.f-inbox .ib-f-l { display: flex; align-items: center; gap: 6px; font: 500 12px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-f-l:empty { display: none; }
.f-inbox .ib-fill { width: 6px; height: 6px; border-radius: 50%; background: var(--st-accent); box-shadow: 0 0 0 3px var(--st-accent-soft); }
.f-inbox .ib-f-v { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 12px; border-radius: 12px; background: #f5f6f8; box-shadow: inset 0 0 0 1px var(--st-hair); font: 500 13.5px var(--st-body); color: var(--st-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-inbox .ib-f-v .st-i { width: 15px; height: 15px; color: var(--st-muted); }
.f-inbox .ib-f-v .st-av { width: 22px; height: 22px; font-size: 9.5px; }
.f-inbox .ib-f-v.is-empty, .f-inbox .ib-f-v > span:only-child:not(.th-stage) { color: var(--st-faint); font-weight: 400; }
.f-inbox .ib-f-v.is-focus { background: var(--st-surface); box-shadow: 0 0 0 1.5px var(--st-accent), 0 0 0 5px rgba(11,116,128,.1); font-size: 15px; }
.f-inbox .ib-f-n { font: 400 11.5px/1.35 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-f-n b { font-weight: 600; color: #2c313a; }
.f-inbox .ib-with { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px 12px 8px 8px; border-radius: 14px; background: var(--st-surface); box-shadow: 0 0 0 1.5px var(--st-accent), 0 0 0 5px rgba(11,116,128,.08); }
.f-inbox .ib-with .st-av { width: 30px; height: 30px; font-size: 11px; }
.f-inbox .ib-with b { font: 600 14px var(--st-body); }
.f-inbox .ib-with a { margin-left: auto; font: 500 12.5px var(--st-body); color: var(--st-accent); }
.f-inbox .ib-newtag { font: 500 11px/1 var(--st-body); color: #075a63; background: var(--st-accent-soft); padding: 4px 8px; border-radius: 999px; }
.f-inbox .ib-dup { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: #f5faf9; box-shadow: inset 0 0 0 1px rgba(11,116,128,.12); font: 400 12.5px/1.45 var(--st-body); color: #0a5560; }
.f-inbox .ib-dup .st-i { width: 15px; height: 15px; margin-top: 1px; color: var(--st-accent); }
.f-inbox .ib-dup b { font-weight: 600; color: #075a63; }
.f-inbox .ib-ac { margin-top: 8px; padding: 6px; border-radius: 18px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08), 0 20px 40px -18px rgba(16,24,40,.35); }
.f-inbox .ib-ac > p { padding: 7px 10px 5px; font: 500 11.5px var(--st-body); color: var(--st-faint); }
.f-inbox .ib-ac li { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 10px; border-radius: 13px; }
.f-inbox .ib-ac li .st-av { width: 30px; height: 30px; font-size: 10.5px; }
.f-inbox .ib-ac li b { display: block; font: 600 13.5px/1.25 var(--st-body); }
.f-inbox .ib-ac li b u { text-decoration: none; background: rgba(11,116,128,.14); border-radius: 3px; }
.f-inbox .ib-ac li small { display: block; margin-top: 2px; font: 400 12px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-ac li.is-on { background: var(--st-accent-soft); }
.f-inbox .ib-ac-plus { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; box-shadow: inset 0 0 0 1.4px rgba(21,24,29,.18); color: var(--st-muted); }
.f-inbox .ib-ac-plus .st-i { width: 14px; height: 14px; }
.f-inbox .ib-ac p.ib-ac-f { margin: 4px 4px 0; padding: 9px 6px 5px; border-top: 1px solid rgba(21,24,29,.06); font: 400 12px/1.45 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-chips { display: flex; gap: 4px; padding: 3px; border-radius: 999px; background: #f2f3f5; box-shadow: inset 0 0 0 1px var(--st-hair); width: max-content; }
.f-inbox .ib-chips span { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border-radius: 999px; font: 500 12.5px/1 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-chips .st-i { width: 14px; height: 14px; }
.f-inbox .ib-chips span.is-on { background: var(--st-surface); color: var(--st-ink); box-shadow: 0 1px 2px rgba(16,24,40,.08), 0 4px 10px -4px rgba(16,24,40,.14); }
.f-inbox .ib-ta { margin-top: 10px; min-height: 120px; padding: 12px 14px; border-radius: 14px; background: #f5f6f8; box-shadow: inset 0 0 0 1px var(--st-hair); font: 400 13.5px/1.55 var(--st-body); color: var(--st-ink); }
.f-inbox .ib-ta.is-empty { color: var(--st-faint); }
.f-inbox .ib-nextrow { margin-top: 12px; }
.f-inbox .ib-nextrow .th-dates { margin-top: 8px; }
.f-inbox .ib-nextrow .th-dates > span { height: 28px; padding: 0 10px; font-size: 12px; }
.f-inbox .ib-basis { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 3px; padding: 3px; border-radius: 14px; background: #f2f3f5; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-inbox .ib-basis span { display: grid; place-items: center; height: 34px; border-radius: 11px; font: 500 12.5px/1 var(--st-body); color: var(--st-muted); white-space: nowrap; }
.f-inbox .ib-basis span.is-on { background: var(--st-surface); color: var(--st-ink); box-shadow: 0 1px 2px rgba(16,24,40,.08), 0 4px 10px -4px rgba(16,24,40,.14); }
.f-inbox .ib-basis-n { margin-top: 8px; font: 400 12px/1.45 var(--st-body); color: var(--st-muted); }
.f-inbox .ib-sh-f { display: flex; align-items: center; gap: 10px; padding: 14px 16px 14px 26px; border-top: 1px solid rgba(21,24,29,.06); background: #fafbfc; border-radius: 0 0 26px 26px; }
.f-inbox .ib-sh-f > span:first-child { margin-right: auto; font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-inbox .ib-sh-f > span:first-child b { color: var(--st-ink); font-weight: 600; }
.f-inbox .ib-sh-f .th-keys { margin-left: 4px; }
.f-inbox .st-btn.is-off { opacity: .4; box-shadow: none; }

/* the result */
.f-inbox .ib-toast { margin: auto 14px 14px; display: flex; align-items: center; gap: 10px; padding: 10px 8px 10px 14px; border-radius: 18px; background: var(--st-ink); color: #fff; box-shadow: 0 18px 36px -16px rgba(16,24,40,.7); }
.f-inbox .ib-toast > .st-i { width: 18px; height: 18px; color: #7fd0d8; }
.f-inbox .ib-toast span { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.f-inbox .ib-toast b { font: 600 13.5px/1.2 var(--st-body); }
.f-inbox .ib-toast small { font: 400 12px var(--st-body); color: rgba(255,255,255,.7); }
.f-inbox .ib-toast a { margin-left: auto; padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,.12); font: 500 12.5px var(--st-body); }
.f-inbox .ib-hint.is-deal { border-style: solid; border-color: rgba(11,116,128,.18); background: #f5fafa; }
.f-inbox .ib-hint.is-deal > .st-i { color: var(--st-accent); }
`;

  // ---------- the flow ----------
  (window.LT_FLOWS = window.LT_FLOWS || []).push({
    id: "inbox",
    name: "Inbox + review",
    look: "studio",
    pitch:
      "Work your deals like an inbox, and once a week let the inbox walk you through them: every lead is a conversation, and the weekly review happens inside those conversations.",
    problem:
      "Today one deal is spread over four places: a dashboard that says something is off, a card on the board with the stage and amount, a detail page with the history at the bottom, and a task list with the next step. Answering “what did Ioana last say and what do I owe her” means visiting three of them. Keeping it honest means opening every card once a week, so nobody does, and the forecast drifts.",
    principles: [
      "One inbox replaces the dashboard, the board, the detail page and the task list; the pipeline is the same inbox grouped by stage. Every lead is a thread: logged calls, notes and emails, form submissions, stage changes and tasks, in order.",
      "Starting one is like writing an email. New (or C) asks who it's with, what it's about and what happened, finds people you already have, and creates the person, company and lead in one go.",
      "Smart folders are rules, not labels: Needs reply, Waiting on them, Going cold, Won. The next step is pinned on top of each thread, and new form leads arrive unowned with a Take it button.",
      "Logging is typing. / opens call, note, email, task, move and lost; after a call it suggests the stage move and the next step, each accepted with one key.",
      "The weekly review is a folder in the same inbox. It opens each deal in its own thread, so the conversation is the evidence, docks three questions where the reply box usually is, and writes every answer back into the thread.",
    ],
    tradeoffs:
      "It's built for people working their own deals one at a time; a manager who wants to drag 20 cards across a board or sort deals by amount will find the By stage view slower than a table. And until there's mailbox sync, a thread is only as complete as what people log or forward. The review catches the gaps, but it can't fill them.",
    fonts: [],
    css,
    screens: [
      // 1 ---------------------------------------------------------------
      {
        id: "monday",
        title: "Monday inbox",
        caption:
          "Monday, 9:05. Ana opens Lead Tracker to four conversations that need her and the weekly review waiting at the top of the same inbox. Ioana's thread shows everything logged so far, with Ana's next move pinned on top.",
        render(d, h) {
          const e = h.esc;
          const now = MON;
          const rows = [R(d, "l7", { last: "2026-10-25", sel: true }), R(d, "l11", { last: "2026-10-25", next: PROTO, due: TUE }), R(d, "l2"), R(d, "l15")];
          const r = rows[0];
          const tl = d.detail.timeline;
          const st = tl.find((x) => x.kind === "stage" && x.lead === r.title);
          const task = tl.find((x) => x.type === "task");
          const meet = tl.find((x) => x.type === "meeting");
          const msgs = `
            ${earlier(2, "Created 4 Sep from a referral · qualified in September")}
            ${dayline(st.at, now, h)}${moved(h, st.actor, st.from, st.to, st.at.slice(11, 16))}
            ${dayline(task.completedAt, now, h)}${sys(`${ic("check")}<span>${e(first(task.author))} completed a task: ${e(task.body)}</span><time>· ${e(task.completedAt.slice(11, 16))}</time>`)}
            ${dayline(meet.at, now, h)}${logCard(h, "meeting", "Meeting logged", meet.author, meet.at.slice(11, 16), meet.body)}
            ${dayline(d.thread[2].at, now, h)}${bubble(h, d.thread[2])}
            ${dayline(d.thread[3].at, now, h)}${bubble(h, d.thread[3])}
            ${sys(`${ic("flag")}<span>Ana set the next step: ${e(r.next)}, due ${dow(r.due)} ${e(h.day(r.due))}</span>`)}`;
          const hint = `<p class="ib-hint">${ic("forward")}<span>Emails here were logged by hand; Lead Tracker doesn't read your mailbox. <b>Optional:</b> set up a forwarding address, then forward an email to add it to its thread.</span><a href="#">Set up forwarding</a></p>`;
          const inner = `${list(h, rows, now)}
            <section class="th-thread" aria-label="Conversation">
              ${head(h, r, { bar: owe(h, r.next, r.due, now) })}
              <div class="th-msgs">${msgs}</div>
              ${composer(`Write a note, or type <kbd>/</kbd> to log a call, an email or a task`, hint)}
            </section>`;
          return chrome(d, h, { nav: "Inbox", badge: 4 }, inboxShell(side(d, h, { day: "mon", rev: "due", active: "reply" }), "", inner));
        },
      },
      // 2 ---------------------------------------------------------------
      {
        id: "arrives",
        title: "A new lead arrives",
        caption:
          "Monday, 14:22. Marta fills in the contact form and a new thread lands at the top of Needs reply: marked unverified, with the consent she ticked, and nobody owning it yet. One click takes it, Assign hands it to a teammate, and the first call can be logged right below.",
        render(d, h) {
          const inner = martaScene(d, h);
          return chrome(d, h, { nav: "Inbox", badge: 5 }, inboxShell(side(d, h, { day: "monPm", rev: "due", active: "reply" }), "", inner));
        },
      },
      // 2a --------------------------------------------------------------
      {
        id: "new-menu",
        title: "Adding one yourself",
        caption:
          "Monday, 15:31. Ana has just hung up with someone she met at a summit. Everything she can add starts from New (or the C key): a short menu where each option says what it creates. The list also has a quiet Start a conversation row.",
        render(d, h) {
          const inner = martaScene(d, h, { read: true });
          return chrome(d, h, { nav: "Inbox", badge: 5 }, inboxShell(side(d, h, { day: "monPm", rev: "due", active: "reply", menu: newMenu(h) }), "", inner));
        },
      },
      // 2b --------------------------------------------------------------
      {
        id: "compose-with",
        title: "Who is it with?",
        caption:
          "New conversation opens a compose sheet, like writing an email. It starts with who it's with: typing “mar” finds Marta, so a second deal joins her conversations, or creates someone new. The rest of the sheet is visible but quiet, so it's clear what's required.",
        render(d, h) {
          const under = `<div class="ib-under">${martaScene(d, h, { read: true })}</div>`;
          const inner = `<div class="ib-stack">${under}<div class="ib-scrim">${composeSheet(d, h, false)}</div></div>`;
          return chrome(d, h, { nav: "Inbox", badge: 5 }, inboxShell(side(d, h, { day: "monPm", rev: "due", active: "reply" }), "is-one", inner));
        },
      },
      // 2c --------------------------------------------------------------
      {
        id: "compose-filled",
        title: "Compose a new conversation",
        caption:
          "Ana pastes Jonas's email signature: name, title, email, phone and company fill in, the company guessed from haldenferries.no, and the duplicate check finds nobody. She adds what it's about, logs the call with a next step, and keeps Legitimate interest as the lawful basis.",
        render(d, h) {
          const under = `<div class="ib-under">${martaScene(d, h, { read: true })}</div>`;
          const inner = `<div class="ib-stack">${under}<div class="ib-scrim">${composeSheet(d, h, true)}</div></div>`;
          return chrome(d, h, { nav: "Inbox", badge: 5 }, inboxShell(side(d, h, { day: "monPm", rev: "due", active: "reply" }), "is-one", inner));
        },
      },
      // 2d --------------------------------------------------------------
      {
        id: "started",
        title: "The conversation is started",
        caption:
          "Monday, 15:36. The new thread sits at the top of Waiting on them, open on the right: the call as its first entry, the next step pinned, and Jonas and Halden Ferries added to People. A second project later is one click: New deal with Jonas, prefilled.",
        render(d, h) {
          const e = h.esc;
          const now = MON;
          const J = JONAS;
          const jr = { id: "new", contact: J.contact, company: J.company, title: J.title, stageId: J.stageId, amount: J.amount, owner: J.owner, closeDate: "", last: MON, time: J.createdAt, next: J.next, due: J.due, via: J.source, sel: true, isNew: true };
          const rows = [jr, R(d, "l4"), R(d, "l10")];
          const toast = `<div class="ib-toast" role="status">${ic("check")}<span><b>Conversation started</b><small>Next step ${dow(J.due)} ${e(h.day(J.due))}</small></span><a href="#">Undo</a></div>`;
          const msgs = `${dayline(MON, now, h)}
            ${logCard(h, "call", "Call logged", J.owner, J.callAt, J.call)}
            ${sys(`${ic("people")}<span><b>${e(J.contact)}</b> and <b>${e(J.company)}</b> were added to People</span><time>· ${J.createdAt}</time>`)}
            ${sys(`${ic("plus")}<span>Started in <b>New</b> · ${e(h.money(J.amount))} · source: ${e(J.source)} · lawful basis: Legitimate interest</span>`)}
            ${sys(`${ic("flag")}<span>Ana set the next step: ${e(J.next)}, due ${dow(J.due)} ${e(h.day(J.due))}</span>`)}`;
          const again = `<p class="ib-hint is-deal">${ic("plus")}<span>Another project with Halden Ferries later? <b>New deal with Jonas</b> starts one with him and his company filled in. It's on every thread and person page.</span><a href="#">New deal with ${e(first(J.contact))}</a></p>`;
          const inner = `${list(h, rows, now, { title: "Waiting on them", foot: toast })}
            <section class="th-thread" aria-label="Conversation">
              ${head(h, jr, { bar: owe(h, J.next, J.due, now) })}
              <div class="th-msgs">${msgs}</div>
              ${composer(`Write a note, or type <kbd>/</kbd> to log a call, an email or a task`, again)}
            </section>`;
          return chrome(d, h, { nav: "Inbox", badge: 5 }, inboxShell(side(d, h, { day: "monNew", rev: "due", active: "waiting" }), "", inner));
        },
      },
      // 3 ---------------------------------------------------------------
      {
        id: "typing",
        title: "Logging is typing",
        caption:
          "Tuesday, 9:46. Straight after the prototype call Ana types /call, picks Talked and writes what happened. Lead Tracker offers the stage move and the next step; she has accepted the move, Tab takes the next step, and she's typing / again to add a task for Tomás.",
        render(d, h) {
          const e = h.esc;
          const now = TUE;
          const r = R(d, "l11", { last: "2026-10-25", next: PROTO, due: TUE, sel: true, stageId: "s3" });
          const rows = [
            r,
            R(d, "l3", { last: TUE, time: "07:12", unread: true, isNew: true }),
            R(d, "l7", { last: "2026-10-25" }),
            R(d, "l2"),
            R(d, "l15"),
          ];
          const call = d.thread[4];
          const msgs = `
            ${earlier(5, "Created 30 Jul from a referral · proposal sent in October")}
            ${dayline(d.thread[3].at, now, h)}${bubble(h, d.thread[3], { also: "Fleet tracking pilot" })}
            ${sys(`${ic("flag")}<span>Ana set the next step: ${e(PROTO)}, due ${dow(TUE)} ${e(h.day(TUE))}</span>`)}
            ${dayline(TUE, now, h)}`;
          const slash = `<div class="ib-slash" role="listbox" aria-label="Add to this thread">
            <p class="ib-slash-h"><span>Add to this thread</span><kbd>↑</kbd><kbd>↓</kbd> choose <kbd>↵</kbd> add</p>
            <ul>${SLASH.map((s) => {
              const cls = s.k === "task" ? "is-on" : s.k === "call" ? "is-used" : "";
              const end = s.k === "call" ? `<em>${ic("check")}Added</em>` : s.k === "task" ? `<kbd>↵</kbd>` : "<span></span>";
              return `<li class="${cls}" role="option"${s.k === "task" ? ' aria-selected="true"' : ""}>${ic(SLASH_IC[s.k])}<b>/${s.k}</b><span>${e(s.d)}</span>${end}</li>`;
            }).join("")}</ul>
          </div>`;
          const comp = `<div class="th-comp is-active">
            ${slash}
            <div class="th-c-top"><span class="th-token">${ic("call")}Call</span><span class="th-with">with ${e(first(r.contact))} · today ${e(call.at.slice(11, 16))}</span>
              <span class="th-oc" role="radiogroup" aria-label="Outcome"><span class="is-on">Talked</span><span>Voicemail</span><span>No answer</span></span></div>
            <div class="th-c-text">${e(call.body)}<br><span class="ib-typed">/</span><i class="th-caret"></i></div>
            <div class="th-sugg">
              <p class="th-sugg-h">Suggested from this call</p>
              <div class="th-sg is-on"><span class="th-tick">${ic("check")}</span><span class="th-sg-t"><b>Move to Negotiation</b><small>Legal reviewing the DPA is the last step before signing. Probability 50% → 75%.</small></span><span class="ib-acc is-ok">${ic("check")}Accepted</span></div>
              <div class="th-sg is-focus"><span class="th-tick is-off"></span><span class="th-sg-t"><b>Next step: ${e(d.touch.l11.next)}</b><small>Replaces “${e(PROTO)}”, which this call marks done.</small></span><span class="ib-acc"><kbd>Tab</kbd> accept</span>
                <div class="th-dates" role="radiogroup" aria-label="Due">
                  <span>Tomorrow<small>Wed 28</small></span>
                  <span class="is-on">${dow(d.touch.l11.nextDue)} ${e(h.day(d.touch.l11.nextDue))}</span>
                  <span>Next week<small>Mon 2</small></span>
                  <span>Pick a date…</span>
                </div>
              </div>
            </div>
            <div class="th-c-f"><span>Adds the call, the stage move and the next step to this thread</span>
              <span class="th-keys"><kbd>Esc</kbd> cancel<i></i><kbd>⌘</kbd><kbd>↵</kbd></span>
              <a href="#" class="st-btn is-ink is-sm">Log call<span class="st-btn-ic">${I.arrowR}</span></a></div>
          </div>`;
          const inner = `${list(h, rows, now)}
            <section class="th-thread" aria-label="Conversation">
              ${head(h, r, { stageId: "s3", bar: owe(h, r.next, r.due, now) })}
              <div class="th-msgs">${msgs}</div>
              ${comp}
            </section>`;
          return chrome(d, h, { nav: "Inbox", badge: 5 }, inboxShell(side(d, h, { day: "tue", rev: "waiting", active: "reply" }), "", inner, "min-height:1200px"));
        },
      },
      // 4 ---------------------------------------------------------------
      {
        id: "review-start",
        title: "Review starts inside the inbox",
        caption:
          "Wednesday, 9:00. Ana skipped the review on Monday; it waited in the inbox like any other thread. She opens it: 12 open deals, 5 that need a look and why, about six minutes. Start is the one big button.",
        render(d, h) {
          const e = h.esc;
          const p = plan(d);
          const minutes = Math.round((p.attention.length * 60 + p.fine.length * 8) / 60);
          const looks = p.attention
            .map(
              (l, i) => `<li><span class="rv-num">${i + 1}</span>
                <div><b>${e(l.title)}</b><p>${e(l.contact)} · ${e(l.company)} · ${e(h.stage(l.stageId).name)}</p><div class="rv-whys">${reasons(l, d, h)}</div></div>
                <span class="rv-amt">${e(h.money(l.amount))}<small>${l.owner ? e(first(l.owner)) : "Unassigned"}</small></span></li>`,
            )
            .join("");
          const fine = p.fine.map((l) => `<li><span>${e(l.title)}</span><em>${e(h.moneyShort(l.amount))}</em></li>`).join("");
          const inner = `<section class="ib-pad" aria-label="Weekly review">
            <div class="ib-rs-h">
              <div>
                <p class="ib-kicker">${ic("review")}Weekly review · due Monday · last done Mon 19 Oct</p>
                <h2>${p.open.length} open deals. <span>${p.attention.length} need a look.</span></h2>
                <p class="ib-lede">About <b>${minutes} minutes</b>, one deal at a time. Each deal opens in its own thread, so what was said is right there while you answer. Furthest stage first.</p>
              </div>
              <div class="ib-go">
                <a href="#" class="st-btn is-primary is-lg">Start review<span class="st-btn-ic">${I.arrowR}</span></a>
                <div class="ib-go-row"><span class="ib-go-k"><kbd>↵</kbd> to start</span><a href="#" class="st-btn is-ghost is-sm">Remind me Friday</a></div>
              </div>
            </div>
            <div class="ib-rs-grid">
              <div class="ib-sec is-plain">
                <div class="ib-sec-h"><h3>Needs a look</h3><span class="st-n">${p.attention.length}</span><small>In review order</small></div>
                <ol class="ib-looks">${looks}</ol>
              </div>
              <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
                <div class="ib-sec">
                  <div class="ib-sec-h"><h3>Three questions per deal</h3></div>
                  <ol class="ib-3q">
                    <li><div><b>Still on track?</b><small><span class="rv-ans"><kbd>K</kbd>Keep</span><span class="rv-ans"><kbd>P</kbd>Push the date</span><span class="rv-ans"><kbd>L</kbd>Mark lost</span></small></div></li>
                    <li><div><b>When will it close?</b><small>Keep the date or pick a new one in one tap</small></div></li>
                    <li><div><b>What's the next step?</b><small>Who does what, by when. It lands in their Needs reply.</small></div></li>
                  </ol>
                </div>
                <div class="ib-sec">
                  <p><b>${p.fine.length} look fine.</b> Touched in the last two weeks, close date ahead, owner set. Confirm them together at the end.</p>
                  <ul class="ib-fine">${fine}</ul>
                  <div class="rv-now"><span>Weighted forecast now</span><b>${e(h.money(Math.round(weighted(p.open, h))))}</b></div>
                </div>
              </div>
            </div>
            <p class="ib-foot">Pause any time with Esc. Answers save as you go, each one is written into the deal's thread, and nothing changes on a deal you skip.</p>
          </section>`;
          return chrome(d, h, { nav: "Inbox", badge: 5 }, inboxShell(side(d, h, { day: "wed", rev: "waiting", active: "review" }), "is-one", inner));
        },
      },
      // 5 ---------------------------------------------------------------
      {
        id: "review-deal",
        title: "Reviewing a deal in its thread",
        caption:
          "Deal 4 of 12. Membership portal stays open as a thread, so Ana can see the 28 days of silence and the lost sibling deal herself. The three questions dock where the reply box usually is: she pushes the date to January and gives Tomás a real next step.",
        render(d, h) {
          const e = h.esc;
          const p = plan(d);
          const l = d.leads.find((x) => x.id === "l6");
          const t = d.touch.l6;
          const pos = p.all.indexOf(l);
          const sibling = d.leads.find((x) => x.company === l.company && x.status === "lost");
          const nextDeal = p.all[pos + 1];
          const bar = `<div class="rv-bar" role="group" aria-label="Review progress"><b>${ic("review")}Weekly review</b><span class="rv-ticks" aria-hidden="true">${p.all.map((x, i) => `<i class="${i < pos ? "is-done" : i === pos ? "is-now" : ""}"></i>`).join("")}</span><span>${pos + 1} of ${p.all.length}</span><a href="#" class="rv-pause">${ic("pause")}Pause<kbd>Esc</kbd></a></div>`;
          const queue = `<section class="ib-queue" aria-label="Review queue">
            <div class="th-list-h"><h2>Review</h2><span class="th-sort">${pos + 1} of ${p.all.length}</span></div>
            <div class="rv-rail">
              <h3>Needs a look</h3>
              ${p.attention
                .map((x, i) => {
                  const dec = DEC[x.id] || {};
                  const state = i < pos ? "is-done" : i === pos ? "is-now" : "";
                  const sub = i < pos ? `<small class="${dec.lost ? "is-lost" : ""}">${e(dec.label)}</small>` : i === pos ? `<small>Now</small>` : `<small>${x.owner ? "Up next" : "No owner"}</small>`;
                  return `<div class="rv-ri ${state}"><span class="rv-dot">${i < pos ? ic("check") : ""}</span><div><b>${e(x.title)}</b>${sub}</div></div>`;
                })
                .join("")}
              <h3>Look fine · confirm at the end</h3>
              ${p.fine.map((x) => `<div class="rv-ri is-fine"><span class="rv-dot"></span><div><b>${e(x.title)}</b></div></div>`).join("")}
            </div>
            <div class="ib-queue-f"><span>Weighted forecast so far</span><b>${e(h.money(Math.round(weighted(p.open, h))))} → ${e(h.money(Math.round(weighted(p.open, h, DEC))))}</b><small>1 lost, 2 kept with new next steps</small></div>
          </section>`;
          const r = R(d, "l6");
          const reasonBar = `<div class="th-owe is-review">${ic("flag")}<span><b>In the review because:</b></span><div class="rv-whys">${reasons(l, d, h)}</div></div>`;
          const msgs = `
            ${dayline(l.created, WED, h)}
            <div class="th-msg is-in"><div class="th-msg-h"><b>${e(l.contact)}</b>${FORM}<time>19:31</time></div><p>We need a members portal for bookings, waivers and passes, live before the winter season. Could you send an estimate?</p></div>
            ${dayline("2026-09-22", WED, h)}
            ${logCard(h, "call", "Call logged", l.owner, "10:15", "Scoped it with Hannah: about 800 members, online payments and waiver e-signing. Budget around €11k, decision by mid-October.")}
            ${moved(h, l.owner, "New", "Qualified", "10:20")}
            ${dayline(t.last, WED, h)}
            ${bubble(h, { from: l.owner, dir: "out", at: t.last + "T16:40", channel: "Email", body: "Outline and estimate attached (€11,000). Could you let us know by 21 Oct so we can plan the build?" })}
            ${sys(`${ic("lost")}<span>Same company: <b>${e(sibling.title)}</b> was marked lost · “${e(sibling.lostReason)}”</span><time>· ${e(h.day(sibling.closeDate))}</time>`, "is-warn")}
            <div class="ib-quiet"><span>${t.days} days, no reply</span></div>`;
          const dock = `<div class="ib-dock" role="group" aria-label="Review this deal">
            <div class="ib-dock-h">${ic("review")}<b>Review this deal</b><span>Three questions, then the next one</span><em>Answers save as you go</em></div>
            <div class="ib-q"><div class="ib-q-l"><span class="ib-qn is-done">${ic("check")}</span><b>Still on track?</b></div>
              <div class="ib-opts"><span class="ib-opt"><kbd>K</kbd>Keep it</span><span class="ib-opt is-on"><kbd>P</kbd>Push the date</span><span class="ib-opt is-lost"><kbd>L</kbd>Mark lost…</span></div></div>
            <div class="ib-q"><div class="ib-q-l"><span class="ib-qn is-done">${ic("check")}</span><b>Close date</b><small>was ${e(h.day(l.closeDate))}</small></div>
              <div class="ib-picks">
                <span class="ib-pick"><kbd>1</kbd><b>11 Nov</b><small>In two weeks</small></span>
                <span class="ib-pick"><kbd>2</kbd><b>30 Nov</b><small>End of month</small></span>
                <span class="ib-pick is-on"><kbd>3</kbd><b>15 Jan</b><small>Next quarter</small></span>
                <span class="ib-pick"><kbd>4</kbd><b>Other…</b><small>Calendar</small></span>
              </div></div>
            <div class="ib-q"><div class="ib-q-l"><span class="ib-qn">3</span><b>Next step</b><small>who, what, by when</small></div>
              <div><div class="rv-input">Call Hannah and ask straight out if the project is still on<span class="rv-caret"></span></div>
                <div class="ib-nx"><span class="rv-field"><small>Due</small>Fri 30 Oct</span><span class="rv-field">${avatar(l.owner, h, "")}${e(l.owner)}</span><span class="rv-was">Replaces <s>${e(t.next)} · ${e(h.day(t.nextDue))}</s></span></div></div></div>
            <div class="ib-dock-f"><span class="rv-delta">Weighted value stays <b>${e(h.money((l.amount * h.stage(l.stageId).probability) / 100))}</b>; it moves from October to January.</span>
              <a href="#" class="st-btn is-ghost is-sm">Skip</a>
              <a href="#" class="st-btn is-ink is-sm">Save, next: ${e(nextDeal.title)}<span class="st-btn-ic">${I.arrowR}</span></a></div>
          </div>`;
          const inner = `${queue}
            <section class="th-thread" aria-label="Conversation under review">
              ${head(h, r, { closeLate: true, bar: reasonBar })}
              <div class="th-msgs">${msgs}</div>
              ${dock}
            </section>`;
          const keys = `<div class="rv-keys"><span><kbd>K</kbd><kbd>P</kbd><kbd>L</kbd> answer</span><span><kbd>1</kbd>–<kbd>4</kbd> pick a date</span><span><kbd>Tab</kbd> next question</span><span><kbd>↵</kbd> save and next</span><span><kbd>S</kbd> skip</span><span><kbd>Esc</kbd> pause</span></div>`;
          const body = `${inboxShell(side(d, h, { day: "wed", rev: "progress", active: "review" }), "is-review", inner)}${keys}`;
          return chrome(d, h, { center: bar }, body);
        },
      },
      // 6 ---------------------------------------------------------------
      {
        id: "review-done",
        title: "Review done",
        caption:
          "Seven minutes later. A receipt of what changed and how the forecast moved. Each answer was also written into its thread as a small event, like this one in Membership portal, and the new next steps are already in their owners' Needs reply.",
        render(d, h) {
          const e = h.esc;
          const p = plan(d);
          const L = (id) => d.leads.find((x) => x.id === id);
          const before = Math.round(weighted(p.open, h));
          const after = Math.round(weighted(p.open, h, DEC));
          const byNov = (over = {}) =>
            p.open.reduce((s, l) => {
              const o = over[l.id] || {};
              const cd = o.closeDate || l.closeDate;
              if (o.lost || !cd || cd > "2026-11-30") return s;
              return s + (l.amount * h.stage(l.stageId).probability) / 100;
            }, 0);
          const lostV = -(L("l9").amount * h.stage(L("l9").stageId).probability) / 100;
          const brRow = (title, sub, v) => {
            const bar = v < 0 ? `<i style="right:50%;width:50%;background:var(--st-rose)"></i>` : "";
            const val = v === 0 ? "€0" : `−${h.money(Math.abs(v))}`;
            return `<div class="rv-br"><span>${title}<small>${sub}</small></span><span class="rv-br-bar">${bar}<i style="left:50%;width:1px;background:rgba(21,24,29,.25);border-radius:0"></i></span><span class="rv-br-v ${v < 0 ? "is-neg" : "is-zero"}">${e(val)}</span></div>`;
          };
          const changed = ["l9", "l6", "l3"];
          const kept = p.all.length - changed.length;
          const changes = `<ul class="rv-chg">
            <li><span class="rv-chg-ic is-lost">${ic("lost")}</span><div><b>${e(L("l9").title)}</b><small>Marked lost · reason: Timing · ${e(L("l9").contact)}, ${e(L("l9").company)}</small></div><span class="rv-amt">${e(h.money(L("l9").amount))}</span></li>
            <li><span class="rv-chg-ic is-date">${ic("push")}</span><div><b>${e(L("l6").title)}</b><small>Close date <span class="rv-from">${e(h.day(L("l6").closeDate))}</span>${ic("arrowR")}<span class="rv-to">${e(h.day(DEC.l6.closeDate))}</span>· next step for Tomás</small></div><span class="rv-amt">${e(h.money(L("l6").amount))}</span></li>
            <li><span class="rv-chg-ic">${ic("person")}</span><div><b>${e(L("l3").title)}</b><small>Owner set to <span class="rv-to">${e(DEC.l3.owner)}</span>· close date <span class="rv-to">${e(h.day(DEC.l3.closeDate))}</span></small></div><span class="rv-amt">${e(h.money(L("l3").amount))}</span></li>
          </ul>
          <p class="rv-kept"><b>${kept} kept as they are.</b> E-commerce replatform and Patient intake forms got a fresh next step; the other seven were confirmed together at the end.</p>`;
          const steps = [
            { body: "Call Hannah and ask straight out if the project is still on", lead: "l6", who: "Tomás Reyes", due: "2026-10-30" },
            { body: d.touch.l8.next, lead: "l8", who: "Priya Nair", due: "2026-10-29" },
            { body: d.touch.l5.next, lead: "l5", who: "Jonas Weber", due: "2026-11-02" },
            { body: "Qualify scope and budget with Sofia", lead: "l3", who: "Priya Nair", due: "2026-11-03" },
          ]
            .map(
              (s) => `<li><span class="st-box" aria-hidden="true"></span><div><b>${e(s.body)}</b><small>${avatar(s.who, h)}${e(first(s.who))} · ${e(L(s.lead).title)}</small></div><span class="rv-d${s.due <= "2026-10-30" ? " is-soon" : ""}">${dow(s.due)} ${e(h.day(s.due))}</span></li>`,
            )
            .join("");
          const l6 = L("l6");
          const mini = `<div class="ib-mini">
            <div class="ib-mini-h"><span class="st-av">${e(h.initials(l6.contact))}</span><div><b>${e(l6.title)}</b><small>${e(l6.contact)} · ${e(l6.company)}</small></div><span class="th-stage">${e(h.stage(l6.stageId).name)}</span></div>
            ${bubble(h, { from: l6.owner, dir: "out", at: d.touch.l6.last + "T16:40", channel: "Email", body: "Outline and estimate attached (€11,000). Could you let us know by 21 Oct so we can plan the build?" })}
            <div class="ib-quiet"><span>28 days, no reply</span></div>
            ${dayline(WED, WED, h)}
            ${reviewed(h, `<span>· close date <s>${e(h.day(l6.closeDate))}</s> → <em>${e(h.day(DEC.l6.closeDate))}</em></span><span>· next step: <em>Call Hannah</em>, Tomás, Fri 30 Oct</span>`, "09:09")}
          </div>`;
          const inner = `<section class="ib-pad" aria-label="Review summary">
            <div class="ib-rs-h">
              <div>
                <p class="ib-kicker is-done">${ic("check")}Weekly review · done in 7 minutes</p>
                <h2>All ${p.all.length} deals checked.</h2>
                <p class="ib-lede">Three deals changed and four next steps went to their owners. The forecast now counts only what you said is real.</p>
                <div class="rv-tally"><span><b>1</b> lost</span><span><b>1</b> date pushed</span><span><b>1</b> owner set</span><span><b>${kept}</b> kept</span><span><b>4</b> next steps</span></div>
              </div>
              <div class="ib-go"><a href="#" class="st-btn is-primary">Back to Needs reply<span class="st-btn-ic">${I.arrowR}</span></a><a href="#" class="st-btn is-ghost is-sm">${ic("copy")}Copy summary for the team</a></div>
            </div>
            <div class="ib-done-grid">
              <div class="ib-sec"><div class="ib-sec-h"><h3>What changed</h3><span class="st-n">3</span></div>${changes}</div>
              <div class="ib-sec"><div class="ib-sec-h"><h3>Forecast</h3><small>Weighted by stage</small></div>
                <div class="rv-fc-top"><div><small>Before</small><b>${e(h.money(before))}</b></div>${ic("arrowR")}<div class="is-after"><small>After</small><b>${e(h.money(after))}</b></div></div>
                <div class="rv-bridge">
                  ${brRow(e(L("l9").title), "Lost, was 50% likely", lostV)}
                  ${brRow(e(L("l6").title), "Same value, now January", 0)}
                  ${brRow(e(L("l3").title), "Owner and date set", 0)}
                </div>
                <p class="rv-note">Closing by the end of November: <b>${e(h.money(Math.round(byNov())))}</b> → <b>${e(h.money(Math.round(byNov(DEC))))}</b>. Smaller, but nothing in it is past its date.</p>
              </div>
            </div>
            <div class="ib-done-grid">
              <div class="ib-sec"><div class="ib-sec-h"><h3>Written into the thread</h3><a href="#">Open thread${ic("arrowR")}</a></div>${mini}</div>
              <div class="ib-sec"><div class="ib-sec-h"><h3>Next steps it created</h3><span class="st-n">4</span></div>
                <ul class="ib-steps">${steps}</ul>
                <div class="ib-steps-f"><span>Each is in its owner's Needs reply. Next review: <b>${nextReview}</b></span><a href="#">Change schedule</a></div>
              </div>
            </div>
          </section>`;
          return chrome(d, h, { nav: "Inbox", badge: 5 }, inboxShell(side(d, h, { day: "after", rev: "done", active: "review" }), "is-one", inner));
        },
      },
      // 7 ---------------------------------------------------------------
      {
        id: "pipeline",
        title: "Pipeline lens",
        caption:
          "Pipeline is the same conversations grouped by stage, with totals and weighted values. Rows the review touched are flagged, the lost deal sits below, and every row opens its thread.",
        render(d, h) {
          const e = h.esc;
          const open = d.leads.filter((l) => l.status === "open" && !(DEC[l.id] || {}).lost).map((l) => ({ ...l, ...(DEC[l.id] || {}) }));
          const total = h.total(open);
          const openStages = d.stages.filter((s) => !s.is_won && !s.is_lost);
          const alpha = { s1: 0.16, s2: 0.3, s3: 0.55, s4: 0.9 };
          const wsum = open.reduce((s, l) => s + (l.amount * h.stage(l.stageId).probability) / 100, 0);
          const strip = openStages
            .map((s) => {
              const ls = open.filter((l) => l.stageId === s.id);
              const v = h.total(ls);
              return `<div class="th-seg" style="flex:${v} 1 0">
                <span class="th-seg-t">${e(s.name)}<small>${ls.length} · ${s.probability}%</small></span>
                <span class="th-bar" style="background:rgba(11,116,128,${alpha[s.id]})"></span>
                <span class="th-seg-v">${e(h.money(v))}</span>
                <span class="th-seg-m">${e(h.moneyShort((v * s.probability) / 100))} weighted</span>
              </div>`;
            })
            .join("");
          const won = d.leads.filter((l) => l.status === "won");
          const NEXT = { l6: "Call Hannah and ask if the project is still on", l3: "Qualify scope and budget with Sofia" };
          const FLAG = {
            l6: `${ic("push")}Pushed to 15 Jan`,
            l3: `${ic("person")}Owner set: Priya`,
            l8: `${ic("flag")}New next step`,
            l5: `${ic("flag")}New next step`,
          };
          const turn = (l) => {
            const t = d.touch[l.id];
            if (t.days >= 14) return `<span class="th-turn is-cold">Cold · ${t.days}d</span>`;
            const due = l.id === "l3" ? "2026-11-03" : t.nextDue;
            if (due && due <= "2026-10-29") return `<span class="th-turn is-reply">Your move</span>`;
            return `<span class="th-turn is-waiting">Their move</span>`;
          };
          const groups = openStages
            .slice()
            .reverse()
            .map((s) => {
              const ls = open.filter((l) => l.stageId === s.id).sort((a, b) => b.amount - a.amount);
              const v = h.total(ls);
              const rows = ls
                .map((l) => `<div class="th-lrow${FLAG[l.id] ? " is-flag" : ""}">
                    <span class="st-av">${e(h.initials(l.contact))}</span>
                    <span class="th-lr-t"><b>${e(l.title)}</b><small>${e(l.contact)} · ${e(l.company)}</small></span>
                    <span class="th-lr-n">${e(NEXT[l.id] || d.touch[l.id].next)}</span>
                    ${turn(l)}
                    <span class="ib-flag${FLAG[l.id] ? "" : " is-none"}">${FLAG[l.id] || "No change"}</span>
                    <span class="th-lr-a">${e(h.money(l.amount))}</span>
                  </div>`)
                .join("");
              return `<section><div class="th-g-h"><b>${e(s.name)}</b><span class="th-n">${ls.length}</span><span><b>${e(h.money(v))}</b> · ${s.probability}% · ${e(h.money((v * s.probability) / 100))} weighted</span></div>${rows}</section>`;
            })
            .join("");
          const lost = d.leads.find((l) => l.id === "l9");
          const inner = `<section class="ib-pad" aria-label="Conversations by stage">
            <div class="th-lens-h">
              <div><h2>By stage</h2><p>${open.length} open conversations · ${e(h.money(total))} open · ${e(h.money(Math.round(wsum)))} weighted</p></div>
              <span class="ib-lastrev">${ic("review")}<span>Last review <b>Wed 28 Oct</b> · 3 changed</span><a href="#">See summary</a></span>
            </div>
            <div class="th-strip">${strip}
              <div class="th-won"><span>Won this month</span><b>${e(h.money(h.total(won)))}</b><small>${won.length} deals</small></div>
            </div>
            <p class="th-legend">Bar length is open value; darker means more likely to close. Flags show what Wednesday's review changed. Click a row to open its thread.</p>
            <div class="th-groups">${groups}</div>
            <div class="ib-closed">${ic("lost")}<span>Closed in Wednesday's review: <b>${e(lost.title)}</b> · ${e(lost.contact)}, ${e(lost.company)} · lost, reason: Timing</span><s>${e(h.money(lost.amount))}</s></div>
          </section>`;
          return chrome(d, h, { nav: "Pipeline", badge: 5 }, inboxShell(side(d, h, { day: "after", rev: "done", active: "stage" }), "is-one", inner));
        },
      },
      // 8 ---------------------------------------------------------------
      {
        id: "person",
        title: "A person",
        caption:
          "Ioana under People: her details and privacy controls on the side, and all four of her threads as the main content instead of a timeline, each with its next move and latest messages.",
        render(d, h) {
          const e = h.esc;
          const D = d.detail;
          const c = D.contact;
          const p = c.privacy;
          const now = WED;
          const tl = D.timeline;
          const stEv = tl.find((x) => x.kind === "stage" && x.lead === "Dispatch console redesign");
          const task = D.openTasks.find((x) => x.lead === "Dispatch console redesign");
          const card = (lead, inner, cls = "") => {
            const st = h.stage(lead.stageId);
            return `<article class="ib-tcard ${cls}">
              <div class="ib-tcard-h"><b>${e(lead.title)}</b><span class="th-stage${st.is_won ? " is-won" : ""}">${e(st.name)}</span><span class="th-amt">${e(h.money(lead.amount))}</span><a href="#">Open${ic("arrowR")}</a></div>
              ${inner}
            </article>`;
          };
          const L = (id) => D.leads.find((x) => x.id === id);
          const threads = [
            card(
              L("l11"),
              `${owe(h, d.touch.l11.next, d.touch.l11.nextDue, now)}
              ${logCard(h, "call", "Call logged", d.thread[4].from, `${dow(d.thread[4].at)} ${d.thread[4].at.slice(11, 16)}`, d.thread[4].body)}
              ${moved(h, stEv.actor, stEv.from, stEv.to, `${dow(stEv.at)} ${stEv.at.slice(11, 16)}`)}
              ${sys(`${ic("task")}<span>Open task for ${e(first(task.assignee))}: ${e(task.body)} · ${dow(task.due)} ${e(h.day(task.due))}</span>`)}`,
              "is-top",
            ),
            card(
              L("l7"),
              `${owe(h, d.touch.l7.next, d.touch.l7.nextDue, now)}
              ${bubble(h, d.thread[3])}`,
            ),
            card(
              L("l4"),
              `${owe(h, d.touch.l4.next, d.touch.l4.nextDue, now)}
              ${bubble(h, d.thread[0])}
              ${bubble(h, d.thread[1])}`,
            ),
            `<article class="ib-tcard is-won"><div class="ib-tcard-h"><b>${e(L("l16").title)}</b><span class="th-stage is-won">Won</span><small>Closed earlier this year</small><span class="th-amt">${e(h.money(L("l16").amount))}</span><a href="#">Open${ic("arrowR")}</a></div></article>`,
          ].join("");
          const details = `<dl class="st-dl">
            <div><dt>Email</dt><dd>${e(c.email)}</dd></div>
            <div><dt>Phone</dt><dd>${e(c.phone)}</dd></div>
            <div><dt>Company</dt><dd>${e(c.company)}</dd></div>
            <div><dt>Owner</dt><dd><span class="st-owner">${avatar(c.owner, h)}${e(c.owner)}</span></dd></div>
            <div><dt>Added</dt><dd>${e(h.day(c.added))}</dd></div>
          </dl>`;
          const privacy = `<dl class="st-dl">
              <div><dt>Lawful basis</dt><dd>${e(p.lawfulBasis)}</dd></div>
              <div><dt>Consent</dt><dd>Given ${e(h.day(p.consent.given))} · ${e(p.consent.source)}</dd></div>
            </dl>
            <div class="st-quote">“${e(p.consent.text)}”<small>Captured via ${e(p.consent.source)} on ${e(h.date(p.consent.given))}</small></div>
            <dl class="st-dl" style="margin-top:10px"><div><dt>Contact</dt><dd>${p.contactAllowed ? `<span class="st-ok">Allowed</span>` : "Not allowed"}</dd></div></dl>
            <div class="st-pbtns"><a href="#" class="st-btn is-ghost is-sm">Withdraw consent</a><a href="#" class="st-btn is-ghost is-sm is-danger">Stop contact</a><a href="#" class="st-btn is-ghost is-sm">Export data</a></div>`;
          const inner = `<section class="ib-pad" aria-label="Person">
            <a href="#" class="ib-crumb">${ic("back")}People <span>/</span> ${e(c.company)}</a>
            <div class="ib-hero">
              <span class="st-av">${e(h.initials(c.name))}</span>
              <div><h2>${e(c.name)}</h2><p>${e(c.title)} at <b>${e(c.company)}</b></p><div class="st-tags">${c.tags.map((t) => `<span class="st-tag">${e(t)}</span>`).join("")}</div></div>
              <div class="ib-hero-r">
                <div class="ib-stat is-acc"><small>Open</small><b>${e(h.money(D.openValue))}</b></div>
                <div class="ib-stat"><small>Won</small><b>${e(h.money(D.wonValue))}</b></div>
                <a href="#" class="st-btn is-ghost is-sm">Edit</a>
                <a href="#" class="st-btn is-primary is-sm">New deal with ${e(first(c.name))}<span class="st-btn-ic">${I.plus}</span></a>
              </div>
            </div>
            <div class="ib-pgrid">
              <div>
                <div class="ib-sec-h"><h3>Threads</h3><span class="st-n">${D.leads.length}</span><small>Latest activity first</small></div>
                <div class="ib-threads">${threads}</div>
              </div>
              <aside class="ib-pside">
                <section><h3>Details</h3>${details}</section>
                <section><h3>${ic("shield")}Privacy<small>GDPR</small></h3>${privacy}</section>
                <section><h3>Notes</h3><p class="st-notes">${e(c.notes)}</p></section>
              </aside>
            </div>
          </section>`;
          return chrome(d, h, { nav: "People", badge: 5 }, inboxShell(side(d, h, { day: "after", rev: "done", active: null }), "is-one", inner));
        },
      },
    ],
  });
})();
