// Threads — the CRM as an inbox. Every lead is a conversation; calls, notes and
// stage changes are lines in that conversation, and the pipeline is one way of
// sorting the inbox rather than a separate board. Studio look.
(function () {
  const TODAY = "2026-10-28";
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const toUTC = (iso) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);
  const dow = (iso) => DOW[new Date(toUTC(iso)).getUTCDay()];

  const I = {
    search: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="M13 13l3.5 3.5"/></svg>`,
    plus: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11"/></svg>`,
    out: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4.5H5.5a1 1 0 00-1 1v9a1 1 0 001 1H8M12 7l3 3-3 3M15 10H8"/></svg>`,
    arrowR: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M11 6l4 4-4 4"/></svg>`,
    check: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3L15 6.5"/></svg>`,
    chev: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 8l4 4 4-4"/></svg>`,
    reply: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 5L4 9.5 8.5 14"/><path d="M4.5 9.5h6.5a5 5 0 015 5v1"/></svg>`,
    wait: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.6"/></svg>`,
    cold: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v14M4 6.5l12 7M16 6.5l-12 7"/><path d="M8 4.5l2 1.5 2-1.5M8 15.5l2-1.5 2 1.5"/></svg>`,
    won: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 4h7v3.5a3.5 3.5 0 01-7 0z"/><path d="M6.5 5.5H4.5a2 2 0 002 3M13.5 5.5h2a2 2 0 01-2 3M10 11v3M7 16h6"/></svg>`,
    stage: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="5" width="3.5" height="10" rx="1"/><rect x="8.25" y="5" width="3.5" height="7" rx="1"/><rect x="13.5" y="5" width="3.5" height="4.5" rx="1"/></svg>`,
    people: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="7.5" r="2.8"/><path d="M3.5 15.5c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4"/><path d="M13 5.2a2.6 2.6 0 010 5M14.5 11.8c1.2.5 2 1.8 2.3 3.7"/></svg>`,
    call: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 3.5l2 3.5-1.6 1.4a8 8 0 004.7 4.7L13 11.5l3.5 2-.7 2.3c-.2.6-.8 1-1.4.9C8.6 16 4 11.4 3.3 5.6c-.1-.6.3-1.2.9-1.4z"/></svg>`,
    note: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 3.5h6l3 3v10h-9z"/><path d="M8 10h4.5M8 13h4.5"/></svg>`,
    email: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="5" width="14" height="10.5" rx="2"/><path d="M3.5 6l6.5 5 6.5-5"/></svg>`,
    meeting: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/></svg>`,
    task: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="3"/><path d="M7 10.2l2 2 4-4.2"/></svg>`,
    move: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M12 6l4 4-4 4"/></svg>`,
    flag: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 17V3.5M5 4h9l-2 3.2 2 3.3H5"/></svg>`,
    globe: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M3.5 10h13M10 3.5c2 2 2 11 0 13M10 3.5c-2 2-2 11 0 13"/></svg>`,
    send: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10l12-6-4.5 12-2-5z"/><path d="M9.5 11L16 4"/></svg>`,
  };
  const ic = (k, cls = "") => `<span class="st-i ${cls}">${I[k]}</span>`;
  const NAV = ["Inbox", "People", "Reports", "Settings"];

  function chrome(d, h, body) {
    const e = h.esc;
    return `
<header class="st-top">
  <a class="st-brand" href="#"><span class="st-mark" aria-hidden="true"><i></i></span><span>Lead Tracker</span></a>
  <nav class="st-nav" aria-label="Main">${NAV.map((n) => `<a href="#" class="${n === "Inbox" ? "is-on" : ""}"${n === "Inbox" ? ' aria-current="page"' : ""}>${e(n)}${n === "Inbox" ? `<span class="th-navn">5</span>` : ""}</a>`).join("")}</nav>
  <div class="st-who">
    <span class="st-org"><i aria-hidden="true"></i>${e(d.org.name)}</span>
    <span class="st-user"><span class="st-av is-sm">${e(h.initials(d.viewer.name))}</span><span class="st-user-t"><b>${e(d.viewer.name)}</b><small>${e(d.viewer.role)}</small></span></span>
    <a class="st-iconbtn" href="#" aria-label="Sign out" title="Sign out">${I.out}</a>
  </div>
</header>
<main class="st-main th-main">${body}</main>`;
  }

  // Smart folders are rules, not labels someone has to maintain.
  // Going cold: no touch in 14+ days. Needs reply: our next step is due by tomorrow, or nobody owns it yet.
  // Waiting on them: everything else that's open.
  function folderOf(l, t) {
    if (l.status === "won") return "won";
    if (l.status !== "open" || !t) return "lost";
    if (t.days >= 14) return "cold";
    if (!l.owner || (t.nextDue && t.nextDue <= "2026-10-29")) return "reply";
    return "waiting";
  }
  const FOLDERS = [
    { id: "reply", name: "Needs reply", rule: "Your move, due by tomorrow", icon: "reply" },
    { id: "waiting", name: "Waiting on them", rule: "Their move, nothing due yet", icon: "wait" },
    { id: "cold", name: "Going cold", rule: "No touch in 14+ days", icon: "cold" },
    { id: "won", name: "Won", rule: "Closed this month", icon: "won" },
  ];

  const dueChip = (iso, h) => {
    if (!iso) return `<span class="th-due is-none">No date</span>`;
    const n = diffDays(TODAY, iso);
    if (n < 0) return `<span class="th-due is-late">${-n} day${n === -1 ? "" : "s"} late</span>`;
    if (n === 0) return `<span class="th-due is-today">Today</span>`;
    if (n === 1) return `<span class="th-due">Tomorrow</span>`;
    return `<span class="th-due">${dow(iso)} ${h.esc(h.day(iso))}</span>`;
  };
  const when = (iso, h) => {
    const n = diffDays(iso, TODAY);
    if (n === 0) return "Today";
    if (n === 1) return "Yesterday";
    if (n < 7) return dow(iso);
    return h.esc(h.day(iso));
  };

  function folders(d, h, active) {
    const e = h.esc;
    const counts = {};
    d.leads.forEach((l) => { const f = folderOf(l, d.touch[l.id]); counts[f] = (counts[f] || 0) + 1; });
    const open = d.leads.filter((l) => l.status === "open");
    return `<aside class="th-side" aria-label="Folders">
      <a href="#" class="th-new">${ic("plus")}New conversation</a>
      <p class="th-side-h">Folders</p>
      <ul class="th-folders">${FOLDERS.map((f) => `<li class="${f.id === active ? "is-on" : ""}${f.id === "won" ? " is-won" : ""}">
        ${ic(f.icon)}<span class="th-f-t"><b>${e(f.name)}</b><small>${e(f.rule)}</small></span><span class="th-f-n">${counts[f.id] || 0}</span></li>`).join("")}</ul>
      <p class="th-side-h">Views</p>
      <ul class="th-folders is-views">
        <li class="${active === "stage" ? "is-on" : ""}">${ic("stage")}<span class="th-f-t"><b>By stage</b><small>The pipeline, as conversations</small></span><span class="th-f-n">${open.length}</span></li>
        <li>${ic("people")}<span class="th-f-t"><b>By owner</b><small>Who owes what</small></span></li>
      </ul>
      <div class="th-pipe">
        <span>Open pipeline</span>
        <b>${e(h.money(h.total(open)))}</b>
        <small>${open.length} conversations · 1 lost this month</small>
      </div>
    </aside>`;
  }

  function list(d, h, sel) {
    const e = h.esc;
    const rows = d.leads
      .filter((l) => folderOf(l, d.touch[l.id]) === "reply")
      .sort((a, b) => (d.touch[b.id].last > d.touch[a.id].last ? 1 : d.touch[b.id].last < d.touch[a.id].last ? -1 : 0))
      .map((l) => {
        const t = d.touch[l.id];
        const st = h.stage(l.stageId);
        const next = l.owner ? t.next : "Nobody owns this yet";
        return `<li class="th-row${l.id === sel ? " is-sel" : ""}${l.id === "l3" ? " is-unread" : ""}">
          <span class="st-av">${e(h.initials(l.contact))}</span>
          <div class="th-row-b">
            <div class="th-row-t"><b>${e(l.contact)}</b><span class="th-co">${e(l.company)}</span><time>${when(t.last, h)}</time></div>
            <p class="th-row-l">${e(l.title)}</p>
            <p class="th-row-n">${ic("arrowR")}<span>${e(next)}</span>${dueChip(t.nextDue, h)}</p>
            <div class="th-row-f"><span class="th-stage">${e(st.name)}</span><span class="th-amt">${e(h.money(l.amount))}</span><span class="th-via">via ${e(t.via)}</span></div>
          </div>
        </li>`;
      })
      .join("");
    return `<section class="th-list" aria-label="Needs reply">
      <div class="th-list-h"><h2>Needs reply</h2><span class="th-sort">Latest touch first${ic("chev")}</span></div>
      <div class="th-search">${ic("search")}Search conversations<kbd>/</kbd></div>
      <ul>${rows}</ul>
      <p class="th-list-f">Waiting on them, Going cold and Won are one click away. Nothing is lost by being out of this folder.</p>
    </section>`;
  }

  function threadHead(d, h, l, nextCls) {
    const e = h.esc;
    const t = d.touch[l.id];
    const st = h.stage(l.stageId);
    return `<div class="th-head">
        <span class="st-av th-av-lg">${e(h.initials(l.contact))}</span>
        <div class="th-head-t"><h2>${e(l.title)}</h2><p>${e(l.contact)} · ${e(l.company)}</p></div>
        <div class="th-deal"><span class="th-stage is-ink">${e(st.name)}</span><b>${e(h.money(l.amount))}</b><small>Closes ${dow(l.closeDate)} ${e(h.day(l.closeDate))}</small></div>
      </div>
      <div class="th-owe${nextCls ? " " + nextCls : ""}">${ic("flag")}<span><b>Your move:</b> ${e(t.next)}</span>${dueChip(t.nextDue, h)}<a href="#" class="th-mini">Mark done</a></div>`;
  }

  function bubble(m, h) {
    const e = h.esc;
    const src = m.channel === "Website form" ? `<span class="st-src">${ic("globe")}via Website form · unverified</span>` : `<span>${e(m.channel)}</span>`;
    return `<div class="th-msg is-${m.dir}">
      <div class="th-msg-h"><b>${e(m.dir === "in" ? m.from : "You")}</b>${src}<time>${e(m.at.slice(11, 16))}</time></div>
      <p>${e(m.body)}</p>
    </div>`;
  }
  const dayline = (iso, h) => `<div class="th-day"><span>${dow(iso)} ${h.esc(h.day(iso))}</span></div>`;

  function composerIdle(h) {
    return `<div class="th-comp">
      <div class="th-comp-in">Reply to Ioana, or type <kbd>/</kbd> to log a call, add a note or move the deal</div>
      <div class="th-comp-f">
        <span class="th-slashes"><span>${ic("call")}/call</span><span>${ic("note")}/note</span><span>${ic("move")}/move</span><span>${ic("flag")}/next</span></span>
        <a href="#" class="st-btn is-ink is-sm">Send email<span class="st-btn-ic">${I.send}</span></a>
      </div>
    </div>`;
  }

  const css = `
.f-threads .th-main { margin-top: 26px; }
.f-threads .st-nav a { display: inline-flex; align-items: center; gap: 8px; }
.f-threads .th-navn { font: 600 11px/1 var(--st-body); padding: 3px 7px; border-radius: 999px; background: var(--st-accent); color: #fff; }
.f-threads .th-shell { display: grid; grid-template-columns: 228px minmax(0, 1fr); gap: 16px; align-items: stretch; }
.f-threads .th-core { display: grid; grid-template-columns: 372px minmax(0, 1fr); min-height: 860px; overflow: hidden; }
.f-threads .th-core.is-one { grid-template-columns: minmax(0, 1fr); min-height: 0; }

/* folders */
.f-threads .th-side { display: flex; flex-direction: column; gap: 6px; padding-top: 7px; min-width: 0; }
.f-threads .th-new { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: 999px; background: var(--st-ink); color: #fff; font: 500 13.5px/1 var(--st-body); box-shadow: inset 0 1px 0 rgba(255,255,255,.16), 0 10px 22px -12px rgba(16,24,40,.7); margin-bottom: 14px; }
.f-threads .th-new .st-i { width: 15px; height: 15px; }
.f-threads .th-side-h { font: 500 12px/1 var(--st-body); color: var(--st-faint); padding: 12px 12px 6px; }
.f-threads .th-folders { display: flex; flex-direction: column; gap: 2px; }
.f-threads .th-folders li { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 16px; color: var(--st-muted); }
.f-threads .th-folders li .st-i { width: 17px; height: 17px; }
.f-threads .th-folders li.is-on { background: var(--st-surface); color: var(--st-ink); box-shadow: var(--st-shadow), 0 0 0 1px var(--st-hair); }
.f-threads .th-folders li.is-on .st-i { color: var(--st-accent); }
.f-threads .th-f-t { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.f-threads .th-f-t b { font: 600 13.5px/1.2 var(--st-body); color: var(--st-ink); }
.f-threads .th-f-t small { font: 400 11.5px/1.25 var(--st-body); color: var(--st-faint); }
.f-threads .th-folders li.is-on .th-f-t small { color: var(--st-muted); }
.f-threads .th-f-n { font: 600 12px/1 var(--st-body); color: var(--st-muted); font-variant-numeric: tabular-nums; }
.f-threads .th-folders li.is-on .th-f-n { color: #fff; background: var(--st-ink); padding: 4px 8px; border-radius: 999px; }
.f-threads .th-folders li.is-won .th-f-n { color: var(--st-accent); }
.f-threads .th-pipe { margin-top: auto; padding: 16px 14px; border-radius: 20px; background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.8), 0 0 0 1px var(--st-hair); display: flex; flex-direction: column; gap: 4px; }
.f-threads .th-pipe span { font: 500 12px var(--st-body); color: var(--st-muted); }
.f-threads .th-pipe b { font: 600 22px/1.1 var(--st-display); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.f-threads .th-pipe small { font: 400 11.5px/1.3 var(--st-body); color: var(--st-faint); }

/* thread list */
.f-threads .th-list { border-right: 1px solid rgba(21,24,29,.06); background: #fafbfc; display: flex; flex-direction: column; min-width: 0; }
.f-threads .th-list-h { display: flex; justify-content: space-between; align-items: center; padding: 20px 20px 12px; }
.f-threads .th-list-h h2 { font: 600 20px/1.1 var(--st-display); letter-spacing: -0.025em; }
.f-threads .th-sort { display: inline-flex; align-items: center; gap: 4px; font: 500 12px var(--st-body); color: var(--st-muted); }
.f-threads .th-sort .st-i { width: 14px; height: 14px; }
.f-threads .th-search { margin: 0 14px 10px; display: flex; align-items: center; gap: 9px; height: 38px; padding: 0 14px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.07); font: 400 13px var(--st-body); color: var(--st-faint); }
.f-threads .th-search .st-i { width: 15px; height: 15px; color: var(--st-muted); }
.f-threads .th-search kbd, .f-threads kbd { margin-left: auto; font: 500 11px/1 var(--st-body); color: var(--st-muted); padding: 4px 7px; border-radius: 6px; background: #eef0f2; box-shadow: inset 0 -1px 0 rgba(21,24,29,.08); }
.f-threads .th-list ul { padding: 0 8px; display: flex; flex-direction: column; gap: 2px; }
.f-threads .th-row { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 12px; padding: 14px 12px; border-radius: 18px; position: relative; }
.f-threads .th-row + .th-row::before { content: ""; position: absolute; left: 58px; right: 12px; top: -1px; height: 1px; background: rgba(21,24,29,.05); }
.f-threads .th-row .st-av { width: 34px; height: 34px; font-size: 11.5px; }
.f-threads .th-row.is-sel { background: var(--st-surface); box-shadow: 0 0 0 1px rgba(11,116,128,.22), 0 10px 24px -16px rgba(16,24,40,.35); }
.f-threads .th-row.is-sel::before, .f-threads .th-row.is-sel + .th-row::before { display: none; }
.f-threads .th-row-b { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.f-threads .th-row-t { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.f-threads .th-row-t b { font: 600 13.5px/1.2 var(--st-body); white-space: nowrap; }
.f-threads .th-row.is-unread .th-row-t b::after { content: ""; display: inline-block; width: 7px; height: 7px; margin-left: 7px; border-radius: 50%; background: var(--st-accent); vertical-align: 1px; }
.f-threads .th-co { font: 400 12px var(--st-body); color: var(--st-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.f-threads .th-row-t time { margin-left: auto; font: 500 11.5px var(--st-body); color: var(--st-faint); white-space: nowrap; }
.f-threads .th-row-l { font: 500 13px/1.3 var(--st-body); color: #2c313a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-threads .th-row-n { display: flex; align-items: center; gap: 6px; font: 400 12.5px/1.3 var(--st-body); color: var(--st-muted); min-width: 0; }
.f-threads .th-row-n > span:not(.th-due) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.f-threads .th-row-n .st-i { width: 13px; height: 13px; color: var(--st-faint); }
.f-threads .th-row-f { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
.f-threads .th-via { margin-left: auto; font: 400 11.5px var(--st-body); color: var(--st-faint); white-space: nowrap; }
.f-threads .th-amt { font: 600 12.5px/1 var(--st-display); font-variant-numeric: tabular-nums; }
.f-threads .th-stage { display: inline-flex; align-items: center; gap: 6px; font: 500 11.5px/1 var(--st-body); color: var(--st-muted); padding: 5px 9px; border-radius: 999px; background: #eff1f3; white-space: nowrap; }
.f-threads .th-stage::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: rgba(21,24,29,.3); }
.f-threads .th-stage.is-ink { background: var(--st-ink); color: #fff; }
.f-threads .th-stage.is-ink::before { background: var(--st-accent); box-shadow: 0 0 0 2px rgba(255,255,255,.2); }
.f-threads .th-due { flex: none; margin-left: auto; font: 500 11px/1 var(--st-body); color: var(--st-muted); padding: 4px 8px; border-radius: 999px; background: #eff1f3; white-space: nowrap; }
.f-threads .th-due.is-late { color: var(--st-amber); background: var(--st-amber-soft); }
.f-threads .th-due.is-today { color: #075a63; background: var(--st-accent-soft); }
.f-threads .th-due.is-none { color: var(--st-faint); background: transparent; box-shadow: inset 0 0 0 1px rgba(21,24,29,.08); }
.f-threads .th-list-f { margin: auto 20px 18px; padding-top: 16px; font: 400 12px/1.45 var(--st-body); color: var(--st-faint); }

/* thread */
.f-threads .th-thread { display: flex; flex-direction: column; min-width: 0; }
.f-threads .th-head { display: grid; grid-template-columns: 46px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 20px 24px 16px; border-bottom: 1px solid rgba(21,24,29,.05); }
.f-threads .th-av-lg { width: 46px; height: 46px; border-radius: 16px; font-size: 14px; background: linear-gradient(160deg, #e6f3f4, #cfe7e9); }
.f-threads .th-head-t { min-width: 0; }
.f-threads .th-head h2 { font: 600 21px/1.15 var(--st-display); letter-spacing: -0.025em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-threads .th-head p { margin-top: 4px; font: 400 13px var(--st-body); color: var(--st-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-threads .th-deal { display: grid; grid-template-columns: auto auto; gap: 4px 10px; align-items: center; justify-items: end; text-align: right; }
.f-threads .th-deal b { font: 600 18px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.f-threads .th-deal small { grid-column: 1 / -1; font: 400 12px var(--st-body); color: var(--st-faint); }
.f-threads .th-owe { display: flex; align-items: center; gap: 10px; margin: 12px 24px 0; padding: 10px 10px 10px 14px; border-radius: 16px; background: #f5f6f8; font: 400 13px/1.35 var(--st-body); color: #2c313a; }
.f-threads .th-owe > .st-i { width: 15px; height: 15px; color: var(--st-accent); }
.f-threads .th-owe b { font-weight: 600; }
.f-threads .th-owe .th-due { margin-left: auto; }
.f-threads .th-owe.is-late { background: #fffaf2; box-shadow: inset 0 0 0 1px rgba(161,92,7,.14); }
.f-threads .th-owe.is-late > .st-i { color: var(--st-amber); }
.f-threads .th-mini { font: 500 12px/1 var(--st-body); padding: 8px 12px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08); white-space: nowrap; }
.f-threads .th-msgs { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 18px 24px 20px; }
.f-threads .th-day { display: flex; align-items: center; gap: 12px; margin: 6px 0 2px; font: 500 11.5px var(--st-body); color: var(--st-faint); }
.f-threads .th-day::before, .f-threads .th-day::after { content: ""; flex: 1; height: 1px; background: rgba(21,24,29,.06); }
.f-threads .th-msg { max-width: 78%; display: flex; flex-direction: column; gap: 6px; }
.f-threads .th-msg-h { display: flex; align-items: center; gap: 8px; font: 400 12px var(--st-body); color: var(--st-faint); }
.f-threads .th-msg-h b { font: 600 12.5px var(--st-body); color: var(--st-ink); }
.f-threads .th-msg-h .st-src { font-size: 11.5px; padding: 3px 8px; }
.f-threads .th-msg p { padding: 12px 16px; border-radius: 20px; font: 400 14px/1.5 var(--st-body); }
.f-threads .th-msg.is-in p { background: #f3f4f6; color: #22262d; border-top-left-radius: 6px; }
.f-threads .th-msg.is-out { align-self: flex-end; align-items: flex-end; }
.f-threads .th-msg.is-out p { background: var(--st-ink); color: #f4f6f8; border-top-right-radius: 6px; box-shadow: 0 10px 22px -16px rgba(16,24,40,.8); }
/* system events: what happened *to* the deal, set apart from what was said */
.f-threads .th-log { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 12px; padding: 12px 14px; border-radius: 18px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(11,116,128,.16), 0 8px 18px -14px rgba(16,24,40,.3); }
.f-threads .th-log-ic { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; background: var(--st-accent-soft); color: var(--st-accent); }
.f-threads .th-log-ic .st-i { width: 15px; height: 15px; }
.f-threads .th-log-h { display: flex; gap: 8px; align-items: baseline; font: 400 12px var(--st-body); color: var(--st-faint); }
.f-threads .th-log-h b { font: 600 12.5px var(--st-body); color: var(--st-ink); }
.f-threads .th-log-h time { margin-left: auto; }
.f-threads .th-log p { margin-top: 5px; font: 400 13.5px/1.5 var(--st-body); color: #2c313a; }
.f-threads .th-sys { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; font: 400 12.5px var(--st-body); color: var(--st-muted); padding: 2px 0; }
.f-threads .th-sys .st-i { width: 14px; height: 14px; color: var(--st-faint); }
.f-threads .th-chip { font: 500 12px/1 var(--st-body); padding: 5px 9px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08); color: var(--st-ink); }
.f-threads .th-chip.is-to { background: var(--st-ink); color: #fff; box-shadow: none; }
.f-threads .th-sys time { color: var(--st-faint); }
.f-threads .th-earlier { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 16px; background: #f7f8f9; box-shadow: inset 0 0 0 1px var(--st-hair); font: 400 12.5px/1.4 var(--st-body); color: var(--st-muted); }
.f-threads .th-earlier b { font-weight: 600; color: var(--st-ink); white-space: nowrap; }
.f-threads .th-earlier .st-i { width: 14px; height: 14px; color: var(--st-faint); }

/* composer */
.f-threads .th-comp { margin: 0 20px 20px; border-radius: 22px; background: #f5f6f8; padding: 6px; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-threads .th-comp-in { min-height: 64px; border-radius: 17px; background: var(--st-surface); padding: 14px 16px; font: 400 14px/1.5 var(--st-body); color: var(--st-faint); box-shadow: 0 0 0 1px rgba(21,24,29,.05), 0 2px 6px -3px rgba(16,24,40,.12); }
.f-threads .th-comp-in kbd { margin: 0 2px; }
.f-threads .th-comp-f { display: flex; align-items: center; gap: 10px; padding: 8px 4px 2px 8px; }
.f-threads .th-slashes { display: flex; gap: 4px; flex-wrap: wrap; }
.f-threads .th-slashes > span { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 999px; font: 500 12px/1 var(--st-body); color: var(--st-muted); }
.f-threads .th-slashes .st-i { width: 14px; height: 14px; }
.f-threads .th-comp-f .st-btn { margin-left: auto; }
.f-threads .st-btn.is-sm { padding-right: 4px; }
.f-threads .st-btn.is-sm .st-btn-ic { width: 26px; height: 26px; }
.f-threads .st-btn.is-sm .st-btn-ic svg { width: 14px; height: 14px; }

/* composer, mid-action */
.f-threads .th-comp.is-active { background: var(--st-surface); padding: 0; box-shadow: 0 0 0 1.5px rgba(11,116,128,.55), 0 0 0 6px rgba(11,116,128,.1), 0 24px 48px -24px rgba(16,24,40,.35); }
.f-threads .th-c-top { display: flex; align-items: center; gap: 10px; padding: 14px 16px 0; flex-wrap: wrap; }
.f-threads .th-token { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 12px 0 10px; border-radius: 999px; background: var(--st-accent); color: #fff; font: 600 12.5px/1 var(--st-body); }
.f-threads .th-token .st-i { width: 14px; height: 14px; }
.f-threads .th-with { font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-threads .th-oc { margin-left: auto; flex: none; display: inline-flex; padding: 3px; border-radius: 999px; background: #f2f3f5; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-threads .th-oc span { height: 28px; display: inline-flex; align-items: center; padding: 0 11px; border-radius: 999px; font: 500 12px/1 var(--st-body); color: var(--st-muted); }
.f-threads .th-oc span.is-on { background: var(--st-surface); color: var(--st-ink); box-shadow: 0 1px 2px rgba(16,24,40,.08), 0 4px 10px -4px rgba(16,24,40,.14); }
.f-threads .th-c-text { padding: 12px 16px 14px; font: 400 15px/1.55 var(--st-body); color: var(--st-ink); }
.f-threads .th-caret { display: inline-block; width: 1.5px; height: 18px; margin-left: 1px; vertical-align: -3px; background: var(--st-accent); }
.f-threads .th-sugg { margin: 0 8px; padding: 12px 8px 10px; border-top: 1px solid rgba(21,24,29,.06); display: flex; flex-direction: column; gap: 6px; }
.f-threads .th-sugg-h { font: 500 12px var(--st-body); color: var(--st-faint); padding: 0 6px 2px; }
.f-threads .th-sg { position: relative; display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 16px; background: #f6f8f9; }
.f-threads .th-sg.is-on { background: #eef6f7; box-shadow: inset 0 0 0 1px rgba(11,116,128,.16); }
.f-threads .th-tick { width: 20px; height: 20px; border-radius: 7px; display: grid; place-items: center; background: var(--st-accent); color: #fff; }
.f-threads .th-tick .st-i { width: 13px; height: 13px; }
.f-threads .th-tick svg { stroke-width: 2; }
.f-threads .th-sg-t b { display: block; font: 600 13.5px/1.3 var(--st-body); }
.f-threads .th-sg-t small { display: block; margin-top: 2px; font: 400 12px/1.35 var(--st-body); color: var(--st-muted); }
.f-threads .th-sg .th-chip { display: inline-flex; align-items: center; gap: 4px; }
.f-threads .th-dates { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.f-threads .th-dates > span { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08); font: 500 12.5px/1 var(--st-body); color: #2c313a; white-space: nowrap; }
.f-threads .th-dates small { font: 400 12px var(--st-body); color: var(--st-faint); }
.f-threads .th-dates > span.is-on { background: var(--st-accent); color: #fff; box-shadow: 0 0 0 3px rgba(11,116,128,.14); }
.f-threads .th-dates > span.is-on small { color: rgba(255,255,255,.8); }
.f-threads .th-dates .st-i { width: 13px; height: 13px; }
.f-threads .th-dates svg { stroke-width: 2; }
.f-threads .th-datebtn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px 0 12px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1.5px var(--st-accent); font: 600 12.5px/1 var(--st-body); color: var(--st-ink); white-space: nowrap; }
.f-threads .th-datebtn .st-i { width: 14px; height: 14px; color: var(--st-muted); }
.f-threads .th-pop { position: absolute; right: 0; bottom: calc(100% + 8px); width: 248px; padding: 6px; border-radius: 18px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08), 0 24px 48px -16px rgba(16,24,40,.35); z-index: 3; }
.f-threads .th-pop li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 12px; font: 500 13px var(--st-body); color: #2c313a; }
.f-threads .th-pop li small { font: 400 12px var(--st-body); color: var(--st-faint); }
.f-threads .th-pop li.is-on { background: var(--st-accent-soft); color: #075a63; }
.f-threads .th-pop li.is-on small { color: #0a5560; }
.f-threads .th-pop li.is-sep { margin-top: 4px; border-top: 1px solid rgba(21,24,29,.06); border-radius: 0 0 12px 12px; color: var(--st-muted); }
.f-threads .th-c-f { display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 18px; margin-top: 4px; border-top: 1px solid rgba(21,24,29,.06); background: #fafbfc; border-radius: 0 0 22px 22px; }
.f-threads .th-c-f > span { font: 400 12px/1.4 var(--st-body); color: var(--st-muted); }
.f-threads .th-keys { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font: 400 12px var(--st-body); color: var(--st-faint); white-space: nowrap; }
.f-threads .th-keys kbd { margin: 0; }
.f-threads .th-keys i { width: 10px; }
.f-threads .th-c-f .st-btn { flex: none; }

/* pipeline lens */
.f-threads .th-lens { padding: 22px 26px 26px; }
.f-threads .th-lens-h { display: flex; align-items: flex-end; gap: 16px; }
.f-threads .th-lens-h h2 { font: 600 26px/1.1 var(--st-display); letter-spacing: -0.03em; }
.f-threads .th-lens-h p { margin-top: 6px; font: 400 13.5px var(--st-body); color: var(--st-muted); }
.f-threads .th-toast { margin-left: auto; display: inline-flex; align-items: center; gap: 10px; padding: 6px 6px 6px 12px; border-radius: 999px; background: var(--st-ink); color: #fff; font: 400 13px var(--st-body); box-shadow: 0 16px 32px -16px rgba(16,24,40,.7); white-space: nowrap; }
.f-threads .th-toast .st-i { width: 16px; height: 16px; color: #7fd0d8; }
.f-threads .th-toast b { font-weight: 600; }
.f-threads .th-toast a { padding: 7px 12px; border-radius: 999px; background: rgba(255,255,255,.12); font-weight: 500; }
.f-threads .th-strip { margin-top: 22px; display: flex; gap: 6px; align-items: stretch; }
.f-threads .th-seg { min-width: 112px; display: flex; flex-direction: column; gap: 8px; }
.f-threads .th-seg-t { display: flex; align-items: baseline; gap: 6px; font: 600 13px/1.2 var(--st-body); white-space: nowrap; }
.f-threads .th-seg-t small { font: 400 12px var(--st-body); color: var(--st-faint); }
.f-threads .th-bar { height: 12px; border-radius: 999px; }
.f-threads .th-seg-v { font: 600 17px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.f-threads .th-seg-m { font: 400 11.5px/1.2 var(--st-body); color: var(--st-faint); white-space: nowrap; }
.f-threads .th-won { flex: none; width: 150px; margin-left: 10px; padding: 12px 14px; border-radius: 18px; background: var(--st-accent-soft); color: #075a63; display: flex; flex-direction: column; gap: 4px; justify-content: center; }
.f-threads .th-won span { font: 500 12px var(--st-body); }
.f-threads .th-won b { font: 600 17px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.f-threads .th-won small { font: 400 11.5px var(--st-body); color: #0a5560; }
.f-threads .th-legend { margin-top: 12px; font: 400 12px var(--st-body); color: var(--st-faint); }
.f-threads .th-groups { margin-top: 22px; display: flex; flex-direction: column; gap: 18px; }
.f-threads .th-g-h { display: flex; align-items: center; gap: 10px; padding: 0 12px 8px; border-bottom: 1px solid rgba(21,24,29,.06); }
.f-threads .th-g-h b { font: 600 15px/1.2 var(--st-display); letter-spacing: -0.015em; }
.f-threads .th-g-h .th-n { font: 600 11.5px/1 var(--st-body); color: var(--st-muted); background: rgba(21,24,29,.05); padding: 4px 8px; border-radius: 999px; }
.f-threads .th-g-h span:last-child { margin-left: auto; font: 400 12.5px var(--st-body); color: var(--st-muted); font-variant-numeric: tabular-nums; }
.f-threads .th-g-h span:last-child b { font: 600 13.5px var(--st-display); color: var(--st-ink); }
.f-threads .th-lrow { display: grid; grid-template-columns: 30px 250px minmax(0, 1fr) 112px 84px 84px; gap: 14px; align-items: center; padding: 10px 12px; border-radius: 14px; }
.f-threads .th-lrow + .th-lrow { box-shadow: 0 -1px 0 rgba(21,24,29,.04); }
.f-threads .th-lrow .st-av { width: 30px; height: 30px; font-size: 10.5px; }
.f-threads .th-lrow.is-new { background: #eef6f7; box-shadow: inset 0 0 0 1px rgba(11,116,128,.18); }
.f-threads .th-lr-t { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.f-threads .th-lr-t b { font: 600 13.5px/1.25 var(--st-body); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-threads .th-lr-t small { font: 400 12px/1.2 var(--st-body); color: var(--st-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-threads .th-lr-n { min-width: 0; font: 400 12.5px/1.3 var(--st-body); color: var(--st-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-threads .th-turn { justify-self: start; display: inline-flex; align-items: center; gap: 6px; font: 500 11.5px/1 var(--st-body); padding: 5px 9px; border-radius: 999px; white-space: nowrap; }
.f-threads .th-turn.is-reply { background: var(--st-ink); color: #fff; }
.f-threads .th-turn.is-waiting { background: #eff1f3; color: var(--st-muted); }
.f-threads .th-turn.is-cold { background: var(--st-amber-soft); color: var(--st-amber); }
.f-threads .th-lr-w { font: 400 12px var(--st-body); color: var(--st-faint); white-space: nowrap; }
.f-threads .th-lr-a { text-align: right; font: 600 13.5px var(--st-display); font-variant-numeric: tabular-nums; }
.f-threads .th-just { font: 500 11px/1 var(--st-body); color: #075a63; background: var(--st-accent-soft); padding: 3px 7px; border-radius: 999px; margin-left: 6px; vertical-align: 1px; }
`;

  (window.LT_FLOWS = window.LT_FLOWS || []).push({
    id: "threads",
    name: "Threads",
    look: "studio",
    pitch: "Your pipeline is a set of conversations, so work it like an inbox: open the thread that needs you, say something or log something, move on.",
    problem:
      "Today a deal lives in three places: a card on the board, a row in the table, and a detail page where the history sits at the bottom. To answer “what did Ioana last say and what do I owe her” you open the detail page and scroll. Logging a call is a form with a type picker and a separate stage dropdown, so people skip it.",
    principles: [
      "Every lead is one thread: emails in and out, logged calls, notes and stage changes in one timeline, newest at the bottom.",
      "Smart folders replace filters. Needs reply, Waiting on them and Going cold are rules (who owes the next move, days since last touch), so nobody has to sort anything.",
      "Each thread pins “Your move” at the top: the next step and when it's due.",
      "Logging is typing. /call, /note, /move and /next turn the reply box into a call log, and it suggests the stage change and follow-up date for you to accept.",
      "The pipeline is a view of the same inbox, grouped by stage with values, not a separate board.",
    ],
    tradeoffs:
      "It favours the person working their own deals one at a time. Managers who want to drag 20 cards across a board, or compare deals side by side by amount and close date, will find it slower than a table. It also leans on email being connected; without it the threads are thinner.",
    fonts: [],
    css,
    screens: [
      {
        id: "inbox",
        title: "The inbox",
        caption: "Ana opens Lead Tracker to five conversations that need her. Ioana's thread shows what was said, the call she logged and the stage change, with her next move pinned on top.",
        render(d, h) {
          const e = h.esc;
          const l = d.leads.find((x) => x.id === "l11");
          const stageEv = d.detail.timeline.find((x) => x.kind === "stage" && x.lead === l.title);
          let lastDay = "";
          const msgs = d.thread
            .map((m) => {
              const day = m.at.slice(0, 10);
              const sep = day !== lastDay ? dayline(day, h) : "";
              lastDay = day;
              if (m.dir === "log") {
                return `${sep}<div class="th-log"><span class="th-log-ic">${ic("call")}</span><div><div class="th-log-h"><b>Call logged</b><span>by ${e(m.from)}</span><time>${e(m.at.slice(11, 16))}</time></div><p>${e(m.body)}</p></div></div>`;
              }
              return sep + bubble(m, h);
            })
            .join("");
          const stage = `<div class="th-sys">${ic("move")}<span>${e(stageEv.actor.split(" ")[0])} moved this from</span><span class="th-chip">${e(stageEv.from)}</span><span>to</span><span class="th-chip is-to">${e(stageEv.to)}</span><time>· ${e(stageEv.at.slice(11, 16))}</time></div>
            <div class="th-sys">${ic("flag")}<span>Next step set: ${e(d.touch.l11.next)}, due ${dow(d.touch.l11.nextDue)} ${e(h.day(d.touch.l11.nextDue))}</span></div>`;
          const body = `<div class="th-shell">
            ${folders(d, h, "reply")}
            <div class="st-shell"><div class="st-core th-core">
              ${list(d, h, "l11")}
              <section class="th-thread" aria-label="Conversation">
                ${threadHead(d, h, l)}
                <div class="th-msgs">${msgs}${stage}</div>
                ${composerIdle(h)}
              </section>
            </div></div>
          </div>`;
          return chrome(d, h, body);
        },
      },
      {
        id: "log",
        title: "Logging is typing",
        caption: "In the Fleet tracking pilot thread Ana types /call and writes what happened. Lead Tracker offers the stage move and a follow-up date; she picks Friday and logs it all with one key.",
        render(d, h) {
          const e = h.esc;
          const l = d.leads.find((x) => x.id === "l7");
          const earlier = d.detail.timeline.filter((x) => x.lead === l.title && x.at < "2026-10-24");
          const out = d.thread[2];
          const inn = d.thread[3];
          const body = `<div class="th-shell">
            ${folders(d, h, "reply")}
            <div class="st-shell"><div class="st-core th-core">
              ${list(d, h, "l7")}
              <section class="th-thread" aria-label="Conversation">
                ${threadHead(d, h, l, "is-late")}
                <div class="th-msgs">
                  <div class="th-earlier">${ic("chev")}<b>${earlier.length} earlier</b><span>Moved to Proposal on 10 Oct · case study shared 15 Oct · Tomás on site at the Cluj depot 18 Oct</span></div>
                  ${dayline(out.at, h)}${bubble(out, h)}
                  ${dayline(inn.at, h)}${bubble(inn, h)}
                  ${dayline(TODAY, h)}
                </div>
                <div class="th-comp is-active" style="margin-top:0">
                  <div class="th-c-top"><span class="th-token">${ic("call")}Call</span><span class="th-with">with ${e(l.contact.split(" ")[0])} · now</span>
                    <span class="th-oc" role="radiogroup" aria-label="Outcome"><span class="is-on">Talked</span><span>Voicemail</span><span>No answer</span></span></div>
                  <div class="th-c-text">Ioana confirmed 120 vehicles, starting 1 Dec. She needs the revised proposal with the 3-month pilot option before legal signs.<i class="th-caret"></i></div>
                  <div class="th-sugg">
                    <p class="th-sugg-h">Also do, based on this call</p>
                    <div class="th-sg is-on"><span class="th-tick">${ic("check")}</span><span class="th-sg-t"><b>Move to Negotiation</b><small>They agreed on volume and a start date. Probability goes from 50% to 75%.</small></span><span class="th-chip">Proposal → Negotiation</span></div>
                    <div class="th-sg is-on"><span class="th-tick">${ic("check")}</span><span class="th-sg-t"><b>Next step: ${e(d.touch.l7.next)}</b><small>Replaces the overdue step from ${e(h.day(d.touch.l7.nextDue))}. Ana owns it.</small></span>
                      <span></span>
                      <div class="th-dates" role="radiogroup" aria-label="Due">
                        <span>Tomorrow<small>Thu 29</small></span>
                        <span class="is-on">${ic("check")}This Friday<small>30 Oct</small></span>
                        <span>Next week<small>Mon 2</small></span>
                        <span>Pick a date…</span>
                      </div>
                    </div>
                  </div>
                  <div class="th-c-f"><span>Adds the call, the stage change and the next step to this thread</span>
                    <span class="th-keys"><kbd>Esc</kbd> cancel<i></i><kbd>⌘</kbd><kbd>↵</kbd></span>
                    <a href="#" class="st-btn is-ink is-sm">Log call and move<span class="st-btn-ic">${I.arrowR}</span></a></div>
                </div>
              </section>
            </div></div>
          </div>`;
          return chrome(d, h, body);
        },
      },
      {
        id: "stages",
        title: "The pipeline is a lens",
        caption: "Switching the inbox to By stage shows the same 12 conversations grouped by stage, with values and whose move it is. The pilot Ana just logged has already moved to Negotiation.",
        render(d, h) {
          const e = h.esc;
          const moved = { l7: "s4" }; // from the call logged on the previous screen
          const open = d.leads.filter((l) => l.status === "open").map((l) => ({ ...l, stageId: moved[l.id] || l.stageId }));
          const total = h.total(open);
          const openStages = d.stages.filter((s) => !s.is_won && !s.is_lost);
          const alpha = { s1: 0.16, s2: 0.3, s3: 0.55, s4: 0.9 };
          const weighted = open.reduce((s, l) => s + (l.amount * h.stage(l.stageId).probability) / 100, 0);
          const strip = openStages
            .map((s) => {
              const list = open.filter((l) => l.stageId === s.id);
              const v = h.total(list);
              return `<div class="th-seg" style="flex:${v} 1 0">
                <span class="th-seg-t">${e(s.name)}<small>${list.length} · ${s.probability}%</small></span>
                <span class="th-bar" style="background:rgba(11,116,128,${alpha[s.id]})"></span>
                <span class="th-seg-v">${e(h.money(v))}</span>
                <span class="th-seg-m">${e(h.moneyShort((v * s.probability) / 100))} weighted</span>
              </div>`;
            })
            .join("");
          const won = d.leads.filter((l) => l.status === "won");
          const turn = (l) => {
            const t = d.touch[l.id];
            const f = folderOf(l, t);
            if (f === "cold") return `<span class="th-turn is-cold">Cold · ${t.days}d</span>`;
            if (f === "reply" || l.id === "l7") return `<span class="th-turn is-reply">Your move</span>`;
            return `<span class="th-turn is-waiting">Their move</span>`;
          };
          const groups = openStages
            .slice()
            .reverse()
            .map((s) => {
              const list = open.filter((l) => l.stageId === s.id).sort((a, b) => b.amount - a.amount);
              const rows = list
                .map((l) => {
                  const t = d.touch[l.id];
                  return `<div class="th-lrow${l.id === "l7" ? " is-new" : ""}">
                    <span class="st-av">${e(h.initials(l.contact))}</span>
                    <span class="th-lr-t"><b>${e(l.title)}${l.id === "l7" ? `<span class="th-just">Just moved</span>` : ""}</b><small>${e(l.contact)} · ${e(l.company)}</small></span>
                    <span class="th-lr-n">${l.owner ? e(t.next) : "Nobody owns this yet"}</span>
                    ${turn(l)}
                    <span class="th-lr-w">${l.id === "l7" ? "Today" : when(t.last, h)}</span>
                    <span class="th-lr-a">${e(h.money(l.amount))}</span>
                  </div>`;
                })
                .join("");
              return `<section><div class="th-g-h"><b>${e(s.name)}</b><span class="th-n">${list.length}</span><span><b>${e(h.money(h.total(list)))}</b> · ${s.probability}% likely</span></div>${rows}</section>`;
            })
            .join("");
          const body = `<div class="th-shell">
            ${folders(d, h, "stage")}
            <div class="st-shell"><div class="st-core th-core is-one">
              <section class="th-lens" aria-label="Conversations by stage">
                <div class="th-lens-h">
                  <div><h2>By stage</h2><p>${open.length} open conversations · ${e(h.money(total))} open · ${e(h.money(Math.round(weighted)))} weighted</p></div>
                  <span class="th-toast" role="status">${ic("check")}<span><b>Fleet tracking pilot</b> moved to Negotiation from your call</span><a href="#">Undo</a></span>
                </div>
                <div class="th-strip">${strip}
                  <div class="th-won"><span>Won this month</span><b>${e(h.money(h.total(won)))}</b><small>${won.length} deals</small></div>
                </div>
                <p class="th-legend">Bar length is open value; darker means more likely to close. Click a stage to filter the inbox to it.</p>
                <div class="th-groups">${groups}</div>
              </section>
            </div></div>
          </div>`;
          return chrome(d, h, body);
        },
      },
    ],
  });
})();
