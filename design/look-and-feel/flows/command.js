// Command line: one sentence in, a previewed set of changes out. Questions get answers, not boards.
// Story clock: Tue 27 Oct, right after Ana's call with Ioana (the data's 27 Oct call + stage move are what this command creates).
(function () {
  const NOW = "2026-10-27";
  const MONO = "'Azeret Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

  const css = `
.f-command .k-top-cmd { border-color:var(--amber); color:var(--dim); box-shadow:0 0 0 3px var(--amber-wash); }
.f-command .k-body { position:relative; flex:1; display:flex; flex-direction:column; }

/* home underneath the open sheet */
.f-command .k-home { padding:22px 28px 28px; display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:24px; }
.f-command .k-hello h1 { font-size:22px; font-weight:700; letter-spacing:-0.02em; }
.f-command .k-hello p { color:var(--dim); margin-top:4px; font-size:13.5px; }
.f-command .k-list { margin-top:16px; border:1px solid var(--rule); border-radius:5px; background:var(--panel); }
.f-command .k-list li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:2px 12px; padding:9px 12px; border-bottom:1px solid #26282c; }
.f-command .k-list li:last-child { border-bottom:0; }
.f-command .k-list .t { font-weight:600; font-size:13px; }
.f-command .k-list .s { font-family:${MONO}; font-size:11px; color:var(--dim); }
.f-command .k-list .v { font-family:${MONO}; font-size:11.5px; grid-row:span 2; align-self:center; text-align:right; }
.f-command .k-scrim { position:absolute; inset:0; background:rgba(12,12,14,.74); }

/* the sheet */
.f-command .k-float { position:absolute; left:50%; top:14px; transform:translateX(-50%); width:940px; display:flex; flex-direction:column; gap:16px; }
.f-command .k-body.open { min-height:880px; }
.f-command .k-sheet { width:100%; background:var(--panel); border:1px solid var(--rule2); border-radius:7px; box-shadow:0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,184,74,.18); overflow:hidden; }
.f-command .k-input { padding:18px 22px 16px; border-bottom:1px solid var(--rule); background:#1d1e22; }
.f-command .k-lab { font-family:${MONO}; font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; color:var(--faint); display:flex; align-items:center; gap:8px; margin-bottom:12px; }
.f-command .k-lab .r { margin-left:auto; text-transform:none; letter-spacing:0; color:var(--dim); display:flex; gap:6px; align-items:center; }
.f-command .k-sent { display:flex; flex-wrap:wrap; align-items:flex-start; gap:12px 9px; font-family:${MONO}; font-size:17px; line-height:1.25; color:var(--fg); }
.f-command .k-pr { color:var(--amber); font-size:18px; margin-right:2px; }
.f-command .k-w { display:inline-flex; flex-direction:column; gap:5px; }
.f-command .k-src { white-space:nowrap; }
.f-command .k-w.hit .k-src u { text-decoration:none; border-bottom:1.5px dotted var(--dim); padding-bottom:1px; }
.f-command .k-w.ent .k-src u { text-decoration:none; border-bottom:1.5px solid var(--fg); padding-bottom:1px; }
.f-command .k-w.plain .k-src { color:var(--dim); }
.f-command .k-gl { font-family:${MONO}; font-size:10.5px; line-height:1; color:var(--dim); white-space:nowrap; display:flex; align-items:center; gap:5px; }
.f-command .k-gl:empty { visibility:hidden; }
.f-command .k-gl:empty::before { content:"."; }
.f-command .k-n { display:inline-flex; align-items:center; justify-content:center; width:15px; height:15px; border-radius:3px; background:var(--raise); border:1px solid var(--rule2); color:var(--fg); font:600 9.5px/1 ${MONO}; }
.f-command .k-chip { display:inline-flex; align-items:center; gap:3px; height:20px; padding:0 7px; border-radius:10px; background:var(--raise); border:1px solid var(--rule2); color:var(--fg); font-family:'Schibsted Grotesk', sans-serif; font-size:12px; font-weight:600; white-space:nowrap; line-height:1; }
.f-command .k-chip i { font-style:normal; font-family:${MONO}; font-weight:500; color:var(--dim); }
.f-command .k-gl .k-chip { height:19px; font-size:11.5px; }
.f-command .k-caretw { align-self:flex-start; }
.f-command .k-caretw .c-caret { height:20px; width:9px; margin:1px 0 0 -6px; }

.f-command .k-acts-h { display:flex; align-items:center; gap:10px; padding:12px 22px 6px; }
.f-command .k-acts-h h2 { font-size:14px; font-weight:700; }
.f-command .k-acts-h span { color:var(--dim); font-size:12.5px; }
.f-command .k-acts li { display:grid; grid-template-columns:20px 120px minmax(0,1fr) auto; gap:14px; align-items:start; padding:11px 22px; border-top:1px solid #26282c; }
.f-command .k-acts li.on { background:var(--amber-wash); box-shadow:inset 3px 0 0 var(--amber); }
.f-command .k-chk { width:15px; height:15px; border-radius:3px; border:1px solid var(--fg); background:var(--fg); color:var(--bg); font:700 10px/13px ${MONO}; text-align:center; margin-top:2px; }
.f-command .k-verb { display:flex; align-items:center; gap:7px; font-family:${MONO}; font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--fg); padding-top:3px; white-space:nowrap; }
.f-command .k-what { display:flex; flex-direction:column; gap:6px; min-width:0; }
.f-command .k-line { display:flex; flex-wrap:wrap; align-items:center; gap:6px 7px; font-size:14px; }
.f-command .k-meta { display:flex; flex-wrap:wrap; gap:4px 14px; font-family:${MONO}; font-size:11px; color:var(--dim); }
.f-command .k-meta b { color:var(--fg); font-weight:500; }
.f-command .k-q { font-size:13.5px; color:var(--fg); padding-left:10px; border-left:2px solid var(--rule2); }
.f-command .k-move { display:inline-flex; align-items:center; gap:8px; font-family:${MONO}; font-size:12px; }
.f-command .k-move s { color:var(--dim); text-decoration-color:var(--faint); }
.f-command .k-move b { color:var(--fg); font-weight:600; border:1px solid var(--dim); border-radius:3px; padding:1px 6px; }
.f-command .k-edit { font-size:12px; color:var(--dim); text-decoration:underline; text-decoration-color:var(--rule2); text-underline-offset:3px; padding-top:3px; white-space:nowrap; }

.f-command .k-guess { margin:4px 22px 0; padding:10px 12px; border:1px dashed var(--rule2); border-radius:5px; display:grid; grid-template-columns:auto minmax(0,1fr); gap:6px 14px; font-size:12.5px; color:var(--dim); }
.f-command .k-guess dt { font-family:${MONO}; font-size:11.5px; color:var(--fg); }
.f-command .k-guess .hd { grid-column:1 / -1; font-family:${MONO}; font-size:10.5px; text-transform:uppercase; letter-spacing:0.06em; color:var(--faint); }
.f-command .k-foot { display:flex; align-items:center; gap:10px; padding:14px 22px 16px; }
.f-command .k-foot .sp { flex:1; }
.f-command .k-foot .note { color:var(--dim); font-size:12.5px; }
.f-command .k-go { height:34px; padding:0 8px 0 14px; font-size:13.5px; font-weight:600; }

.f-command .k-try { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.f-command .k-try > span { font-size:12.5px; color:var(--dim); margin-right:4px; }
.f-command .k-ex { display:inline-flex; align-items:center; gap:7px; height:28px; padding:0 11px; border:1px solid var(--rule2); border-radius:14px; background:var(--panel); font-family:${MONO}; font-size:11.5px; color:var(--fg); white-space:nowrap; }
.f-command .k-ex em { font-style:normal; color:var(--faint); font-family:'Schibsted Grotesk', sans-serif; font-size:11.5px; }

/* receipt screen */
.f-command .k-two { display:grid; grid-template-columns:minmax(0,1fr) 430px; flex:1; }
.f-command .k-two > aside { border-left:1px solid var(--rule); background:#1e1f23; }
.f-command .k-main { padding:20px 24px 24px; display:flex; flex-direction:column; gap:18px; min-width:0; }
.f-command .k-bar { display:flex; align-items:center; gap:10px; height:50px; padding:0 10px 0 16px; border:1px solid var(--rule2); border-radius:6px; background:var(--panel); font-family:${MONO}; font-size:15px; color:var(--faint); }
.f-command .k-bar.typed { color:var(--fg); border-color:var(--amber); box-shadow:0 0 0 3px var(--amber-wash); }
.f-command .k-bar .k-pr { font-size:17px; }
.f-command .k-bar .sp { flex:1; }
.f-command .k-bar .c-caret { height:18px; width:8px; margin:0 0 0 1px; }
.f-command .k-rc { border:1px solid var(--rule2); border-radius:6px; background:var(--panel); overflow:hidden; }
.f-command .k-rc-h { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--rule); }
.f-command .k-rc-h h2 { font-size:15px; font-weight:700; display:flex; align-items:center; gap:8px; }
.f-command .k-ok { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; background:#9fbf8a; color:#14180f; font:700 11px/1 ${MONO}; }
.f-command .k-rc-h .when { font-family:${MONO}; font-size:11px; color:var(--dim); }
.f-command .k-rc-h .sp { flex:1; }
.f-command .k-said { padding:10px 16px; font-family:${MONO}; font-size:12px; color:var(--dim); border-bottom:1px solid var(--rule); line-height:1.5; }
.f-command .k-said b { color:var(--faint); font-weight:500; margin-right:6px; }
.f-command .k-rows li { display:grid; grid-template-columns:20px 118px minmax(0,1fr) auto; gap:12px; align-items:center; padding:11px 16px; border-bottom:1px solid #26282c; }
.f-command .k-rows li:last-child { border-bottom:0; }
.f-command .k-rows .ck { color:#9fbf8a; font-family:${MONO}; font-size:13px; }
.f-command .k-rows .vb { font-family:${MONO}; font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; }
.f-command .k-rows .ds { display:flex; flex-wrap:wrap; align-items:center; gap:4px 8px; font-size:13.5px; min-width:0; }
.f-command .k-rows .ds .m { color:var(--dim); }
.f-command .k-rc-f { display:flex; align-items:center; gap:12px; padding:10px 16px; border-top:1px solid var(--rule); background:#1d1e22; font-size:12.5px; color:var(--dim); }
.f-command .k-sec-h { font-family:${MONO}; font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; color:var(--faint); margin-bottom:8px; }
.f-command .k-next { display:flex; flex-wrap:wrap; gap:8px; }
.f-command .k-hist li { display:grid; grid-template-columns:52px minmax(0,1fr); gap:12px; padding:9px 0; border-top:1px solid #26282c; }
.f-command .k-hist .tm { font-family:${MONO}; font-size:11px; color:var(--faint); padding-top:1px; }
.f-command .k-hist .cm { font-family:${MONO}; font-size:12px; color:var(--fg); }
.f-command .k-hist .an { font-size:13px; color:var(--dim); margin-top:3px; line-height:1.45; }

/* the updated lead */
.f-command .k-lead { padding:18px 20px; display:flex; flex-direction:column; gap:16px; }
.f-command .k-lead h2 { font-size:19px; font-weight:700; letter-spacing:-0.02em; }
.f-command .k-lead .who { color:var(--dim); font-size:13px; margin-top:3px; }
.f-command .k-track { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:3px; }
.f-command .k-track span { height:6px; border-radius:1px; background:var(--rule2); }
.f-command .k-track span.f { background:var(--dim); }
.f-command .k-track span.now { background:var(--fg); }
.f-command .k-tlab { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:3px; margin-top:5px; font-family:${MONO}; font-size:10.5px; color:var(--faint); }
.f-command .k-tlab .now { color:var(--fg); font-weight:600; }
.f-command .k-kv { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--rule); border:1px solid var(--rule); border-radius:5px; overflow:hidden; }
.f-command .k-kv > div { background:var(--panel); padding:8px 10px; }
.f-command .k-kv dt { font-family:${MONO}; font-size:10px; text-transform:uppercase; letter-spacing:0.06em; color:var(--faint); display:flex; justify-content:space-between; }
.f-command .k-kv dd { font-size:13.5px; margin-top:2px; }
.f-command .k-kv dd.m { font-family:${MONO}; font-size:12.5px; }
.f-command .k-kv > div.chg { background:#2a2720; }
.f-command .k-kv > div.chg dt em { font-style:normal; color:var(--amber); text-transform:none; letter-spacing:0; }
.f-command .k-kv > div.wide { grid-column:1 / -1; }
.f-command .k-mini li { display:grid; grid-template-columns:62px minmax(0,1fr); gap:10px; padding:8px 0; border-top:1px solid #26282c; }
.f-command .k-mini .tm { font-family:${MONO}; font-size:10.5px; color:var(--faint); line-height:1.4; }
.f-command .k-mini .tm b { display:block; color:var(--amber); font-weight:600; }
.f-command .k-mini .bd { font-size:13px; line-height:1.45; }
.f-command .k-mini .bd .ty { font-family:${MONO}; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; border:1px solid var(--rule2); border-radius:3px; padding:1px 5px; margin-right:6px; }
.f-command .k-others li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:1px 10px; padding:7px 0; border-top:1px solid #26282c; }
.f-command .k-others .t { font-weight:600; font-size:13px; }
.f-command .k-others .s { font-family:${MONO}; font-size:11px; color:var(--dim); }
.f-command .k-others .v { font-family:${MONO}; font-size:12px; grid-row:span 2; align-self:center; }

/* ask screen */
.f-command .k-read { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:-6px; }
.f-command .k-read > span { font-size:12.5px; color:var(--dim); margin-right:2px; }
.f-command .k-flt { display:inline-flex; align-items:center; gap:7px; height:28px; padding:0 6px 0 10px; border:1px solid var(--rule2); border-radius:4px; background:var(--raise); font-size:13px; white-space:nowrap; }
.f-command .k-flt i { font-style:normal; font-family:${MONO}; font-size:11px; color:var(--faint); }
.f-command .k-flt b { font-weight:600; }
.f-command .k-flt .x { font-family:${MONO}; font-size:11px; color:var(--faint); padding:0 3px; border-left:1px solid var(--rule2); margin-left:2px; padding-left:6px; }
.f-command .k-flt.add { background:transparent; border-style:dashed; color:var(--dim); padding:0 10px; }
.f-command .k-ans { font-size:22px; line-height:1.35; font-weight:500; letter-spacing:-0.015em; max-width:780px; }
.f-command .k-ans b { font-weight:700; }
.f-command .k-ans .m { font-family:${MONO}; font-size:19px; font-weight:600; letter-spacing:-0.02em; }
.f-command .k-res { border:1px solid var(--rule); border-radius:6px; background:var(--panel); overflow:hidden; }
.f-command .k-res .c-tbl td { padding:10px 10px; }
.f-command .k-res .c-tbl tfoot td { border-bottom:0; border-top:1px solid var(--rule2); background:#1d1e22; font-family:${MONO}; font-size:12px; font-weight:600; }
.f-command .k-res .c-tbl tfoot td.lab { font-family:'Schibsted Grotesk', sans-serif; font-size:12.5px; font-weight:600; color:var(--dim); }
.f-command .k-stg { display:flex; flex-direction:column; gap:4px; }
.f-command .k-near { border:1px dashed var(--rule2); border-radius:6px; }
.f-command .k-near-h { display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px dashed var(--rule2); font-size:13px; }
.f-command .k-near-h b { font-weight:600; }
.f-command .k-near-h span { color:var(--dim); }
.f-command .k-near li { display:grid; grid-template-columns:minmax(0,1fr) 200px 90px 130px; gap:12px; align-items:center; padding:8px 14px; border-bottom:1px solid #26282c; font-size:13px; color:var(--dim); }
.f-command .k-near li:last-child { border-bottom:0; }
.f-command .k-near li .t { color:var(--fg); }
.f-command .k-near li .why { font-family:${MONO}; font-size:11px; color:var(--dim); }
.f-command .k-near li .num { font-family:${MONO}; font-size:12px; text-align:right; }
.f-command .k-near li .act { font-size:12px; text-align:right; text-decoration:underline; text-decoration-color:var(--rule2); text-underline-offset:3px; }

.f-command .k-side { padding:18px 18px 22px; display:flex; flex-direction:column; gap:18px; }
.f-command .k-save { border:1px solid var(--amber); border-radius:6px; background:#25231e; padding:14px; display:flex; flex-direction:column; gap:10px; }
.f-command .k-save h3 { font-size:14px; font-weight:700; }
.f-command .k-save p { font-size:12.5px; color:var(--dim); line-height:1.45; }
.f-command .k-name { display:flex; align-items:center; height:32px; padding:0 10px; border:1px solid var(--rule2); border-radius:4px; background:var(--panel); font-size:13.5px; }
.f-command .k-name .c-caret { height:15px; width:7px; margin-left:1px; }
.f-command .k-opt { display:flex; align-items:flex-start; gap:9px; font-size:12.5px; line-height:1.35; }
.f-command .k-opt .bx { flex:none; width:14px; height:14px; border-radius:3px; border:1px solid var(--dim); margin-top:1px; font:700 9.5px/12px ${MONO}; text-align:center; }
.f-command .k-opt .bx.on { background:var(--fg); border-color:var(--fg); color:var(--bg); }
.f-command .k-opt span.dim { display:block; font-size:11.5px; margin-top:1px; }
.f-command .k-views li { padding:9px 0; border-top:1px solid #26282c; }
.f-command .k-views .hd { display:flex; align-items:baseline; gap:8px; }
.f-command .k-views .hd b { font-size:13px; font-weight:600; }
.f-command .k-views .hd .q { font-family:${MONO}; font-size:11px; color:var(--faint); margin-left:auto; white-space:nowrap; }
.f-command .k-views .say { font-family:${MONO}; font-size:11px; color:var(--dim); margin-top:2px; }
.f-command .k-pipe { margin-top:8px; display:flex; flex-direction:column; gap:5px; }
.f-command .k-pipe div { display:grid; grid-template-columns:82px minmax(0,1fr) 62px; gap:8px; align-items:center; font-size:12px; color:var(--dim); }
.f-command .k-pipe i { display:block; height:8px; border-radius:1px; background:var(--dim); }
.f-command .k-pipe div.hi i { background:var(--fg); }
.f-command .k-pipe div.hi { color:var(--fg); }
.f-command .k-pipe span.m { font-family:${MONO}; font-size:11.5px; text-align:right; color:var(--fg); }
`;

  const NAV = ["Home", "Views", "Contacts", "Reports", "Settings"];

  function chrome(d, h, o) {
    const nav = NAV.map((n, i) => `<a class="${n === o.active ? "on" : ""}"><kbd>${i + 1}</kbd>${h.esc(n)}</a>`).join("");
    return `<div class="c-app">
  <header class="c-top">
    <div class="c-brand">Lead Tracker<i class="c-caret" aria-hidden="true"></i></div>
    <nav class="c-nav" aria-label="Main">${nav}</nav>
    <div class="c-cmd${o.topOn ? " k-top-cmd" : ""}"><span class="c-pr">›</span><span class="ph">${h.esc(o.topText || "Say what happened, or ask a question")}</span><kbd>/</kbd></div>
    <div class="c-who"><div><b>${h.esc(d.org.name)}</b><span>${h.esc(d.viewer.name)} · ${h.esc(d.viewer.role.toLowerCase())}</span></div><a class="c-btn ghost">Sign out</a></div>
  </header>
  ${o.body}
  <footer class="c-status"><span class="mode">${o.mode}</span><span class="path">${o.path}</span>${o.segs.map((s) => `<span>${s}</span>`).join("")}<span class="fill"></span><span class="r">${o.keys}</span><span class="r">utf-8 · eur</span><span class="r">27 Oct 2026 ${o.time}</span></footer>
</div>`;
  }

  const dayNum = (iso) => Math.round(Date.parse(iso.slice(0, 10) + "T00:00:00Z") / 864e5);
  const ago = (iso) => dayNum(NOW) - dayNum(iso);
  const person = (h, n) => `<span class="k-chip"><i>@</i>${h.esc(n)}</span>`;
  const lead = (h, n) => `<span class="k-chip"><i>#</i>${h.esc(n)}</span>`;
  const meter = (p) => `<span class="c-meter" aria-label="${p}% chance">${Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(p / 10) ? "f" : ""}"></i>`).join("")}</span>`;

  // ---------- 1. home, sheet open ----------
  function compose(d, h) {
    const D = d.leads.find((l) => l.id === "l11");
    const segs = [
      { t: "called", cls: "hit", gl: `<span class="k-n">1</span>log a call` },
      { t: "ioana", tail: ",", cls: "ent", gl: person(h, "Ioana Petrescu") },
      { t: "she wants night-shift mode.", cls: "hit", gl: `<span class="k-n">1</span>call note` },
      { t: "move", cls: "hit", gl: `<span class="k-n">2</span>move stage` },
      { t: "dispatch", cls: "ent", gl: lead(h, D.title) },
      { t: "to", cls: "plain", gl: "" },
      { t: "negotiation", tail: ",", cls: "hit", gl: `<span class="k-n">2</span>stage: Negotiation` },
      { t: "remind me", cls: "hit", gl: `<span class="k-n">3</span>new task` },
      { t: "fri", cls: "hit", gl: `<span class="k-n">3</span>Fri 30 Oct` },
      { t: "to send the DPA", cls: "hit", gl: `<span class="k-n">3</span>task text` },
    ];
    const sentence = segs
      .map((s) => `<span class="k-w ${s.cls}"><span class="k-src"><u>${h.esc(s.t)}</u>${s.tail || ""}</span><span class="k-gl">${s.gl}</span></span>`)
      .join("");

    const overdue = d.leads.filter((l) => l.status === "open" && l.closeDate && l.closeDate < NOW);
    const due = Object.entries(d.touch)
      .filter(([, t]) => t.nextDue && t.nextDue <= NOW)
      .map(([id, t]) => ({ l: d.leads.find((x) => x.id === id), t }))
      .sort((a, b) => (a.t.nextDue < b.t.nextDue ? -1 : 1));
    const home = `<div class="k-home">
      <div>
        <div class="k-hello"><h1>Tuesday, 27 October</h1><p>${due.length} follow-ups due · ${overdue.length} leads past their close date</p></div>
        <ul class="k-list">${due
          .map((x) => `<li><span class="t">${h.esc(x.t.next)}</span><span class="v">${h.esc(h.moneyShort(x.l.amount))}</span><span class="s">${h.esc(x.l.title)} · due ${h.esc(h.day(x.t.nextDue))}</span></li>`)
          .join("")}</ul>
      </div>
      <div>
        <div class="k-hello"><h1 style="font-size:15px">Saved views</h1></div>
        <ul class="k-list">
          <li><span class="t">Pipeline by stage</span><span class="v">${h.esc(h.moneyShort(h.total(d.leads.filter((l) => l.status === "open"))))}</span><span class="s">all open leads</span></li>
          <li><span class="t">Closing this month</span><span class="v">2</span><span class="s">close date in October</span></li>
          <li><span class="t">Quiet for 2+ weeks</span><span class="v">4</span><span class="s">no touch in 14 days</span></li>
        </ul>
      </div>
    </div>`;

    const body = `<div class="k-body open">${home}<div class="k-scrim"></div>
      <div class="k-float"><section class="k-sheet" aria-label="Command">
        <div class="k-input">
          <div class="k-lab">Tell me what happened, or ask<span class="r">words I understood are underlined</span></div>
          <div class="k-sent"><span class="k-pr">›</span>${sentence}<span class="k-caretw"><i class="c-caret" aria-hidden="true"></i></span></div>
        </div>
        <div class="k-acts-h"><h2>Here's what I'll do</h2><span>3 changes · untick any you don't want</span></div>
        <ul class="k-acts">
          <li class="on">
            <span class="k-chk">✓</span><span class="k-verb"><span class="k-n">1</span>Log a call</span>
            <div class="k-what">
              <div class="k-line">Call with ${person(h, "Ioana Petrescu")} on ${lead(h, D.title)}</div>
              <div class="k-q">“She wants night-shift mode.”</div>
              <div class="k-meta"><span>when <b>today, 09:41</b></span><span>by <b>you</b></span></div>
            </div>
            <a class="k-edit">Change</a>
          </li>
          <li>
            <span class="k-chk">✓</span><span class="k-verb"><span class="k-n">2</span>Move stage</span>
            <div class="k-what">
              <div class="k-line">${lead(h, D.title)}<span class="k-move"><s>Proposal</s>→<b>Negotiation</b></span></div>
              <div class="k-meta"><span>chance <b>50% → 75%</b></span><span>value <b>${h.esc(h.money(D.amount))}</b></span><span>closes <b>${h.esc(h.day(D.closeDate))}</b></span></div>
            </div>
            <a class="k-edit">Change</a>
          </li>
          <li>
            <span class="k-chk">✓</span><span class="k-verb"><span class="k-n">3</span>New task</span>
            <div class="k-what">
              <div class="k-line"><b>Send the DPA</b></div>
              <div class="k-meta"><span>due <b>Fri 30 Oct, 09:00</b></span><span>for <b>you</b></span><span>on <b>${h.esc(D.title)}</b></span></div>
            </div>
            <a class="k-edit">Change</a>
          </li>
        </ul>
        <dl class="k-guess">
          <div class="hd">Where I guessed</div>
          <dt>“fri”</dt><dd>This Friday, 30 Oct, at 09:00 — your usual reminder time.</dd>
          <dt>“dispatch”</dt><dd>Dispatch console redesign, the only lead with that word in it.</dd>
          <dt>the call</dt><dd>Goes on Dispatch console redesign, not Ioana's other 2 leads, because you mentioned it.</dd>
        </dl>
        <div class="k-foot">
          <span class="note">Nothing changes until you confirm.</span><span class="sp"></span>
          <a class="c-btn ghost">Cancel <kbd>esc</kbd></a>
          <a class="c-btn">Edit sentence</a>
          <a class="c-btn pri k-go">Do these 3 things <kbd>↵</kbd></a>
        </div>
      </section>
      <div class="k-try"><span>Not sure what to type? Try:</span>
        <span class="k-ex">met lucas, he wants v3 by friday</span>
        <span class="k-ex">who haven't I spoken to in 2 weeks?</span>
        <span class="k-ex">new lead: booking audit, fjord stays, 3.2k</span>
        <span class="k-ex">what's closing this month?</span>
      </div></div>
    </div>`;
    return chrome(d, h, {
      active: "Home",
      topOn: true,
      topText: "typing…",
      body,
      mode: "TYPING",
      path: "home",
      segs: ["3 changes found", "nothing saved yet"],
      keys: "<kbd>↵</kbd> do all <kbd>⇥</kbd> next change <kbd>esc</kbd> cancel",
      time: "09:41",
    });
  }

  // ---------- 2. receipt ----------
  function receipt(d, h) {
    const D = d.leads.find((l) => l.id === "l11");
    const said = "called ioana, she wants night-shift mode. move dispatch to negotiation, remind me fri to send the DPA";
    const overdue = d.leads.filter((l) => l.status === "open" && l.closeDate && l.closeDate < NOW);
    const others = d.detail.leads.filter((l) => l.id !== "l11" && !h.stage(l.stageId).is_won).map((l) => d.leads.find((x) => x.id === l.id));
    const stages = d.stages.filter((s) => !s.is_won && !s.is_lost);
    const cur = stages.findIndex((s) => s.id === D.stageId);
    const days = dayNum(D.closeDate) - dayNum(NOW);

    const main = `<div class="k-main">
      <div class="k-bar"><span class="k-pr">›</span><i class="c-caret" aria-hidden="true"></i><span>What happened next?</span><span class="sp"></span><kbd>/</kbd></div>
      <section class="k-rc" aria-label="Receipt">
        <div class="k-rc-h"><h2><span class="k-ok">✓</span>Done · 3 changes saved</h2><span class="when">09:42</span><span class="sp"></span><a class="c-btn">Undo all 3 <kbd>⌘Z</kbd></a></div>
        <div class="k-said"><b>you said</b>${h.esc(said)}</div>
        <ul class="k-rows">
          <li><span class="ck">✓</span><span class="vb">Logged call</span><span class="ds">with Ioana Petrescu<span class="m">·</span>“She wants night-shift mode.”</span><a class="c-btn sm ghost">Undo</a></li>
          <li><span class="ck">✓</span><span class="vb">Moved stage</span><span class="ds">${h.esc(D.title)}<span class="m">Proposal →</span><b>Negotiation</b></span><a class="c-btn sm ghost">Undo</a></li>
          <li><span class="ck">✓</span><span class="vb">Created task</span><span class="ds">Send the DPA<span class="m">· due Fri 30 Oct, 09:00 · you</span></span><a class="c-btn sm ghost">Undo</a></li>
        </ul>
        <div class="k-rc-f">Each change is on the lead's timeline too. Undo stays here until you close the day.</div>
      </section>
      <div>
        <div class="k-sec-h">You might say next</div>
        <div class="k-next">
          <span class="k-ex">email ioana the DPA draft</span>
          <span class="k-ex">push dispatch close to 20 nov</span>
          <span class="k-ex">add ben carter to dispatch</span>
        </div>
      </div>
      <div>
        <div class="k-sec-h">Earlier today</div>
        <ul class="k-hist">
          <li><span class="tm">09:42</span><div><div class="cm">› ${h.esc(said)}</div><div class="an">Logged a call, moved Dispatch console redesign to Negotiation, created 1 task.</div></div></li>
          <li><span class="tm">09:12</span><div><div class="cm">› what's overdue?</div><div class="an">${overdue.length} leads are past their close date: ${overdue.map((l) => `${h.esc(l.title)} (${h.esc(h.day(l.closeDate))})`).join(" and ")}.</div></div></li>
        </ul>
      </div>
    </div>`;

    const side = `<aside><div class="k-lead">
      <div class="k-sec-h" style="margin:0">Lead · updated 09:42</div>
      <div><h2>${h.esc(D.title)}</h2><div class="who">${h.esc(D.contact)} · ${h.esc(D.company)}</div></div>
      <div>
        <div class="k-track">${stages.map((s, i) => `<span class="${i === cur ? "now" : i < cur ? "f" : ""}"></span>`).join("")}</div>
        <div class="k-tlab">${stages.map((s, i) => `<span class="${i === cur ? "now" : ""}">${h.esc(s.name)}</span>`).join("")}</div>
      </div>
      <dl class="k-kv">
        <div class="chg"><dt>Stage <em>changed</em></dt><dd>Negotiation <span class="m dim">· 75%</span></dd></div>
        <div><dt>Value</dt><dd class="m">${h.esc(h.money(D.amount))}</dd></div>
        <div><dt>Closes</dt><dd class="m">${h.esc(h.day(D.closeDate))} <span class="dim">· in ${days} days</span></dd></div>
        <div><dt>Owner</dt><dd>${h.esc(D.owner)}</dd></div>
        <div class="chg wide"><dt>Next step <em>new</em></dt><dd>Send the DPA <span class="m dim">· Fri 30 Oct, 09:00</span></dd></div>
      </dl>
      <div>
        <div class="k-sec-h">Timeline</div>
        <ul class="k-mini">
          <li><span class="tm"><b>new</b>09:42</span><div class="bd"><span class="ty">Call</span>She wants night-shift mode.</div></li>
          <li><span class="tm"><b>new</b>09:42</span><div class="bd">Moved from Proposal to Negotiation</div></li>
          <li><span class="tm">${h.esc(h.day(D.created))}</span><div class="bd dim">Created from ${h.esc(D.source.toLowerCase())}</div></li>
        </ul>
      </div>
      <div>
        <div class="k-sec-h">Ioana's other open leads</div>
        <ul class="k-others">${others
          .map((l) => `<li><span class="t">${h.esc(l.title)}</span><span class="v">${h.esc(h.money(l.amount))}</span><span class="s">${h.esc(h.stage(l.stageId).name)} · closes ${h.esc(h.day(l.closeDate))}</span></li>`)
          .join("")}</ul>
      </div>
    </div></aside>`;

    return chrome(d, h, {
      active: "Home",
      body: `<div class="k-two">${main}${side}</div>`,
      mode: "DONE",
      path: "home",
      segs: ["3 changes saved", "undo all ⌘Z"],
      keys: "<kbd>/</kbd> type <kbd>u</kbd> undo one <kbd>?</kbd> examples",
      time: "09:42",
    });
  }

  // ---------- 3. ask ----------
  function ask(d, h) {
    const open = d.leads.filter((l) => l.status === "open");
    const inNov = (l) => l.closeDate && l.closeDate.slice(0, 7) === "2026-11";
    const hits = open.filter((l) => l.amount > 20000 && inNov(l)).sort((a, b) => (a.closeDate < b.closeDate ? -1 : 1));
    const prob = (l) => h.stage(l.stageId).probability;
    const total = h.total(hits);
    const weighted = hits.reduce((s, l) => s + (l.amount * prob(l)) / 100, 0);
    const stageNames = [...new Set(hits.map((l) => h.stage(l.stageId).name))];

    const near = [
      ...open.filter((l) => inNov(l) && l.amount <= 20000 && l.amount >= 15000).map((l) => ({ l, why: `${h.moneyShort(20000 - l.amount)} under the limit`, act: "Lower to €15k" })),
      ...open.filter((l) => l.amount > 20000 && l.closeDate && !inNov(l) && l.closeDate < "2026-12-15").map((l) => ({ l, why: `closes ${h.day(l.closeDate)}`, act: "Include December" })),
    ];

    const rows = hits
      .map(
        (l) => `<tr>
        <td><div class="nm">${h.esc(l.title)}</div><div class="sub">${h.esc(l.contact)} · ${h.esc(l.company)}</div></td>
        <td><div class="k-stg"><span>${h.esc(h.stage(l.stageId).name)} <span class="m dim">${prob(l)}%</span></span>${meter(prob(l))}</div></td>
        <td class="m">${h.esc(h.day(l.closeDate))}</td>
        <td class="m num">${h.esc(h.money(l.amount))}</td>
        <td class="m num dim">${h.esc(h.money((l.amount * prob(l)) / 100))}</td>
        <td>${h.esc(l.owner)}</td>
      </tr>`,
      )
      .join("");

    const stages = d.stages.filter((s) => !s.is_won && !s.is_lost);
    const max = Math.max(...stages.map((s) => h.total(h.leadsIn(s.id))));
    const pipe = stages
      .map((s) => {
        const v = h.total(h.leadsIn(s.id));
        return `<div class="${s.id === "s4" ? "hi" : ""}"><span>${h.esc(s.name)}</span><i style="width:${Math.round((v / max) * 100)}%"></i><span class="m">${h.esc(h.moneyShort(v))}</span></div>`;
      })
      .join("");
    const quiet = Object.values(d.touch).filter((t) => ago(t.last) >= 14).length;

    const main = `<div class="k-main">
      <div class="k-bar typed"><span class="k-pr">›</span><span>open deals over 20k closing in november</span><i class="c-caret" aria-hidden="true"></i><span class="sp"></span><kbd>↵</kbd></div>
      <div class="k-read"><span>I read this as</span>
        <span class="k-flt"><i>status</i><b>Open</b><span class="x">✕</span></span>
        <span class="k-flt"><i>value</i><b>over €20,000</b><span class="x">✕</span></span>
        <span class="k-flt"><i>closes</i><b>1–30 Nov 2026</b><span class="x">✕</span></span>
        <span class="k-flt"><i>sorted by</i><b>close date</b></span>
        <span class="k-flt add">+ Add a condition</span>
      </div>
      <p class="k-ans"><b>${hits.length} deals</b> match: <span class="m">${h.esc(h.money(total))}</span> in total, <span class="m">${h.esc(h.money(weighted))}</span> if you weight by stage. ${stageNames.length === 1 ? `Both are in ${h.esc(stageNames[0])}.` : ""}</p>
      <div class="k-res">
        <table class="c-tbl">
          <colgroup><col><col style="width:150px"><col style="width:84px"><col style="width:104px"><col style="width:104px"><col style="width:120px"></colgroup>
          <thead><tr><th>Lead</th><th>Stage</th><th>Closes</th><th class="num">Value</th><th class="num">Weighted</th><th>Owner</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td class="lab">Total · ${hits.length} deals</td><td></td><td></td><td class="num">${h.esc(h.money(total))}</td><td class="num">${h.esc(h.money(weighted))}</td><td></td></tr></tfoot>
        </table>
      </div>
      <section class="k-near">
        <div class="k-near-h"><b>Just outside your question</b><span>${near.length} more deals almost match</span></div>
        <ul>${near
          .map(
            (n) => `<li><span class="t">${h.esc(n.l.title)}</span><span class="why">${h.esc(n.why)}</span><span class="num">${h.esc(h.money(n.l.amount))}</span><a class="act">${h.esc(n.act)}</a></li>`,
          )
          .join("")}</ul>
      </section>
    </div>`;

    const side = `<aside><div class="k-side">
      <section class="k-save">
        <h3>Save as a view</h3>
        <p>It stays live: deals join and leave as their value, stage or date changes.</p>
        <div class="k-name">November, over €20k<i class="c-caret" aria-hidden="true"></i></div>
        <div class="k-opt"><span class="bx on">✓</span><div>Pin to Home</div></div>
        <div class="k-opt"><span class="bx"></span><div>Tell me when a deal joins or leaves<span class="dim">One message a day, at most</span></div></div>
        <div style="display:flex;gap:8px;justify-content:flex-end"><a class="c-btn ghost">Not now</a><a class="c-btn pri">Save view <kbd>⌘S</kbd></a></div>
      </section>
      <div>
        <div class="k-sec-h">Your views</div>
        <ul class="k-views">
          <li><div class="hd"><b>Pipeline by stage</b><span class="q">${open.length} · ${h.esc(h.moneyShort(h.total(open)))}</span></div>
            <div class="say">› open leads by stage</div>
            <div class="k-pipe">${pipe}</div></li>
          <li><div class="hd"><b>Quiet for 2+ weeks</b><span class="q">${quiet}</span></div><div class="say">› leads with no touch in 14 days</div></li>
          <li><div class="hd"><b>No owner</b><span class="q">${open.filter((l) => !l.owner).length}</span></div><div class="say">› open leads nobody owns</div></li>
        </ul>
      </div>
    </div></aside>`;

    return chrome(d, h, {
      active: "Views",
      body: `<div class="k-two">${main}${side}</div>`,
      mode: "ASKING",
      path: "views/new",
      segs: [`${hits.length} results · ${h.esc(h.money(total))}`, "not saved"],
      keys: "<kbd>⌘S</kbd> save view <kbd>⇥</kbd> edit filters <kbd>esc</kbd> clear",
      time: "09:50",
    });
  }

  (window.LT_FLOWS = window.LT_FLOWS || []).push({
    id: "command",
    name: "Command line",
    look: "console",
    pitch: "Type what happened the way you'd text a colleague, check what it understood, press Enter — and ask the pipeline questions instead of scrolling a board.",
    problem:
      "After a call you have to visit three places: log the call on the contact, drag the card to a new column, then add a task somewhere else. Most people skip one, so the CRM drifts from reality. And the board only answers one question (what's in each stage); anything else means building a filter.",
    principles: [
      "One box for everything. Write a sentence; it turns into separate changes you can see before anything is saved.",
      "It shows its working: the words it understood are underlined, and every guess (which Friday, which lead) is spelled out in plain words.",
      "Every confirm leaves a receipt with undo, and the updated lead right next to it.",
      "Questions get answers: a sentence, a table with totals, and the deals that almost matched. Any answer can be saved as a live view.",
      "Example prompts are always one glance away, so you never face an empty box.",
    ],
    tradeoffs:
      "It depends on the parsing being right, and a wrong guess costs trust fast; the preview and undo have to be excellent. People who think visually and like to scan a whole board will miss the overview, which here is just one saved view among others.",
    fonts: [],
    css,
    screens: [
      { id: "compose", title: "Say what happened", caption: "Ana types one sentence after her call with Ioana. It becomes three changes she can check and untick before pressing Enter.", render: compose },
      { id: "receipt", title: "Receipt with undo", caption: "What changed, one Undo per change, and the updated lead beside it, so she can see the stage moved and the DPA task is set.", render: receipt },
      { id: "ask", title: "Ask the pipeline", caption: "A question gets a direct answer with totals, the deals that nearly matched, and a way to keep it as a live view.", render: ask },
    ],
  });
})();
