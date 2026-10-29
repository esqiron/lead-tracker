// Focus queue (Quiet look): the app opens on "Today", one ranked list of next actions
// with a plain reason on every item. The pipeline is a calm summary underneath.
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
    check: `<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 6.4l2.4 2.4 5.2-5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    chev: `<svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    arrow: `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const tag = (h, id, text) => `<span class="pt" style="--bg:${TAG[id][0]};--fg:${TAG[id][1]}">${h.esc(text)}</span>`;
  const ini = (h, name) => (name ? `<span class="in">${h.initials(name)}</span>` : `<span class="in un" title="Unassigned"></span>`);
  const first = (name) => String(name || "").split(" ")[0];
  const wday = (h, iso) => DOW[new Date(iso.slice(0, 10) + "T12:00:00Z").getUTCDay()] + " " + h.day(iso);
  const lead = (d, id) => d.leads.find((l) => l.id === id);

  function shell(d, h, body, extra) {
    const nav = [
      ["Today", "9"],
      ["Pipeline", ""],
      ["People", ""],
      ["Reports", ""],
      ["Settings", ""],
    ];
    return `<div class="app">
      <aside class="sb">
        <div class="wm"><i></i>Lead Tracker</div>
        <nav>${nav.map(([n, c]) => `<a class="${n === "Today" ? "on" : ""}">${h.esc(n)}${c ? `<span class="qn">${c}</span>` : ""}</a>`).join("")}</nav>
        <div class="acct">
          <span class="lab">Organisation</span>
          <span class="orgn">${h.esc(d.org.name)}</span>
          <div class="usr">${ini(h, d.viewer.name)}<div><b>${h.esc(d.viewer.name)}</b><span>${h.esc(d.viewer.email)}</span></div></div>
          <a class="so">Sign out</a>
        </div>
      </aside>
      <main class="mn ${extra || ""}">${body}</main>
    </div>`;
  }

  // The ranked queue. Reasons are written from the data in d.touch / d.detail.openTasks.
  function queue(d, h) {
    const t1 = d.detail.openTasks[0];
    const T = d.touch;
    return [
      { id: "l7", k: "od", label: "Overdue task · 1 day", act: "Call Ioana", mine: true,
        why: `You told Ioana the revised proposal with the 3-month pilot option would be with her by ${h.dateTime(t1.due)} yesterday. She wants to start on 1 Dec.` },
      { id: "l11", k: "due", label: "Next step due tomorrow", act: "Send DPA", mine: true,
        why: `Legal needs the DPA before Ioana can sign. The close date is ${wday(h, lead(d, "l11").closeDate)}.` },
      { id: "l8", k: "cold", label: `Going cold · ${T.l8.days} days`, act: "Remind Priya",
        why: `Proposal v2 has had no reply for ${T.l8.days} days, and the chase was due ${wday(h, T.l8.nextDue)}. It's the biggest open deal.` },
      { id: "l3", k: "new", label: "New lead · no owner", act: "Take it", mine: true,
        why: `Came in through the ${h.esc(T.l3.via)} yesterday. Nobody owns it and nobody has replied.` },
      { id: "l15", k: "due", label: "Next step due today", act: "Remind Priya",
        why: `${h.esc(T.l15.next)} with Elif. Last touch was ${T.l15.days} days ago.` },
      { id: "l9", k: "cold", label: `Going cold · ${T.l9.days} days`, act: "Remind Jonas",
        why: `No word from Grace since ${h.day(T.l9.last)}. The board sign-off date was meant to be confirmed by ${h.day(T.l9.nextDue)}.` },
      { id: "l6", k: "cold", label: `Going cold · ${T.l6.days} days`, act: "Remind Tomás",
        why: `Quiet for four weeks and the close date (${h.day(lead(d, "l6").closeDate)}) has passed. Still on, or time to close it as lost?` },
      { id: "l5", k: "cold", label: `Going cold · ${T.l5.days} days`, act: "Remind Jonas",
        why: `Rahul hasn't heard from us since the conference. The follow-up was due ${h.day(T.l5.nextDue)}.` },
      { id: "l2", k: "due", label: "Next step due tomorrow", act: "Remind Priya",
        why: `Daniel asked for the portfolio and two references.` },
    ].map((q, i) => ({ ...q, rank: i + 1, l: lead(d, q.id), t: T[q.id] }));
  }

  function row(d, h, q, cls) {
    const l = q.l;
    const owner = l.owner ? `${ini(h, l.owner)}<span>${l.owner === d.viewer.name ? "You" : h.esc(first(l.owner))}</span>` : `${ini(h, "")}<span>No owner</span>`;
    return `<li class="qi ${q.mine ? "mine" : ""} ${cls || ""}">
      <span class="rk">${q.rank}</span>
      <div class="qb">
        <span class="k k-${q.k}"><i></i>${h.esc(q.label)}</span>
        <h4>${h.esc(l.title)}</h4>
        <p class="why">${q.why}</p>
        <div class="qm"><span>${h.esc(l.contact)} · ${h.esc(l.company)}</span><span class="am">${h.money(l.amount)}</span>${tag(h, l.stageId, h.stage(l.stageId).name)}</div>
      </div>
      <div class="qa"><a class="b ${q.mine ? "pr" : "ln"}">${h.esc(q.act)}</a><span class="ow">${owner}</span></div>
    </li>`;
  }

  function header(d, h, title, line, scope) {
    return `<div class="hello">
      <div>
        <span class="lab">${title}</span>
        ${line}
      </div>
      ${scope ? `<div class="vt"><a class="on">Everyone <em>9</em></a><a>Just mine <em>3</em></a></div>` : ""}
    </div>`;
  }

  // Open pipeline by stage, with optional overrides (lead id -> stage id) for "after this morning".
  function stageSums(d, h, moved) {
    const open = d.stages.filter((s) => !s.is_won && !s.is_lost);
    const leads = d.leads.filter((l) => l.status === "open").map((l) => (moved && moved[l.id] ? { ...l, stageId: moved[l.id] } : l));
    return open.map((s) => {
      const list = leads.filter((l) => l.stageId === s.id);
      return { s, list, total: h.total(list), cold: list.filter((l) => d.touch[l.id] && d.touch[l.id].days >= 14) };
    });
  }

  function propBar(h, rows) {
    const sum = rows.reduce((a, r) => a + r.total, 0);
    return `<div class="pbar">${rows
      .map((r) => `<span style="flex:${r.total};--bg:${TAG[r.s.id][0]};--fg:${TAG[r.s.id][1]}" title="${h.esc(r.s.name)}">${h.moneyShort(r.total)}</span>`)
      .join("")}</div><span class="sr-only">Total ${h.money(sum)}</span>`;
  }

  /* ---------- Screen 1: the morning queue ---------- */
  function morning(d, h) {
    const Q = queue(d, h);
    const rows = stageSums(d, h);
    const openTotal = rows.reduce((a, r) => a + r.total, 0);
    const openCount = rows.reduce((a, r) => a + r.list.length, 0);
    const cold = rows.flatMap((r) => r.cold);
    const T = d.touch;
    const later = [
      { l: lead(d, "l10"), due: T.l10.nextDue, what: T.l10.next },
      { l: lead(d, "l1"), due: T.l1.nextDue, what: T.l1.next },
      { l: lead(d, "l11"), due: d.detail.openTasks[1].due, what: d.detail.openTasks[1].body, who: d.detail.openTasks[1].assignee },
      { l: lead(d, "l4"), due: T.l4.nextDue, what: T.l4.next },
    ];

    const body = `
      ${header(
        d,
        h,
        `${wday(h, d.today)} · Good morning, ${h.esc(first(d.viewer.name))}`,
        `<h1>Nine things today. Start with Ioana, who's waiting on a proposal.</h1>
         <p class="sum">Three are yours. The other six belong to teammates and need a nudge. ${h.money(h.total(cold))} across ${cold.length} deals has gone quiet for two weeks or more.</p>`,
        true,
      )}
      <div class="cols2">
        <ol class="queue">${Q.map((q) => row(d, h, q)).join("")}</ol>
        <aside class="rail">
          <section class="blk pipe-mini">
            <span class="lab">Pipeline</span>
            <div class="pm-big">${h.money(openTotal)}</div>
            <span class="cap">${openCount} open deals · ${cold.length} going quiet</span>
            ${propBar(h, rows)}
            <ul class="pm-list">${rows
              .map((r) => `<li>${tag(h, r.s.id, r.s.name)}<span class="pm-n">${r.list.length}</span><span class="am">${h.moneyShort(r.total)}</span></li>`)
              .join("")}</ul>
            <a class="more">Open pipeline ${I.arrow}</a>
          </section>
          <section class="blk later">
            <span class="lab">Later this week</span>
            <p class="lt-note">Not in today's list. They'll move up on the day.</p>
            <ul>${later
              .map((x) => `<li><span class="dt">${wday(h, x.due)}</span><div><b>${h.esc(x.what)}</b><span>${h.esc(x.l.title)} · ${h.esc(first(x.who || x.l.owner))}</span></div></li>`)
              .join("")}</ul>
          </section>
        </aside>
      </div>`;
    return shell(d, h, body);
  }

  /* ---------- Screen 2: working one item in place ---------- */
  function working(d, h) {
    const Q = queue(d, h);
    const q = Q[0];
    const l = q.l;
    const c = d.detail.contact;
    const recent = d.thread.slice(-3).reverse();
    const chips = [
      ["Good call, moving forward", true],
      ["Needs more time", false],
      ["No answer", false],
      ["Not interested", false],
    ];
    const dates = [["Today", true], ["Tomorrow", false], [wday(h, "2026-10-30"), false], ["Pick a date", false]];

    const open = `<li class="qi mine open">
      <span class="rk">1</span>
      <div class="qb">
        <span class="k k-od"><i></i>${h.esc(q.label)}</span>
        <h4>${h.esc(l.title)}</h4>
        <div class="qm"><span>${h.esc(l.contact)} · ${h.esc(l.company)}</span><span class="am">${h.money(l.amount)}</span>${tag(h, l.stageId, h.stage(l.stageId).name)}</div>

        <div class="work">
          <div class="tp"><a>Note</a><a class="on">Call</a><a>Email</a><a>Meeting</a></div>
          <span class="flab">How did it go?</span>
          <div class="chips">${chips.map(([t, on]) => `<span class="chip ${on ? "on" : ""}">${on ? I.check : ""}${h.esc(t)}</span>`).join("")}</div>
          <div class="ta typed">Ioana confirmed 120 vehicles from 1 Dec. She can approve the pilot herself; legal wants the DPA in the same pack. Sending the revised proposal today.<span class="caret"></span></div>

          <div class="next">
            <span class="flab">Next step</span>
            <div class="nx-row">
              <span class="field">Send revised proposal and DPA to Ioana</span>
              <span class="field own">${ini(h, d.viewer.name)}You${I.chev}</span>
            </div>
            <div class="chips sm">${dates.map(([t, on]) => `<span class="chip ${on ? "on" : ""}">${h.esc(t)}</span>`).join("")}</div>
            <p class="repl">${I.check}Replaces the overdue task “${h.esc(d.detail.openTasks[0].body)}”</p>
          </div>

          <div class="nudge">
            <div>
              <b>Sounds like the terms are agreed. Move this deal to Negotiation?</b>
              <span class="mv">${tag(h, "s3", "Proposal")}${I.arrow}${tag(h, "s4", "Negotiation")}<span class="dt">75% likely · adds ${h.moneyShort(l.amount * 0.25)} to the weighted forecast</span></span>
            </div>
            <div class="nb"><a class="b sm sel">${I.check}Yes, move it</a><a class="b sm ln">Not yet</a></div>
          </div>

          <div class="cf"><a class="b tx-m">Skip for today</a><span class="gap"></span><span class="hint"><kbd>⌘</kbd><kbd>↵</kbd></span><a class="b pr pressed">Log call and move on</a></div>
        </div>
      </div>
    </li>`;

    const body = `
      ${header(
        d,
        h,
        `${wday(h, d.today)} · 1 of 9`,
        `<h1>Nine things today. Start with Ioana, who's waiting on a proposal.</h1>`,
        true,
      )}
      <div class="cols2">
        <div>
          <ol class="queue">${open}${Q.slice(1, 4).map((x) => row(d, h, x, "dim")).join("")}</ol>
          <p class="rest">5 more below</p>
        </div>
        <aside class="rail">
          <section class="blk ctx">
            <span class="lab">For this call</span>
            <div class="who">${ini(h, c.name)}<div><b>${h.esc(c.name)}</b><span>${h.esc(c.title)}</span></div></div>
            <p class="ph">${h.esc(c.phone)}</p>
            <p class="nt">${h.esc(c.notes)}</p>
          </section>
          <section class="blk ctx">
            <span class="lab">Last messages</span>
            <ol class="msgs">${recent
              .map((m) => `<li class="m-${m.dir}"><span class="dt">${h.esc(m.channel)} · ${h.dateTime(m.at)}</span><p>${h.esc(m.body)}</p><span class="by">${h.esc(m.dir === "in" ? m.from : first(m.from))}</span></li>`)
              .join("")}</ol>
          </section>
        </aside>
      </div>
      <div class="toast" role="status">
        <span class="ok">${I.check}</span>
        <div><b>Call logged on ${h.esc(l.title)}. Moved to Negotiation.</b><span>Next: Send revised proposal and DPA to Ioana, today. Up next in your list: ${h.esc(Q[1].l.title)}.</span></div>
        <a class="undo">Undo</a>
      </div>`;
    return shell(d, h, body, "has-toast");
  }

  /* ---------- Screen 3: bigger picture, queue nearly done ---------- */
  function picture(d, h) {
    const Q = queue(d, h);
    const moved = { l7: "s4" };
    const rows = stageSums(d, h, moved);
    const openTotal = rows.reduce((a, r) => a + r.total, 0);
    const weighted = rows.reduce((a, r) => a + r.total * (r.s.probability / 100), 0);
    const count = rows.reduce((a, r) => a + r.list.length, 0);
    const won = d.leads.filter((l) => l.status === "won" && l.closeDate >= "2026-10-01");
    const lost = d.leads.filter((l) => l.status === "lost" && l.closeDate >= "2026-10-01");
    const W = d.weekly;
    const max = Math.max(...W), min = Math.min(...W);
    const pts = W.map((v, i) => `${(i * 140) / (W.length - 1)},${(4 + (1 - (v - min) / (max - min)) * 32).toFixed(1)}`).join(" ");

    const notes = {
      s1: `<span class="ch">${I.check}Booking flow audit is yours now</span>`,
      s4: `<span class="ch">${I.check}Fleet tracking pilot moved in this morning</span>`,
    };
    const stageRows = rows
      .map((r) => {
        const flags = r.cold.map((l) => `<span class="cold"><i></i>${h.esc(l.title)} · ${d.touch[l.id].days} days quiet</span>`).join("");
        return `<li>
          <div class="sl">${tag(h, r.s.id, r.s.name)}<span class="dt">${r.s.probability}% likely</span></div>
          <div class="sf">${flags || notes[r.s.id] || `<span class="ok-q">Nothing going quiet</span>`}${flags && notes[r.s.id] ? notes[r.s.id] : ""}</div>
          <span class="sn">${r.list.length} ${r.list.length === 1 ? "deal" : "deals"}</span>
          <span class="sv">${h.money(r.total)}</span>
        </li>`;
      })
      .join("");

    const done = [
      [Q[0], "Call logged · moved to Negotiation"],
      [Q[1], "DPA sent to legal"],
      [Q[2], "Reminded Priya"],
      [Q[3], "Now yours"],
      [Q[4], "Reminded Priya"],
      [Q[5], "Reminded Jonas"],
      [Q[7], "Reminded Jonas"],
    ];
    const left = [Q[6], Q[8]];

    const body = `
      ${header(
        d,
        h,
        `${wday(h, d.today)} · 11:40`,
        `<h1>Seven done, two left. Both can wait until tomorrow.</h1>
         <p class="sum">Here's the pipeline after this morning's work.</p>`,
        false,
      )}
      <div class="cols3">
        <section class="blk pipe">
          <div class="pp-top">
            <div><span class="lab">Open pipeline</span><div class="big">${h.money(openTotal)}</div><span class="cap">${count} deals · ${h.money(Math.round(weighted))} likely, weighted by stage</span></div>
            <div class="spark"><svg width="140" height="40" viewBox="0 0 140 40" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="#1C1E21" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg><span class="cap">Up from €${min}k seven weeks ago</span></div>
          </div>
          ${propBar(h, rows)}
          <ul class="stages">${stageRows}</ul>
          <div class="closed"><span>Won in October <b>${h.money(h.total(won))}</b></span><span>Lost in October <b>${h.money(h.total(lost))}</b></span><a class="more">Open full pipeline ${I.arrow}</a></div>
        </section>

        <section class="blk today">
          <div class="td-top"><span class="lab">Today</span><span class="dt">7 of 9</span></div>
          <div class="ticks">${Q.map((x, i) => `<i class="${i < 7 ? "on" : ""}"></i>`).join("")}</div>
          <span class="flab">Left</span>
          <ul class="left">${left
            .map((x) => `<li><div><b>${h.esc(x.l.title)}</b><span class="k k-${x.k}"><i></i>${h.esc(x.label)}</span></div><a class="b sm ln">${h.esc(x.act)}</a></li>`)
            .join("")}</ul>
          <span class="flab">Done</span>
          <ul class="done">${done.map(([x, what]) => `<li><span class="tick">${I.check}</span><span class="dn-t">${h.esc(x.l.title)}</span><span class="dn-w">${h.esc(what)}</span></li>`).join("")}</ul>
          <p class="end">When the list is empty, you'll see tomorrow's first three items here.</p>
        </section>
      </div>`;
    return shell(d, h, body);
  }

  const INK = "#1C1E21";
  const MUTE = "#6A6E75";
  const R = "#E3E5E8";
  const css = `
