// Ledger — the pipeline kept as a bookkeeper's sales ledger.
(function () {
  const dm = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : "");
  const fig = (n) => Math.round(Number(n)).toLocaleString("en-GB");
  const TICK =
    '<svg class="lg-tick" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8.6c1.6 1.2 2.7 2.6 4 4.6C8.4 8.6 10.9 5.2 14.4 2.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function chrome(d, h, active) {
    const nav = d.nav
      .map((n) => `<a class="lg-nav-i${n === active ? " is-on" : ""}"${n === active ? ' aria-current="page"' : ""}>${h.esc(n)}</a>`)
      .join("");
    return `<div class="lg-bind" aria-hidden="true"></div>
    <header class="lg-top">
      <div class="lg-mark">Lead Tracker</div>
      <nav class="lg-nav" aria-label="Main">${nav}</nav>
      <div class="lg-who">
        <span class="lg-org">${h.esc(d.org.name)}</span>
        <span class="lg-user">${h.esc(d.viewer.name)} <i class="lg-mono">${h.esc(d.viewer.role)}</i></span>
        <a class="lg-out">Sign out</a>
      </div>
    </header>`;
  }

  const cells = (n) => '<div class="lg-c"></div>'.repeat(n);
  const money = (n, extra = "") =>
    `<div class="lg-c lg-eur lg-mono${extra}">${fig(n)}</div><div class="lg-c lg-ct lg-mono${extra}">00</div>`;
  const ownerCell = (h, name) =>
    name ? `<abbr title="${h.esc(name)}">${h.esc(h.initials(name))}</abbr>` : '<span class="lg-un" title="Unassigned">—</span>';

  function board(d, h) {
    const colhead = `<div class="lg-row lg-colh"><div class="lg-c lg-m"></div><div class="lg-c">Date</div><div class="lg-c">Particulars</div><div class="lg-c">Owner</div><div class="lg-c">Due</div><div class="lg-c lg-eur">€</div><div class="lg-c lg-ct">c</div></div>`;

    const account = (s, i) => {
      const list = h.leadsIn(s.id);
      const tot = h.total(list);
      const tag = s.is_won
        ? `<span class="lg-ah-tag is-won">${TICK} Posted</span>`
        : s.is_lost
          ? '<span class="lg-ah-tag is-lost">Written off</span>'
          : "";
      const rows = list
        .map((l) => {
          const margin = l.status === "won" ? TICK : l.overdue ? '<span class="lg-od">o/d</span>' : "";
          const reason = l.status === "lost" && l.lostReason ? `<p class="lg-s lg-red">Reason: ${h.esc(l.lostReason)}</p>` : "";
          const due = l.closeDate ? h.esc(h.day(l.closeDate)) : '<span class="lg-un" title="No close date">—</span>';
          return `<div class="lg-row lg-entry is-${l.status}${l.overdue ? " is-od" : ""}">
            <div class="lg-c lg-m">${margin}</div>
            <div class="lg-c lg-mono lg-date">${dm(l.created)}</div>
            <div class="lg-c lg-part"><p class="lg-t">${h.esc(l.title)}</p><p class="lg-s">${h.esc(l.contact)} · ${h.esc(l.company)}</p>${reason}</div>
            <div class="lg-c lg-mono lg-own">${ownerCell(h, l.owner)}</div>
            <div class="lg-c lg-mono lg-due">${due}${l.overdue ? '<span class="lg-odl">overdue</span>' : ""}</div>
            ${money(l.amount)}
          </div>`;
        })
        .join("");
      const label = s.is_won ? "Posted to sales" : s.is_lost ? "Written off" : "Balance c/f";
      return `<section class="lg-acct is-${s.is_won ? "won" : s.is_lost ? "lost" : "open"}">
        <div class="lg-row lg-ahrow"><div class="lg-c lg-m"></div><div class="lg-c lg-ah"><h3>${h.esc(s.name)}</h3><span class="lg-mono lg-ah-meta">A/c ${i + 1} · ${list.length} ${list.length === 1 ? "entry" : "entries"} · ${s.probability}%</span>${tag}</div></div>
        ${rows}
        <div class="lg-row lg-tot"><div class="lg-c lg-m"></div><div class="lg-c lg-tot-l">${label}</div>${money(tot, " lg-sum")}</div>
        <div class="lg-row lg-blank">${cells(7)}</div>
      </section>`;
    };

    const open = d.stages.filter((s) => !s.is_won && !s.is_lost);
    const closed = d.stages.filter((s) => s.is_won || s.is_lost);
    const idx = (s) => d.stages.indexOf(s);

    let openBal = 0;
    let openW = 0;
    const tbRows = d.stages
      .map((s) => {
        const list = h.leadsIn(s.id);
        const bal = h.total(list);
        const w = (bal * s.probability) / 100;
        if (!s.is_won && !s.is_lost) {
          openBal += bal;
          openW += w;
        }
        const mark = s.is_won ? TICK : s.is_lost ? '<span class="lg-od">w/o</span>' : "";
        return `<div class="lg-tbrow${s.is_lost ? " is-lost" : ""}"><div class="lg-c lg-m">${mark}</div><div class="lg-c">${h.esc(s.name)}</div><div class="lg-c lg-mono lg-r">${list.length}</div><div class="lg-c lg-mono lg-r">${s.probability}%</div><div class="lg-c lg-mono lg-r">${fig(bal)}.00</div><div class="lg-c lg-mono lg-r">${fig(w)}.00</div></div>`;
      })
      .join("");

    return `${chrome(d, h, "Leads")}
    <div class="lg-head">
      <h1>Leads <span class="lg-count lg-mono">15 leads</span></h1>
      <p class="lg-folio lg-mono">Sales ledger · Oct 2026 · Fo. 14–15</p>
    </div>
    <div class="lg-tools">
      <div class="lg-seg" role="group" aria-label="View"><a class="is-on" aria-pressed="true">Board</a><a aria-pressed="false">Table</a></div>
      <div class="lg-field lg-search"><span class="lg-fl">Search</span><span class="lg-ph">Title, contact or company</span></div>
      <div class="lg-field"><span class="lg-fl">Owner</span><b>All owners</b><span class="lg-caret">▾</span></div>
      <div class="lg-field"><span class="lg-fl">Source</span><b>All sources</b><span class="lg-caret">▾</span></div>
      <span class="lg-sp"></span>
      <a class="lg-btn">Export CSV</a>
      <a class="lg-btn lg-btn-pri">+ New lead</a>
    </div>
    <div class="lg-spread">
      <div class="lg-page">
        <div class="lg-pageh"><span>Open accounts</span><span class="lg-mono">Fo. 14</span></div>
        ${colhead}
        ${open.map((s) => account(s, idx(s))).join("")}
        <div class="lg-row lg-fill">${cells(7)}</div>
      </div>
      <div class="lg-gutter" aria-hidden="true"></div>
      <div class="lg-page">
        <div class="lg-pageh"><span>Closed accounts</span><span class="lg-mono">Fo. 15</span></div>
        ${colhead}
        ${closed.map((s) => account(s, idx(s))).join("")}
        <div class="lg-row lg-fill">${cells(7)}</div>
        <section class="lg-tb">
          <div class="lg-tbtitle"><span>Trial balance</span><span class="lg-mono">at ${h.esc(h.day(d.today))} 2026</span></div>
          <div class="lg-tbrow lg-tbh"><div class="lg-c lg-m"></div><div class="lg-c">Account</div><div class="lg-c lg-r">No.</div><div class="lg-c lg-r">Prob.</div><div class="lg-c lg-r">Balance €</div><div class="lg-c lg-r">Weighted €</div></div>
          ${tbRows}
          <div class="lg-tbrow lg-tbtot"><div class="lg-c lg-m"></div><div class="lg-c">Open pipeline</div><div class="lg-c lg-mono lg-r">12</div><div class="lg-c"></div><div class="lg-c lg-mono lg-r lg-sum">${fig(openBal)}.00</div><div class="lg-c lg-mono lg-r lg-sum">${fig(openW)}.00</div></div>
          <p class="lg-sign lg-mono">Checked · ${h.esc(h.initials(d.viewer.name))} · ${h.esc(h.date(d.today))}</p>
        </section>
      </div>
    </div>`;
  }

  function contacts(d, h) {
    let openSum = 0;
    const rows = d.contacts
      .map((c, i) => {
        openSum += c.openLeads;
        const tags = c.tags.map((t) => `<span class="lg-tag">${h.esc(t)}</span>`).join("");
        const dnc = c.doNotContact ? '<span class="lg-dnc">Do not contact</span>' : "";
        const title = c.title ? h.esc(c.title) : '<span class="lg-un">No title</span>';
        return `<div class="lg-row lg-crow${c.id === "c1" ? " is-sel" : ""}${c.doNotContact ? " is-dnc" : ""}">
          <div class="lg-c lg-m">${c.doNotContact ? '<span class="lg-od">dnc</span>' : ""}</div>
          <div class="lg-c lg-mono lg-no">C-${String(i + 1).padStart(2, "0")}</div>
          <div class="lg-c lg-part"><p class="lg-t">${h.esc(c.name)} ${dnc}</p><p class="lg-s">${title}${tags ? ` <span class="lg-tags">${tags}</span>` : ""}</p></div>
          <div class="lg-c lg-email">${h.esc(c.email)}</div>
          <div class="lg-c lg-mono lg-phone">${c.phone ? h.esc(c.phone) : '<span class="lg-un">—</span>'}</div>
          <div class="lg-c">${h.esc(c.company)}</div>
          <div class="lg-c">${c.owner ? h.esc(c.owner) : '<span class="lg-un">Unassigned</span>'}</div>
          <div class="lg-c lg-mono lg-r${c.openLeads ? "" : " lg-zero"}">${c.openLeads}</div>
          <div class="lg-c lg-mono lg-r">${h.esc(h.date(c.added))}</div>
        </div>`;
      })
      .join("");

    return `${chrome(d, h, "Contacts")}
    <div class="lg-head">
      <h1>Contacts <span class="lg-count lg-mono">${d.contacts.length} contacts</span></h1>
      <p class="lg-folio lg-mono">Register of contacts · Fo. 21</p>
    </div>
    <div class="lg-tools">
      <div class="lg-field lg-search"><span class="lg-fl">Search</span><span class="lg-ph">Name, email or company</span></div>
      <div class="lg-field"><span class="lg-fl">Tag</span><b>All tags</b><span class="lg-caret">▾</span></div>
      <div class="lg-field"><span class="lg-fl">Owner</span><b>All owners</b><span class="lg-caret">▾</span></div>
      <span class="lg-sp"></span>
      <a class="lg-btn">Import CSV</a>
      <a class="lg-btn">Export CSV</a>
      <a class="lg-btn lg-btn-pri">+ New contact</a>
    </div>
    <div class="lg-sheet lg-reg">
      <div class="lg-pageh"><span>Register of contacts</span><span class="lg-mono">Fo. 21</span></div>
      <div class="lg-row lg-colh"><div class="lg-c lg-m"></div><div class="lg-c">No.</div><div class="lg-c">Name · title · tags</div><div class="lg-c">Email</div><div class="lg-c">Phone</div><div class="lg-c">Company</div><div class="lg-c">Owner</div><div class="lg-c lg-r">Open leads</div><div class="lg-c lg-r">Added</div></div>
      ${rows}
      <div class="lg-row lg-tot"><div class="lg-c lg-m"></div><div class="lg-c lg-tot-l">${d.contacts.length} contacts · open leads c/f</div><div class="lg-c lg-mono lg-r lg-sum">${openSum}</div><div class="lg-c"></div></div>
      <div class="lg-row lg-blank">${cells(9)}</div>
      <div class="lg-row lg-blank">${cells(9)}</div>
    </div>`;
  }

  function detail(d, h) {
    const D = d.detail;
    const c = D.contact;
    const leadStage = (title) => {
      const l = d.leads.find((x) => x.title === title) || D.leads.find((x) => x.title === title);
      return l ? h.stage(l.stageId) : null;
    };

    const leadRows = D.leads
      .map((l) => {
        const s = h.stage(l.stageId);
        return `<div class="lg-drow${s.is_won ? " is-won" : ""}"><div class="lg-c lg-m">${s.is_won ? TICK : ""}</div><div class="lg-c lg-t">${h.esc(l.title)}</div><div class="lg-c">${h.esc(s.name)}</div><div class="lg-c lg-mono lg-r">${s.probability}%</div>${money(l.amount)}</div>`;
      })
      .join("");

    const types = ["note", "call", "email", "meeting", "task"];
    const tasks = D.openTasks
      .map(
        (t) => `<div class="lg-task${t.overdue ? " is-od" : ""}">
          <span class="lg-box" role="checkbox" aria-checked="false" aria-label="Mark done"></span>
          <div class="lg-task-b"><p class="lg-t">${h.esc(t.body)}</p><p class="lg-s">${h.esc(t.lead)} · ${h.esc(t.assignee)}</p></div>
          <div class="lg-mono lg-task-d">${h.esc(h.dateTime(t.due))}${t.overdue ? '<span class="lg-odl">overdue</span>' : ""}</div>
        </div>`,
      )
      .join("");

    const day = D.timeline
      .map((e) => {
        const [date, time] = e.at.split("T");
        if (e.kind === "stage") {
          const text = e.from
            ? `Moved from <b>${h.esc(e.from)}</b> to <b>${h.esc(e.to)}</b> by ${h.esc(e.actor)}`
            : `Moved to <b>${h.esc(e.to)}</b> by ${h.esc(e.actor)}`;
          return `<div class="lg-jrow is-stage"><div class="lg-c lg-m">⇄</div><div class="lg-c lg-mono">${h.esc(h.day(date))}</div><div class="lg-c lg-mono">${time}</div><div class="lg-c lg-type">Stage</div><div class="lg-c"><p class="lg-jt">${text}</p><p class="lg-s">${h.esc(e.lead)}</p></div></div>`;
        }
        const who = e.source
          ? `<span class="lg-via">via ${h.esc(e.source)} · unverified</span>`
          : `<b>${h.esc(e.author)}</b>`;
        const done = e.completedAt;
        return `<div class="lg-jrow${done ? " is-done" : ""}"><div class="lg-c lg-m">${done ? TICK : ""}</div><div class="lg-c lg-mono">${h.esc(h.day(date))}</div><div class="lg-c lg-mono">${time}</div><div class="lg-c lg-type">${h.esc(h.TYPE_LABELS[e.type])}</div><div class="lg-c"><p class="lg-s">${who} · ${h.esc(e.lead)}${done ? ` · done ${h.esc(h.dateTime(done))}` : ""}</p><p class="lg-jb">${h.esc(e.body)}</p></div></div>`;
      })
      .join("");

    const p = c.privacy;
    return `${chrome(d, h, "Contacts")}
    <div class="lg-dhead">
      <a class="lg-back">← Contacts</a>
      <div class="lg-who2">
        <div class="lg-av lg-mono" aria-hidden="true">${h.esc(h.initials(c.name))}</div>
        <div>
          <h1>${h.esc(c.name)}</h1>
          <p class="lg-sub">${h.esc(c.title)} at ${h.esc(c.company)} <span class="lg-mono lg-acno">A/c C-01 · Fo. 21</span></p>
        </div>
        <div class="lg-acts"><a class="lg-btn lg-btn-pri">+ New lead</a><a class="lg-btn">Edit</a><a class="lg-btn lg-btn-red">Delete</a></div>
      </div>
    </div>
    <div class="lg-dgrid">
      <div class="lg-main">
        <section class="lg-sheet">
          <div class="lg-pageh"><span>Leads account</span><span class="lg-mono">${D.leads.length} entries</span></div>
          <div class="lg-drow lg-colh"><div class="lg-c lg-m"></div><div class="lg-c">Particulars</div><div class="lg-c">Stage</div><div class="lg-c lg-r">Prob.</div><div class="lg-c lg-eur">€</div><div class="lg-c lg-ct">c</div></div>
          ${leadRows}
          <div class="lg-drow lg-tot"><div class="lg-c lg-m"></div><div class="lg-c lg-tot-l">Open · balance c/f</div>${money(D.openValue, " lg-sum")}</div>
          <div class="lg-drow lg-tot is-won"><div class="lg-c lg-m">${TICK}</div><div class="lg-c lg-tot-l">Won · posted</div>${money(D.wonValue, " lg-sum")}</div>
        </section>

        <section class="lg-sheet lg-comp">
          <div class="lg-pageh"><span>New entry</span><span class="lg-mono">${h.esc(h.date(d.today))}</span></div>
          <div class="lg-comp-in">
            <div class="lg-seg lg-types" role="radiogroup" aria-label="Activity type">${types.map((t, i) => `<a role="radio" aria-checked="${i === 0}" class="${i === 0 ? "is-on" : ""}">${h.TYPE_LABELS[t]}</a>`).join("")}</div>
            <div class="lg-ta"><span class="lg-ph">What happened? Write it as you would in the day book…</span></div>
            <div class="lg-comp-f"><span class="lg-s">Linked lead: <b>none</b> ▾</span><a class="lg-btn lg-btn-pri">Log activity</a></div>
          </div>
        </section>

        <section class="lg-sheet">
          <div class="lg-pageh"><span>Open tasks</span><span class="lg-mono">${D.openTasks.length} open</span></div>
          ${tasks}
        </section>

        <section class="lg-sheet">
          <div class="lg-pageh"><span>Day book</span><span class="lg-mono">newest first</span></div>
          <div class="lg-jrow lg-colh"><div class="lg-c lg-m"></div><div class="lg-c">Date</div><div class="lg-c">Time</div><div class="lg-c">Type</div><div class="lg-c">Particulars</div></div>
          ${day}
        </section>
      </div>

      <aside class="lg-side">
        <section class="lg-sheet">
          <div class="lg-pageh"><span>Details</span></div>
          <dl class="lg-kv">
            <dt>Email</dt><dd>${h.esc(c.email)}</dd>
            <dt>Phone</dt><dd class="lg-mono">${h.esc(c.phone)}</dd>
            <dt>Company</dt><dd>${h.esc(c.company)}</dd>
            <dt>Owner</dt><dd>${h.esc(c.owner)}</dd>
            <dt>Tags</dt><dd>${c.tags.map((t) => `<span class="lg-tag">${h.esc(t)}</span>`).join(" ")}</dd>
            <dt>Added</dt><dd class="lg-mono">${h.esc(h.date(c.added))}</dd>
          </dl>
        </section>
        <section class="lg-sheet">
          <div class="lg-pageh"><span>Privacy</span><span class="lg-mono">GDPR</span></div>
          <dl class="lg-kv">
            <dt>Lawful basis</dt><dd>${h.esc(p.lawfulBasis)}</dd>
            <dt>Consent</dt><dd>Given <span class="lg-mono">${h.esc(h.date(p.consent.given))}</span><q class="lg-q">${h.esc(p.consent.text)}</q><span class="lg-s">Source: ${h.esc(p.consent.source)}</span></dd>
            <dt>Contact</dt><dd class="lg-ok">${p.contactAllowed ? `${TICK} Allowed` : "Not allowed"}</dd>
          </dl>
          <div class="lg-pbtns"><a class="lg-btn lg-btn-sm">Withdraw consent</a><a class="lg-btn lg-btn-sm lg-btn-red">Stop contact</a><a class="lg-btn lg-btn-sm">Export data</a></div>
        </section>
        <section class="lg-sheet">
          <div class="lg-pageh"><span>Notes</span></div>
          <p class="lg-notes">${h.esc(c.notes)}</p>
        </section>
      </aside>
    </div>`;
  }

  const css = `
.v-ledger{--paper:#edf3e7;--sheet:#f6f9f2;--rule:#c5d9bf;--col:#8bb093;--ink:#1d2722;--mute:#5a6c61;--red:#b3302a;--green:#2f5d45;
  background:var(--paper);color:var(--ink);font-family:'Barlow',ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.35;min-height:820px;padding-bottom:40px;}
.v-ledger p,.v-ledger h1,.v-ledger h3,.v-ledger dl,.v-ledger dd{margin:0}
.v-ledger a{color:inherit;text-decoration:none;cursor:pointer}
.v-ledger abbr{text-decoration:none}
.v-ledger .lg-mono{font-family:'IBM Plex Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
.v-ledger .lg-tick{width:15px;height:15px;color:var(--green);vertical-align:-2px}
.v-ledger .lg-red{color:var(--red)}
.v-ledger .lg-un{color:var(--mute);font-style:italic}
.v-ledger .lg-r{text-align:right}

.v-ledger .lg-bind{height:12px;background:linear-gradient(var(--green) 0 8px,transparent 8px 10px,var(--green) 10px 11px,transparent 11px)}
.v-ledger .lg-top{display:flex;align-items:center;gap:28px;padding:12px 32px;border-bottom:1px solid var(--ink)}
.v-ledger .lg-mark{font:700 22px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.05em;padding-bottom:4px;border-bottom:3px double var(--ink)}
.v-ledger .lg-nav{display:flex}
.v-ledger .lg-nav-i{font:500 15px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.09em;color:var(--mute);padding:6px 14px 5px;border-left:1px solid var(--col)}
.v-ledger .lg-nav-i:first-child{border-left:0}
.v-ledger .lg-nav-i.is-on{color:var(--ink);font-weight:600;text-decoration:underline double;text-underline-offset:5px}
.v-ledger .lg-who{margin-left:auto;display:flex;align-items:center;gap:16px;font-size:13px}
.v-ledger .lg-org{font-weight:600}
.v-ledger .lg-user i{font-style:normal;font-size:11px;color:var(--mute);border:1px solid var(--col);padding:0 4px;margin-left:4px}
.v-ledger .lg-out{color:var(--mute);text-decoration:underline;text-underline-offset:3px}

.v-ledger .lg-head{display:flex;align-items:flex-end;justify-content:space-between;padding:22px 32px 14px}
.v-ledger h1{font:600 40px/1 'Barlow Condensed','Arial Narrow',sans-serif;letter-spacing:.01em}
.v-ledger .lg-count{font-size:14px;font-weight:400;color:var(--mute);letter-spacing:0;margin-left:10px}
.v-ledger .lg-folio{font-size:12px;color:var(--mute)}

.v-ledger .lg-tools{display:flex;align-items:stretch;gap:10px;padding:0 32px 18px}
.v-ledger .lg-sp{flex:1}
.v-ledger .lg-seg{display:flex;border:1px solid var(--ink)}
.v-ledger .lg-seg a{font:500 14px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.08em;padding:10px 14px;color:var(--mute);display:flex;align-items:center}
.v-ledger .lg-seg a+a{border-left:1px solid var(--ink)}
.v-ledger .lg-seg a.is-on{background:var(--ink);color:var(--sheet)}
.v-ledger .lg-field{display:flex;align-items:center;gap:8px;border:1px solid var(--col);background:var(--sheet);padding:0 10px;height:36px;font-size:13.5px}
.v-ledger .lg-field b{font-weight:500}
.v-ledger .lg-fl{font:600 11px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--mute);padding-right:8px;border-right:1px solid var(--rule);align-self:stretch;display:flex;align-items:center}
.v-ledger .lg-search{width:280px}
.v-ledger .lg-ph{color:var(--mute);font-style:italic}
.v-ledger .lg-caret{color:var(--mute);font-size:11px}
.v-ledger .lg-btn{font:600 14px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.08em;border:1px solid var(--ink);padding:0 14px;height:36px;display:inline-flex;align-items:center;background:var(--sheet);white-space:nowrap}
.v-ledger .lg-btn-pri{background:var(--green);border-color:var(--green);color:#f3f8ef}
.v-ledger .lg-btn-red{color:var(--red);border-color:var(--red)}
.v-ledger .lg-btn-sm{height:30px;font-size:13px;padding:0 10px}

/* ruled sheets */
.v-ledger .lg-spread{margin:0 32px;display:grid;grid-template-columns:minmax(0,1fr) 20px minmax(0,1fr);border:1px solid var(--col);background:var(--sheet)}
.v-ledger .lg-gutter{border-left:1px solid var(--col);border-right:1px solid var(--col);background:linear-gradient(90deg,rgba(47,93,69,.04),rgba(47,93,69,.16) 50%,rgba(47,93,69,.04))}
.v-ledger .lg-page{display:flex;flex-direction:column;min-width:0}
.v-ledger .lg-sheet{border:1px solid var(--col);background:var(--sheet)}
.v-ledger .lg-pageh{display:flex;justify-content:space-between;align-items:baseline;padding:9px 12px 7px;border-bottom:1px solid var(--ink);font:600 14px/1.1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.12em}
.v-ledger .lg-pageh .lg-mono{font-size:11.5px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--mute)}

.v-ledger .lg-row,.v-ledger .lg-tbrow,.v-ledger .lg-drow,.v-ledger .lg-jrow{display:grid;border-bottom:1px solid var(--rule)}
.v-ledger .lg-page .lg-row{grid-template-columns:28px 52px minmax(0,1fr) 44px 66px 82px 30px}
.v-ledger .lg-c{padding:6px 8px;min-width:0}
.v-ledger .lg-c+.lg-c{border-left:1px solid var(--col)}
.v-ledger .lg-c.lg-m{padding:6px 0;display:flex;justify-content:center;align-items:flex-start;border-right:3px double var(--red)}
.v-ledger .lg-m+.lg-c{border-left:0}
.v-ledger .lg-c.lg-eur,.v-ledger .lg-c.lg-ct{border-left:1px solid var(--red)}
.v-ledger .lg-eur{text-align:right}
.v-ledger .lg-ct{text-align:center;padding-left:2px;padding-right:2px;color:var(--mute)}
.v-ledger .lg-colh{font:600 11px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--mute);border-bottom:3px double var(--col)}
.v-ledger .lg-colh .lg-c{padding-top:7px;padding-bottom:6px}
.v-ledger .lg-colh .lg-eur,.v-ledger .lg-colh .lg-ct{color:var(--red);text-align:center}

.v-ledger .lg-entry{min-height:46px}
.v-ledger .lg-entry .lg-c{padding-top:7px}
.v-ledger .lg-entry .lg-mono{font-size:12.5px}
.v-ledger .lg-entry .lg-eur{font-size:13.5px;font-weight:500}
.v-ledger .lg-t{font-weight:500;font-size:14px;line-height:1.25}
.v-ledger .lg-s{font-size:12px;color:var(--mute);line-height:1.35}
.v-ledger .lg-s.lg-red{color:var(--red);font-style:italic}
.v-ledger .lg-date{color:var(--mute)}
.v-ledger .lg-own{text-align:center}
.v-ledger .lg-due{display:flex;flex-direction:column}
.v-ledger .lg-od{font:500 10px/1.4 'IBM Plex Mono',ui-monospace,monospace;color:var(--red);letter-spacing:.02em}
.v-ledger .lg-odl{font:600 10.5px/1.3 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.08em;color:var(--red)}
.v-ledger .is-od .lg-due{color:var(--red);font-weight:500}
.v-ledger .is-lost .lg-eur,.v-ledger .is-lost .lg-ct{color:var(--red)}
.v-ledger .is-lost .lg-t{text-decoration:line-through;text-decoration-color:var(--red);text-decoration-thickness:1px}

.v-ledger .lg-ahrow .lg-ah{grid-column:2 / -1;display:flex;align-items:baseline;gap:12px;padding:10px 10px 6px}
.v-ledger .lg-ah h3{font:600 17px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.08em}
.v-ledger .lg-ah-meta{font-size:11.5px;color:var(--mute)}
.v-ledger .lg-ah-tag{margin-left:auto;font:600 11px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.1em;padding:3px 6px;border:1px solid currentColor;display:inline-flex;gap:4px;align-items:center}
.v-ledger .lg-ah-tag.is-won{color:var(--green)}
.v-ledger .lg-ah-tag.is-lost{color:var(--red)}
.v-ledger .lg-ah-tag .lg-tick{width:12px;height:12px}
.v-ledger .lg-acct.is-lost .lg-ah h3{color:var(--red)}

.v-ledger .lg-tot{border-bottom:0}
.v-ledger .lg-tot .lg-tot-l{grid-column:2 / -3;text-align:right;font:600 12px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--mute);padding-top:9px}
.v-ledger .lg-sum{font-weight:600;color:var(--ink)}
.v-ledger .lg-tot .lg-sum,.v-ledger .lg-tbtot .lg-sum{box-shadow:inset 0 1px 0 var(--ink);border-bottom:3px double var(--ink);padding-top:7px;padding-bottom:5px}
.v-ledger .lg-tot .lg-ct.lg-sum{color:var(--ink)}
.v-ledger .lg-acct.is-lost .lg-tot .lg-sum{color:var(--red);border-bottom-color:var(--red);box-shadow:inset 0 1px 0 var(--red)}
.v-ledger .lg-blank{min-height:16px}
.v-ledger .lg-fill{flex:1;min-height:22px;background:repeating-linear-gradient(to bottom,transparent 0 21px,var(--rule) 21px 22px)}

.v-ledger .lg-tb{border-top:1px solid var(--ink)}
.v-ledger .lg-tbtitle{display:flex;justify-content:space-between;align-items:baseline;padding:10px 12px 6px 38px;font:600 17px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.08em}
.v-ledger .lg-tbtitle .lg-mono{font-size:11.5px;font-weight:400;color:var(--mute);letter-spacing:0;text-transform:none}
.v-ledger .lg-tbrow{grid-template-columns:28px minmax(0,1fr) 40px 52px 108px 108px;font-size:13.5px}
.v-ledger .lg-tbrow .lg-c{padding-top:6px;padding-bottom:5px}
.v-ledger .lg-tbrow .lg-mono{font-size:12.5px}
.v-ledger .lg-tbh{font:600 11px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--mute);border-bottom:3px double var(--col)}
.v-ledger .lg-tbrow.is-lost{color:var(--red)}
.v-ledger .lg-tbtot{border-bottom:0;font-weight:600}
.v-ledger .lg-tbtot .lg-c:nth-child(2){font:600 12px/1.3 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.1em;padding-top:9px}
.v-ledger .lg-sign{font-size:11.5px;color:var(--mute);text-align:right;padding:10px 12px 12px;border-top:1px solid var(--rule)}

/* contacts register */
.v-ledger .lg-reg{margin:0 32px}
.v-ledger .lg-reg .lg-row{grid-template-columns:28px 54px minmax(0,1.75fr) minmax(0,1.55fr) 148px minmax(0,1.05fr) 112px 78px 96px}
.v-ledger .lg-crow{min-height:50px}
.v-ledger .lg-crow .lg-c{padding-top:8px;font-size:13.5px}
.v-ledger .lg-crow .lg-mono{font-size:12.5px}
.v-ledger .lg-no{color:var(--mute)}
.v-ledger .lg-email{overflow-wrap:anywhere}
.v-ledger .lg-zero{color:var(--mute)}
.v-ledger .lg-crow.is-sel{background:#e3edda}
.v-ledger .lg-crow.is-sel .lg-m{box-shadow:inset 3px 0 0 var(--green)}
.v-ledger .lg-tags{display:inline-flex;flex-wrap:wrap;gap:4px;vertical-align:1px;margin-left:4px}
.v-ledger .lg-tag{font:500 11px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.07em;color:var(--green);border:1px solid var(--col);padding:2px 5px 1px;display:inline-block;background:var(--paper)}
.v-ledger .lg-dnc{font:600 11px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.08em;color:var(--red);border:1px solid var(--red);padding:2px 5px 1px;margin-left:6px;vertical-align:2px;display:inline-block}
.v-ledger .is-dnc .lg-email,.v-ledger .is-dnc .lg-phone{color:var(--red);text-decoration:line-through;text-decoration-thickness:1px}
.v-ledger .lg-reg .lg-tot .lg-tot-l{grid-column:2 / 8}

/* detail */
.v-ledger .lg-dhead{padding:16px 32px 20px}
.v-ledger .lg-back{font:600 13px/1 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--mute)}
.v-ledger .lg-who2{display:flex;align-items:center;gap:16px;margin-top:14px}
.v-ledger .lg-av{width:60px;height:60px;border:1px solid var(--ink);outline:1px solid var(--ink);outline-offset:3px;display:grid;place-items:center;font-size:20px;font-weight:500;background:var(--sheet)}
.v-ledger .lg-who2 h1{font-size:38px}
.v-ledger .lg-sub{margin-top:5px;font-size:15px}
.v-ledger .lg-acno{font-size:11.5px;color:var(--mute);margin-left:10px}
.v-ledger .lg-acts{margin-left:auto;display:flex;gap:8px}
.v-ledger .lg-dgrid{display:grid;grid-template-columns:minmax(0,1fr) 372px;gap:22px;padding:0 32px;align-items:start}
.v-ledger .lg-main,.v-ledger .lg-side{display:flex;flex-direction:column;gap:18px;min-width:0}
.v-ledger .lg-drow{grid-template-columns:28px minmax(0,1fr) 116px 56px 92px 30px;font-size:13.5px}
.v-ledger .lg-drow .lg-c{padding-top:7px;padding-bottom:6px}
.v-ledger .lg-drow .lg-t{font-size:13.5px}
.v-ledger .lg-drow.lg-colh .lg-c{padding-top:7px;padding-bottom:6px}
.v-ledger .lg-drow .lg-mono{font-size:12.5px}
.v-ledger .lg-drow.is-won .lg-c:nth-child(3){color:var(--green);font-weight:600}
.v-ledger .lg-drow.lg-tot.is-won .lg-tot-l{color:var(--green)}
.v-ledger .lg-drow.lg-tot .lg-sum{font-size:13.5px}

.v-ledger .lg-comp-in{padding:12px}
.v-ledger .lg-types{display:inline-flex}
.v-ledger .lg-types a{padding:8px 12px;font-size:13px}
.v-ledger .lg-ta{margin-top:10px;height:88px;border:1px solid var(--col);padding:4px 10px;background:var(--sheet) repeating-linear-gradient(to bottom,transparent 0 21px,var(--rule) 21px 22px);line-height:22px;font-size:13.5px}
.v-ledger .lg-comp-f{display:flex;justify-content:space-between;align-items:center;margin-top:10px}

.v-ledger .lg-task{display:grid;grid-template-columns:28px minmax(0,1fr) 128px;gap:10px;align-items:start;padding:9px 12px 9px 10px;border-bottom:1px solid var(--rule)}
.v-ledger .lg-task:last-child{border-bottom:0}
.v-ledger .lg-box{width:16px;height:16px;border:1px solid var(--ink);background:var(--sheet);margin:2px 0 0 6px}
.v-ledger .lg-task-d{font-size:12px;text-align:right;display:flex;flex-direction:column;align-items:flex-end}
.v-ledger .lg-task.is-od .lg-task-d{color:var(--red);font-weight:500}
.v-ledger .lg-task.is-od .lg-box{border-color:var(--red)}

.v-ledger .lg-jrow{grid-template-columns:28px 64px 52px 74px minmax(0,1fr)}
.v-ledger .lg-jrow .lg-c{padding-top:8px;padding-bottom:8px}
.v-ledger .lg-jrow .lg-mono{font-size:12px;color:var(--mute)}
.v-ledger .lg-jrow:last-child{border-bottom:0}
.v-ledger .lg-type{font:600 12px/1.3 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.09em}
.v-ledger .lg-jb{margin-top:3px;font-size:13.5px;line-height:1.45;text-wrap:pretty}
.v-ledger .lg-jt{font-size:13.5px}
.v-ledger .lg-via{color:#8a5a12;font-style:italic}
.v-ledger .is-stage{background:#e6efe0}
.v-ledger .is-stage .lg-m{color:var(--green);font-weight:600}
.v-ledger .is-stage .lg-type{color:var(--green)}
.v-ledger .is-done .lg-jb{text-decoration:line-through;text-decoration-thickness:1px;color:var(--mute)}

.v-ledger .lg-kv{display:grid;grid-template-columns:96px minmax(0,1fr)}
.v-ledger .lg-kv dt,.v-ledger .lg-kv dd{padding:8px 12px 7px;border-bottom:1px solid var(--rule);font-size:13.5px;min-width:0}
.v-ledger .lg-kv dt{font:600 11px/1.6 'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.1em;color:var(--mute);border-right:1px solid var(--col)}
.v-ledger .lg-kv dd{overflow-wrap:anywhere}
.v-ledger .lg-kv dd .lg-tag{margin:0 2px 2px 0}
.v-ledger .lg-q{display:block;margin:6px 0 4px;padding-left:10px;border-left:3px double var(--col);font-style:italic}
.v-ledger .lg-ok{color:var(--green);font-weight:600}
.v-ledger .lg-pbtns{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 12px}
.v-ledger .lg-notes{padding:6px 12px 8px;line-height:22px;font-size:13.5px;background:repeating-linear-gradient(to bottom,transparent 0 21px,var(--rule) 21px 22px);background-position:0 6px}
`;

  (window.LT_VARIANTS = window.LT_VARIANTS || []).push({
    id: "ledger",
    name: "Ledger",
    concept:
      "The pipeline kept as a bookkeeper's sales ledger: each stage is an account, each lead a posting, and every column is totalled and carried forward — a CRM that shows its working, like the build-in-public story behind it.",
    fonts: ["Barlow+Condensed:wght@500;600;700", "Barlow:ital,wght@0,400;0,500;0,600;1,400", "IBM+Plex+Mono:wght@400;500;600"],
    tokens: {
      color: [
        { name: "Ledger paper", value: "#edf3e7" },
        { name: "Ink", value: "#1d2722" },
        { name: "Red ink", value: "#b3302a" },
        { name: "Binding green", value: "#2f5d45" },
        { name: "Column rule", value: "#8bb093" },
        { name: "Line rule", value: "#c5d9bf" },
        { name: "Sheet", value: "#f6f9f2" },
      ],
      type: [
        { role: "Printed headings", family: "'Barlow Condensed', 'Arial Narrow', sans-serif", sample: "NEGOTIATION · A/C 4", style: "font-weight:600;letter-spacing:.08em" },
        { role: "Entries", family: "'Barlow', ui-sans-serif, system-ui, sans-serif", sample: "Dispatch console redesign" },
        { role: "Figures", family: "'IBM Plex Mono', ui-monospace, Menlo, monospace", sample: "27,500 | 00", style: "font-weight:500" },
      ],
      spacing: "4px base; 8/12/16/22/32 steps; 46px two-line ledger entries, 22px ruled lines in empty space",
      shape: "0 radius; 1px green column rules, red rules around the € and cents columns, red double margin rule, double rule under every total",
      signature: "Each stage is an account on a two-page spread, closed with a carried-forward total under a double rule; won leads get a pen tick in the margin, overdue ones red ink.",
    },
    css,
    render: { board, contacts, detail },
  });
})();
