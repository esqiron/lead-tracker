// People first (Quiet look): the app is organised around companies and the people in them.
// Deals are things that happen inside a relationship; warmth comes from the last touch.
(function () {
  const TAG = {
    s1: ["#E2ECF6", "#2D5C88"],
    s2: ["#EAE6F4", "#574A85"],
    s3: ["#F3EDD3", "#6F5B12"],
    s4: ["#F4E3E6", "#853544"],
    s5: ["#E1EEE4", "#2C653D"],
    s6: ["#E9EAEC", "#565A61"],
  };
  const I = {
    search: `<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    chev: `<svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    check: `<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 6.4l2.4 2.4 5.2-5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };
  // Warmth from days since last touch: a four-bar meter, warm rose down to cold blue.
  const WARM = {
    warm: { label: "Warm", bars: 4, c: "#853544" },
    steady: { label: "Steady", bars: 3, c: "#6F5B12" },
    cooling: { label: "Cooling", bars: 2, c: "#574A85" },
    cold: { label: "Cold", bars: 1, c: "#2D5C88" },
    rest: { label: "No open deals", bars: 0, c: "#A3A7AD" },
    dnc: { label: "Do not contact", bars: 0, c: "#962F27" },
  };
  const level = (days) => (days == null ? "rest" : days <= 3 ? "warm" : days <= 10 ? "steady" : days <= 20 ? "cooling" : "cold");

  const tag = (h, id, text) => `<span class="pt" style="--bg:${TAG[id][0]};--fg:${TAG[id][1]}">${h.esc(text)}</span>`;
  const ini = (h, name) => (name ? `<span class="in">${h.initials(name)}</span>` : `<span class="in un" title="Unassigned"></span>`);
  const first = (name) => String(name || "").split(" ")[0];
  const ago = (days) => (days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`);
  const meter = (k) => {
    const w = WARM[k];
    return `<span class="wm4" style="--c:${w.c}" aria-label="${w.label}">${[1, 2, 3, 4].map((i) => `<i class="${i <= w.bars ? "on" : ""}"></i>`).join("")}</span>`;
  };

  function shell(d, h, active, body) {
    const nav = ["People", "Pipeline", "Tasks", "Reports", "Settings"];
    return `<div class="app">
      <aside class="sb">
        <div class="wm"><i></i>Lead Tracker</div>
        <nav>${nav.map((n) => `<a class="${n === active ? "on" : ""}">${h.esc(n)}</a>`).join("")}</nav>
        <div class="acct">
          <span class="lab">Organisation</span>
          <span class="orgn">${h.esc(d.org.name)}</span>
          <div class="usr">${ini(h, d.viewer.name)}<div><b>${h.esc(d.viewer.name)}</b><span>${h.esc(d.viewer.email)}</span></div></div>
          <a class="so">Sign out</a>
        </div>
      </aside>
      <main class="mn">${body}</main>
    </div>`;
  }

  // Companies built from contacts + leads + last touch.
  function companies(d) {
    const names = [...new Set(d.contacts.map((c) => c.company))];
    return names.map((name) => {
      const people = d.contacts.filter((c) => c.company === name).map((c) => {
        const ls = d.leads.filter((l) => l.contact === c.name && l.status === "open" && d.touch[l.id]);
        const best = ls.map((l) => ({ ...d.touch[l.id], lead: l })).sort((a, b) => a.days - b.days)[0];
        return { ...c, touch: best || null };
      });
      const leads = d.leads.filter((l) => l.company === name);
      const open = leads.filter((l) => l.status === "open");
      const touches = people.map((p) => p.touch).filter(Boolean).sort((a, b) => a.days - b.days);
      const t = touches[0] || null;
      const dnc = people.every((p) => p.doNotContact);
      const k = dnc ? "dnc" : open.length ? level(t ? t.days : null) : "rest";
      const owners = open.map((l) => l.owner).filter(Boolean);
      const owner = owners[0] || people.map((p) => p.owner).find(Boolean) || "";
      return { name, people, leads, open, won: leads.filter((l) => l.status === "won"), lost: leads.filter((l) => l.status === "lost"), t, k, owner, openValue: open.reduce((a, l) => a + l.amount, 0) };
    });
  }

  /* ---------- Screen 1: directory grouped by company ---------- */
  function directory(d, h) {
    const C = companies(d);
    const order = ["warm", "steady", "cooling", "cold", "rest", "dnc"];
    const groups = [
      ["warm", "Warm", "Touched in the last 3 days"],
      ["steady", "Steady", "4–10 days since anyone was in touch"],
      ["cooling", "Cooling", "11–20 days"],
      ["cold", "Cold", "Over three weeks of silence"],
      ["rest", "Resting", "No open deals"],
    ];
    const sorted = C.slice().sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k) || (a.t ? a.t.days : 99) - (b.t ? b.t.days : 99) || b.openValue - a.openValue);

    const personLine = (h, p, c) => {
      let st;
      if (p.doNotContact) st = `<span class="pt" style="--bg:#F6E1DF;--fg:#962F27">Do not contact</span>`;
      else if (p.touch) st = `<span class="pl-t">${h.esc(p.touch.via)} · ${ago(p.touch.days)}</span>`;
      else if (!c.open.length) st = `<span class="pl-t mute">No open deals · added ${h.day(p.added)}</span>`;
      else st = `<span class="pl-t mute">No activity logged yet</span>`;
      return `<li>${ini(h, p.name)}<div class="pl-n"><b>${h.esc(p.name)}</b><span>${p.title ? h.esc(p.title) : "No title yet"}</span></div>${st}</li>`;
    };

    const companyRow = (c) => `<article class="co ${c.name === "Brightline Logistics" ? "hover" : ""}">
      <div class="co-a">
        <h3>${h.esc(c.name)}</h3>
        <span class="co-s">${c.people.length} ${c.people.length === 1 ? "person" : "people"}${c.owner ? ` · ${h.esc(first(c.owner))}` : ""}</span>
        <span class="co-w" style="--c:${WARM[c.k].c}">${meter(c.k)}<b>${WARM[c.k].label}</b>${c.t ? `<span>${h.esc(c.t.via)} · ${ago(c.t.days)}</span>` : ""}</span>
      </div>
      <ul class="co-p">${c.people.map((p) => personLine(h, p, c)).join("")}</ul>
      <div class="co-v">${c.open.length ? `<span class="v">${h.money(c.openValue)}</span><span class="dt">${c.open.length} open ${c.open.length === 1 ? "deal" : "deals"}</span>` : `<span class="v mute">—</span>`}${c.won.length ? `<span class="dt wonv">${h.money(h.total(c.won))} won</span>` : ""}</div>
    </article>`;

    const sections = groups
      .map(([k, label, hint]) => {
        const list = sorted.filter((c) => c.k === k || (k === "rest" && c.k === "dnc"));
        if (!list.length) return "";
        return `<section class="grp">
          <header class="gh"><span class="co-w" style="--c:${WARM[k].c}">${meter(k)}</span><b>${label}</b><span class="lab">${hint}</span><em>${list.length}</em></header>
          ${list.map(companyRow).join("")}
        </section>`;
      })
      .join("");

    const body = `
      <div class="hd">
        <div>
          <h1>People <span class="ct">${d.contacts.length} people · ${C.length} companies</span></h1>
          <p class="lede">Brightline Logistics is your warmest relationship. Open Harbour Trust and Ridgeback Climbing haven't heard from anyone in over three weeks.</p>
        </div>
        <div class="vt"><a class="on">By company</a><a>Everyone</a></div>
      </div>
      <div class="tb">
        <span class="sr">${I.search}<span>Find a person or company</span><kbd>/</kbd></span>
        <span class="fl"><span>Sort</span>Warmth${I.chev}</span>
        <span class="fl"><span>Owner</span>Anyone${I.chev}</span>
        <span class="gap"></span>
        <a class="b ln">Import CSV</a><a class="b pr">Add person</a>
      </div>
      <div class="dir">${sections}</div>`;
    return shell(d, h, "People", body);
  }

  /* ---------- Screen 2: Brightline Logistics ---------- */
  function company(d, h) {
    const C = companies(d).find((c) => c.name === "Brightline Logistics");
    const D = d.detail;
    const ioana = D.contact;
    const ben = d.contacts.find((c) => c.name === "Ben Carter");
    const deals = D.leads.slice().map((l) => ({ ...l, full: d.leads.find((x) => x.id === l.id) }));
    const totalAll = deals.reduce((a, l) => a + l.amount, 0);

    const strip = deals
      .map((l) => {
        const st = h.stage(l.stageId);
        const f = l.full;
        const t = d.touch[l.id];
        let line;
        if (st.is_won) line = `<span class="dt">Won · first project</span>`;
        else if (l.id === "l7") line = `<span class="od">Task overdue</span>`;
        else line = `<span class="dt">Next: ${h.esc(t.next)}</span>`;
        return `<div class="dl ${st.is_won ? "won" : ""}" style="flex:${l.amount}">
          ${tag(h, l.stageId, st.name)}
          <b>${h.esc(l.title)}</b>
          <div class="dl-f"><span class="am">${h.money(l.amount)}</span>${f && !st.is_won ? `<span class="dt">Closes ${h.day(f.closeDate)}</span>` : ""}</div>
          ${line}
        </div>`;
      })
      .join("");

    const who = (e) => {
      if (e.source) return `<span class="pt" style="--bg:#F3EDD3;--fg:#6F5B12">via ${h.esc(e.source)}</span><span class="with">from Ioana</span>`;
      return `<span class="au">${h.esc(e.author)}</span><span class="with">with Ioana</span>`;
    };
    const tl = D.timeline
      .slice(0, 6)
      .map((e) => {
        const when = `<div class="wh">${h.dateTime(e.at).replace(", ", "<br>")}</div>`;
        if (e.kind === "stage") {
          return `<li class="ev st">${when}<div class="eb"><p class="mv">${e.from ? `${h.esc(e.lead)} moved to ` : `${h.esc(e.lead)} added in `}${tag(h, d.stages.find((s) => s.name === e.to).id, e.to)}</p></div></li>`;
        }
        const done = e.completedAt ? `<span class="dn">${I.check}Done ${h.dateTime(e.completedAt)}</span>` : "";
        return `<li class="ev ${e.completedAt ? "fin" : ""}">${when}<div class="eb">
          <div class="em"><span class="ty">${h.TYPE_LABELS[e.type]}</span>${who(e)}<span class="lk">${h.esc(e.lead)}</span>${done}</div>
          <p>${h.esc(e.body)}</p></div></li>`;
      })
      .join("");

    const tasks = D.openTasks
      .map((t) => `<li><span class="cb"></span><div><p>${h.esc(t.body)}</p>
        <div class="meta">${t.overdue ? `<span class="od">Overdue · ${h.dateTime(t.due)}</span>` : `<span>Due ${h.dateTime(t.due)}</span>`}<span>${h.esc(first(t.assignee))}</span></div></div></li>`)
      .join("");

    const person = (p, opts) => `<section class="blk pc">
      <div class="pc-h">${ini(h, p.name)}<div><b>${h.esc(p.name)}</b><span>${h.esc(p.title)}</span></div>
        <span class="co-w" style="--c:${WARM[opts.k].c}">${meter(opts.k)}</span></div>
      <div class="roles">${opts.roles.map((r) => `<span class="pt" style="--bg:#ECEDEF;--fg:#4A4E55">${h.esc(r)}</span>`).join("")}</div>
      <p class="pc-l">${opts.line}</p>
      <div class="pc-c"><span>${h.esc(p.email)}</span><span class="mo">${h.esc(p.phone)}</span></div>
    </section>`;

    const body = `
      <a class="bk">← People</a>
      <div class="dh">
        <span class="av">BL</span>
        <div>
          <h1>${h.esc(C.name)}</h1>
          <p class="sub">${h.esc(ioana.website.replace("https://", ""))} · Logistics · Relationship owner ${h.esc(C.owner)}</p>
        </div>
        <div class="dh-w"><span class="co-w big" style="--c:${WARM[C.k].c}">${meter(C.k)}<b>${WARM[C.k].label}</b></span><span class="dt">Last touch: ${h.esc(C.t.via.toLowerCase())} ${ago(C.t.days)}</span></div>
      </div>

      <div class="people">
        ${person(ioana, { k: "warm", roles: ["Main contact", "Signs up to €50k"], line: `Call ${ago(1)} about the dispatch prototype. Waiting on the revised pilot proposal.` })}
        ${person(ben, { k: "rest", roles: ["Operations"], line: `No activity logged with Ben yet. Added ${h.day(ben.added)} by ${h.esc(first(ben.owner))}.` })}
        <a class="addp">+ Add someone from Brightline</a>
      </div>

      <section class="blk deals">
        <div class="dh2"><span class="lab">Deals with Brightline</span><span class="tot"><b>${h.money(D.openValue)}</b> open · <b>${h.money(D.wonValue)}</b> won · ${h.money(totalAll)} all time</span><a class="b sm ln">New deal</a></div>
        <div class="strip">${strip}</div>
      </section>

      <div class="grid2">
        <div class="colm">
          <section class="blk logb">
            <span class="lab">Log with Brightline</span>
            <div class="lg-row"><span class="lg-k">With</span><span class="pp on">${I.check}Ioana</span><span class="pp on">${I.check}Ben</span><span class="pp add">+ Someone</span></div>
            <div class="lg-row"><span class="lg-k">About</span><span class="pp deal">Dispatch console redesign${I.chev}</span><span class="lg-h">Suggested from what you typed. Optional.</span></div>
            <div class="tp"><a class="on">Note</a><a>Call</a><a>Email</a><a>Meeting</a><a>Task</a></div>
            <div class="ta typed">Ioana asked us to copy Ben on the DPA. He owns the data fields on their side.<span class="caret"></span></div>
            <div class="cf"><span class="hint"><kbd>⌘</kbd><kbd>↵</kbd> to save</span><a class="b pr">Log note for Ioana and Ben</a></div>
          </section>
          <section class="blk">
            <span class="lab">Everything with Brightline <em>newest first · all deals</em></span>
            <ol class="tl">${tl}</ol>
            <a class="older">Show 2 older</a>
          </section>
        </div>
        <div class="cols">
          <section class="blk">
            <span class="lab">Open tasks <em>${D.openTasks.length}</em></span>
            <ul class="tk">${tasks}</ul>
          </section>
          <section class="blk">
            <span class="lab">Account notes</span>
            <p class="nt">${h.esc(ioana.notes)}</p>
          </section>
          <section class="blk priv">
            <span class="lab">Privacy, per person</span>
            <dl>
              <div><dt>Ioana</dt><dd>${h.esc(ioana.privacy.lawfulBasis)} · consent ${h.date(ioana.privacy.consent.given)}<br><span class="pt" style="--bg:#E1EEE4;--fg:#2C653D">Contact allowed</span></dd></div>
              <div><dt>Ben</dt><dd><span class="warnb">No lawful basis recorded</span><br><a class="lnk">Add lawful basis</a></dd></div>
            </dl>
          </section>
        </div>
      </div>`;
    return shell(d, h, "People", body);
  }

  /* ---------- Screen 3: pipeline as accounts ---------- */
  function pipeline(d, h) {
    const C = companies(d).filter((c) => c.open.length).sort((a, b) => b.openValue - a.openValue);
    const total = C.reduce((a, c) => a + c.openValue, 0);
    const max = C[0].openValue;
    const open = d.stages.filter((s) => !s.is_won && !s.is_lost);
    const stageTotals = open.map((s) => ({ s, v: h.total(d.leads.filter((l) => l.status === "open" && l.stageId === s.id)), n: d.leads.filter((l) => l.status === "open" && l.stageId === s.id).length }));
    const share = Math.round((C[0].openValue / total) * 100);

    const menu = `<div class="pop" role="menu">
      <span class="pop-h">Move to stage</span>
      ${open.concat(d.stages.filter((s) => s.is_won || s.is_lost))
        .map((s) => `<a class="${s.id === "s3" ? "cur" : ""} ${s.id === "s4" ? "hov" : ""}">${tag(h, s.id, s.name)}<span>${s.id === "s3" ? "Now" : s.is_won || s.is_lost ? "Close" : `${s.probability}%`}</span></a>`)
        .join("")}
    </div>`;

    const rows = C.map((c, i) => {
      const main = c.people.find((p) => !p.doNotContact) || c.people[0];
      const deals = c.open
        .slice()
        .sort((a, b) => Number(b.stageId.slice(1)) - Number(a.stageId.slice(1)))
        .map((l) => `<span class="dc ${l.id === "l7" ? "act" : ""}">${tag(h, l.stageId, h.stage(l.stageId).name)}<span class="dc-t">${h.esc(l.title)}</span><span class="dc-a">${h.moneyShort(l.amount)}</span>${l.overdue ? `<span class="od">Overdue</span>` : ""}${l.id === "l7" ? `${I.chev}${menu}` : ""}</span>`)
        .join("");
      const closed = [c.won.length ? `${h.money(h.total(c.won))} won before` : "", c.lost.length ? `${h.money(h.total(c.lost))} lost` : ""].filter(Boolean).join(" · ");
      return `<li class="ar">
        <span class="rk">${i + 1}</span>
        <div class="ar-a">
          <h3>${h.esc(c.name)}</h3>
          <span class="ar-p">${h.esc(main.name)}${c.people.length > 1 ? ` +${c.people.length - 1}` : ""}</span>
          <span class="co-w" style="--c:${WARM[c.k].c}">${meter(c.k)}<b>${WARM[c.k].label}</b>${c.t ? `<span>${ago(c.t.days)}</span>` : ""}</span>
        </div>
        <div class="ar-d">${deals}${closed ? `<span class="ar-c">${closed}</span>` : ""}</div>
        <div class="ar-v"><span class="v">${h.money(c.openValue)}</span><span class="vb"><i style="width:${((c.openValue / max) * 100).toFixed(1)}%"></i></span><span class="dt">${Math.round((c.openValue / total) * 100)}% of open</span></div>
      </li>`;
    }).join("");

    const body = `
      <div class="hd">
        <div>
          <h1>Pipeline <span class="ct">${h.money(total)} open · ${C.length} accounts</span></h1>
          <p class="lede">${share}% of what's open sits with Brightline Logistics. Atelier Moreau's single ${h.money(C[1].openValue)} deal is the next biggest.</p>
        </div>
        <div class="vt"><a class="on">By account</a><a>By stage</a></div>
      </div>
      <div class="stg">
        <div class="stg-bar">${stageTotals.map((x) => `<span style="flex:${x.v};--bg:${TAG[x.s.id][0]}"></span>`).join("")}</div>
        <div class="stg-l">${stageTotals.map((x) => `<span>${tag(h, x.s.id, x.s.name)}<b>${h.money(x.v)}</b><em>${x.n}</em></span>`).join("")}</div>
      </div>
      <ol class="accts">${rows}</ol>`;
    return shell(d, h, "Pipeline", body);
  }

  const INK = "#1C1E21";
  const MUTE = "#6A6E75";
  const R = "#E3E5E8";
  const css = `
.f-accounts .mute{color:#A3A7AD}
.f-accounts .lede{margin:12px 0 0;font-size:16px;line-height:1.5;color:#3E4248;max-width:62ch;text-wrap:pretty}
.f-accounts .hd{align-items:flex-end;gap:32px}
.f-accounts .hd .vt{flex:none}

/* Warmth meter */
.f-accounts .wm4{display:inline-flex;align-items:flex-end;gap:2px;height:14px;flex:none}
.f-accounts .wm4 i{width:4px;border-radius:1px;background:#DADDE1}
.f-accounts .wm4 i:nth-child(1){height:5px}
.f-accounts .wm4 i:nth-child(2){height:8px}
.f-accounts .wm4 i:nth-child(3){height:11px}
.f-accounts .wm4 i:nth-child(4){height:14px}
.f-accounts .wm4 i.on{background:var(--c)}
.f-accounts .co-w{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:${MUTE};white-space:nowrap}
.f-accounts .co-w b{font-weight:500;color:var(--c)}
.f-accounts .co-w.big .wm4{height:18px}
.f-accounts .co-w.big b{font-size:15px}

/* Directory */
.f-accounts .dir{display:flex;flex-direction:column;gap:22px}
.f-accounts .grp{background:#fff;border:1px solid ${R};border-radius:10px;padding:6px 24px 4px}
.f-accounts .gh{display:flex;align-items:center;gap:12px;padding:14px 0 12px}
.f-accounts .gh b{font-weight:500;font-size:15px}
.f-accounts .gh .lab{margin-left:4px}
.f-accounts .gh em{margin-left:auto;font:400 12px/1 'DM Mono',ui-monospace,monospace;font-style:normal;color:${MUTE}}
.f-accounts .co{display:grid;grid-template-columns:250px minmax(0,1fr) 140px;gap:24px;padding:16px 0;border-top:1px solid ${R}}
.f-accounts .co.hover{margin:0 -12px;padding:16px 12px;background:#F7F8F9;border-radius:6px;border-top-color:transparent;box-shadow:inset 0 0 0 1px #D4D7DB}
.f-accounts .co.hover + .co{border-top-color:transparent}
.f-accounts .co h3{margin:0;font-weight:500;font-size:16.5px;line-height:1.3;letter-spacing:-.01em}
.f-accounts .co-a{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}
.f-accounts .co-s{font-size:13px;color:${MUTE}}
.f-accounts .co-w span{color:${MUTE}}
.f-accounts .co-p li{display:grid;grid-template-columns:26px minmax(0,1fr) auto;align-items:center;gap:12px;padding:5px 0}
.f-accounts .pl-n{min-width:0}
.f-accounts .pl-n b{display:block;font-weight:500;font-size:14.5px;line-height:1.3}
.f-accounts .pl-n span{display:block;font-size:12.5px;color:${MUTE};line-height:1.35}
.f-accounts .pl-t{font:400 11.5px/1.3 'DM Mono',ui-monospace,monospace;color:#4A4E55;white-space:nowrap}
.f-accounts .pl-t.mute{color:#A3A7AD}
.f-accounts .co-v{display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right}
.f-accounts .v{font-weight:300;font-size:22px;line-height:1.1;letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.f-accounts .v.mute{color:#C3C6CB}
.f-accounts .wonv{color:#2C653D}

/* Company page */
.f-accounts .dh{margin:16px 0 22px}
.f-accounts .dh-w{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.f-accounts .people{display:grid;grid-template-columns:1fr 1fr 150px;gap:12px;margin-bottom:12px}
.f-accounts .pc{display:flex;flex-direction:column;gap:10px;padding:18px 20px}
.f-accounts .pc-h{display:flex;align-items:center;gap:12px}
.f-accounts .pc-h .in{width:38px;height:38px;font-size:12.5px;background:#E2ECF6;color:#2D5C88;border-radius:8px}
.f-accounts .pc-h b{display:block;font-weight:500;font-size:16px;line-height:1.3}
.f-accounts .pc-h span:not(.in):not(.co-w){display:block;font-size:13px;color:${MUTE}}
.f-accounts .pc-h .co-w{margin-left:auto}
.f-accounts .roles{display:flex;flex-wrap:wrap;gap:4px}
.f-accounts .pc-l{margin:0;font-size:14px;line-height:1.5;color:#3E4248}
.f-accounts .pc-c{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13px;color:${MUTE};margin-top:auto}
.f-accounts .pc-c .mo{font:400 12.5px/1.6 'DM Mono',ui-monospace,monospace}
.f-accounts .addp{display:grid;place-items:center;text-align:center;padding:16px;border:1px dashed #C3C6CB;border-radius:10px;font-size:13.5px;color:${MUTE};line-height:1.4}
.f-accounts .deals{margin-bottom:12px;padding:18px 20px 20px}
.f-accounts .dh2{display:flex;align-items:center;gap:18px;margin-bottom:14px}
.f-accounts .tot{font-size:13.5px;color:${MUTE}}
.f-accounts .tot b{color:${INK};font-weight:500}
.f-accounts .dh2 .b{margin-left:auto}
.f-accounts .strip{display:flex;gap:2px;border-radius:8px;overflow:hidden;background:${R}}
.f-accounts .dl{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding:14px 16px;background:#FAFAFB}
.f-accounts .dl b{font-weight:500;font-size:14.5px;line-height:1.3}
.f-accounts .dl-f{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}
.f-accounts .dl .dt{white-space:normal;line-height:1.45}
.f-accounts .dl.won{background:#F3F8F4}
.f-accounts .grid2{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:12px;align-items:start}
.f-accounts .grid2 > .colm,.f-accounts .grid2 > .cols{grid-column:auto}
.f-accounts .lg-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px}
.f-accounts .lg-k{width:52px;font-size:13px;color:${MUTE}}
.f-accounts .pp{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 11px;border:1px solid #D4D7DB;border-radius:999px;font-size:13px;background:#fff;white-space:nowrap}
.f-accounts .pp.on{background:${INK};border-color:${INK};color:#fff;font-weight:500}
.f-accounts .pp.add{border-style:dashed;color:${MUTE}}
.f-accounts .pp.deal{border-radius:6px;font-weight:500}
.f-accounts .lg-h{font-size:12.5px;color:${MUTE};margin-left:6px}
.f-accounts .logb .tp{margin:16px 0 10px}
.f-accounts .ta.typed{min-height:70px;color:${INK};border-color:${INK};box-shadow:0 0 0 3px #E2ECF6}
.f-accounts .caret{display:inline-block;width:1.5px;height:17px;background:${INK};margin-left:2px;vertical-align:-3px}
.f-accounts .with{color:${MUTE}}
.f-accounts .older{display:inline-block;margin-top:6px;font-size:13px;color:${MUTE};text-decoration:underline;text-underline-offset:3px;text-decoration-color:#C3C6CB}
.f-accounts .priv dd{line-height:1.7}
.f-accounts .warnb{color:#962F27;font-weight:500}
.f-accounts .lnk{font-size:13px;text-decoration:underline;text-underline-offset:3px;text-decoration-color:#C3C6CB}

/* Pipeline by account */
.f-accounts .stg{margin-bottom:22px}
.f-accounts .stg-bar{display:flex;gap:2px;height:8px;border-radius:4px;overflow:hidden}
.f-accounts .stg-bar span{background:var(--bg);filter:saturate(1.6) brightness(.94)}
.f-accounts .stg-l{display:flex;flex-wrap:wrap;gap:8px 28px;margin-top:12px}
.f-accounts .stg-l > span{display:inline-flex;align-items:center;gap:10px;font-size:14px}
.f-accounts .stg-l b{font-weight:500;font-variant-numeric:tabular-nums}
.f-accounts .stg-l em{font:400 11.5px/1 'DM Mono',ui-monospace,monospace;font-style:normal;color:${MUTE}}
.f-accounts .accts{background:#fff;border:1px solid ${R};border-radius:10px;padding:4px 24px}
.f-accounts .ar{display:grid;grid-template-columns:20px 210px minmax(0,1fr) 150px;gap:20px;padding:18px 0;border-top:1px solid ${R}}
.f-accounts .ar:first-child{border-top:0}
.f-accounts .rk{font:400 12px/1 'DM Mono',ui-monospace,monospace;color:#9A9EA5;padding-top:5px}
.f-accounts .ar-a{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:0}
.f-accounts .ar h3{margin:0;font-weight:500;font-size:16px;line-height:1.3}
.f-accounts .ar-p{font-size:13px;color:${MUTE}}
.f-accounts .ar-d{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}
.f-accounts .dc{position:relative;display:inline-flex;align-items:center;gap:10px;max-width:100%;padding:5px 10px 5px 6px;border:1px solid ${R};border-radius:8px;font-size:14px}
.f-accounts .dc-t{font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.f-accounts .dc-a{font-variant-numeric:tabular-nums;color:#3E4248}
.f-accounts .dc.act{border-color:${INK};box-shadow:0 0 0 3px #E2ECF6}
.f-accounts .ar-c{font-size:12.5px;color:${MUTE};padding-left:2px}
.f-accounts .ar-v{display:flex;flex-direction:column;align-items:flex-end;gap:7px}
.f-accounts .vb{display:block;width:100%;height:4px;border-radius:2px;background:#ECEDEF}
.f-accounts .vb i{display:block;height:100%;border-radius:2px;background:${INK}}
.f-accounts .pop{position:absolute;z-index:3;top:-6px;left:calc(100% + 12px);width:196px;padding:8px;background:#fff;border:1px solid #D4D7DB;border-radius:10px;box-shadow:0 12px 32px -12px rgba(28,30,33,.28);display:flex;flex-direction:column;gap:1px}
.f-accounts .pop-h{font:500 10.5px/1.4 'DM Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:${MUTE};padding:4px 8px 8px}
.f-accounts .pop a{display:flex;align-items:center;justify-content:space-between;padding:7px 8px;border-radius:6px;font-size:12.5px;color:${MUTE}}
.f-accounts .pop a.cur{color:${INK}}
.f-accounts .pop a.hov{background:#F1F2F3;color:${INK};font-weight:500}
`;

  (window.LT_FLOWS = window.LT_FLOWS || []).push({
    id: "accounts",
    name: "People first",
    look: "quiet",
    pitch: "Work with companies and the people in them; deals are just things that happen inside a relationship.",
    problem:
      "Today every deal is its own island. Brightline has three open deals with Ioana, and their history is split across three cards and a contact page. You can see which deals are stuck, but not which customers you're neglecting.",
    principles: [
      "The directory groups people by company and shows how warm each relationship is, based on the last time anyone was in touch.",
      "A company page holds its people, every deal in one strip, and one shared timeline across all of them.",
      "You log with people, once; tagging a deal is optional and suggested from what you wrote.",
      "The pipeline is ranked by account, so you see where the money sits by customer, with each deal and its stage inline and movable from there.",
    ],
    tradeoffs:
      "Extra clicks for high-volume, one-off sales where every lead is a different small company and there's no relationship to speak of. Stage-by-stage forecasting drops to a summary line instead of being the main view.",
    fonts: [],
    css,
    screens: [
      { id: "people", title: "People, by company", caption: "The directory replaces the leads board as home. Companies are grouped by how warm the relationship is, with each person's last touch.", render: directory },
      { id: "company", title: "Brightline Logistics", caption: "One page for the relationship: the people, all four deals as a strip, and a single timeline. Ana logs a note for Ioana and Ben at once.", render: company },
      { id: "pipeline", title: "Pipeline by account", caption: "Open value ranked by customer, with every deal and its stage inline. Ana moves the Fleet tracking pilot without leaving the list.", render: pipeline },
    ],
  });
})();