.f-focus .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.f-focus .sb nav a{display:flex;align-items:center;justify-content:space-between}
.f-focus .qn{font:500 11px/1 'DM Mono',ui-monospace,monospace;color:${INK};background:#fff;border:1px solid ${R};border-radius:999px;padding:3px 7px}
.f-focus .mn{position:relative}
.f-focus .mn.has-toast{padding-bottom:120px}

/* Header */
.f-focus .hello{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;margin-bottom:26px}
.f-focus .hello h1{font-size:38px;line-height:1.12;letter-spacing:-.03em;margin-top:10px;max-width:34ch;text-wrap:balance}
.f-focus .sum{margin:14px 0 0;font-size:16px;line-height:1.5;color:#3E4248;max-width:64ch;text-wrap:pretty}
.f-focus .vt{flex:none}
.f-focus .hello > div:first-child{flex:1;min-width:0}
.f-focus .rail .pbar{height:10px;margin:16px 0 4px}
.f-focus .rail .pbar span{font-size:0}
.f-focus .vt em{font:400 11px/1 'DM Mono',ui-monospace,monospace;font-style:normal;color:${MUTE};margin-left:4px}

/* Layout */
.f-focus .cols2{display:grid;grid-template-columns:minmax(0,1fr) 284px;gap:24px;align-items:start}
.f-focus .rail{display:flex;flex-direction:column;gap:12px;min-width:0}

/* Queue */
.f-focus .queue{background:#fff;border:1px solid ${R};border-radius:10px;padding:4px 22px}
.f-focus .qi{display:grid;grid-template-columns:22px minmax(0,1fr) 128px;gap:16px;padding:18px 0;border-top:1px solid ${R}}
.f-focus .qi:first-child{border-top:0}
.f-focus .rk{font:400 12px/1 'DM Mono',ui-monospace,monospace;color:#9A9EA5;padding-top:3px}
.f-focus .qb{min-width:0}
.f-focus .k{display:inline-flex;align-items:center;gap:7px;font:500 10.5px/1.4 'DM Mono',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:${MUTE}}
.f-focus .k i{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}
.f-focus .k-od{color:#962F27}
.f-focus .k-cold{color:#2D5C88}
.f-focus .k-due{color:#6F5B12}
.f-focus .k-new{color:#574A85}
.f-focus .qi h4{margin:5px 0 0;font-weight:500;font-size:16px;line-height:1.3;letter-spacing:-.005em}
.f-focus .why{margin:5px 0 0;font-size:14px;line-height:1.5;color:#3E4248;max-width:58ch;text-wrap:pretty}
.f-focus .qm{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-top:9px;font-size:13px;color:${MUTE}}
.f-focus .qm .am{color:${INK};font-size:13px}
.f-focus .qa{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.f-focus .qa .b{width:100%;justify-content:center}
.f-focus .qa .ow{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:${MUTE}}
.f-focus .qa .ow .in{width:22px;height:22px;font-size:9.5px}
.f-focus .qi.mine .qa .ow{color:${INK};font-weight:500}
.f-focus .qi.dim{opacity:.45}
.f-focus .rest{margin:12px 0 0 22px;font:400 12px/1 'DM Mono',ui-monospace,monospace;color:${MUTE}}

/* Rail */
.f-focus .pm-big{font-weight:300;font-size:32px;letter-spacing:-.035em;line-height:1;margin:14px 0 6px;font-variant-numeric:tabular-nums}
.f-focus .cap{font:400 11.5px/1.45 'DM Mono',ui-monospace,monospace;color:${MUTE}}
.f-focus .pbar{display:flex;gap:2px;height:26px;margin:16px 0 4px;border-radius:6px;overflow:hidden}
.f-focus .pbar span{display:flex;align-items:center;justify-content:center;min-width:0;background:var(--bg);color:var(--fg);font:500 11px/1 'DM Mono',ui-monospace,monospace;white-space:nowrap;overflow:hidden}
.f-focus .pm-list{margin-top:10px}
.f-focus .pm-list li{display:grid;grid-template-columns:minmax(0,1fr) 24px 56px;align-items:center;gap:8px;padding:7px 0;border-top:1px solid ${R}}
.f-focus .pm-list li:first-child{border-top:0}
.f-focus .pm-n{font:400 12px/1 'DM Mono',ui-monospace,monospace;color:${MUTE};text-align:right}
.f-focus .pm-list .am{text-align:right;font-size:13.5px}
.f-focus .more{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-size:13.5px;font-weight:500;border-bottom:1px solid #C3C6CB;padding-bottom:1px}
.f-focus .lt-note{margin:6px 0 4px;font-size:13px;color:${MUTE}}
.f-focus .later li{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;padding:10px 0;border-top:1px solid ${R}}
.f-focus .later li:first-of-type{border-top:0}
.f-focus .later .dt{padding-top:3px;line-height:1.3}
.f-focus .later b{display:block;font-weight:500;font-size:13.5px;line-height:1.35}
.f-focus .later li span:not(.dt){display:block;font-size:12.5px;color:${MUTE};margin-top:2px}

/* Working an item */
.f-focus .qi.open{grid-template-columns:22px minmax(0,1fr);margin:6px -10px;padding:20px 10px 22px;border:1px solid ${INK};border-radius:8px}
.f-focus .qi.open + .qi{border-top:0}
.f-focus .work{margin-top:16px;padding-top:4px;border-top:1px solid ${R}}
.f-focus .work .tp{margin:12px 0 14px}
.f-focus .flab{display:block;font:500 10.5px/1.4 'DM Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:${MUTE};margin:0 0 8px}
.f-focus .chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.f-focus .chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:1px solid #D4D7DB;border-radius:999px;background:#fff;font-size:13px;color:#3E4248;white-space:nowrap}
.f-focus .chip.on{background:${INK};border-color:${INK};color:#fff;font-weight:500}
.f-focus .chips.sm .chip{height:26px;font-size:12.5px;padding:0 10px}
.f-focus .ta.typed{min-height:0;color:${INK};line-height:1.55;border-color:${INK};box-shadow:0 0 0 3px #E2ECF6}
.f-focus .caret{display:inline-block;width:1.5px;height:17px;background:${INK};margin-left:2px;vertical-align:-3px}
.f-focus .next{margin-top:18px}
.f-focus .nx-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-bottom:10px}
.f-focus .field{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;border:1px solid #CDD0D5;border-radius:6px;background:#fff;font-size:14px}
.f-focus .field.own{font-weight:500}
.f-focus .field .in{width:20px;height:20px;font-size:9px}
.f-focus .repl{display:flex;align-items:center;gap:7px;margin:0;font-size:12.5px;color:#2C653D}
.f-focus .nudge{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:18px;padding:14px 16px;border-radius:8px;background:#F8EEF0;border:1px solid #EBD3D8}
.f-focus .nudge b{display:block;font-weight:500;font-size:14px;line-height:1.4}
.f-focus .nudge .mv{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;color:#853544}
.f-focus .nudge .mv .dt{color:#853544}
.f-focus .nb{display:flex;gap:6px;flex:none}
.f-focus .b.sel{background:#853544;color:#fff;gap:6px}
.f-focus .cf{display:flex;align-items:center;gap:10px;margin-top:18px}
.f-focus .gap{flex:1}
.f-focus .b.tx-m{padding:0;color:${MUTE};font-weight:400;text-decoration:underline;text-underline-offset:3px;text-decoration-color:#C3C6CB}
.f-focus .b.pressed{box-shadow:0 0 0 3px #D4D7DB}

/* Call context */
.f-focus .who{display:flex;align-items:center;gap:10px;margin-top:14px}
.f-focus .who .in{width:34px;height:34px;font-size:12px;background:#E2ECF6;color:#2D5C88}
.f-focus .who b{display:block;font-weight:500;font-size:15px;line-height:1.3}
.f-focus .who span:not(.in){display:block;font-size:12.5px;color:${MUTE}}
.f-focus .ctx .ph{margin:12px 0 0;font:400 13px/1.4 'DM Mono',ui-monospace,monospace}
.f-focus .ctx .nt{margin:10px 0 0;font-size:13.5px;line-height:1.55;color:#3E4248}
.f-focus .msgs{margin-top:8px}
.f-focus .msgs li{padding:11px 0;border-top:1px solid ${R}}
.f-focus .msgs li:first-child{border-top:0}
.f-focus .msgs p{margin:5px 0 3px;font-size:13px;line-height:1.5}
.f-focus .msgs .by{font-size:12px;color:${MUTE}}
.f-focus .msgs li.m-in p{color:${INK}}
.f-focus .msgs li.m-out p,.f-focus .msgs li.m-log p{color:#3E4248}

/* Toast */
.f-focus .toast{position:absolute;left:44px;right:352px;bottom:32px;display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:10px;background:${INK};color:#fff}
.f-focus .toast .ok{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#2C653D;flex:none}
.f-focus .toast b{display:block;font-weight:500;font-size:14px;line-height:1.35}
.f-focus .toast span:not(.ok){display:block;font-size:13px;color:#C9CCD1;line-height:1.45;margin-top:2px}
.f-focus .toast .undo{margin-left:auto;flex:none;font-weight:500;font-size:13.5px;text-decoration:underline;text-underline-offset:3px;text-decoration-color:#6A6E75}

/* Bigger picture */
.f-focus .cols3{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;align-items:start}
.f-focus .pp-top{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.f-focus .pipe .big{padding-top:14px;margin:0 0 8px}
.f-focus .spark{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.f-focus .pipe .pbar{height:34px;margin:22px 0 6px}
.f-focus .pipe .pbar span{font-size:12px}
.f-focus .stages{margin-top:8px}
.f-focus .stages li{display:grid;grid-template-columns:118px minmax(0,1fr) 64px 92px;gap:14px;align-items:start;padding:14px 0;border-top:1px solid ${R}}
.f-focus .stages li:first-child{border-top:0}
.f-focus .sl{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.f-focus .sf{display:flex;flex-direction:column;gap:5px;font-size:13px;min-width:0;padding-top:1px}
.f-focus .cold{display:flex;align-items:center;gap:7px;color:#2D5C88}
.f-focus .cold i{width:7px;height:7px;border-radius:50%;background:#2D5C88;flex:none}
.f-focus .ch{display:flex;align-items:center;gap:7px;color:#2C653D}
.f-focus .ok-q{color:#A3A7AD}
.f-focus .sn{font:400 12px/1.6 'DM Mono',ui-monospace,monospace;color:${MUTE};text-align:right}
.f-focus .sv{font-weight:300;font-size:20px;line-height:1.1;letter-spacing:-.02em;text-align:right;font-variant-numeric:tabular-nums}
.f-focus .closed{display:flex;flex-wrap:wrap;align-items:center;gap:8px 28px;margin-top:6px;padding-top:16px;border-top:1px solid ${R};font-size:13px;color:${MUTE}}
.f-focus .closed b{color:${INK};font-weight:500;margin-left:6px}
.f-focus .closed .more{margin:0 0 0 auto;color:${INK}}
.f-focus .td-top{display:flex;justify-content:space-between;align-items:baseline}
.f-focus .ticks{display:grid;grid-template-columns:repeat(9,1fr);gap:4px;margin:14px 0 20px}
.f-focus .ticks i{height:6px;border-radius:3px;background:${R}}
.f-focus .ticks i.on{background:${INK}}
.f-focus .left{margin-bottom:18px}
.f-focus .left li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid ${R}}
.f-focus .left li:first-child{border-top:0}
.f-focus .left b{display:block;font-weight:500;font-size:14.5px;line-height:1.3;margin-bottom:4px}
.f-focus .done li{display:grid;grid-template-columns:16px minmax(0,1fr);column-gap:10px;padding:8px 0;border-top:1px solid ${R}}
.f-focus .done li:first-child{border-top:0}
.f-focus .tick{grid-row:span 2;display:grid;place-items:center;width:16px;height:16px;border-radius:4px;background:#E1EEE4;color:#2C653D;margin-top:2px}
.f-focus .dn-t{font-size:13.5px;color:${MUTE};text-decoration:line-through;text-decoration-color:#B5B9BF}
.f-focus .dn-w{font-size:12.5px;color:#2C653D}
.f-focus .end{margin:16px 0 0;padding-top:14px;border-top:1px solid ${R};font-size:13px;line-height:1.5;color:${MUTE}}
`;

  (window.LT_FLOWS = window.LT_FLOWS || []).push({
    id: "focus",
    name: "Focus queue",
    look: "quiet",
    pitch: "Open the app and it tells you what to do next, in order, and why.",
    problem:
      "The board shows where every deal sits but not which one needs you this morning, so people scan columns and open cards to work it out. Overdue tasks, quiet deals and new leads live on different screens, and the ones nobody looks at slowly go cold.",
    principles: [
      "Today is the home page: one ranked list built from overdue tasks, next steps that are due, deals going quiet and new leads with no owner.",
      "Every item says in one line why it's there and has one obvious action.",
      "You work an item where it sits: log the call, set the next step and a date, and accept a stage move if what you wrote implies one.",
      "Nothing leaves the list without a next step, so deals can't drift unnoticed.",
      "The pipeline is still there, as a calm summary beside and under the list, not the place you live.",
    ],
    tradeoffs:
      "The ranking is an opinion; when it's wrong it's worse than no ranking, so people have to see and trust the reasons. Less suited to managers who want the whole board at a glance, or teams that plan by stage rather than by day.",
    fonts: [],
    css,
    screens: [
      { id: "morning", title: "Morning queue", caption: "Ana opens the app and gets one ranked list for the team, each item with its reason and one action. The pipeline sits in the margin.", render: morning },
      { id: "work", title: "Working an item in place", caption: "She calls Ioana and logs it inside the list: outcome, notes, the next step with a date, and an offer to move the deal to Negotiation.", render: working },
      { id: "picture", title: "The bigger picture", caption: "By late morning the list is nearly empty, and the pipeline shows the result: one deal moved, the quiet ones flagged.", render: picture },
    ],
  });
})();
