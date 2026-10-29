// Bauhaus — the pipeline as a colour-blocked poster grid.
(function () {
  const C = { off: "#f2f0ea", ink: "#141414", red: "#d8341f", blue: "#1f4e9c", yellow: "#f2bf1b" };
  // Each stage: a shape, its standalone colour, and the colour it takes on its own block.
  const ST = {
    s1: { shape: "circle", fill: C.yellow, onBlock: C.yellow },
    s2: { shape: "triangle", fill: C.blue, onBlock: C.off },
    s3: { shape: "square", fill: C.red, onBlock: C.ink },
    s4: { shape: "half", fill: C.ink, onBlock: C.yellow },
    s5: { shape: "won", fill: C.red, onBlock: C.red },
    s6: { shape: "lost", fill: C.ink, onBlock: C.ink },
  };

  function glyph(id, size, color) {
    const s = ST[id];
    const f = color || s.fill;
    let body = "";
    if (s.shape === "circle") body = `<circle cx="12" cy="12" r="11" fill="${f}"/>`;
    else if (s.shape === "triangle") body = `<path d="M12 1.5 23 22.5H1z" fill="${f}"/>`;
    else if (s.shape === "square") body = `<rect x="2" y="2" width="20" height="20" fill="${f}"/>`;
    else if (s.shape === "half") body = `<path d="M1 17.5a11 11 0 0 1 22 0z" fill="${f}"/>`;
    else if (s.shape === "won")
      body = color
        ? `<circle cx="12" cy="12" r="11" fill="${f}"/>`
        : `<rect x="1" y="1" width="22" height="22" fill="${C.yellow}"/><circle cx="12" cy="12" r="7.5" fill="${C.red}"/>`;
    else body = `<rect x="2.5" y="2.5" width="19" height="19" fill="none" stroke="${f}" stroke-width="2.6"/><path d="M2.5 21.5 21.5 2.5" stroke="${f}" stroke-width="2.6"/>`;
    return `<svg class="bh-g" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  }

  const MARK = `<svg class="bh-mark" width="58" height="20" viewBox="0 0 58 20" aria-hidden="true"><circle cx="10" cy="10" r="9.5" fill="${C.yellow}"/><rect x="21" y="0.5" width="19" height="19" fill="${C.red}"/><path d="M49 0.5 58 19.5H40z" fill="${C.blue}"/></svg>`;

  function chrome(d, h, active) {
    const nav = d.nav
      .map((n) => `<a class="bh-nav-i${n === active ? " is-on" : ""}"${n === active ? ' aria-current="page"' : ""}>${h.esc(n)}</a>`)
      .join("");
    return `<header class="bh-top">
      <div class="bh-logo">${MARK}<span>Lead Tracker</span></div>
      <nav class="bh-nav" aria-label="Main">${nav}</nav>
      <div class="bh-who">
        <span class="bh-org">${h.esc(d.org.name)}</span>
        <span class="bh-me"><span class="bh-av">${h.esc(h.initials(d.viewer.name))}</span>${h.esc(d.viewer.name)}</span>
        <a class="bh-out">Sign out</a>
      </div>
    </header>`;
  }

  const owner = (h, name) =>
    name
      ? `<span class="bh-av" title="${h.esc(name)}">${h.esc(h.initials(name))}</span>`
      : '<span class="bh-av is-none" title="Unassigned"></span><span class="bh-un">Unassigned</span>';

  function board(d, h) {
    const totals = d.stages.map((s) => h.total(h.leadsIn(s.id)));
    const max = Math.max(...totals);
    const open = d.leads.filter((l) => l.status === "open");
    const openTotal = h.total(open);

    const cols = d.stages
      .map((s, i) => {
        const list = h.leadsIn(s.id);
        const tot = totals[i];
        const height = Math.round(132 + 118 * (tot / max));
        const mark = s.is_won ? '<span class="bh-flag">Closed · won</span>' : s.is_lost ? '<span class="bh-flag">Closed · lost</span>' : `<span class="bh-flag">${s.probability}%</span>`;
        const cards = list
          .map((l) => {
            const date = l.closeDate
              ? l.overdue
                ? `<span class="bh-od">Overdue · ${h.esc(h.day(l.closeDate))}</span>`
                : `<span class="bh-date">${s.is_won ? "Won" : s.is_lost ? "Closed" : "Close"} ${h.esc(h.day(l.closeDate))}</span>`
              : '<span class="bh-date bh-un">No close date</span>';
            const reason = l.lostReason ? `<p class="bh-reason">${h.esc(l.lostReason)}</p>` : "";
            return `<article class="bh-card is-${l.status}${l.overdue ? " is-od" : ""}">
              <div class="bh-card-h">${glyph(s.id, 14)}<h4>${h.esc(l.title)}</h4></div>
              <p class="bh-who2">${h.esc(l.contact)} · ${h.esc(l.company)}</p>
              ${reason}
              <div class="bh-card-d">${date}</div>
              <div class="bh-card-f"><span class="bh-amt">${h.esc(h.money(l.amount))}</span><span class="bh-own">${owner(h, l.owner)}</span></div>
            </article>`;
          })
          .join("");
        return `<section class="bh-col">
          <div class="bh-blockwrap"><div class="bh-block bh-b-${s.id}" style="height:${height}px">
            <span class="bh-block-g">${glyph(s.id, 56, ST[s.id].onBlock)}</span>
            <div class="bh-block-t"><h3>${h.esc(s.name)}</h3><span>${list.length} ${list.length === 1 ? "lead" : "leads"}</span>${mark}</div>
            <p class="bh-block-n">${h.esc(h.moneyShort(tot))}</p>
          </div></div>
          <div class="bh-cards">${cards}</div>
        </section>`;
      })
      .join("");

    return `${chrome(d, h, "Leads")}
    <div class="bh-head">
      <div class="bh-title"><h1>Leads</h1><span class="bh-count"><b>15</b> leads</span></div>
      <div class="bh-headfig"><span class="bh-lab">Open pipeline</span><b>${h.esc(h.money(openTotal))}</b></div>
    </div>
    <div class="bh-tools">
      <div class="bh-seg" role="group" aria-label="View"><a class="is-on" aria-pressed="true">Board</a><a aria-pressed="false">Table</a></div>
      <div class="bh-in bh-search"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" fill="none" stroke="${C.ink}" stroke-width="2.2"/><path d="m10.5 10.5 4.5 4.5" stroke="${C.ink}" stroke-width="2.2"/></svg><span class="bh-ph">Search leads</span></div>
      <div class="bh-in"><span class="bh-lab">Owner</span><b>Anyone</b><span class="bh-caret"></span></div>
      <div class="bh-in"><span class="bh-lab">Source</span><b>All sources</b><span class="bh-caret"></span></div>
      <span class="bh-sp"></span>
      <a class="bh-btn">Export CSV</a>
      <a class="bh-btn bh-btn-pri">New lead</a>
    </div>
    <div class="bh-board">${cols}</div>`;
  }

  function contacts(d, h) {
    const rows = d.contacts
      .map((c) => {
        const tags = c.tags.map((t) => `<span class="bh-tag">${h.esc(t)}</span>`).join("");
        const dnc = c.doNotContact ? '<span class="bh-dnc">Do not contact</span>' : "";
        return `<div class="bh-tr${c.id === "c1" ? " is-sel" : ""}${c.doNotContact ? " is-dnc" : ""}">
          <div class="bh-td bh-name"><span class="bh-cav">${h.esc(h.initials(c.name))}</span><div><p class="bh-n">${h.esc(c.name)}</p><p class="bh-sm">${c.title ? h.esc(c.title) : '<span class="bh-un">No title</span>'}</p>${tags || dnc ? `<p class="bh-tags">${dnc}${tags}</p>` : ""}</div></div>
          <div class="bh-td"><p class="bh-email">${h.esc(c.email)}</p><p class="bh-sm">${c.phone ? h.esc(c.phone) : '<span class="bh-un">No phone</span>'}</p></div>
          <div class="bh-td">${h.esc(c.company)}</div>
          <div class="bh-td">${c.owner ? h.esc(c.owner) : '<span class="bh-un">Unassigned</span>'}</div>
          <div class="bh-td bh-num${c.openLeads ? "" : " is-zero"}">${c.openLeads}</div>
          <div class="bh-td bh-added">${h.esc(h.day(c.added))}</div>
        </div>`;
      })
      .join("");

    return `${chrome(d, h, "Contacts")}
    <div class="bh-cgrid">
      <aside class="bh-cpanel">
        <div class="bh-bigblock"><b>${d.contacts.length}</b><span>contacts</span></div>
        <h1 class="bh-h1sm">Contacts</h1>
        <div class="bh-in bh-search"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" fill="none" stroke="${C.ink}" stroke-width="2.2"/><path d="m10.5 10.5 4.5 4.5" stroke="${C.ink}" stroke-width="2.2"/></svg><span class="bh-ph">Search contacts</span></div>
        <div class="bh-in"><span class="bh-lab">Tag</span><b>All tags</b><span class="bh-caret"></span></div>
        <div class="bh-in"><span class="bh-lab">Owner</span><b>Anyone</b><span class="bh-caret"></span></div>
        <a class="bh-btn bh-btn-pri bh-wide">New contact</a>
        <div class="bh-pair"><a class="bh-btn">Import CSV</a><a class="bh-btn">Export CSV</a></div>
      </aside>
      <div class="bh-table">
        <div class="bh-tr bh-th"><div class="bh-td">Name · title · tags</div><div class="bh-td">Email · phone</div><div class="bh-td">Company</div><div class="bh-td">Owner</div><div class="bh-td bh-num">Open leads</div><div class="bh-td bh-added">Added</div></div>
        ${rows}
      </div>
    </div>`;
  }

  function detail(d, h) {
    const D = d.detail;
    const c = D.contact;
    const p = c.privacy;
    const stageOfLead = (title) => {
      const l = D.leads.find((x) => x.title === title) || d.leads.find((x) => x.title === title);
      return l ? l.stageId : "s1";
    };
    const stageByName = (name) => d.stages.find((s) => s.name === name);

    const leads = D.leads
      .map((l) => {
        const s = h.stage(l.stageId);
        return `<div class="bh-lead${s.is_won ? " is-won" : ""}">${glyph(s.id, 22)}<div><p class="bh-n">${h.esc(l.title)}</p><p class="bh-sm">${h.esc(s.name)}</p></div><b>${h.esc(h.money(l.amount))}</b></div>`;
      })
      .join("");

    const tasks = D.openTasks
      .map(
        (t) => `<div class="bh-task${t.overdue ? " is-od" : ""}">
          <span class="bh-check" role="checkbox" aria-checked="false" aria-label="Mark done"></span>
          <div><p class="bh-n">${h.esc(t.body)}</p><p class="bh-sm">${glyph(stageOfLead(t.lead), 12)} ${h.esc(t.lead)} · ${h.esc(t.assignee)}</p></div>
          <span class="${t.overdue ? "bh-od" : "bh-date"}">${t.overdue ? "Overdue · " : "Due "}${h.esc(h.dateTime(t.due))}</span>
        </div>`,
      )
      .join("");

    const tl = D.timeline
      .map((e) => {
        if (e.kind === "stage") {
          const to = stageByName(e.to);
          const from = e.from ? stageByName(e.from) : null;
          const text = from
            ? `Moved from <b>${h.esc(e.from)}</b> to <b>${h.esc(e.to)}</b> by ${h.esc(e.actor)}`
            : `Moved to <b>${h.esc(e.to)}</b> by ${h.esc(e.actor)}`;
          return `<li class="bh-ev bh-band bh-b-${to.id}">
            <span class="bh-band-g">${from ? glyph(from.id, 18, ST[to.id].onBlock) + '<i>→</i>' : ""}${glyph(to.id, 18, ST[to.id].onBlock)}</span>
            <div><p>${text}</p><p class="bh-sm">${h.esc(e.lead)} · ${h.esc(h.dateTime(e.at))}</p></div>
          </li>`;
        }
        const who = e.source ? `<span class="bh-via">via ${h.esc(e.source)} · unverified</span>` : `<b>${h.esc(e.author)}</b>`;
        return `<li class="bh-ev${e.completedAt ? " is-done" : ""}">
          <span class="bh-type">${h.esc(h.TYPE_LABELS[e.type])}</span>
          <div>
            <p class="bh-meta">${who} · ${h.esc(h.dateTime(e.at))} · ${glyph(stageOfLead(e.lead), 12)} ${h.esc(e.lead)}${e.completedAt ? ` · done ${h.esc(h.dateTime(e.completedAt))}` : ""}</p>
            <p class="bh-body">${h.esc(e.body)}</p>
          </div>
        </li>`;
      })
      .join("");

    const types = ["note", "call", "email", "meeting", "task"];
    return `${chrome(d, h, "Contacts")}
    <a class="bh-back">← Contacts</a>
    <div class="bh-dhead">
      <div class="bh-bigav">${h.esc(h.initials(c.name))}</div>
      <div class="bh-dname">
        <h1>${h.esc(c.name)}</h1>
        <p class="bh-role">${h.esc(c.title)} at ${h.esc(c.company)}</p>
      </div>
      <div class="bh-acts"><a class="bh-btn bh-btn-pri">New lead</a><a class="bh-btn">Edit</a><a class="bh-btn bh-btn-del">Delete</a></div>
    </div>
    <div class="bh-dgrid">
      <div class="bh-dmain">
        <section class="bh-sec">
          <h2>Log activity</h2>
          <div class="bh-seg bh-types" role="radiogroup" aria-label="Activity type">${types.map((t, i) => `<a role="radio" aria-checked="${i === 0}" class="${i === 0 ? "is-on" : ""}">${h.TYPE_LABELS[t]}</a>`).join("")}</div>
          <div class="bh-ta"><span class="bh-ph">What happened with Ioana?</span></div>
          <div class="bh-comp-f"><div class="bh-in"><span class="bh-lab">Lead</span><b>None</b><span class="bh-caret"></span></div><a class="bh-btn bh-btn-ink">Log activity</a></div>
        </section>
        <section class="bh-sec">
          <h2>Open tasks <span class="bh-pill">${D.openTasks.length}</span></h2>
          ${tasks}
        </section>
        <section class="bh-sec">
          <h2>Timeline</h2>
          <ol class="bh-tl">${tl}</ol>
        </section>
      </div>
      <aside class="bh-dside">
        <section class="bh-sec bh-leads">
          <h2>Leads <span class="bh-pill">${D.leads.length}</span></h2>
          ${leads}
          <div class="bh-sum">
            <div class="bh-sum-o"><span class="bh-lab">Open</span><b>${h.esc(h.money(D.openValue))}</b></div>
            <div class="bh-sum-w"><span class="bh-lab">Won</span><b>${h.esc(h.money(D.wonValue))}</b></div>
          </div>
        </section>
        <section class="bh-sec">
          <h2>Details</h2>
          <dl class="bh-kv">
            <dt>Email</dt><dd>${h.esc(c.email)}</dd>
            <dt>Phone</dt><dd>${h.esc(c.phone)}</dd>
            <dt>Company</dt><dd>${h.esc(c.company)}</dd>
            <dt>Owner</dt><dd>${h.esc(c.owner)}</dd>
            <dt>Tags</dt><dd>${c.tags.map((t) => `<span class="bh-tag">${h.esc(t)}</span>`).join(" ")}</dd>
            <dt>Added</dt><dd>${h.esc(h.day(c.added))}</dd>
          </dl>
        </section>
        <section class="bh-sec bh-priv">
          <h2>Privacy</h2>
          <dl class="bh-kv">
            <dt>Lawful basis</dt><dd>${h.esc(p.lawfulBasis)}</dd>
            <dt>Consent</dt><dd>Given ${h.esc(h.day(p.consent.given))} via ${h.esc(p.consent.source)}</dd>
            <dt>Contact</dt><dd class="bh-ok"><i></i>${p.contactAllowed ? "Allowed" : "Not allowed"}</dd>
          </dl>
          <blockquote class="bh-q">${h.esc(p.consent.text)}</blockquote>
          <div class="bh-pbtns"><a class="bh-btn bh-btn-sm">Withdraw consent</a><a class="bh-btn bh-btn-sm">Stop contact</a><a class="bh-btn bh-btn-sm">Export data</a></div>
        </section>
        <section class="bh-notes">
          <h2>Notes</h2>
          <p>${h.esc(c.notes)}</p>
        </section>
      </aside>
    </div>`;
  }

  const css = `
.v-bauhaus{--off:${C.off};--card:#fbfaf6;--ink:${C.ink};--red:${C.red};--blue:${C.blue};--yellow:${C.yellow};--mute:#5b5952;
  background:var(--off);color:var(--ink);font-family:'Jost',ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.35;min-height:820px;padding-bottom:48px;}
.v-bauhaus p,.v-bauhaus h1,.v-bauhaus h2,.v-bauhaus h3,.v-bauhaus h4,.v-bauhaus dl,.v-bauhaus dd,.v-bauhaus ol,.v-bauhaus blockquote{margin:0;padding:0}
.v-bauhaus a{color:inherit;text-decoration:none;cursor:pointer}
.v-bauhaus .bh-g{flex:none;display:inline-block;vertical-align:-1px}
.v-bauhaus .bh-un{color:var(--mute);font-style:italic}
.v-bauhaus .bh-lab{font:600 10.5px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.14em;color:var(--mute)}
.v-bauhaus .bh-sm{font-size:12.5px;color:var(--mute)}
.v-bauhaus .bh-n{font-weight:600;font-size:14.5px;line-height:1.25}

/* chrome */
.v-bauhaus .bh-top{display:flex;align-items:center;gap:28px;height:68px;padding:0 28px;border-bottom:8px solid var(--ink)}
.v-bauhaus .bh-logo{display:flex;align-items:center;gap:12px;font:700 21px/1 'League Spartan','Futura','Century Gothic',sans-serif;letter-spacing:-.01em}
.v-bauhaus .bh-nav{display:flex;align-self:stretch}
.v-bauhaus .bh-nav-i{display:flex;align-items:center;padding:0 16px;font:500 13px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.14em}
.v-bauhaus .bh-nav-i.is-on{background:var(--ink);color:var(--off);font-weight:600}
.v-bauhaus .bh-who{margin-left:auto;display:flex;align-items:center;gap:16px;font-size:13.5px}
.v-bauhaus .bh-org{font-weight:600}
.v-bauhaus .bh-me{display:flex;align-items:center;gap:8px}
.v-bauhaus .bh-av{width:26px;height:26px;border-radius:50%;background:var(--ink);color:var(--off);display:inline-grid;place-items:center;font:600 10.5px/1 'Jost',sans-serif;letter-spacing:.04em;flex:none}
.v-bauhaus .bh-av.is-none{background:transparent;border:2px dashed var(--ink)}
.v-bauhaus .bh-out{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:4px}

/* controls */
.v-bauhaus .bh-seg{display:inline-flex;border:3px solid var(--ink)}
.v-bauhaus .bh-seg a{padding:0 16px;display:flex;align-items:center;height:36px;font:600 12.5px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.12em}
.v-bauhaus .bh-seg a+a{border-left:3px solid var(--ink)}
.v-bauhaus .bh-seg a.is-on{background:var(--ink);color:var(--off)}
.v-bauhaus .bh-in{display:flex;align-items:center;gap:10px;height:42px;padding:0 12px;border:3px solid var(--ink);background:var(--card);font-size:14px}
.v-bauhaus .bh-in b{font-weight:500}
.v-bauhaus .bh-ph{color:var(--mute)}
.v-bauhaus .bh-caret{margin-left:auto;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid var(--ink)}
.v-bauhaus .bh-btn{display:inline-flex;align-items:center;justify-content:center;height:42px;padding:0 18px;border:3px solid var(--ink);background:var(--card);font:600 13px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.12em;white-space:nowrap}
.v-bauhaus .bh-btn-pri{background:var(--red);border-color:var(--red);color:var(--off)}
.v-bauhaus .bh-btn-pri::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--off);margin-right:10px}
.v-bauhaus .bh-btn-ink{background:var(--ink);color:var(--off)}
.v-bauhaus .bh-btn-del{border-color:var(--red);color:var(--red)}
.v-bauhaus .bh-btn-sm{height:34px;padding:0 12px;font-size:11.5px;border-width:2px}
.v-bauhaus .bh-sp{flex:1}
.v-bauhaus .bh-tag{display:inline-block;font:500 10.5px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.06em;border:2px solid var(--ink);padding:3px 5px 2px;margin:0 3px 4px 0;white-space:nowrap}
.v-bauhaus .bh-dnc{display:inline-block;font:600 11px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.1em;background:var(--red);color:var(--off);padding:5px 7px 4px;margin:0 4px 4px 0}
.v-bauhaus .bh-od{display:inline-block;background:var(--red);color:var(--off);font:600 11.5px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.08em;padding:5px 7px 4px;white-space:nowrap}
.v-bauhaus .bh-date{font-size:12.5px;font-weight:500;text-transform:uppercase;letter-spacing:.08em}

/* board */
.v-bauhaus .bh-head{display:flex;align-items:flex-end;justify-content:space-between;padding:26px 28px 18px}
.v-bauhaus .bh-title{display:flex;align-items:flex-end;gap:18px}
.v-bauhaus h1{font:800 104px/.78 'League Spartan','Futura','Century Gothic',sans-serif;letter-spacing:-.045em;padding-top:10px}
.v-bauhaus .bh-count{display:flex;align-items:center;gap:8px;font:500 15px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.12em;padding-bottom:4px}
.v-bauhaus .bh-count b{width:48px;height:48px;border-radius:50%;background:var(--yellow);display:grid;place-items:center;font:800 22px/1 'League Spartan',sans-serif;letter-spacing:-.02em;padding-top:3px}
.v-bauhaus .bh-headfig{text-align:right;display:flex;flex-direction:column;gap:6px}
.v-bauhaus .bh-headfig b{font:800 56px/.85 'League Spartan','Futura',sans-serif;letter-spacing:-.04em;color:var(--blue)}
.v-bauhaus .bh-tools{display:flex;gap:10px;align-items:center;padding:0 28px 26px}
.v-bauhaus .bh-tools .bh-seg a{height:36px}
.v-bauhaus .bh-search{width:250px}
.v-bauhaus .bh-tools .bh-in:not(.bh-search){min-width:170px}

.v-bauhaus .bh-board{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0 12px;padding:0 28px;align-items:start;position:relative}
.v-bauhaus .bh-col{display:flex;flex-direction:column;min-width:0}
.v-bauhaus .bh-blockwrap{height:250px;display:flex;flex-direction:column;justify-content:flex-end}
.v-bauhaus .bh-block{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:12px 12px 10px;overflow:hidden}
.v-bauhaus .bh-block-g{position:absolute;right:-6px;top:-6px;line-height:0}
.v-bauhaus .bh-block-g .bh-g{width:64px;height:64px}
.v-bauhaus .bh-block-t{position:relative;display:flex;flex-direction:column;gap:3px;align-items:flex-start}
.v-bauhaus .bh-block h3{font:700 19px/1 'League Spartan','Futura',sans-serif;text-transform:uppercase;letter-spacing:.02em;padding-top:2px}
.v-bauhaus .bh-block-t span{font-size:12.5px;font-weight:500;text-transform:uppercase;letter-spacing:.1em}
.v-bauhaus .bh-block-t .bh-flag{font-weight:600;font-size:11px;letter-spacing:.12em;margin-top:2px}
.v-bauhaus .bh-block-n{position:relative;font:800 42px/.85 'League Spartan','Futura',sans-serif;letter-spacing:-.04em;padding-top:6px}
.v-bauhaus .bh-b-s1{background:var(--off);box-shadow:inset 0 0 0 4px var(--ink);color:var(--ink)}
.v-bauhaus .bh-b-s2{background:var(--blue);color:var(--off)}
.v-bauhaus .bh-b-s3{background:var(--red);color:var(--off)}
.v-bauhaus .bh-b-s4{background:var(--ink);color:var(--off)}
.v-bauhaus .bh-b-s5{background:var(--yellow);color:var(--ink)}
.v-bauhaus .bh-b-s6{background:var(--off) repeating-linear-gradient(45deg,transparent 0 7px,rgba(20,20,20,.55) 7px 9px);box-shadow:inset 0 0 0 4px var(--ink);color:var(--ink)}
.v-bauhaus .bh-block.bh-b-s6 .bh-block-t > *,.v-bauhaus .bh-block.bh-b-s6 .bh-block-n{background:var(--off);padding-left:4px;padding-right:4px;margin-left:-4px}
.v-bauhaus .bh-board::before{content:"";position:absolute;left:28px;right:28px;height:8px;background:var(--ink);top:250px}
.v-bauhaus .bh-cards{display:flex;flex-direction:column;gap:10px;padding-top:20px}
.v-bauhaus .bh-card{background:var(--card);border:3px solid var(--ink);padding:10px 10px 0;display:flex;flex-direction:column;gap:6px}
.v-bauhaus .bh-card-h{display:flex;gap:7px;align-items:flex-start}
.v-bauhaus .bh-card-h .bh-g{margin-top:2px}
.v-bauhaus .bh-card h4{font:600 14.5px/1.2 'Jost',sans-serif}
.v-bauhaus .bh-who2{font-size:12.5px;color:var(--mute);line-height:1.3}
.v-bauhaus .bh-reason{font-size:12.5px;font-style:italic;border-left:4px solid var(--ink);padding-left:7px}
.v-bauhaus .bh-card-f{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:2px -10px 0;padding:7px 10px;border-top:3px solid var(--ink)}
.v-bauhaus .bh-amt{font:700 19px/1 'League Spartan','Futura',sans-serif;letter-spacing:-.02em;padding-top:2px}
.v-bauhaus .bh-own{display:flex;align-items:center;gap:5px}
.v-bauhaus .bh-own .bh-un{font-size:11px;font-style:normal;text-transform:uppercase;letter-spacing:.08em}
.v-bauhaus .bh-card.is-won{border-color:var(--ink);background:var(--card)}
.v-bauhaus .bh-card.is-won .bh-card-f{background:var(--yellow)}
.v-bauhaus .bh-card.is-lost .bh-amt{text-decoration:line-through;text-decoration-thickness:3px;color:var(--mute)}

/* contacts */
.v-bauhaus .bh-cgrid{display:grid;grid-template-columns:268px minmax(0,1fr);gap:28px;padding:28px 28px 0}
.v-bauhaus .bh-cpanel{display:flex;flex-direction:column;gap:12px}
.v-bauhaus .bh-bigblock{background:var(--red);color:var(--off);padding:18px 18px 16px;display:flex;flex-direction:column;position:relative;overflow:hidden}
.v-bauhaus .bh-bigblock::after{content:"";position:absolute;right:-46px;bottom:-46px;width:120px;height:120px;border-radius:50%;background:var(--yellow)}
.v-bauhaus .bh-bigblock b{font:900 168px/.78 'League Spartan','Futura',sans-serif;letter-spacing:-.06em;position:relative;padding-top:14px}
.v-bauhaus .bh-bigblock span{font:600 13px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.16em;margin-top:10px;position:relative}
.v-bauhaus .bh-h1sm{font-size:52px;line-height:.9;margin:8px 0 6px}
.v-bauhaus .bh-cpanel .bh-search{width:auto}
.v-bauhaus .bh-wide{width:100%}
.v-bauhaus .bh-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.v-bauhaus .bh-pair .bh-btn{padding:0 8px;font-size:12px}
.v-bauhaus .bh-table{min-width:0}
.v-bauhaus .bh-tr{display:grid;grid-template-columns:minmax(0,2.15fr) minmax(0,1.95fr) minmax(0,1.2fr) 112px 88px 74px;border-bottom:2px solid var(--ink)}
.v-bauhaus .bh-td{padding:12px 10px;min-width:0;font-size:14px}
.v-bauhaus .bh-th{border-bottom:8px solid var(--ink)}
.v-bauhaus .bh-th .bh-td{font:600 11px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.14em;padding-top:4px;padding-bottom:10px}
.v-bauhaus .bh-name{display:flex;gap:12px;align-items:flex-start}
.v-bauhaus .bh-cav{width:36px;height:36px;border-radius:50%;background:var(--ink);color:var(--off);display:grid;place-items:center;font:600 12px/1 'Jost',sans-serif;letter-spacing:.04em;flex:none}
.v-bauhaus .bh-tags{margin-top:6px}
.v-bauhaus .bh-email{overflow-wrap:anywhere}
.v-bauhaus .bh-num{text-align:right;font:800 26px/1 'League Spartan','Futura',sans-serif;letter-spacing:-.02em;padding-top:14px}
.v-bauhaus .bh-th .bh-num{text-align:right}
.v-bauhaus .bh-num.is-zero{color:#b5b2a8}
.v-bauhaus .bh-added{text-align:right;font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:.06em}
.v-bauhaus .bh-tr.is-sel{background:var(--yellow)}
.v-bauhaus .bh-tr.is-sel .bh-sm{color:var(--ink)}
.v-bauhaus .bh-tr.is-sel .bh-cav{background:var(--blue)}
.v-bauhaus .bh-tr.is-dnc .bh-cav{background:var(--red)}
.v-bauhaus .bh-tr.is-dnc .bh-email{text-decoration:line-through;text-decoration-thickness:2px;text-decoration-color:var(--red)}

/* detail */
.v-bauhaus .bh-back{display:inline-block;margin:20px 28px 0;font:600 12.5px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.14em;border-bottom:3px solid var(--ink);padding-bottom:4px}
.v-bauhaus .bh-dhead{display:grid;grid-template-columns:150px minmax(0,1fr) auto;gap:24px;align-items:end;padding:18px 28px 26px}
.v-bauhaus .bh-bigav{width:150px;height:150px;background:var(--blue);color:var(--off);display:flex;align-items:flex-end;padding:0 12px 6px;font:800 76px/.8 'League Spartan','Futura',sans-serif;letter-spacing:-.05em;position:relative;overflow:hidden}
.v-bauhaus .bh-bigav::before{content:"";position:absolute;right:-30px;top:-30px;width:84px;height:84px;border-radius:50%;background:var(--yellow)}
.v-bauhaus .bh-dname h1{font-size:76px;line-height:.85;letter-spacing:-.045em}
.v-bauhaus .bh-role{margin-top:12px;font-size:18px;font-weight:500}
.v-bauhaus .bh-acts{display:flex;gap:8px}
.v-bauhaus .bh-dgrid{display:grid;grid-template-columns:minmax(0,1fr) 392px;gap:32px;padding:0 28px;align-items:start}
.v-bauhaus .bh-dmain,.v-bauhaus .bh-dside{display:flex;flex-direction:column;gap:28px;min-width:0}
.v-bauhaus .bh-sec{border-top:8px solid var(--ink);padding-top:12px}
.v-bauhaus .bh-sec h2{font:700 22px/1 'League Spartan','Futura',sans-serif;text-transform:uppercase;letter-spacing:.01em;margin-bottom:14px;display:flex;align-items:center;gap:10px;padding-top:3px}
.v-bauhaus .bh-pill{font:700 13px/1 'Jost',sans-serif;background:var(--ink);color:var(--off);min-width:24px;height:24px;border-radius:12px;display:inline-grid;place-items:center;padding:0 6px}
.v-bauhaus .bh-types a{height:34px;padding:0 14px}
.v-bauhaus .bh-ta{margin-top:10px;height:92px;border:3px solid var(--ink);background:var(--card);padding:10px 12px;font-size:14.5px}
.v-bauhaus .bh-comp-f{display:flex;justify-content:space-between;gap:10px;margin-top:10px}
.v-bauhaus .bh-comp-f .bh-in{min-width:220px}
.v-bauhaus .bh-task{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:12px;align-items:start;padding:12px 0;border-bottom:2px solid var(--ink)}
.v-bauhaus .bh-task:last-child{border-bottom:0}
.v-bauhaus .bh-check{width:22px;height:22px;border:3px solid var(--ink);background:var(--card);margin-top:1px}
.v-bauhaus .bh-task.is-od .bh-check{border-color:var(--red)}
.v-bauhaus .bh-task .bh-sm{margin-top:3px;display:flex;align-items:center;gap:6px}
.v-bauhaus .bh-tl{list-style:none;display:flex;flex-direction:column;gap:10px;position:relative}
.v-bauhaus .bh-ev{display:grid;grid-template-columns:86px minmax(0,1fr);gap:14px;align-items:start;padding:4px 0 10px;border-bottom:2px solid var(--ink)}
.v-bauhaus .bh-type{background:var(--ink);color:var(--off);font:600 11px/1 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.14em;padding:6px 8px 5px;text-align:center;margin-top:1px}
.v-bauhaus .bh-meta{font-size:12.5px;color:var(--mute);display:flex;flex-wrap:wrap;align-items:center;gap:0 5px}
.v-bauhaus .bh-meta b{color:var(--ink);font-weight:600}
.v-bauhaus .bh-via{color:var(--ink);background:var(--yellow);padding:1px 5px;font-weight:500}
.v-bauhaus .bh-body{margin-top:4px;font-size:14.5px;line-height:1.45;text-wrap:pretty}
.v-bauhaus .bh-ev.is-done .bh-body{text-decoration:line-through;text-decoration-thickness:2px;color:var(--mute)}
.v-bauhaus .bh-ev.is-done .bh-type{background:var(--card);color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink)}
.v-bauhaus .bh-band{border-bottom:0;padding:10px 12px;align-items:center}
.v-bauhaus .bh-band p{font-size:14.5px}
.v-bauhaus .bh-band .bh-sm{color:inherit;opacity:.85;margin-top:2px}
.v-bauhaus .bh-band-g{display:flex;align-items:center;gap:6px;font-weight:700}
.v-bauhaus .bh-band-g i{font-style:normal}
.v-bauhaus .bh-lead{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-bottom:2px solid var(--ink)}
.v-bauhaus .bh-lead b{font:700 18px/1 'League Spartan','Futura',sans-serif;letter-spacing:-.02em;padding-top:2px}
.v-bauhaus .bh-lead.is-won .bh-sm{color:var(--ink);font-weight:600}
.v-bauhaus .bh-sum{display:grid;grid-template-columns:1.25fr 1fr;margin-top:14px}
.v-bauhaus .bh-sum > div{padding:12px;display:flex;flex-direction:column;gap:8px}
.v-bauhaus .bh-sum b{font:800 34px/.85 'League Spartan','Futura',sans-serif;letter-spacing:-.04em;padding-top:3px}
.v-bauhaus .bh-sum-o{background:var(--blue);color:var(--off)}
.v-bauhaus .bh-sum-o .bh-lab{color:var(--off)}
.v-bauhaus .bh-sum-w{background:var(--yellow)}
.v-bauhaus .bh-sum-w .bh-lab{color:var(--ink)}
.v-bauhaus .bh-kv{display:grid;grid-template-columns:104px minmax(0,1fr);row-gap:0}
.v-bauhaus .bh-kv dt{font:600 10.5px/1.9 'Jost',sans-serif;text-transform:uppercase;letter-spacing:.14em;color:var(--mute);padding:7px 0;border-bottom:1px solid #cfccc2}
.v-bauhaus .bh-kv dd{padding:7px 0;border-bottom:1px solid #cfccc2;overflow-wrap:anywhere;font-size:14px}
.v-bauhaus .bh-ok{display:flex;align-items:center;gap:8px;font-weight:600}
.v-bauhaus .bh-ok i{width:12px;height:12px;background:var(--blue);display:inline-block}
.v-bauhaus .bh-q{margin:14px 0 0;padding:12px 14px 12px 40px;border:3px solid var(--ink);position:relative;font-size:15px;font-weight:500;line-height:1.35}
.v-bauhaus .bh-q::before{content:"\\201C";position:absolute;left:10px;top:4px;font:800 44px/1 'League Spartan',sans-serif;color:var(--red)}
.v-bauhaus .bh-pbtns{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.v-bauhaus .bh-notes{background:var(--yellow);padding:16px 18px 18px;position:relative;overflow:hidden}
.v-bauhaus .bh-notes::after{content:"";position:absolute;right:-22px;bottom:-22px;width:64px;height:64px;background:var(--ink);border-radius:50% 0 0 0}
.v-bauhaus .bh-notes h2{font:700 22px/1 'League Spartan','Futura',sans-serif;text-transform:uppercase;margin-bottom:10px;padding-top:3px}
.v-bauhaus .bh-notes p{font-size:15px;line-height:1.45;position:relative;padding-right:28px}
`;

  (window.LT_VARIANTS = window.LT_VARIANTS || []).push({
    id: "bauhaus",
    name: "Bauhaus",
    concept:
      "The pipeline as a Bauhaus poster: every stage owns a shape and a colour block — yellow circle, blue triangle, red square, black half-disc — so you read where a deal stands by its glyph before its words, loud enough to screenshot for a build-in-public post.",
    fonts: ["League+Spartan:wght@600;700;800;900", "Jost:ital,wght@0,400;0,500;0,600;0,700;1,400"],
    tokens: {
      color: [
        { name: "Bauhaus red", value: C.red },
        { name: "Bauhaus blue", value: C.blue },
        { name: "Signal yellow", value: C.yellow },
        { name: "Ink black", value: C.ink },
        { name: "Off-white", value: C.off },
        { name: "Card", value: "#fbfaf6" },
        { name: "Grey text", value: "#5b5952" },
      ],
      type: [
        { role: "Display numerals", family: "'League Spartan', 'Futura', 'Century Gothic', sans-serif", sample: "€80.9k", style: "font-weight:800;letter-spacing:-.04em" },
        { role: "Body & labels", family: "'Jost', ui-sans-serif, system-ui, sans-serif", sample: "Dispatch console redesign", style: "font-weight:500" },
      ],
      spacing: "4px base; 10/12/18/28 steps; 28px page gutter; 8px black rules between zones",
      shape: "Flat, no shadows, 0 radius on blocks; circles only for people and the New/Won glyphs; 3px borders on controls and cards, 8px black structural rules",
      signature: "Stage blocks rise like a bar chart from one thick black baseline — height scales with each stage's total — and the stage glyph (circle, triangle, square, half-disc) recurs on every card, task and timeline band.",
    },
    css,
    render: { board, contacts, detail },
  });
})();
