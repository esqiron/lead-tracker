// Transit — the pipeline drawn as a metro line. Stages are stations, columns hang from them,
// and a contact's history reads as a vertical route map.
(function () {
  const LINE = { s1: "#1F5FD6", s2: "#7B3FC4", s3: "#00807F", s4: "#D2461F", s5: "#0B8A4A", s6: "#6E7681" };
  const INK = "#111418";

  const I = {
    search: `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    chev: `<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    warn: `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1l5.2 9.5H.8z" fill="${INK}"/><path d="M6 4.6v2.6M6 8.6v.1" stroke="#FFD23F" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    check: `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 6.4l2.4 2.4 5.2-5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    cross: `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    noEntry: `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="7" fill="#C8261D"/><rect x="3" y="5.8" width="8" height="2.4" rx=".6" fill="#fff"/></svg>`,
    mark: `<svg width="46" height="18" viewBox="0 0 46 18" aria-hidden="true"><rect x="3" y="7" width="40" height="4" rx="2" fill="#fff"/><circle cx="7" cy="9" r="5" fill="${INK}" stroke="#4C8BF5" stroke-width="3"/><circle cx="23" cy="9" r="5" fill="${INK}" stroke="#14B8A6" stroke-width="3"/><circle cx="39" cy="9" r="5" fill="${INK}" stroke="#22C55E" stroke-width="3"/></svg>`,
  };

  const lineOf = (d, name) => {
    const s = d.stages.find((x) => x.name === name);
    return s ? LINE[s.id] : INK;
  };
  const leadLine = (d, title) => {
    const l = d.detail.leads.find((x) => x.title === title) || d.leads.find((x) => x.title === title);
    return l ? LINE[l.stageId] : INK;
  };

  function chrome(d, h, active) {
    return `<header class="tb">
      <div class="brand">${I.mark}<span>Lead Tracker</span></div>
      <nav class="nav">${d.nav.map((n) => `<a class="${n === active ? "on" : ""}">${h.esc(n)}</a>`).join("")}</nav>
      <div class="who">
        <span class="org">${h.esc(d.org.name)}</span>
        <span class="me"><span class="ini inv">${h.initials(d.viewer.name)}</span>${h.esc(d.viewer.name)}</span>
        <a class="out">Sign out</a>
      </div>
    </header>`;
  }

  const sel = (label, value) => `<span class="sel"><em>${label}</em>${value}${I.chev}</span>`;
  const own = (h, name) =>
    name ? `<span class="ini" title="${h.esc(name)}">${h.initials(name)}</span>` : `<span class="ini un" title="Unassigned">–</span>`;

  function card(d, h, l) {
    const st = h.stage(l.stageId);
    let date;
    if (l.status !== "open") date = `<span class="due">Closed ${h.day(l.closeDate)}</span>`;
    else if (!l.closeDate) date = `<span class="due none">No close date</span>`;
    else if (l.overdue) date = `<span class="due late">${I.warn}Overdue ${h.day(l.closeDate)}</span>`;
    else date = `<span class="due">Due ${h.day(l.closeDate)}</span>`;
    return `<article class="card ${l.status}">
      <div class="r1"><span class="route">${h.esc(st.name)}</span><b class="amt">${h.money(l.amount)}</b></div>
      <h3>${h.esc(l.title)}</h3>
      <p class="co">${h.esc(l.contact)} <span class="sep"></span> ${h.esc(l.company)}</p>
      <div class="r3">${date}${own(h, l.owner)}</div>
      ${l.lostReason ? `<p class="reason"><span>Reason</span>${h.esc(l.lostReason)}</p>` : ""}
    </article>`;
  }

  function board(d, h) {
    const cols = d.stages
      .map((s) => {
        const list = h.leadsIn(s.id);
        const kind = s.is_won ? "won" : s.is_lost ? "lost" : "";
        const flag = s.is_won
          ? `<span class="term ok">${I.check}Terminus · won</span>`
          : s.is_lost
            ? `<span class="term no">${I.cross}Closed · lost</span>`
            : `<span class="prob">${s.probability}%</span>`;
        return `<section class="col ${kind}" style="--c:${LINE[s.id]}">
          <div class="track"></div><div class="dot"></div>
          <div class="drop">
            <div class="lbl"><b>${h.esc(s.name)}</b>
              <div class="meta"><span class="n">${list.length}</span><span>${h.money(h.total(list))}</span></div>
              ${flag}
            </div>
            ${list.map((l) => card(d, h, l)).join("")}
          </div>
        </section>`;
      })
      .join("");
    return `${chrome(d, h, "Leads")}
    <main class="page">
      <div class="ph">
        <h1>Leads</h1><span class="count">${d.leads.length} leads</span>
        <div class="seg" role="tablist"><a class="on">Board</a><a>Table</a></div>
      </div>
      <div class="tools">
        <span class="search">${I.search}<span>Search leads, contacts, companies</span></span>
        ${sel("Owner", "Everyone")}
        ${sel("Source", "All sources")}
        <span class="sp"></span>
        <a class="btn ghost">Export CSV</a><a class="btn pri"><b>+</b> New lead</a>
      </div>
      <div class="dir"><span>Direction of travel</span><i></i><span>New → Won</span></div>
      <div class="map">${cols}</div>
    </main>`;
  }

  function contacts(d, h) {
    const rows = d.contacts
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c, i, arr) => {
        const letter = c.name[0].toUpperCase();
        const first = i === 0 || arr[i - 1].name[0].toUpperCase() !== letter;
        const tags = c.tags.map((t) => `<span class="tag">${h.esc(t)}</span>`).join("");
        const dnc = c.doNotContact ? `<span class="dnc">${I.noEntry}Do not contact</span>` : "";
        return `<tr class="${first ? "grp" : ""} ${c.id === "c1" ? "hov" : ""} ${c.doNotContact ? "off" : ""}">
          <td class="lx">${first ? `<span class="lt">${letter}</span>` : ""}</td>
          <td class="nm"><b>${h.esc(c.name)}</b><span class="jt">${c.title ? h.esc(c.title) : "No title"}</span>${tags || dnc ? `<div class="tags">${dnc}${tags}</div>` : ""}</td>
          <td class="em">${h.esc(c.email)}</td>
          <td class="mono">${c.phone ? h.esc(c.phone) : `<span class="none">—</span>`}</td>
          <td class="cp">${h.esc(c.company)}</td>
          <td>${c.owner ? `<span class="ow">${own(h, c.owner)}${h.esc(c.owner)}</span>` : `<span class="ow">${own(h, "")}<span class="none">Unassigned</span></span>`}</td>
          <td class="ctr"><span class="ol ${c.openLeads ? "on" : ""}">${c.openLeads}</span></td>
          <td class="mono">${h.day(c.added)}</td>
        </tr>`;
      })
      .join("");
    return `${chrome(d, h, "Contacts")}
    <main class="page">
      <div class="ph">
        <h1>Contacts</h1><span class="count">${d.contacts.length} contacts</span>
      </div>
      <div class="tools">
        <span class="search">${I.search}<span>Search name, email, company</span></span>
        ${sel("Tag", "Any tag")}
        ${sel("Owner", "Everyone")}
        <span class="sp"></span>
        <a class="btn ghost">Import CSV</a><a class="btn ghost">Export CSV</a><a class="btn pri"><b>+</b> New contact</a>
      </div>
      <div class="tbl">
        <table>
          <thead><tr><th class="lx">A–Z</th><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Owner</th><th class="ctr">Open leads</th><th>Added</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="tfoot"><span>Showing ${d.contacts.length} of ${d.contacts.length}</span><span>Sorted by name</span></div>
      </div>
    </main>`;
  }

  function detail(d, h) {
    const D = d.detail;
    const c = D.contact;
    const p = c.privacy;

    const leads = D.leads
      .map((l) => {
        const st = h.stage(l.stageId);
        return `<li style="--c:${LINE[l.stageId]}"><span class="route">${h.esc(st.name)}</span><span class="lt-t">${h.esc(l.title)}</span><b class="amt">${h.money(l.amount)}</b></li>`;
      })
      .join("");

    const tasks = D.openTasks
      .map(
        (t) => `<li class="${t.overdue ? "late" : ""}">
          <span class="box"></span>
          <div><p>${h.esc(t.body)}</p>
            <div class="tmeta">${t.overdue ? `<span class="due late">${I.warn}Overdue · ${h.dateTime(t.due)}</span>` : `<span class="due">Due ${h.dateTime(t.due)}</span>`}
              <span class="ow">${own(h, t.assignee)}${h.esc(t.assignee)}</span>
              <span class="lk"><i style="background:${leadLine(d, t.lead)}"></i>${h.esc(t.lead)}</span></div>
          </div></li>`,
      )
      .join("");

    const stops = D.timeline
      .map((e, i) => {
        const [dd, tt] = h.dateTime(e.at).split(", ");
        const pos = i === 0 ? "first" : i === D.timeline.length - 1 ? "last" : "";
        const onLead = `<span class="lk"><i style="background:${leadLine(d, e.lead)}"></i>${h.esc(e.lead)}</span>`;
        if (e.kind === "stage") {
          const to = `<span class="route sm" style="--c:${lineOf(d, e.to)}">${h.esc(e.to)}</span>`;
          const text = e.from
            ? `Moved from <span class="route sm" style="--c:${lineOf(d, e.from)}">${h.esc(e.from)}</span> to ${to} by <b>${h.esc(e.actor)}</b>`
            : `Started in ${to} by <b>${h.esc(e.actor)}</b>`;
          return `<li class="stop xchg ${pos}"><div class="t"><b>${dd}</b>${tt}</div><div class="rail"><i></i></div>
            <div class="c"><div class="hd"><span class="ty x">Interchange</span>${onLead}</div><p class="mv">${text}</p></div></li>`;
        }
        const who = e.source
          ? `<span class="via">via ${h.esc(e.source)} · unverified</span>`
          : `<b>${h.esc(e.author)}</b>`;
        const done = e.completedAt ? `<span class="done">${I.check}Completed ${h.dateTime(e.completedAt)}</span>` : "";
        return `<li class="stop ${pos} ${e.completedAt ? "fin" : ""}"><div class="t"><b>${dd}</b>${tt}</div><div class="rail"><i></i></div>
          <div class="c"><div class="hd"><span class="ty">${h.TYPE_LABELS[e.type]}</span>${who}${onLead}${done}</div><p>${h.esc(e.body)}</p></div></li>`;
      })
      .join("");

    return `${chrome(d, h, "Contacts")}
    <main class="page det">
      <a class="back">← Contacts</a>
      <div class="hero">
        <div class="avatar"><span>${h.initials(c.name)}</span></div>
        <div class="hn"><h1>${h.esc(c.name)}</h1><p>${h.esc(c.title)} at <b>${h.esc(c.company)}</b></p></div>
        <div class="acts"><a class="btn pri"><b>+</b> New lead</a><a class="btn ghost">Edit</a><a class="btn ghost danger">Delete</a></div>
      </div>
      <div class="cols2">
        <div class="mainc">
          <section class="pnl">
            <div class="ph2"><h2>Leads</h2><div class="tot"><span>Open <b>${h.money(D.openValue)}</b></span><span>Won <b>${h.money(D.wonValue)}</b></span></div></div>
            <ul class="leads">${leads}</ul>
          </section>
          <section class="pnl comp">
            <div class="types"><a class="on">Note</a><a>Call</a><a>Email</a><a>Meeting</a><a>Task</a></div>
            <div class="ta">Write a note about Ioana or one of her leads…</div>
            <div class="cf">${sel("Lead", "None")}<a class="btn pri">Log activity</a></div>
          </section>
          <section class="pnl">
            <div class="ph2"><h2>Open tasks</h2><span class="count sm">${D.openTasks.length}</span></div>
            <ul class="tasks">${tasks}</ul>
          </section>
          <section class="pnl">
            <div class="ph2"><h2>Route history</h2><span class="hint">Activity, newest first</span></div>
            <ol class="route-map">${stops}</ol>
          </section>
        </div>
        <aside class="side">
          <section class="sign"><h3><span class="i">i</span>Details</h3>
            <dl>
              <div><dt>Email</dt><dd>${h.esc(c.email)}</dd></div>
              <div><dt>Phone</dt><dd class="mono">${h.esc(c.phone)}</dd></div>
              <div><dt>Company</dt><dd>${h.esc(c.company)}</dd></div>
              <div><dt>Owner</dt><dd><span class="ow">${own(h, c.owner)}${h.esc(c.owner)}</span></dd></div>
              <div><dt>Tags</dt><dd class="tags">${c.tags.map((t) => `<span class="tag">${h.esc(t)}</span>`).join("")}</dd></div>
              <div><dt>Added</dt><dd class="mono">${h.day(c.added)} 2026</dd></div>
            </dl>
          </section>
          <section class="sign"><h3><span class="i">P</span>Privacy</h3>
            <dl>
              <div><dt>Lawful basis</dt><dd>${h.esc(p.lawfulBasis)}</dd></div>
              <div><dt>Consent</dt><dd>Given <span class="mono">${h.date(p.consent.given)}</span><blockquote>“${h.esc(p.consent.text)}”</blockquote><span class="src">Source: ${h.esc(p.consent.source)}</span></dd></div>
              <div><dt>Contact</dt><dd>${p.contactAllowed ? `<span class="ok">${I.check}Allowed</span>` : `<span class="dnc">${I.noEntry}Do not contact</span>`}</dd></div>
            </dl>
            <div class="pbtn"><a class="btn sm ghost">Withdraw consent</a><a class="btn sm ghost danger">Stop contact</a><a class="btn sm ghost">Export data</a></div>
          </section>
          <section class="sign"><h3><span class="i">N</span>Notes</h3>
            <p class="notes">${h.esc(c.notes)}</p>
          </section>
        </aside>
      </div>
    </main>`;
  }

  const css = `
.v-transit{background:#F3F5F7;color:${INK};font-family:'Overpass','Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.4;min-height:820px;padding-bottom:8px}
.v-transit a{color:inherit;text-decoration:none;cursor:default}
.v-transit .mono{font-family:'Overpass Mono',ui-monospace,Menlo,monospace;font-size:12.5px}

/* Chrome */
.v-transit .tb{display:flex;align-items:center;gap:24px;height:60px;padding:0 28px;background:${INK};color:#fff}
.v-transit .brand{display:flex;align-items:center;gap:10px;font-weight:900;font-size:18px;letter-spacing:-.01em}
.v-transit .brand svg{display:block}
.v-transit .nav{display:flex;gap:4px;margin-left:12px}
.v-transit .nav a{padding:8px 15px 6px;border-radius:999px;color:#C3C9D2;font-weight:600;font-size:14px}
.v-transit .nav a.on{background:#fff;color:${INK};font-weight:800}
.v-transit .who{margin-left:auto;display:flex;align-items:center;gap:14px;font-size:13px}
.v-transit .org{color:#C3C9D2;font-weight:600;padding-right:14px;border-right:1px solid #3A414B}
.v-transit .me{display:flex;align-items:center;gap:8px;font-weight:700}
.v-transit .out{font-weight:700;text-decoration:underline;text-underline-offset:3px}
.v-transit .ini{display:inline-grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;background:${INK};color:#fff;font:700 11px/1 'Overpass Mono',ui-monospace,monospace;padding-top:1px}
.v-transit .ini.inv{background:#fff;color:${INK}}
.v-transit .ini.un{background:transparent;border:2px dashed #8A929D;color:#8A929D}

/* Page head + tools */
.v-transit .page{padding:28px 28px 32px}
.v-transit .ph{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.v-transit h1{font-size:46px;font-weight:900;letter-spacing:-.025em;line-height:1;margin:0;padding-top:6px}
.v-transit .count{display:inline-flex;align-items:center;height:28px;padding:2px 12px 0;border-radius:999px;border:2px solid ${INK};font-weight:800;font-size:13px;background:#fff}
.v-transit .count.sm{height:24px;padding:2px 9px 0;font-size:12px}
.v-transit .seg{margin-left:auto;display:flex;background:#fff;border:2px solid ${INK};border-radius:999px;padding:3px}
.v-transit .seg a{padding:7px 18px 5px;border-radius:999px;font-weight:700}
.v-transit .seg a.on{background:${INK};color:#fff}
.v-transit .tools{display:flex;gap:10px;align-items:center}
.v-transit .sp{flex:1}
.v-transit .search{width:340px;height:42px;border:2px solid ${INK};border-radius:999px;background:#fff;display:flex;align-items:center;gap:10px;padding:0 16px;color:#4F5763}
.v-transit .search svg{color:${INK}}
.v-transit .search span{padding-top:2px}
.v-transit .sel{height:42px;border:2px solid #C9CED6;border-radius:999px;background:#fff;padding:2px 14px 0 16px;display:inline-flex;align-items:center;gap:8px;font-weight:700;white-space:nowrap}
.v-transit .sel em{font-style:normal;font-weight:700;color:#4F5763;font-size:10.5px;text-transform:uppercase;letter-spacing:.1em}
.v-transit .sel svg{margin-top:-2px}
.v-transit .btn{height:42px;border-radius:999px;padding:2px 20px 0;font-weight:800;display:inline-flex;align-items:center;gap:6px;border:2px solid ${INK};white-space:nowrap}
.v-transit .btn b{font-size:18px;margin-top:-2px}
.v-transit .btn.pri{background:${INK};color:#fff}
.v-transit .btn.ghost{background:#fff}
.v-transit .btn.danger{color:#C8261D;border-color:#C8261D}
.v-transit .btn.sm{height:32px;padding:2px 13px 0;font-size:12.5px}

/* Board: the line */
.v-transit .dir{display:flex;align-items:center;gap:10px;margin:26px 0 10px;font:700 10.5px/1 'Overpass',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#4F5763}
.v-transit .dir i{flex:none;width:28px;height:2px;background:#4F5763;position:relative}
.v-transit .dir i::after{content:'';position:absolute;right:-1px;top:-4px;border:5px solid transparent;border-left:7px solid #4F5763;border-right:0}
.v-transit .map{display:grid;grid-template-columns:repeat(6,minmax(0,1fr))}
.v-transit .col{position:relative;padding:0 5px;min-width:0}
.v-transit .track{position:absolute;top:10px;left:0;right:0;height:12px;background:var(--c)}
.v-transit .col:first-child .track{left:10px;border-radius:6px 0 0 6px}
.v-transit .col.won .track{right:0}
.v-transit .col.lost .track{background:repeating-linear-gradient(90deg,var(--c) 0 14px,transparent 14px 22px);right:34%;border-radius:0}
.v-transit .dot{position:relative;z-index:1;width:32px;height:32px;border-radius:50%;background:#fff;border:7px solid var(--c)}
.v-transit .col.won .dot{border-color:${INK};box-shadow:inset 0 0 0 4px #fff,inset 0 0 0 16px var(--c)}
.v-transit .col.lost .dot{border-color:var(--c);border-style:solid;background:#E4E7EB}
.v-transit .drop{position:relative;margin-top:-2px}
.v-transit .drop::before{content:'';position:absolute;left:14px;top:0;bottom:0;width:4px;background:var(--c)}
.v-transit .col.lost .drop::before{background:repeating-linear-gradient(180deg,var(--c) 0 10px,transparent 10px 16px)}
.v-transit .lbl{padding:10px 4px 16px 28px}
.v-transit .lbl b{display:block;font-size:19px;font-weight:900;letter-spacing:-.015em;line-height:1.05}
.v-transit .lbl .meta{display:flex;gap:8px;align-items:center;margin-top:6px;font:600 12.5px/1 'Overpass Mono',ui-monospace,monospace}
.v-transit .lbl .n{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:1px 6px 0;border-radius:999px;background:var(--c);color:#fff;font-weight:700}
.v-transit .prob,.v-transit .term{display:inline-flex;align-items:center;gap:5px;margin-top:8px;font:700 10.5px/1 'Overpass',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#4F5763}
.v-transit .prob::before{content:'Close odds';color:#8A929D}
.v-transit .term{padding:5px 8px 3px;border-radius:999px;color:#fff;background:var(--c)}
.v-transit .term svg{margin-top:-2px}

/* Board: cards */
.v-transit .card{position:relative;margin:0 0 10px 14px;background:#fff;border:1.5px solid #CFD5DD;border-left:4px solid var(--c);border-radius:0 14px 14px 0;padding:11px 12px 11px 11px}
.v-transit .card.lost{background:#FAFBFC}
.v-transit .card.lost h3,.v-transit .card.lost .amt{color:#4F5763}
.v-transit .r1{display:flex;justify-content:space-between;align-items:center;gap:6px}
.v-transit .route{display:inline-flex;align-items:center;height:21px;padding:2px 9px 0;border-radius:999px;background:var(--c);color:#fff;font:800 10px/1 'Overpass',sans-serif;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.v-transit .route.sm{height:19px;padding:2px 8px 0;font-size:10px;vertical-align:1px}
.v-transit .amt{font:700 13.5px/1 'Overpass Mono',ui-monospace,monospace;white-space:nowrap}
.v-transit .card h3{margin:9px 0 3px;font-size:15.5px;font-weight:800;line-height:1.2;letter-spacing:-.005em}
.v-transit .co{margin:0;font-size:12.5px;color:#4F5763;line-height:1.35}
.v-transit .sep{display:inline-block;width:4px;height:4px;border-radius:50%;background:#8A929D;vertical-align:2px;margin:0 1px}
.v-transit .r3{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:11px}
.v-transit .due{display:inline-flex;align-items:center;gap:5px;font:600 12px/1 'Overpass Mono',ui-monospace,monospace;letter-spacing:-.02em;color:${INK};white-space:nowrap}
.v-transit .due.late{background:#FFD23F;padding:5px 6px 4px;border-radius:5px;font:800 12px/1 'Overpass',sans-serif;letter-spacing:0}
.v-transit .due.late svg{margin-top:-2px}
.v-transit .due.none{color:#8A929D}
.v-transit .reason{margin:10px 0 0;padding-top:9px;border-top:1.5px dashed #CFD5DD;font-size:12.5px;line-height:1.35;color:${INK}}
.v-transit .reason span{display:block;font:700 10px/1 'Overpass',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6E7681;margin-bottom:4px}

/* Contacts */
.v-transit .tbl{margin-top:22px;background:#fff;border:2px solid ${INK};border-radius:18px;overflow:hidden}
.v-transit table{width:100%;border-collapse:collapse}
.v-transit th{background:${INK};color:#fff;font:700 10.5px/1 'Overpass',sans-serif;letter-spacing:.12em;text-transform:uppercase;text-align:left;padding:14px 12px 12px;white-space:nowrap}
.v-transit td{padding:12px;border-top:1px solid #E1E5EA;vertical-align:middle;font-size:13.5px}
.v-transit tr.grp td{border-top:2px solid #C9CED6}
.v-transit tbody tr:first-child td{border-top:0}
.v-transit tr.hov td{background:#EEF3FC}
.v-transit tr.off td{background:#FBF4F3}
.v-transit .lx{width:56px;text-align:center;padding-left:14px;padding-right:4px}
.v-transit .lt{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:${INK};color:#fff;font-weight:900;font-size:15px;padding-top:2px}
.v-transit .nm b{display:block;font-size:15px;font-weight:800}
.v-transit .jt{display:block;font-size:12.5px;color:#4F5763}
.v-transit .tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.v-transit .tag{display:inline-flex;align-items:center;height:20px;padding:2px 8px 0;border-radius:999px;border:1.5px solid #AEB5BF;font-size:11px;font-weight:700;color:#3A414B;white-space:nowrap}
.v-transit .dnc{display:inline-flex;align-items:center;gap:5px;height:22px;padding:2px 9px 0 4px;border-radius:999px;background:#C8261D;color:#fff;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.v-transit .dnc svg{margin-top:-2px}
.v-transit .dnc svg circle{fill:#fff}.v-transit .dnc svg rect{fill:#C8261D}
.v-transit .em{font-size:13px}
.v-transit .cp{font-weight:700}
.v-transit .ow{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.v-transit .ow .ini{width:24px;height:24px;font-size:10px}
.v-transit .ctr{text-align:center}
.v-transit .ol{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;border:2px solid #C9CED6;color:#8A929D;font:700 13px/1 'Overpass Mono',ui-monospace,monospace;padding-top:1px}
.v-transit .ol.on{background:${INK};border-color:${INK};color:#fff}
.v-transit .none{color:#8A929D}
.v-transit .tfoot{display:flex;justify-content:space-between;padding:12px 16px 10px;border-top:2px solid ${INK};font:700 10.5px/1 'Overpass',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#4F5763}

/* Detail */
.v-transit .back{display:inline-flex;align-items:center;height:30px;padding:2px 12px 0;border-radius:999px;background:#fff;border:1.5px solid #C9CED6;font-weight:800;font-size:13px}
.v-transit .hero{display:flex;align-items:center;gap:20px;margin:18px 0 24px}
.v-transit .avatar{position:relative;flex:none;width:92px;height:92px;border-radius:50%;border:10px solid ${INK};background:#fff;display:grid;place-items:center}
.v-transit .avatar::after{content:'';position:absolute;inset:-18px;border-radius:50%;border:4px solid ${LINE.s4};border-right-color:${LINE.s3};border-bottom-color:${LINE.s2};border-left-color:${LINE.s1}}
.v-transit .avatar span{position:relative;z-index:1;background:#fff;font-weight:900;font-size:22px;padding:4px 2px 0;line-height:1}
.v-transit .hero{padding-left:18px}
.v-transit .hn{margin-left:22px}
.v-transit .hn h1{font-size:44px}
.v-transit .hn p{margin:4px 0 0;font-size:17px;color:#3A414B}
.v-transit .acts{margin-left:auto;display:flex;gap:8px}
.v-transit .cols2{display:grid;grid-template-columns:minmax(0,1fr) 372px;gap:24px;align-items:start}
.v-transit .mainc{display:flex;flex-direction:column;gap:16px;min-width:0}
.v-transit .pnl{background:#fff;border:1.5px solid #CFD5DD;border-radius:18px;padding:18px 20px}
.v-transit .ph2{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.v-transit h2{margin:0;font-size:21px;font-weight:900;letter-spacing:-.015em;padding-top:3px}
.v-transit .hint{font:700 10.5px/1 'Overpass',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6E7681;padding-top:3px}
.v-transit .tot{margin-left:auto;display:flex;gap:18px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#4F5763}
.v-transit .tot b{font:700 16px/1 'Overpass Mono',ui-monospace,monospace;color:${INK};letter-spacing:0;text-transform:none;margin-left:6px}
.v-transit ul,.v-transit ol{list-style:none;margin:0;padding:0}
.v-transit .leads li{display:grid;grid-template-columns:128px 1fr auto;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #E1E5EA}
.v-transit .leads li:first-child{border-top:0;padding-top:2px}
.v-transit .leads .route{justify-self:start}
.v-transit .lt-t{font-weight:700;font-size:15px}
.v-transit .comp .types{display:flex;gap:6px;margin-bottom:12px}
.v-transit .types a{height:32px;padding:2px 14px 0;border-radius:999px;border:2px solid #C9CED6;font-weight:700;font-size:13px;display:inline-flex;align-items:center}
.v-transit .types a.on{background:${INK};border-color:${INK};color:#fff}
.v-transit .ta{min-height:76px;border:2px solid ${INK};border-radius:12px;padding:12px 14px;color:#6E7681;font-size:14px;box-shadow:0 0 0 4px #DCE6FA}
.v-transit .cf{display:flex;justify-content:space-between;align-items:center;margin-top:12px}
.v-transit .cf .sel,.v-transit .cf .btn{height:38px}
.v-transit .tasks li{display:grid;grid-template-columns:24px 1fr;gap:12px;padding:12px 0;border-top:1px solid #E1E5EA}
.v-transit .tasks li:first-child{border-top:0;padding-top:2px}
.v-transit .box{width:22px;height:22px;border:2.5px solid ${INK};border-radius:6px;margin-top:1px;background:#fff}
.v-transit .tasks p{margin:0 0 7px;font-weight:700;font-size:14.5px}
.v-transit .tmeta{display:flex;flex-wrap:wrap;align-items:center;gap:14px;font-size:12.5px;color:#3A414B}
.v-transit .lk{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#3A414B;font-weight:600}
.v-transit .lk i{width:10px;height:10px;border-radius:50%;flex:none}

/* Route map timeline */
.v-transit .route-map{margin-top:4px}
.v-transit .stop{display:grid;grid-template-columns:62px 40px minmax(0,1fr)}
.v-transit .stop .t{text-align:right;font:500 12px/1.35 'Overpass Mono',ui-monospace,monospace;color:#4F5763;padding-top:12px}
.v-transit .stop .t b{display:block;color:${INK};font-weight:700}
.v-transit .rail{position:relative}
.v-transit .rail::before{content:'';position:absolute;left:17px;width:6px;top:0;bottom:0;background:${INK}}
.v-transit .stop.first .rail::before{top:14px}
.v-transit .stop.last .rail::before{bottom:10px}
.v-transit .stop.last .rail::after{content:'';position:absolute;left:9px;bottom:6px;width:22px;height:6px;border-radius:3px;background:${INK}}
.v-transit .rail i{position:absolute;left:9px;top:12px;width:22px;height:22px;border-radius:50%;background:#fff;border:5px solid ${INK}}
.v-transit .stop.xchg .rail i{left:6px;top:6px;width:28px;height:42px;border-radius:999px;border-width:5px}
.v-transit .stop.xchg .rail i::after{content:'';position:absolute;left:4px;right:4px;top:50%;height:3px;margin-top:-1.5px;background:${INK};border-radius:2px}
.v-transit .stop .c{padding:11px 0 20px 12px;min-width:0}
.v-transit .hd{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:13px}
.v-transit .ty{display:inline-flex;align-items:center;height:21px;padding:2px 9px 0;border-radius:4px;background:${INK};color:#fff;font:800 10.5px/1 'Overpass',sans-serif;letter-spacing:.1em;text-transform:uppercase}
.v-transit .ty.x{background:#fff;color:${INK};box-shadow:inset 0 0 0 2px ${INK}}
.v-transit .via{display:inline-flex;align-items:center;height:21px;padding:2px 8px 0;border-radius:4px;background:#FFD23F;font-weight:800;font-size:12px}
.v-transit .done{display:inline-flex;align-items:center;gap:4px;color:${LINE.s5};font-weight:800;font-size:12px}
.v-transit .done svg{margin-top:-2px}
.v-transit .stop p{margin:7px 0 0;font-size:14px;line-height:1.5;max-width:68ch}
.v-transit .stop.fin p{text-decoration:line-through;text-decoration-thickness:1.5px;color:#6E7681}
.v-transit .stop p.mv{font-size:14.5px;line-height:1.7}

/* Sidebar signage */
.v-transit .side{display:flex;flex-direction:column;gap:16px}
.v-transit .sign{background:#fff;border:2px solid ${INK};border-radius:16px;overflow:hidden}
.v-transit .sign h3{margin:0;background:${INK};color:#fff;font:800 13px/1 'Overpass',sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:11px 16px 9px;display:flex;align-items:center;gap:10px}
.v-transit .sign .i{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#fff;color:${INK};font-weight:900;font-size:12px;letter-spacing:0;padding-top:2px}
.v-transit .sign dl{margin:0;padding:4px 16px 8px}
.v-transit .sign dl div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;padding:10px 0;border-top:1px solid #E1E5EA}
.v-transit .sign dl div:first-child{border-top:0}
.v-transit .sign dt{font:700 10.5px/1.5 'Overpass',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6E7681;padding-top:2px}
.v-transit .sign dd{margin:0;font-weight:600;font-size:13.5px;overflow-wrap:anywhere}
.v-transit .sign dd.tags{margin:0}
.v-transit blockquote{margin:8px 0 6px;padding:8px 12px 6px;border-left:4px solid ${LINE.s1};background:#EEF3FC;font-weight:600;font-size:13.5px;line-height:1.45}
.v-transit .src{font-size:12px;color:#4F5763}
.v-transit .ok{display:inline-flex;align-items:center;gap:5px;height:22px;padding:2px 9px 0 7px;border-radius:999px;background:${LINE.s5};color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.v-transit .ok svg{margin-top:-2px}
.v-transit .pbtn{display:flex;flex-wrap:wrap;gap:6px;padding:4px 16px 16px}
.v-transit .notes{margin:0;padding:14px 16px 16px;font-size:14px;line-height:1.55}
`;

  (window.LT_VARIANTS = window.LT_VARIANTS || []).push({
    id: "transit",
    name: "Transit",
    concept:
      "The pipeline as a metro line: every stage is a station, every deal rides toward the Won terminus, and a contact's history reads as a route map — wayfinding you can follow at a glance, built in public like a city's transit plan.",
    fonts: ["Overpass:wght@400;600;700;800;900", "Overpass+Mono:wght@500;600;700"],
    tokens: {
      color: [
        { name: "Signal ink", value: "#111418" },
        { name: "Platform", value: "#F3F5F7" },
        { name: "Blue line · New", value: LINE.s1 },
        { name: "Orange line · Negotiation", value: LINE.s4 },
        { name: "Service alert", value: "#FFD23F" },
        { name: "Green line · Won", value: LINE.s5 },
        { name: "Teal line · Proposal", value: LINE.s3 },
      ],
      type: [
        { role: "Display", family: "'Overpass', 'Helvetica Neue', Arial, sans-serif", sample: "Negotiation", style: "font-weight:900;letter-spacing:-.02em" },
        { role: "Signage labels", family: "'Overpass', 'Helvetica Neue', Arial, sans-serif", sample: "TERMINUS · WON", style: "font-weight:800;font-size:15px;letter-spacing:.1em" },
        { role: "Data · times & money", family: "'Overpass Mono', ui-monospace, Menlo, monospace", sample: "27 Oct 09:52 €27,500", style: "font-weight:600" },
      ],
      spacing: "4px base; 6/10/14/18/24/28 scale; 42px pill controls; six 204px station columns",
      shape: "Pills (999px) for routes, controls and counts; round station dots; 0/14/14/0 card tabs with a 4px line-coloured spine; 2px ink borders on signage panels",
      signature:
        "A thick coloured metro line across the board with a station dot per stage; each column hangs from its station on a coloured stem that becomes the spine of every card, and the contact timeline is a vertical route with interchanges for stage moves.",
    },
    css,
    render: { board, contacts, detail },
  });
})();
