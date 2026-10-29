// Runway: time is the main axis. Every open lead is a bar from the day it came in to the day it should close.
(function () {
  const MONO = "'Azeret Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  const START = "2026-07-27";
  const DAYS = 188; // 27 Jul 2026 → 31 Jan 2027
  const LAB = 250; // label column
  const TW = 996; // track width inside the 1280 frame
  const PX = TW / DAYS;
  const ROW = 46;
  const HEAD = 34;
  const SHADE = { s1: "#45484f", s2: "#686a6e", s3: "#959187", s4: "#d3cdc0" };

  const css = `
.f-runway .r-tool .c-seg span { padding:0 10px; }
.f-runway .r-legend { display:flex; align-items:center; gap:14px; padding:9px 16px; border-bottom:1px solid var(--rule); font-size:12px; color:var(--dim); flex-wrap:wrap; }
.f-runway .r-legend > span { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; }
.f-runway .r-sw { width:16px; height:9px; border-radius:1px; display:inline-block; }
.f-runway .r-legend .r-sep { width:1px; height:14px; background:var(--rule2); }
.f-runway .r-dia { width:8px; height:8px; transform:rotate(45deg); background:var(--fg); border:1.5px solid var(--bg); box-sizing:content-box; display:inline-block; }
.f-runway .r-gapk { width:22px; height:6px; border-top:1.5px solid var(--alert); border-left:1.5px solid var(--alert); border-right:1.5px solid var(--alert); display:inline-block; transform:translateY(2px); }
.f-runway .r-runk { width:20px; height:9px; border:1px dashed var(--dim); border-radius:1px; display:inline-block; }

.f-runway .r-chart { position:relative; margin:12px 16px 0; border:1px solid var(--rule); border-radius:5px; background:var(--panel); }
.f-runway .r-grid { position:absolute; top:0; bottom:0; left:${LAB}px; width:${TW}px; pointer-events:none; }
.f-runway .r-grid i { position:absolute; top:0; bottom:0; width:1px; background:#2a2c31; }
.f-runway .r-mh { position:absolute; top:0; height:${HEAD}px; display:flex; align-items:center; justify-content:flex-start; padding-left:9px; font-family:${MONO}; font-size:11px; color:var(--dim); text-transform:uppercase; letter-spacing:0.08em; }
.f-runway .r-mh.past { color:var(--faint); }
.f-runway .r-pastshade { position:absolute; top:${HEAD}px; bottom:0; left:0; background:rgba(0,0,0,.14); }
.f-runway .r-today { position:absolute; top:0; bottom:0; width:2px; margin-left:-1px; background:var(--amber); z-index:4; }
.f-runway .r-today b { position:absolute; top:7px; left:50%; transform:translateX(-50%); font:600 10.5px/1 ${MONO}; color:var(--amber-ink); background:var(--amber); padding:4px 6px; border-radius:2px; white-space:nowrap; }
.f-runway .r-head { height:${HEAD}px; border-bottom:1px solid var(--rule); display:grid; grid-template-columns:${LAB}px 1fr; }
.f-runway .r-head > span { display:flex; align-items:center; padding:0 12px; font-family:${MONO}; font-size:10.5px; text-transform:uppercase; letter-spacing:0.06em; color:var(--faint); border-right:1px solid var(--rule); background:var(--panel); position:relative; z-index:5; }

.f-runway .r-row { display:grid; grid-template-columns:${LAB}px ${TW}px; height:${ROW}px; border-bottom:1px solid #26282c; position:relative; }
.f-runway .r-row:last-child { border-bottom:0; }
.f-runway .r-lab { display:flex; flex-direction:column; justify-content:center; gap:3px; padding:0 12px 0 14px; border-right:1px solid var(--rule); min-width:0; background:var(--panel); position:relative; z-index:5; }
.f-runway .r-lab .t { font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.f-runway .r-lab .s { font-family:${MONO}; font-size:11px; color:var(--dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.f-runway .r-row.sel { background:var(--amber-wash); }
.f-runway .r-row.sel .r-lab { background:#2b2922; box-shadow:inset 3px 0 0 var(--amber); }
.f-runway .r-row.sel .r-lab .t { color:var(--amber); }
.f-runway .r-row.dimmed > .r-trk { opacity:.32; }
.f-runway .r-row.dimmed > .r-lab { color:var(--dim); }
.f-runway .r-trk { position:relative; }
.f-runway .r-seg { position:absolute; top:24px; height:13px; }
.f-runway .r-seg:first-child { border-radius:2px 0 0 2px; }
.f-runway .r-run { position:absolute; top:24px; height:13px; border:1px dashed; border-left:0; border-radius:0 2px 2px 0; background:rgba(255,255,255,.025); }
.f-runway .r-end { position:absolute; top:20px; width:2px; height:21px; background:var(--fg); margin-left:-1px; }
.f-runway .r-endl { position:absolute; top:24px; font-family:${MONO}; font-size:11px; line-height:13px; color:var(--dim); white-space:nowrap; padding-left:7px; }
.f-runway .r-endl b { color:var(--fg); font-weight:500; }
.f-runway .r-endl.flip { transform:translateX(-100%); padding-left:0; padding-right:7px; }
.f-runway .r-late { position:absolute; top:30px; height:0; border-top:1.5px dashed var(--alert); }
.f-runway .r-latel { position:absolute; top:24px; font-family:${MONO}; font-size:11px; line-height:13px; color:var(--alert); white-space:nowrap; padding-left:8px; }
.f-runway .r-end.late { background:var(--alert); }
.f-runway .r-nodate { position:absolute; top:30px; width:70px; height:0; border-top:1.5px dashed var(--faint); }
.f-runway .r-touch { position:absolute; top:26px; width:9px; height:9px; margin-left:-4.5px; transform:rotate(45deg); background:var(--fg); outline:2px solid var(--panel); z-index:2; }
.f-runway .r-gap { position:absolute; top:16px; height:6px; border:1.5px solid var(--alert); border-bottom:0; }
.f-runway .r-gapl { position:absolute; top:3px; transform:translateX(-50%); font:600 10.5px/1 ${MONO}; color:var(--alert); background:var(--panel); padding:0 4px; white-space:nowrap; z-index:3; }
.f-runway .r-row.sel .r-gapl { background:#26251f; }

/* forecast strip */
.f-runway .r-fc { display:grid; grid-template-columns:${LAB}px ${TW}px; border-top:1px solid var(--rule2); background:#1d1e22; border-radius:0 0 5px 5px; }
.f-runway .r-fcl { padding:12px 12px 12px 14px; border-right:1px solid var(--rule); display:flex; flex-direction:column; gap:6px; position:relative; z-index:5; background:#1d1e22; border-radius:0 0 0 5px; }
.f-runway .r-fcl h3 { font-size:13px; font-weight:700; }
.f-runway .r-fcl p { font-size:12px; color:var(--dim); line-height:1.4; }
.f-runway .r-fcl .m { font-size:11px; }
.f-runway .r-fct { position:relative; height:118px; }
.f-runway .r-mo { position:absolute; top:10px; bottom:10px; padding:0 10px; display:flex; flex-direction:column; gap:4px; border-left:1px solid transparent; }
.f-runway .r-mo .k { font-family:${MONO}; font-size:10.5px; text-transform:uppercase; letter-spacing:0.08em; color:var(--faint); }
.f-runway .r-mo .v { font-family:${MONO}; font-size:17px; font-weight:600; letter-spacing:-0.02em; color:var(--fg); display:flex; align-items:baseline; gap:7px; white-space:nowrap; }
.f-runway .r-mo .v s { font-size:12px; font-weight:400; color:var(--faint); }
.f-runway .r-mo .w { font-size:12px; color:var(--dim); white-space:nowrap; }
.f-runway .r-mo .w b { font-family:${MONO}; font-weight:500; color:var(--fg); font-size:11.5px; }
.f-runway .r-bar { position:relative; height:8px; background:var(--rule); border-radius:1px; margin-top:3px; }
.f-runway .r-bar i { position:absolute; left:0; top:0; bottom:0; border-radius:1px; }
.f-runway .r-bar i.tot { background:#4a4c52; }
.f-runway .r-bar i.wt { background:var(--fg); }
.f-runway .r-bar i.ghost { background:transparent; border:1px dashed var(--alert); }
.f-runway .r-mo .dl { font-family:${MONO}; font-size:11.5px; font-weight:600; padding:1px 5px; border-radius:2px; }
.f-runway .r-mo .dl.neg { color:var(--alert); border:1px solid rgba(240,127,105,.55); }
.f-runway .r-mo .dl.pos { color:var(--fg); border:1px solid var(--rule2); }
.f-runway .r-mo.hit { background:rgba(240,127,105,.06); border-left-color:rgba(240,127,105,.4); }

/* drag state */
.f-runway .r-run.drag { border:1.5px solid var(--amber); border-left:0; background:rgba(255,184,74,.12); }
.f-runway .r-was { position:absolute; top:18px; height:25px; border-left:1.5px dashed var(--dim); }
.f-runway .r-wasl { position:absolute; top:3px; font-family:${MONO}; font-size:10.5px; color:var(--dim); transform:translateX(-50%); white-space:nowrap; }
.f-runway .r-grip { position:absolute; top:18px; width:10px; height:25px; margin-left:-5px; background:var(--amber); border-radius:2px; z-index:6; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 3px rgba(255,184,74,.25); }
.f-runway .r-grip::before { content:""; width:2px; height:11px; border-left:1px solid var(--amber-ink); border-right:1px solid var(--amber-ink); }
.f-runway .r-tip { position:absolute; top:-14px; transform:translateX(-50%); font:600 11px/1 ${MONO}; background:var(--amber); color:var(--amber-ink); padding:5px 7px; border-radius:3px; white-space:nowrap; z-index:7; }
.f-runway .r-guide { position:absolute; top:${HEAD}px; bottom:0; width:0; border-left:1.5px dashed rgba(255,184,74,.7); z-index:4; }
.f-runway .r-cursor { position:absolute; width:0; height:0; z-index:8; }
.f-runway .r-cursor svg { position:absolute; left:2px; top:6px; }
.f-runway .r-pop { position:absolute; width:410px; z-index:9; background:var(--raise); border:1px solid var(--rule2); border-radius:7px; box-shadow:0 18px 48px rgba(0,0,0,.55); overflow:hidden; }
.f-runway .r-pop-h { padding:12px 14px 10px; border-bottom:1px solid var(--rule); }
.f-runway .r-pop-h h3 { font-size:14.5px; font-weight:700; }
.f-runway .r-pop-h p { font-size:12.5px; color:var(--dim); margin-top:2px; }
.f-runway .r-imp { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid var(--rule); }
.f-runway .r-imp > div { padding:10px 14px; }
.f-runway .r-imp > div + div { border-left:1px solid var(--rule); }
.f-runway .r-imp span { display:block; font-family:${MONO}; font-size:10px; text-transform:uppercase; letter-spacing:0.07em; color:var(--faint); }
.f-runway .r-imp b { display:block; font-family:${MONO}; font-size:17px; font-weight:600; margin-top:3px; }
.f-runway .r-imp b.neg { color:var(--alert); }
.f-runway .r-imp em { display:block; font-style:normal; font-size:11.5px; color:var(--dim); margin-top:2px; }
.f-runway .r-why { padding:11px 14px; display:flex; flex-direction:column; gap:8px; border-bottom:1px solid var(--rule); }
.f-runway .r-why h4 { font-size:12.5px; font-weight:600; }
.f-runway .r-chips { display:flex; flex-wrap:wrap; gap:6px; }
.f-runway .r-chips span { display:inline-flex; align-items:center; height:25px; padding:0 9px; border:1px solid var(--rule2); border-radius:13px; font-size:12px; color:var(--dim); white-space:nowrap; }
.f-runway .r-chips span.on { border-color:var(--fg); color:var(--fg); background:#34363c; }
.f-runway .r-chips span.on::before { content:"✓"; font-family:${MONO}; font-size:10px; margin-right:5px; }
.f-runway .r-ev { font-size:12.5px; line-height:1.45; color:var(--fg); padding:7px 10px; border-left:2px solid var(--rule2); background:var(--panel); }
.f-runway .r-ev span { display:block; font-family:${MONO}; font-size:10.5px; color:var(--dim); margin-bottom:2px; }
.f-runway .r-pop-f { display:flex; align-items:center; gap:8px; padding:10px 14px; }
.f-runway .r-pop-f .sp { flex:1; }
.f-runway .r-pop-f .note { font-size:11.5px; color:var(--dim); }

/* this week */
.f-runway .r-wk { display:grid; grid-template-columns:minmax(0,1fr) 430px; flex:1; }
.f-runway .r-wk > aside { border-left:1px solid var(--rule); background:#1e1f23; }
.f-runway .r-sum { padding:14px 18px; border-bottom:1px solid var(--rule); font-size:15px; line-height:1.45; }
.f-runway .r-sum b { font-weight:700; }
.f-runway .r-sum .m { font-size:13.5px; font-weight:600; }
.f-runway .r-days { display:flex; flex-direction:column; }
.f-runway .r-day { display:grid; grid-template-columns:96px minmax(0,1fr); border-bottom:1px solid var(--rule); }
.f-runway .r-dl { padding:12px 14px; border-right:1px solid var(--rule); display:flex; flex-direction:column; gap:2px; }
.f-runway .r-dl b { font-size:14px; font-weight:700; }
.f-runway .r-dl span { font-family:${MONO}; font-size:10.5px; color:var(--faint); }
.f-runway .r-day.today .r-dl { box-shadow:inset 3px 0 0 var(--amber); background:#232220; }
.f-runway .r-day.today .r-dl b { color:var(--amber); }
.f-runway .r-day.quiet .r-items { color:var(--faint); font-size:12.5px; padding:12px 14px; }
.f-runway .r-items { display:flex; flex-direction:column; min-width:0; }
.f-runway .r-it { display:grid; grid-template-columns:62px minmax(0,1fr) auto; gap:12px; align-items:center; padding:9px 14px; border-bottom:1px solid #26282c; }
.f-runway .r-it:last-child { border-bottom:0; }
.f-runway .r-kind { font-family:${MONO}; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--dim); border:1px solid var(--rule2); border-radius:3px; padding:2px 0; text-align:center; }
.f-runway .r-it .b { font-size:13.5px; line-height:1.3; }
.f-runway .r-it .l { font-family:${MONO}; font-size:11px; color:var(--dim); margin-top:2px; }
.f-runway .r-it .r { display:flex; align-items:center; gap:8px; font-family:${MONO}; font-size:11.5px; }
.f-runway .r-it.slip .r-kind { color:var(--alert); border-color:rgba(240,127,105,.5); }
.f-runway .r-it.slip .od { color:var(--alert); font-family:${MONO}; font-size:11px; }
.f-runway .r-it.close { background:rgba(255,255,255,.03); }
.f-runway .r-it.close .r-kind { color:var(--bg); background:var(--fg); border-color:var(--fg); }
.f-runway .r-it.close .b { font-weight:600; }
.f-runway .r-it.focus { background:var(--amber-wash); box-shadow:inset 3px 0 0 var(--amber); grid-template-columns:62px minmax(0,1fr); }
.f-runway .r-it.focus .b { color:var(--amber); font-weight:600; }
.f-runway .r-qa { grid-column:2 / -1; display:flex; flex-wrap:wrap; gap:6px; margin-top:2px; }
.f-runway .r-sub { padding:7px 14px; font-family:${MONO}; font-size:10.5px; text-transform:uppercase; letter-spacing:0.06em; color:var(--faint); border-bottom:1px solid #26282c; background:#1e1f23; }
.f-runway .r-sub.alert { color:var(--alert); }

.f-runway .r-hh { padding:14px 16px 10px; display:flex; align-items:baseline; gap:10px; }
.f-runway .r-hh h2 { font-size:15px; font-weight:700; }
.f-runway .r-hh span { font-size:12px; color:var(--dim); }
.f-runway .r-hg { border-top:1px solid var(--rule); }
.f-runway .r-hg > h3 { display:flex; align-items:center; gap:8px; padding:8px 16px; font-family:${MONO}; font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--dim); }
.f-runway .r-hg > h3 .n { color:var(--faint); font-weight:500; }
.f-runway .r-hg.bad > h3 { color:var(--alert); }
.f-runway .r-hl { display:grid; grid-template-columns:minmax(0,1fr) 112px; gap:2px 12px; padding:7px 16px; border-top:1px solid #26282c; align-items:center; }
.f-runway .r-hl .t { font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.f-runway .r-hl .s { font-size:12px; color:var(--dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.f-runway .r-hl .s.alert { color:var(--alert); }
.f-runway .r-q { grid-row:span 2; display:flex; flex-direction:column; gap:3px; }
.f-runway .r-q .qb { position:relative; height:6px; background:var(--rule); border-radius:1px; }
.f-runway .r-q .qb i { position:absolute; left:0; top:0; bottom:0; background:var(--dim); border-radius:1px; }
.f-runway .r-q .qb i.bad { background:var(--alert); }
.f-runway .r-q .qb b { position:absolute; left:46.6%; top:-2px; bottom:-2px; width:1px; background:var(--faint); }
.f-runway .r-q span { font-family:${MONO}; font-size:10.5px; color:var(--dim); }
`;

  const NAV = ["Runway", "This week", "Contacts", "Reports", "Settings"];
  function chrome(d, h, o) {
    const nav = NAV.map((n, i) => `<a class="${n === o.active ? "on" : ""}"><kbd>${i + 1}</kbd>${h.esc(n)}</a>`).join("");
    return `<div class="c-app">
  <header class="c-top">
    <div class="c-brand">Lead Tracker<i class="c-caret" aria-hidden="true"></i></div>
    <nav class="c-nav" aria-label="Main">${nav}</nav>
    <div class="c-cmd"><span class="c-pr">›</span><span class="ph">Jump to a lead, contact or date…</span><kbd>⌘K</kbd></div>
    <div class="c-who"><div><b>${h.esc(d.org.name)}</b><span>${h.esc(d.viewer.name)} · ${h.esc(d.viewer.role.toLowerCase())}</span></div><a class="c-btn ghost">Sign out</a></div>
  </header>
  ${o.body}
  <footer class="c-status"><span class="mode">${o.mode}</span><span class="path">${o.path}</span>${o.segs.map((s) => `<span>${s}</span>`).join("")}<span class="fill"></span><span class="r">${o.keys}</span><span class="r">utf-8 · eur</span><span class="r">28 Oct 2026 09:41</span></footer>
</div>`;
  }

  const dn = (iso) => Math.round(Date.parse(iso.slice(0, 10) + "T00:00:00Z") / 864e5);
  const X = (iso) => (dn(iso) - dn(START)) * PX;
  const px = (n) => `${Math.round(n * 10) / 10}px`;
  const MONTHS = [
    { k: "Aug", from: "2026-08-01", to: "2026-09-01", key: "2026-08" },
    { k: "Sep", from: "2026-09-01", to: "2026-10-01", key: "2026-09" },
    { k: "Oct", from: "2026-10-01", to: "2026-11-01", key: "2026-10" },
    { k: "Nov", from: "2026-11-01", to: "2026-12-01", key: "2026-11" },
    { k: "Dec", from: "2026-12-01", to: "2027-01-01", key: "2026-12" },
    { k: "Jan", from: "2027-01-01", to: "2027-02-01", key: "2027-01" },
  ];

  // Stage history: what the timeline knows, the rest spread evenly between known points.
  const KNOWN = { l7: { s3: "2026-10-10" }, l11: { s4: "2026-10-27" } };
  const STARTS_AT = { l4: "s2" };
  function segments(l, today) {
    const order = ["s1", "s2", "s3", "s4"];
    const ids = order.slice(order.indexOf(STARTS_AT[l.id] || "s1"), order.indexOf(l.stageId) + 1);
    const b = Array(ids.length + 1).fill(null);
    b[0] = dn(l.created);
    b[ids.length] = dn(today);
    ids.forEach((id, i) => { if (i > 0 && KNOWN[l.id] && KNOWN[l.id][id]) b[i] = dn(KNOWN[l.id][id]); });
    for (let i = 1; i < ids.length; i++) {
      if (b[i] != null) continue;
      let j = i; while (b[j] == null) j++;
      b[i] = b[i - 1] + (b[j] - b[i - 1]) / (j - i + 1);
    }
    return ids.map((id, i) => ({ id, from: b[i], to: b[i + 1] }));
  }

  const openSorted = (d) =>
    d.leads.filter((l) => l.status === "open").sort((a, b) => (a.closeDate || "9999") < (b.closeDate || "9999") ? -1 : 1);
  const prob = (h, l) => h.stage(l.stageId).probability;

  function forecast(d, h, move) {
    const open = d.leads.filter((l) => l.status === "open");
    const out = {};
    for (const m of MONTHS) out[m.key] = { tot: 0, wt: 0, n: 0 };
    for (const l of open) {
      const cd = move && move.id === l.id ? move.to : l.closeDate;
      if (!cd) continue;
      const k = cd.slice(0, 7);
      if (!out[k]) continue;
      out[k].tot += l.amount; out[k].wt += (l.amount * prob(h, l)) / 100; out[k].n++;
    }
    return out;
  }

  function chart(d, h, opt) {
    const today = d.today;
    const tx = X(today);
    const rows = openSorted(d);
    const grid = MONTHS.map((m) => `<i style="left:${px(X(m.from))}"></i>`).join("");
    const mh = MONTHS.map((m) => `<span class="r-mh${m.to <= "2026-10-01" ? " past" : ""}" style="left:${px(X(m.from))};width:${px(X(m.to) - X(m.from))}">${m.k}${m.k === "Jan" ? " ’27" : ""}</span>`).join("");

    const rowHtml = rows
      .map((l) => {
        const t = d.touch[l.id] || {};
        const segs = segments(l, today)
          .map((s) => `<i class="r-seg" style="left:${px((s.from - dn(START)) * PX)};width:${px((s.to - s.from) * PX)};background:${SHADE[s.id]}"></i>`)
          .join("");
        let tail = "";
        const drag = opt.drag && opt.drag.id === l.id;
        const close = drag ? opt.drag.to : l.closeDate;
        if (!close) {
          tail = `<i class="r-nodate" style="left:${px(tx)}"></i><span class="r-endl" style="left:${px(tx + 70)}">no close date · <b>set one</b></span>`;
        } else if (close < today) {
          const late = dn(today) - dn(close);
          tail = `<i class="r-end late" style="left:${px(X(close))}"></i><i class="r-late" style="left:${px(X(close))};width:${px(tx - X(close))}"></i><span class="r-latel" style="left:${px(tx)}">${late} days past close (${h.esc(h.day(close))})</span>`;
        } else {
          const left = dn(close) - dn(today);
          tail = `<i class="r-run${drag ? " drag" : ""}" style="left:${px(tx)};width:${px(X(close) - tx)};border-color:${drag ? "" : SHADE[l.stageId]}"></i>`;
          if (drag) {
            tail += `<i class="r-was" style="left:${px(X(l.closeDate))}"></i><span class="r-wasl" style="left:${px(X(l.closeDate))}">was ${h.esc(h.day(l.closeDate))}</span>`;
            tail += `<i class="r-grip" style="left:${px(X(close))}"></i><span class="r-tip" style="left:${px(X(close))}">Fri 4 Dec · +${dn(close) - dn(l.closeDate)} days</span>`;
            tail += `<span class="r-cursor" style="left:${px(X(close))};top:30px"><svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true"><path d="M1 1 L1 16 L5 12 L8 19 L11 17.6 L8 11 L14 11 Z" fill="#e6e2d8" stroke="#1b1c1f" stroke-width="1.3" stroke-linejoin="round"/></svg></span>`;
          } else {
            // Near the right edge the label sits before the end mark so it stays on the track.
            const flip = X(close) > TW - 140;
            tail += `<i class="r-end" style="left:${px(X(close))}"></i><span class="r-endl${flip ? " flip" : ""}" style="left:${px(X(close))}"><b>${h.esc(h.day(close))}</b> · ${left} d</span>`;
          }
        }
        let touch = "";
        if (t.last) {
          touch = `<i class="r-touch" style="left:${px(X(t.last))}" title="Last touch ${h.esc(h.day(t.last))}"></i>`;
          if (t.days >= 14) {
            touch += `<i class="r-gap" style="left:${px(X(t.last))};width:${px(tx - X(t.last))}"></i><span class="r-gapl" style="left:${px((X(t.last) + tx) / 2)}">silent ${t.days} days</span>`;
          }
        }
        const cls = [opt.sel === l.id ? "sel" : "", opt.drag && !drag ? "dimmed" : ""].join(" ");
        const st = h.stage(l.stageId).name;
        return `<div class="r-row ${cls}">
          <div class="r-lab"><span class="t">${opt.sel === l.id ? "▸ " : ""}${h.esc(l.title)}</span><span class="s">${h.esc(st)} · ${h.esc(h.money(l.amount))} · ${l.owner ? h.esc(h.initials(l.owner)) : "no owner"}</span></div>
          <div class="r-trk">${segs}${tail}${touch}</div>
        </div>`;
      })
      .join("");

    // forecast strip, aligned to the same months
    const base = forecast(d, h);
    const now = opt.drag ? forecast(d, h, opt.drag) : base;
    const maxTot = Math.max(...Object.values(base).map((m) => m.tot), ...Object.values(now).map((m) => m.tot));
    const won = d.leads.filter((l) => l.status === "won");
    const pastDue = d.leads.filter((l) => l.overdue);
    const months = MONTHS.map((m) => {
      const pos = `left:${px(X(m.from))};width:${px(X(m.to) - X(m.from))}`;
      const f = now[m.key];
      const b = base[m.key];
      if (m.to <= "2026-10-01") return `<div class="r-mo" style="${pos}"><span class="k">${m.k}</span><span class="w">nothing closed</span></div>`;
      if (m.key === "2026-10") {
        const w = h.total(won.filter((l) => l.closeDate.slice(0, 7) === m.key));
        return `<div class="r-mo late" style="${pos}"><span class="k">Oct · so far</span><span class="v">${h.esc(h.moneyShort(w))}</span><span class="w">won · <b style="color:var(--alert)">${h.esc(h.moneyShort(h.total(pastDue)))}</b> past due</span></div>`;
      }
      const delta = f.tot - b.tot;
      const changed = opt.drag && delta !== 0;
      const bar = `<div class="r-bar">${changed && delta < 0 ? `<i class="ghost" style="width:${(b.tot / maxTot) * 100}%"></i>` : ""}<i class="tot" style="width:${(f.tot / maxTot) * 100}%"></i><i class="wt" style="width:${(f.wt / maxTot) * 100}%"></i></div>`;
      return `<div class="r-mo${changed && delta < 0 ? " hit" : ""}" style="${pos}">
        <span class="k">${m.k}${m.k === "Jan" ? " ’27" : ""} · ${f.n} ${f.n === 1 ? "deal" : "deals"}</span>
        <span class="v">${h.esc(h.moneyShort(f.tot))}${changed ? `<span class="dl ${delta < 0 ? "neg" : "pos"}">${delta < 0 ? "−" : "+"}${h.esc(h.moneyShort(Math.abs(delta)))}</span>` : ""}</span>
        <span class="w"><b>${h.esc(h.moneyShort(f.wt))}</b> likely</span>
        ${bar}
      </div>`;
    }).join("");
    const nodate = d.leads.filter((l) => l.status === "open" && !l.closeDate);

    const pastW = tx;
    const guide = opt.drag ? `<i class="r-guide" style="left:${px(LAB + X(opt.drag.to))}"></i>` : "";
    return `<section class="r-chart">
      <div class="r-grid"><i class="r-pastshade" style="width:${px(pastW)};left:0;position:absolute"></i>${grid}${mh}<i class="r-today" style="left:${px(tx)}"><b>today · ${h.esc(h.day(today))}</b></i></div>
      ${guide}
      <div class="r-head"><span>Lead · ${rows.length} open</span><span style="border:0;background:transparent"></span></div>
      ${rowHtml}
      <div class="r-fc">
        <div class="r-fcl"><h3>Forecast by close month</h3><p>Grey bar: everything due to close. Light bar: likely, weighted by stage.</p><span class="m dim">No date: ${h.esc(h.money(h.total(nodate)))} (${nodate.length})</span></div>
        <div class="r-fct">${months}</div>
      </div>
      ${opt.extra || ""}
    </section>`;
  }

  function legend() {
    return `<div class="r-legend">
      <span><i class="r-sw" style="background:${SHADE.s1}"></i>New</span>
      <span><i class="r-sw" style="background:${SHADE.s2}"></i>Qualified</span>
      <span><i class="r-sw" style="background:${SHADE.s3}"></i>Proposal</span>
      <span><i class="r-sw" style="background:${SHADE.s4}"></i>Negotiation</span>
      <i class="r-sep"></i>
      <span><i class="r-runk"></i>time left to close</span>
      <span><i class="r-dia"></i>last touch</span>
      <span><i class="r-gapk"></i>silent 14+ days</span>
      <span style="margin-left:auto">Drag the end of a bar to move its close date</span>
    </div>`;
  }

  function tool(d, h, extra) {
    const open = d.leads.filter((l) => l.status === "open");
    return `<div class="c-tool r-tool">
      <h1>Runway</h1><span class="count">${open.length} open · ${h.esc(h.money(h.total(open)))}</span>
      <div class="c-seg"><span class="on">Months</span><span>Weeks</span></div>
      <span class="c-field">sort <b>close date</b></span>
      <span class="c-field">owner <b>anyone</b> <kbd>o</kbd></span>
      <span class="sp"></span>${extra || ""}
      <a class="c-btn pri">New lead <kbd>n</kbd></a>
    </div>`;
  }

  // ---------- 1. runway ----------
  function runway(d, h) {
    const open = d.leads.filter((l) => l.status === "open");
    const silent = Object.values(d.touch).filter((t) => t.days >= 14).length;
    const body = `${tool(d, h, `<a class="c-btn">Go to today <kbd>t</kbd></a>`)}${legend()}${chart(d, h, { sel: "l7" })}<div style="height:14px"></div>`;
    return chrome(d, h, {
      active: "Runway",
      body,
      mode: "RUNWAY",
      path: "runway/months",
      segs: [`${open.length} open`, `${d.leads.filter((l) => l.overdue).length} past close`, `${silent} silent 14+ d`],
      keys: "<kbd>j</kbd><kbd>k</kbd> lead <kbd>[</kbd><kbd>]</kbd> close date ±1 wk <kbd>t</kbd> today",
    });
  }

  // ---------- 2. drag ----------
  function drag(d, h) {
    const l = d.leads.find((x) => x.id === "l7");
    const to = "2026-12-04";
    const rows = openSorted(d);
    const idx = rows.findIndex((x) => x.id === l.id);
    const base = forecast(d, h);
    const moved = forecast(d, h, { id: l.id, to });
    const nov = moved["2026-11"].tot - base["2026-11"].tot;
    const novW = moved["2026-11"].wt - base["2026-11"].wt;
    const quote = d.thread.find((m) => m.dir === "in" && /DPA/.test(m.body));
    const sentence = quote.body.split(". ").find((s) => /DPA/.test(s));
    const top = HEAD + (idx + 1) * ROW + 10;
    const left = LAB + 24;
    const pop = `<div class="r-pop" style="left:${px(left)};top:${top}px">
      <div class="r-pop-h"><h3>Move close date to Fri 4 Dec?</h3><p>${h.esc(l.title)} · ${h.esc(h.money(l.amount))} · ${h.esc(h.stage(l.stageId).name)}</p></div>
      <div class="r-imp">
        <div><span>November forecast</span><b class="neg">−${h.esc(h.moneyShort(-nov))}</b><em>likely −${h.esc(h.moneyShort(Math.round(-novW / 100) * 100))} · ${h.esc(h.moneyShort(moved["2026-11"].tot))} left</em></div>
        <div><span>December forecast</span><b>+${h.esc(h.moneyShort(-nov))}</b><em>${h.esc(h.moneyShort(moved["2026-12"].tot))} in total</em></div>
      </div>
      <div class="r-why">
        <h4>Why is it moving?</h4>
        <div class="r-chips"><span class="on">Waiting on their legal team</span><span>They asked for more time</span><span>Budget moved</span><span>We're at capacity</span><span>Other…</span></div>
        <div class="r-ev"><span>${h.esc(quote.from.split(" ")[0])} · ${h.esc(h.day(quote.at))} · ${h.esc(quote.channel.toLowerCase())}</span>“${h.esc(sentence)}.”</div>
      </div>
      <div class="r-pop-f"><span class="note">Saved on the lead's timeline.</span><span class="sp"></span><a class="c-btn ghost">Cancel <kbd>esc</kbd></a><a class="c-btn pri">Move to 4 Dec <kbd>↵</kbd></a></div>
    </div>`;
    const body = `${tool(d, h, `<a class="c-btn">Go to today <kbd>t</kbd></a>`)}${legend()}${chart(d, h, { sel: "l7", drag: { id: l.id, to }, extra: pop })}<div style="height:14px"></div>`;
    return chrome(d, h, {
      active: "Runway",
      body,
      mode: "DRAG",
      path: `runway/${h.esc(l.title.toLowerCase().replace(/\s+/g, "-"))}`,
      segs: [`close 14 Nov → 4 Dec`, `Nov −${h.esc(h.moneyShort(-nov))}`],
      keys: "<kbd>←</kbd><kbd>→</kbd> ±1 day <kbd>↵</kbd> move <kbd>esc</kbd> cancel",
    });
  }

  // ---------- 3. this week ----------
  function week(d, h) {
    const today = d.today;
    const L = (id) => d.leads.find((l) => l.id === id);
    const lead = (title) => d.leads.find((l) => l.title === title);
    const end = "2026-11-03";
    const items = [];
    const t1 = d.detail.openTasks;
    // next steps from each open lead (the Ioana tasks come from the task list instead)
    for (const [id, t] of Object.entries(d.touch)) {
      if (!t.nextDue || id === "l7") continue;
      if (t.nextDue > end) continue;
      const l = L(id);
      items.push({ due: t.nextDue, text: t.next, l, kind: /call$/i.test(t.next) && !/^book/i.test(t.next) ? "Call" : "Task", who: l.owner });
    }
    for (const t of t1) {
      const l = lead(t.lead);
      items.push({ due: t.due.slice(0, 10), time: t.due.slice(11, 16), text: t.body, l, kind: "Task", who: t.assignee });
    }
    for (const l of d.leads.filter((x) => x.status === "open" && x.closeDate && x.closeDate >= today && x.closeDate <= end)) {
      items.push({ due: l.closeDate, text: `${l.title} should close`, l, kind: "Close", who: l.owner, close: true });
    }
    const slipped = items.filter((i) => i.due < today).sort((a, b) => (a.due < b.due ? -1 : 1));
    const days = [
      { iso: "2026-10-28", lab: "Wed 28", sub: "today" },
      { iso: "2026-10-29", lab: "Thu 29", sub: "tomorrow" },
      { iso: "2026-10-30", lab: "Fri 30", sub: "" },
      { iso: "2026-10-31", lab: "Sat 31", sub: "+ Sun 1", also: "2026-11-01" },
      { iso: "2026-11-02", lab: "Mon 2", sub: "Nov" },
      { iso: "2026-11-03", lab: "Tue 3", sub: "" },
    ];
    const FOCUS = "l8";
    const itemHtml = (i) => {
      const late = i.due < today ? dn(today) - dn(i.due) : 0;
      const focus = i.l.id === FOCUS && late;
      const right = i.close
        ? `<span class="r"><span>${h.esc(h.money(i.l.amount))}</span><span class="dim">${prob(h, i.l)}%</span>${ownerTag(h, i.who)}</span>`
        : `<span class="r">${late ? `<span class="od">${late} d late</span>` : i.time ? `<span class="dim">${i.time}</span>` : ""}${ownerTag(h, i.who)}</span>`;
      return `<div class="r-it${late ? " slip" : ""}${i.close ? " close" : ""}${focus ? " focus" : ""}">
        <span class="r-kind">${h.esc(i.kind)}</span>
        <div><div class="b">${h.esc(i.text)}</div><div class="l">${i.close ? `${h.esc(h.stage(i.l.stageId).name)} · ${h.esc(i.l.contact)}` : `↳ ${h.esc(i.l.title)} · ${h.esc(h.moneyShort(i.l.amount))}`}${late ? ` · was due ${h.esc(h.day(i.due))}` : ""}</div></div>
        ${focus ? `<div class="r-qa"><a class="c-btn sm pri">Mark done <kbd>↵</kbd></a><a class="c-btn sm">Log what happened <kbd>l</kbd></a><a class="c-btn sm">Push to Mon 2 Nov <kbd>p</kbd></a><a class="c-btn sm ghost">Open on runway</a></div>` : right}
      </div>`;
    };
    const dayHtml = days
      .map((dd) => {
        const list = items.filter((i) => i.due === dd.iso || (dd.also && i.due === dd.also)).sort((a, b) => (a.close ? 1 : 0) - (b.close ? 1 : 0));
        const isToday = dd.iso === today;
        const inner = isToday
          ? `<div class="r-sub alert">Slipped · ${slipped.length} from earlier</div>${slipped.map(itemHtml).join("")}<div class="r-sub">Due today</div>${list.map(itemHtml).join("")}`
          : list.length
            ? list.map(itemHtml).join("")
            : "";
        return `<div class="r-day${isToday ? " today" : ""}${list.length || isToday ? "" : " quiet"}">
          <div class="r-dl"><b>${dd.lab}</b><span>${dd.sub}</span></div>
          <div class="r-items">${inner || "Nothing due. A good day to wake up a silent lead."}</div>
        </div>`;
      })
      .join("");

    // health
    const open = d.leads.filter((l) => l.status === "open");
    const health = open.map((l) => {
      const t = d.touch[l.id];
      const nextLate = t.nextDue && t.nextDue < today;
      let g, why;
      if (l.overdue) { g = "past"; why = `Close date passed ${h.day(l.closeDate)}`; }
      else if (t.days >= 14) { g = "silent"; why = `Nothing for ${t.days} days · next step ${nextLate ? "late" : "set"}`; }
      else if (!l.owner) { g = "slip"; why = "Nobody owns it yet"; }
      else if (nextLate) { g = "slip"; why = `Next step ${dn(today) - dn(t.nextDue)} d late`; }
      else { g = "ok"; why = l.closeDate ? `Closes ${h.day(l.closeDate)} · next step ${t.nextDue === today ? "today" : h.day(t.nextDue)}` : "Next step set"; }
      return { l, t, g, why };
    });
    const groups = [
      { g: "past", name: "Past close date", bad: true },
      { g: "silent", name: "Gone silent", bad: true },
      { g: "slip", name: "Slipping", bad: false },
      { g: "ok", name: "On track", bad: false },
    ];
    const qbar = (t) => {
      const w = Math.min(100, (t.days / 30) * 100);
      return `<div class="r-q"><div class="qb"><i class="${t.days >= 14 ? "bad" : ""}" style="width:${w}%"></i><b></b></div><span>${t.days === 1 ? "1 day" : `${t.days} days`} quiet</span></div>`;
    };
    const healthHtml = groups
      .map((G) => {
        const list = health.filter((x) => x.g === G.g).sort((a, b) => b.t.days - a.t.days);
        if (!list.length) return "";
        return `<div class="r-hg${G.bad ? " bad" : ""}"><h3>${G.name}<span class="n">${list.length} · ${h.esc(h.moneyShort(h.total(list.map((x) => x.l))))}</span></h3>
          ${list.map((x) => `<div class="r-hl"><span class="t">${h.esc(x.l.title)}</span>${qbar(x.t)}<span class="s${G.bad ? " alert" : ""}">${h.esc(x.why)}</span></div>`).join("")}
        </div>`;
      })
      .join("");

    const due = items.filter((i) => i.due >= today && !i.close).length;
    const closing = items.filter((i) => i.close);
    const body = `<div class="c-tool r-tool">
      <h1>This week</h1><span class="count">Wed 28 Oct – Tue 3 Nov</span>
      <div class="c-seg"><span class="on">Everyone</span><span>Just me</span></div>
      <span class="sp"></span>
      <a class="c-btn">Open runway <kbd>1</kbd></a>
      <a class="c-btn pri">Log activity <kbd>l</kbd></a>
    </div>
    <div class="r-wk">
      <section>
        <p class="r-sum"><b>${due} things due</b> in the next 7 days, <b class="alert">${slipped.length} slipped</b> from earlier, and <b>${closing.length} deal should close</b>: ${closing.map((c) => `${h.esc(c.l.title)}, <span class="m">${h.esc(h.money(c.l.amount))}</span>`).join("")} on Tuesday.</p>
        <div class="r-days">${dayHtml}</div>
      </section>
      <aside>
        <div class="r-hh"><h2>Lead health</h2><span>${open.length} open · bar = days since anyone touched it</span></div>
        ${healthHtml}
      </aside>
    </div>`;
    return chrome(d, h, {
      active: "This week",
      body,
      mode: "WEEK",
      path: "week/2026-w44",
      segs: [`${due} due · ${slipped.length} slipped`, `closing ${h.esc(h.moneyShort(h.total(closing.map((c) => c.l))))}`],
      keys: "<kbd>j</kbd><kbd>k</kbd> item <kbd>↵</kbd> done <kbd>p</kbd> push <kbd>l</kbd> log",
    });
  }

  const ownerTag = (h, n) => (n ? `<span class="c-own" title="${h.esc(n)}">${h.esc(h.initials(n))}</span>` : `<span class="c-own none">—</span>`);

  (window.LT_FLOWS = window.LT_FLOWS || []).push({
    id: "runway",
    name: "Runway",
    look: "console",
    pitch: "See every deal as a bar on a calendar, so you can tell at a glance what lands this month, what has gone quiet, and what a slipped date does to the forecast.",
    problem:
      "A kanban board shows where deals are, but not when. A deal that has sat in Proposal for six weeks looks exactly like one that arrived yesterday, and nobody notices that a close date passed or that a client went quiet a month ago until the month is over.",
    principles: [
      "Time runs left to right. Each lead is a bar from the day it came in to its expected close, shaded by the stages it went through.",
      "A today line splits what happened from what's left; last touches and silent gaps sit right on the bar.",
      "The forecast sits under the months it belongs to, so moving a close date visibly moves money from one month to the next.",
      "Moving a date asks for a one-tap reason, so the forecast history explains itself.",
      "This week turns the same timeline into a short agenda: what's due, what slipped, what should close, and how healthy each lead is.",
    ],
    tradeoffs:
      "It only works if close dates are honest; leads without a date fall off the chart. Teams with many small, fast deals get a wall of thin bars, and anyone who thinks in stages first will find the stage view secondary.",
    fonts: [],
    css,
    screens: [
      { id: "runway", title: "The runway", caption: "Every open lead on one timeline: how long it has been alive, when it should close, when someone last touched it, and the monthly forecast underneath.", render: runway },
      { id: "drag", title: "Moving a close date", caption: "Ana drags Fleet tracking pilot from 14 Nov to 4 Dec. Before she lets go she sees November lose €18.5k, and picks a reason backed by Ioana's email.", render: drag },
      { id: "week", title: "This week", caption: "The next seven days as an agenda — slipped items first, tasks and calls by day, one deal closing Tuesday — next to the health of every open lead.", render: week },
    ],
  });
})();
