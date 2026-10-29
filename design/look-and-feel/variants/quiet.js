// Quiet — editorial calm. Ink on cool paper, one hairline weight, pastel stage tags,
// and type size/weight doing the work boxes usually do.
(function () {
  const TAG = {
    s1: ["#E2ECF6", "#2D5C88"],
    s2: ["#EAE6F4", "#574A85"],
    s3: ["#F3EDD3", "#6F5B12"],
    s4: ["#F4E3E6", "#853544"],
    s5: ["#E1EEE4", "#2C653D"],
    s6: ["#E9EAEC", "#565A61"],
  };
  const INK = "#1C1E21";

  const I = {
    search: `<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    chev: `<svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    check: `<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 6.4l2.4 2.4 5.2-5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };

  const tag = (h, id, text) => `<span class="pt" style="--bg:${TAG[id][0]};--fg:${TAG[id][1]}">${h.esc(text)}</span>`;
  const stageIdByName = (d, name) => (d.stages.find((s) => s.name === name) || {}).id;
  const ini = (h, name) => (name ? `<span class="in">${h.initials(name)}</span>` : `<span class="in un" title="Unassigned"></span>`);

  function shell(d, h, active, body) {
    return `<div class="app">
      <aside class="sb">
        <div class="wm"><i></i>Lead Tracker</div>
        <nav>${d.nav.map((n) => `<a class="${n === active ? "on" : ""}">${h.esc(n)}</a>`).join("")}</nav>
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

  const filt = (label, value) => `<span class="fl"><span>${label}</span>${value}${I.chev}</span>`;

  function leadEntry(h, l) {
    let date;
    if (l.status !== "open") date = `<span class="dt">Closed ${h.day(l.closeDate)}</span>`;
    else if (!l.closeDate) date = `<span class="dt mute">No close date</span>`;
    else if (l.overdue) date = `<span class="od">Overdue · ${h.day(l.closeDate)}</span>`;
    else date = `<span class="dt">Closes ${h.day(l.closeDate)}</span>`;
    return `<article class="le ${l.status}">
      <h4>${h.esc(l.title)}</h4>
      <p class="cc">${h.esc(l.contact)} · ${h.esc(l.company)}</p>
      <div class="lf"><span class="am">${h.money(l.amount)}</span>${date}<span class="ow">${ini(h, l.owner)}</span></div>
      ${l.lostReason ? `<p class="lr">Lost to: ${h.esc(l.lostReason)}</p>` : ""}
    </article>`;
  }

  function stageBlock(d, h, s, compact) {
    const list = h.leadsIn(s.id);
    const state = s.is_won ? "Closed · won" : s.is_lost ? "Closed · lost" : `${s.probability}% likely`;
    return `<section class="sg ${compact ? "half" : ""} ${s.is_won ? "won" : ""} ${s.is_lost ? "lost" : ""}">
      <header class="sh">
        ${tag(h, s.id, s.name)}
        <div class="tv">${h.money(h.total(list))}</div>
        <div class="smeta"><span>${list.length} ${list.length === 1 ? "lead" : "leads"}</span><span>${state}</span></div>
      </header>
      <div class="ll">${list.map((l) => leadEntry(h, l)).join("")}</div>
    </section>`;
  }

  function board(d, h) {
    const open = d.stages.filter((s) => !s.is_won && !s.is_lost);
    const closed = d.stages.filter((s) => s.is_won || s.is_lost);
    const body = `
      <div class="hd">
        <div><h1>Leads <span class="ct">${d.leads.length} leads</span></h1></div>
        <div class="vt"><a class="on">Board</a><a>Table</a></div>
      </div>
      <div class="tb">
        <span class="sr">${I.search}<span>Search leads</span><kbd>/</kbd></span>
        ${filt("Owner", "Anyone")}${filt("Source", "Any source")}
        <span class="gap"></span>
        <a class="b ln">Export CSV</a><a class="b pr">New lead</a>
      </div>
      <div class="bento">
        ${open.map((s) => stageBlock(d, h, s, false)).join("")}
        <div class="pair">${closed.map((s) => stageBlock(d, h, s, true)).join("")}</div>
      </div>`;
    return shell(d, h, "Leads", body);
  }

  function contacts(d, h) {
    const rows = d.contacts
      .map(
        (c) => `<tr class="${c.doNotContact ? "dncr" : ""}">
        <td class="nm"><b>${h.esc(c.name)}</b><span class="ti">${c.title ? h.esc(c.title) : "—"}</span>
          ${c.tags.length || c.doNotContact ? `<div class="tg">${c.doNotContact ? `<span class="pt" style="--bg:#F6E1DF;--fg:#962F27">Do not contact</span>` : ""}${c.tags.map((t) => `<span class="pt" style="--bg:#ECEDEF;--fg:#4A4E55">${h.esc(t)}</span>`).join("")}</div>` : ""}</td>
        <td class="rc"><span>${h.esc(c.email)}</span><span class="ph">${c.phone ? h.esc(c.phone) : "No phone"}</span></td>
        <td>${h.esc(c.company)}</td>
        <td>${c.owner ? `<span class="ow">${ini(h, c.owner)}${h.esc(c.owner)}</span>` : `<span class="ow mute">${ini(h, "")}Unassigned</span>`}</td>
        <td class="num ${c.openLeads ? "" : "mute"}">${c.openLeads}</td>
        <td class="mo">${h.date(c.added)}</td>
      </tr>`,
      )
      .join("");
    const body = `
      <div class="hd">
        <div><h1>Contacts <span class="ct">${d.contacts.length} people</span></h1></div>
      </div>
      <div class="tb">
        <span class="sr">${I.search}<span>Search contacts</span><kbd>/</kbd></span>
        ${filt("Tag", "Any")}${filt("Owner", "Anyone")}
        <span class="gap"></span>
        <a class="b ln">Import CSV</a><a class="b ln">Export CSV</a><a class="b pr">New contact</a>
      </div>
      <section class="blk tblk">
        <table>
          <thead><tr><th>Name</th><th>Email · phone</th><th>Company</th><th>Owner</th><th class="num">Open leads</th><th>Added</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    return shell(d, h, "Contacts", body);
  }

  function detail(d, h) {
    const D = d.detail;
    const c = D.contact;
    const p = c.privacy;

    const leads = D.leads
      .map((l) => `<li><span class="lt">${h.esc(l.title)}</span>${tag(h, l.stageId, h.stage(l.stageId).name)}<span class="am">${h.money(l.amount)}</span></li>`)
      .join("");

    const tasks = D.openTasks
      .map(
        (t) => `<li><span class="cb"></span><div><p>${h.esc(t.body)}</p>
          <div class="meta">${t.overdue ? `<span class="od">Overdue · ${h.dateTime(t.due)}</span>` : `<span>Due ${h.dateTime(t.due)}</span>`}<span>${h.esc(t.assignee)}</span><span>${h.esc(t.lead)}</span></div></div></li>`,
      )
      .join("");

    const tl = D.timeline
      .map((e) => {
        const when = `<div class="wh">${h.dateTime(e.at).replace(", ", "<br>")}</div>`;
        if (e.kind === "stage") {
          const fromT = e.from ? tag(h, stageIdByName(d, e.from), e.from) : "";
          return `<li class="ev st">${when}<div class="eb"><p class="mv">${e.from ? `Moved from ${fromT} to ` : "Added to "}${tag(h, stageIdByName(d, e.to), e.to)} by ${h.esc(e.actor)}</p><span class="lk">${h.esc(e.lead)}</span></div></li>`;
        }
        const who = e.source ? `<span class="pt" style="--bg:#F3EDD3;--fg:#6F5B12">via ${h.esc(e.source)} · unverified</span>` : `<span class="au">${h.esc(e.author)}</span>`;
        const done = e.completedAt ? `<span class="dn">${I.check}Done ${h.dateTime(e.completedAt)}</span>` : "";
        return `<li class="ev ${e.completedAt ? "fin" : ""}">${when}<div class="eb">
          <div class="em"><span class="ty">${h.TYPE_LABELS[e.type]}</span>${who}<span class="lk">${h.esc(e.lead)}</span>${done}</div>
          <p>${h.esc(e.body)}</p></div></li>`;
      })
      .join("");

    const body = `
      <a class="bk">← Contacts</a>
      <div class="dh">
        <span class="av">${h.initials(c.name)}</span>
        <div><h1>${h.esc(c.name)}</h1><p class="sub">${h.esc(c.title)} at ${h.esc(c.company)}</p></div>
        <div class="ac"><a class="b pr">New lead</a><a class="b ln">Edit</a><a class="b tx">Delete</a></div>
      </div>
      <div class="grid">
        <section class="blk fig"><span class="lab">Open pipeline</span><div class="big">${h.money(D.openValue)}</div><span class="cap">${D.leads.filter((l) => !h.stage(l.stageId).is_won && !h.stage(l.stageId).is_lost).length} open leads</span></section>
        <section class="blk fig"><span class="lab">Won to date</span><div class="big">${h.money(D.wonValue)}</div><span class="cap">1 lead closed</span></section>
        <section class="blk lds"><span class="lab">Leads</span><ul>${leads}</ul></section>

        <div class="colm">
          <section class="blk">
            <span class="lab">Log activity</span>
            <div class="tp"><a class="on">Note</a><a>Call</a><a>Email</a><a>Meeting</a><a>Task</a></div>
            <div class="ta">What happened with Ioana?</div>
            <div class="cf"><span class="hint"><kbd>⌘</kbd><kbd>↵</kbd> to save</span><a class="b pr">Log activity</a></div>
          </section>
          <section class="blk">
            <span class="lab">Open tasks <em>${D.openTasks.length}</em></span>
            <ul class="tk">${tasks}</ul>
          </section>
          <section class="blk">
            <span class="lab">Activity <em>newest first</em></span>
            <ol class="tl">${tl}</ol>
          </section>
        </div>

        <div class="cols">
          <section class="blk">
            <span class="lab">Details</span>
            <dl>
              <div><dt>Email</dt><dd>${h.esc(c.email)}</dd></div>
              <div><dt>Phone</dt><dd>${h.esc(c.phone)}</dd></div>
              <div><dt>Company</dt><dd>${h.esc(c.company)}</dd></div>
              <div><dt>Owner</dt><dd>${h.esc(c.owner)}</dd></div>
              <div><dt>Tags</dt><dd class="tg">${c.tags.map((t) => `<span class="pt" style="--bg:#ECEDEF;--fg:#4A4E55">${h.esc(t)}</span>`).join("")}</dd></div>
              <div><dt>Added</dt><dd>${h.date(c.added)}</dd></div>
            </dl>
          </section>
          <section class="blk">
            <span class="lab">Privacy</span>
            <dl>
              <div><dt>Lawful basis</dt><dd>${h.esc(p.lawfulBasis)}</dd></div>
              <div><dt>Consent</dt><dd>Given ${h.date(p.consent.given)} · ${h.esc(p.consent.source)}</dd></div>
              <div><dt>Contact</dt><dd>${p.contactAllowed ? `<span class="pt" style="--bg:#E1EEE4;--fg:#2C653D">Allowed</span>` : `<span class="pt" style="--bg:#F6E1DF;--fg:#962F27">Do not contact</span>`}</dd></div>
            </dl>
            <blockquote>“${h.esc(p.consent.text)}”</blockquote>
            <div class="pb"><a class="b ln sm">Withdraw consent</a><a class="b ln sm">Stop contact</a><a class="b ln sm">Export data</a></div>
          </section>
          <section class="blk">
            <span class="lab">Notes</span>
            <p class="nt">${h.esc(c.notes)}</p>
          </section>
        </div>
      </div>`;
    return shell(d, h, "Contacts", body);
  }

  const R = "#E3E5E8";
  const MUTE = "#6A6E75";
  const css = `
.v-quiet{background:#F1F2F3;color:${INK};font-family:'Hanken Grotesk','Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.55;min-height:820px}
.v-quiet a{color:inherit;text-decoration:none;cursor:default}
.v-quiet .app{display:grid;grid-template-columns:208px minmax(0,1fr);min-height:820px}

/* Sidebar */
.v-quiet .sb{display:flex;flex-direction:column;padding:28px 18px 24px 24px;border-right:1px solid ${R}}
.v-quiet .wm{display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px;letter-spacing:-.01em;margin-bottom:36px}
.v-quiet .wm i{width:12px;height:12px;border-radius:3px;background:${INK};outline:3px solid #E2ECF6}
.v-quiet .sb nav{display:flex;flex-direction:column;gap:2px}
.v-quiet .sb nav a{padding:7px 10px;border-radius:6px;color:${MUTE};font-size:14px}
.v-quiet .sb nav a.on{background:#E4E6E9;color:${INK};font-weight:500}
.v-quiet .acct{margin-top:auto;display:flex;flex-direction:column;gap:4px}
.v-quiet .lab{display:block;font:500 10.5px/1.4 'DM Mono',ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:${MUTE}}
.v-quiet .lab em{font-style:normal;color:#9A9EA5;margin-left:6px}
.v-quiet .orgn{font-weight:500;margin-bottom:14px}
.v-quiet .usr{display:flex;gap:10px;align-items:center;padding-top:14px;border-top:1px solid ${R}}
.v-quiet .usr b{display:block;font-weight:500;font-size:13px;line-height:1.3}
.v-quiet .usr span:not(.in){display:block;font-size:11.5px;color:${MUTE};line-height:1.3}
.v-quiet .so{margin-top:10px;font-size:13px;color:${MUTE};text-decoration:underline;text-underline-offset:3px;text-decoration-color:#C3C6CB}
.v-quiet .in{display:inline-grid;place-items:center;flex:none;width:26px;height:26px;border-radius:6px;background:#E4E6E9;color:#3E4248;font:500 10.5px/1 'DM Mono',ui-monospace,monospace}
.v-quiet .in.un{background:transparent;border:1px dashed #B5B9BF}

/* Main */
.v-quiet .mn{padding:40px 44px 48px;min-width:0}
.v-quiet .hd{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px}
.v-quiet h1{margin:0;font-weight:300;font-size:44px;letter-spacing:-.035em;line-height:1.05}
.v-quiet .ct{font:400 12px/1 'DM Mono',ui-monospace,monospace;letter-spacing:.02em;color:${MUTE};margin-left:10px;vertical-align:middle}
.v-quiet .vt{display:flex;gap:20px;font-size:14px}
.v-quiet .vt a{color:${MUTE};padding-bottom:5px;border-bottom:1px solid transparent}
.v-quiet .vt a.on{color:${INK};font-weight:500;border-bottom-color:${INK}}
.v-quiet .tb{display:flex;align-items:center;gap:22px;padding:12px 0;border-top:1px solid ${R};border-bottom:1px solid ${R};margin-bottom:28px}
.v-quiet .sr{display:flex;align-items:center;gap:8px;width:260px;color:${MUTE}}
.v-quiet .sr span{flex:1}
.v-quiet kbd{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border:1px solid ${R};border-radius:4px;background:#F7F7F8;font:500 11px/1 'DM Mono',ui-monospace,monospace;color:#4A4E55}
.v-quiet .fl{display:inline-flex;align-items:center;gap:6px;font-weight:500;white-space:nowrap}
.v-quiet .fl span{color:${MUTE};font-weight:400}
.v-quiet .gap{flex:1}
.v-quiet .b{display:inline-flex;align-items:center;height:34px;padding:0 14px;border-radius:6px;font-weight:500;font-size:13.5px;white-space:nowrap}
.v-quiet .b.pr{background:${INK};color:#fff}
.v-quiet .b.ln{border:1px solid #D4D7DB;background:#fff}
.v-quiet .b.tx{color:#962F27}
.v-quiet .b.sm{height:30px;padding:0 11px;font-size:12.5px}
.v-quiet .pt{display:inline-flex;align-items:center;height:20px;padding:0 9px;border-radius:999px;background:var(--bg);color:var(--fg);font:500 10.5px/1 'Hanken Grotesk',sans-serif;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}

/* Board bento */
.v-quiet .bento{display:flex;flex-direction:column;gap:12px}
.v-quiet .sg{display:grid;grid-template-columns:196px minmax(0,1fr);gap:32px;background:#fff;border:1px solid ${R};border-radius:10px;padding:22px 24px}
.v-quiet .sh{display:flex;flex-direction:column;align-items:flex-start}
.v-quiet .tv{font-weight:300;font-size:30px;letter-spacing:-.03em;line-height:1.1;margin:14px 0 6px;font-variant-numeric:tabular-nums}
.v-quiet .smeta{display:flex;flex-direction:column;font:400 11.5px/1.6 'DM Mono',ui-monospace,monospace;color:${MUTE}}
.v-quiet .ll{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 28px;align-content:start}
.v-quiet .le{padding:12px 0 14px;border-top:1px solid ${R}}
.v-quiet .le h4{margin:0;font-weight:500;font-size:15px;line-height:1.3;letter-spacing:-.005em}
.v-quiet .cc{margin:2px 0 0;font-size:13px;color:${MUTE};line-height:1.4}
.v-quiet .lf{display:flex;align-items:center;gap:12px;margin-top:12px;font-size:12.5px}
.v-quiet .am{font-weight:500;font-variant-numeric:tabular-nums;font-size:14px}
.v-quiet .dt{font:400 11.5px/1 'DM Mono',ui-monospace,monospace;color:${MUTE};white-space:nowrap}
.v-quiet .dt.mute{color:#A3A7AD}
.v-quiet .od{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;background:#F6E1DF;color:#962F27;font:500 11px/1 'DM Mono',ui-monospace,monospace;white-space:nowrap}
.v-quiet .lf .ow{margin-left:auto}
.v-quiet .lf .in{width:24px;height:24px}
.v-quiet .le.lost h4,.v-quiet .le.lost .am{color:${MUTE}}
.v-quiet .lr{margin:10px 0 0;font-size:13px;color:#4A4E55;font-style:italic}
.v-quiet .pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.v-quiet .sg.half{grid-template-columns:1fr;gap:16px}
.v-quiet .sg.half .sh{display:grid;grid-template-columns:auto 1fr;align-items:baseline;column-gap:16px}
.v-quiet .sg.half .sh .pt{justify-self:start}
.v-quiet .sg.half .tv{margin:0;grid-row:span 2;order:2;text-align:right;font-size:26px}
.v-quiet .sg.half .smeta{flex-direction:row;gap:12px;grid-column:1}
.v-quiet .sg.half .ll{grid-template-columns:repeat(2,minmax(0,1fr))}

/* Contacts */
.v-quiet .blk{background:#fff;border:1px solid ${R};border-radius:10px;padding:22px 24px;min-width:0}
.v-quiet .tblk{padding:6px 8px}
.v-quiet table{width:100%;border-collapse:collapse}
.v-quiet th{text-align:left;font:500 10.5px/1 'DM Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:${MUTE};padding:16px 14px 12px}
.v-quiet td{padding:15px 14px;border-top:1px solid ${R};vertical-align:top}
.v-quiet .nm b{display:block;font-weight:500;font-size:15px;line-height:1.3}
.v-quiet .ti{display:block;font-size:13px;color:${MUTE}}
.v-quiet .tg{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.v-quiet .rc span{display:block}
.v-quiet .rc .ph{font:400 12px/1.6 'DM Mono',ui-monospace,monospace;color:${MUTE};margin-top:2px}
.v-quiet .ow{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.v-quiet .ow .in{width:22px;height:22px;font-size:9.5px}
.v-quiet .mute{color:#A3A7AD}
.v-quiet .num{text-align:right;font-variant-numeric:tabular-nums}
.v-quiet td.num{font-weight:300;font-size:22px;line-height:1;padding-top:13px}
.v-quiet .mo{font:400 12px/1.6 'DM Mono',ui-monospace,monospace;color:${MUTE};white-space:nowrap}
.v-quiet tr.dncr td{background:#FBF8F8}
.v-quiet tr.dncr .nm b{color:#4A4E55}

/* Detail */
.v-quiet .bk{font-size:13px;color:${MUTE}}
.v-quiet .dh{display:flex;align-items:center;gap:20px;margin:18px 0 28px}
.v-quiet .av{display:grid;place-items:center;width:64px;height:64px;border-radius:10px;background:#E2ECF6;color:#2D5C88;font-weight:400;font-size:22px;letter-spacing:-.02em}
.v-quiet .sub{margin:6px 0 0;font-size:16px;color:${MUTE}}
.v-quiet .ac{margin-left:auto;display:flex;gap:8px}
.v-quiet .grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px;align-items:start}
.v-quiet .fig{grid-column:span 3;min-height:0;align-self:stretch;display:flex;flex-direction:column}
.v-quiet .big{font-weight:300;font-size:40px;letter-spacing:-.04em;line-height:1;margin:auto 0 10px;padding-top:28px;font-variant-numeric:tabular-nums}
.v-quiet .cap{font:400 11.5px/1.4 'DM Mono',ui-monospace,monospace;color:${MUTE}}
.v-quiet .lds{grid-column:span 6}
.v-quiet ul,.v-quiet ol{list-style:none;margin:0;padding:0}
.v-quiet .lds ul{margin-top:8px}
.v-quiet .lds li{display:grid;grid-template-columns:minmax(0,1fr) auto 84px;align-items:center;gap:14px;padding:9px 0;border-top:1px solid ${R}}
.v-quiet .lds li:first-child{border-top:0}
.v-quiet .lds .am{text-align:right}
.v-quiet .lt{font-weight:500}
.v-quiet .colm{grid-column:span 7;display:flex;flex-direction:column;gap:12px;min-width:0}
.v-quiet .cols{grid-column:span 5;display:flex;flex-direction:column;gap:12px;min-width:0}
.v-quiet .tp{display:flex;gap:18px;margin:14px 0 12px;font-size:14px}
.v-quiet .tp a{color:${MUTE};padding-bottom:4px;border-bottom:1px solid transparent}
.v-quiet .tp a.on{color:${INK};font-weight:500;border-bottom-color:${INK}}
.v-quiet .ta{min-height:84px;border:1px solid #CDD0D5;border-radius:8px;padding:12px 14px;color:#A3A7AD;font-size:14.5px}
.v-quiet .cf{display:flex;justify-content:space-between;align-items:center;margin-top:12px}
.v-quiet .hint{display:flex;align-items:center;gap:4px;font-size:12px;color:${MUTE}}
.v-quiet .tk{margin-top:6px}
.v-quiet .tk li{display:grid;grid-template-columns:18px minmax(0,1fr);gap:14px;padding:13px 0;border-top:1px solid ${R}}
.v-quiet .tk li:first-child{border-top:0}
.v-quiet .cb{width:16px;height:16px;border:1.5px solid #8E9298;border-radius:4px;margin-top:3px}
.v-quiet .tk p{margin:0;font-size:14.5px}
.v-quiet .meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;margin-top:6px;font-size:12.5px;color:${MUTE}}
.v-quiet .tl{margin-top:8px}
.v-quiet .ev{display:grid;grid-template-columns:76px minmax(0,1fr);gap:20px;padding:16px 0;border-top:1px solid ${R}}
.v-quiet .ev:first-child{border-top:0}
.v-quiet .wh{font:400 11.5px/1.55 'DM Mono',ui-monospace,monospace;color:${MUTE};padding-top:2px}
.v-quiet .em{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:13px}
.v-quiet .ty{font:500 10.5px/1 'DM Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:${INK}}
.v-quiet .au{font-weight:500}
.v-quiet .lk{color:${MUTE}}
.v-quiet .lk::before{content:'→ ';color:#A3A7AD}
.v-quiet .dn{display:inline-flex;align-items:center;gap:5px;color:#2C653D;font-size:12.5px}
.v-quiet .ev p{margin:6px 0 0;font-size:14.5px;line-height:1.6;max-width:62ch;text-wrap:pretty}
.v-quiet .ev.fin p{text-decoration:line-through;text-decoration-color:#A3A7AD;color:${MUTE}}
.v-quiet .ev.st .eb{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px}
.v-quiet .ev.st p.mv{margin:0;font-size:13.5px;color:#4A4E55}
.v-quiet .ev.st .pt{vertical-align:1px}
.v-quiet dl{margin:8px 0 0}
.v-quiet dl div{display:grid;grid-template-columns:92px minmax(0,1fr);gap:12px;padding:9px 0;border-top:1px solid ${R}}
.v-quiet dl div:first-child{border-top:0}
.v-quiet dt{font-size:13px;color:${MUTE}}
.v-quiet dd{margin:0;font-size:13.5px;overflow-wrap:anywhere}
.v-quiet dd.tg{margin:0}
.v-quiet blockquote{margin:10px 0 0;padding:14px 0 0;border-top:1px solid ${R};font-weight:300;font-size:19px;line-height:1.35;letter-spacing:-.01em}
.v-quiet .pb{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}
.v-quiet .nt{margin:10px 0 0;font-size:14.5px;line-height:1.6}
`;

  (window.LT_VARIANTS = window.LT_VARIANTS || []).push({
    id: "quiet",
    name: "Quiet",
    concept:
      "Editorial calm for a one-person-plus-team CRM: ink on cool paper, stages as flat bento rows instead of columns, and light-weight numerals and pastel tags carrying the hierarchy so the work, not the chrome, is what you read.",
    fonts: ["Hanken+Grotesk:ital,wght@0,300;0,400;0,500;0,600;1,400", "DM+Mono:wght@400;500"],
    tokens: {
      color: [
        { name: "Cool paper", value: "#F1F2F3" },
        { name: "Ink", value: INK },
        { name: "Hairline", value: R },
        { name: "Mist · New", value: TAG.s1[0] },
        { name: "Lilac · Qualified", value: TAG.s2[0] },
        { name: "Sage · Won", value: TAG.s5[0] },
        { name: "Graphite text", value: MUTE },
      ],
      type: [
        { role: "Display · light numerals", family: "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif", sample: "€88,000", style: "font-weight:300;letter-spacing:-.04em" },
        { role: "Body / UI", family: "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif", sample: "Dispatch console redesign", style: "font-weight:500" },
        { role: "Meta · dates, labels", family: "'DM Mono', ui-monospace, Menlo, monospace", sample: "OPEN PIPELINE · 27 OCT", style: "font-size:13px;letter-spacing:.08em" },
      ],
      spacing: "4px base; 12px bento gutter; 22–24px block padding; 40–44px page margins; 208px text-only sidebar",
      shape: "1px #E3E5E8 hairlines only; 10px block radius, 6px controls; pills reserved for small pastel tags; no shadows, no gradients",
      signature:
        "The board reads top to bottom as a document: each stage is a flat white row with its total set in 30px light numerals, Won and Lost share the last row, and leads sit as hairline-ruled text entries, not cards.",
    },
    css,
    render: { board, contacts, detail },
  });
})();
