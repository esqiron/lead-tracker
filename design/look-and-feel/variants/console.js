// Console — keyboard-first instrument panel. Graphite ground, one phosphor-amber accent for the cursor.
(function () {
  const MONO = "'Azeret Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  const SANS = "'Schibsted Grotesk', 'Helvetica Neue', Arial, sans-serif";

  const css = `
.v-console { --bg:#1b1c1f; --bar:#151619; --panel:#202226; --raise:#26282d; --rule:#2f3237; --rule2:#3b3e45;
  --fg:#e6e2d8; --dim:#9a968c; --faint:#6f6c66; --amber:#ffb84a; --amber-ink:#1b1408; --amber-wash:rgba(255,184,74,.10); --alert:#f07f69;
  background:var(--bg); color:var(--fg); font-family:${SANS}; font-size:13px; line-height:1.4; min-height:860px; display:flex; flex-direction:column; }
.v-console .c-app { flex:1; display:flex; flex-direction:column; min-height:860px; }
.v-console .m { font-family:${MONO}; font-size:11.5px; letter-spacing:-0.01em; }
.v-console .dim { color:var(--dim); }
.v-console .faint { color:var(--faint); }
.v-console .alert { color:var(--alert); }
.v-console kbd { font:500 10px/1 ${MONO}; color:var(--dim); background:var(--raise); border:1px solid var(--rule2); border-bottom-width:2px; border-radius:3px; padding:3px 4px 2px; min-width:17px; text-align:center; display:inline-block; letter-spacing:0; }
.v-console h1, .v-console h2, .v-console h3, .v-console p, .v-console dl, .v-console dd, .v-console ul { margin:0; padding:0; }
.v-console ul { list-style:none; }
.v-console a { color:inherit; text-decoration:none; }

/* top bar */
.v-console .c-top { display:grid; grid-template-columns:auto auto minmax(0,1fr) auto; align-items:center; gap:18px; height:46px; padding:0 14px; background:var(--bar); border-bottom:1px solid var(--rule); }
.v-console .c-brand { font-weight:700; font-size:14px; letter-spacing:-0.01em; display:flex; align-items:center; gap:2px; white-space:nowrap; }
.v-console .c-caret { display:inline-block; width:7px; height:15px; background:var(--amber); margin-left:3px; transform:translateY(1px); }
.v-console .c-nav { display:flex; gap:2px; }
.v-console .c-nav a { display:flex; align-items:center; gap:7px; padding:6px 10px 6px 7px; color:var(--dim); font-weight:500; border-radius:4px; white-space:nowrap; }
.v-console .c-nav a.on { color:var(--fg); background:var(--raise); box-shadow:inset 0 -2px 0 var(--amber); }
.v-console .c-nav a.on kbd { color:var(--amber); border-color:rgba(255,184,74,.55); }
.v-console .c-cmd { display:flex; align-items:center; gap:9px; height:30px; padding:0 6px 0 10px; border:1px solid var(--rule2); border-radius:5px; background:var(--panel); color:var(--faint); min-width:0; }
.v-console .c-cmd .c-pr { color:var(--amber); font-family:${MONO}; font-size:13px; }
.v-console .c-cmd span.ph { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:${MONO}; font-size:11.5px; }
.v-console .c-who { display:flex; align-items:center; gap:12px; }
.v-console .c-who div { display:flex; flex-direction:column; align-items:flex-end; line-height:1.2; }
.v-console .c-who b { font-weight:600; font-size:12.5px; }
.v-console .c-who span { font-family:${MONO}; font-size:10.5px; color:var(--dim); }

/* buttons + inputs */
.v-console .c-btn { display:inline-flex; align-items:center; gap:8px; height:28px; padding:0 6px 0 10px; border:1px solid var(--rule2); border-radius:4px; background:var(--raise); color:var(--fg); font-weight:500; font-size:12.5px; white-space:nowrap; }
.v-console .c-btn.pri { border-color:var(--amber); color:var(--amber); background:var(--amber-wash); }
.v-console .c-btn.pri kbd { color:var(--amber); border-color:rgba(255,184,74,.5); background:transparent; }
.v-console .c-btn.ghost { background:transparent; }
.v-console .c-btn.danger { color:var(--alert); }
.v-console .c-btn.sm { height:24px; font-size:11.5px; padding:0 8px; }
.v-console .c-field { display:inline-flex; align-items:center; gap:8px; height:28px; padding:0 8px; border:1px solid var(--rule2); border-radius:4px; background:var(--panel); font-family:${MONO}; font-size:11.5px; color:var(--faint); white-space:nowrap; }
.v-console .c-field b { color:var(--fg); font-weight:500; }
.v-console .c-field.search { width:250px; }
.v-console .c-seg { display:inline-flex; border:1px solid var(--rule2); border-radius:4px; overflow:hidden; }
.v-console .c-seg span { display:flex; align-items:center; gap:7px; height:26px; padding:0 6px 0 10px; color:var(--dim); font-weight:500; font-size:12.5px; }
.v-console .c-seg span + span { border-left:1px solid var(--rule2); }
.v-console .c-seg span.on { background:var(--raise); color:var(--fg); }
.v-console .c-tool { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--rule); }
.v-console .c-tool h1 { font-size:19px; font-weight:700; letter-spacing:-0.02em; }
.v-console .c-tool .count { font-family:${MONO}; font-size:11.5px; color:var(--dim); margin-right:6px; }
.v-console .c-tool .sp { flex:1; }

/* pane chrome (tmux-ish borders with a title) */
.v-console .c-ptitle { display:flex; align-items:center; gap:8px; height:28px; padding:0 12px; border-bottom:1px solid var(--rule); font-family:${MONO}; font-size:10.5px; letter-spacing:0.06em; text-transform:uppercase; color:var(--dim); }
.v-console .c-ptitle i { font-style:normal; color:var(--amber); }
.v-console .c-ptitle .r { margin-left:auto; text-transform:none; letter-spacing:0; display:flex; gap:6px; align-items:center; }

/* board lanes */
.v-console .c-lanes { padding:10px 16px 0; display:flex; flex-direction:column; gap:6px; }
.v-console .c-lane { display:grid; grid-template-columns:184px minmax(0,1fr); border:1px solid var(--rule); border-radius:5px; background:var(--panel); }
.v-console .c-lh { padding:9px 12px 8px; border-right:1px solid var(--rule); display:flex; flex-direction:column; gap:4px; }
.v-console .c-ln { display:flex; align-items:center; gap:7px; font-weight:600; font-size:13.5px; }
.v-console .c-ln .n { font-family:${MONO}; font-size:10.5px; color:var(--faint); font-weight:400; }
.v-console .c-tag { font-family:${MONO}; font-size:10px; padding:1px 5px; border-radius:3px; border:1px solid var(--rule2); color:var(--dim); font-weight:500; }
.v-console .c-tag.won { color:var(--fg); border-color:var(--dim); }
.v-console .c-tag.lost { color:var(--alert); border-color:rgba(240,127,105,.5); }
.v-console .c-lsum { display:flex; align-items:baseline; justify-content:space-between; gap:6px; }
.v-console .c-lsum b { font-family:${MONO}; font-weight:500; font-size:13px; }
.v-console .c-meter { display:flex; gap:2px; margin-top:2px; }
.v-console .c-meter i { width:12px; height:4px; background:var(--rule2); border-radius:1px; }
.v-console .c-meter i.f { background:var(--dim); }
.v-console .c-cards { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:6px; padding:6px; align-content:start; }
.v-console .c-card { position:relative; border:1px solid var(--rule2); border-radius:4px; background:var(--raise); padding:7px 10px 7px; display:flex; flex-direction:column; gap:2px; min-width:0; }
.v-console .c-card .t { font-weight:600; font-size:13px; line-height:1.25; }
.v-console .c-card .s { font-family:${MONO}; font-size:10.5px; color:var(--dim); }
.v-console .c-card .f { display:flex; align-items:center; gap:10px; margin-top:4px; font-family:${MONO}; font-size:11px; }
.v-console .c-card .f .amt { font-weight:600; color:var(--fg); }
.v-console .c-card .why { font-family:${MONO}; font-size:10.5px; color:var(--alert); margin-top:2px; }
.v-console .c-own { margin-left:auto; font-family:${MONO}; font-size:10px; font-weight:500; min-width:24px; height:18px; padding:0 4px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--rule2); border-radius:3px; color:var(--fg); }
.v-console .c-own.none { border-style:dashed; color:var(--faint); }
.v-console .c-card.sel { border-color:var(--amber); background:#2d2a22; box-shadow:inset 3px 0 0 var(--amber); }
.v-console .c-card.sel .t { color:var(--amber); }
.v-console .c-cur { position:absolute; top:-8px; right:8px; font:600 9.5px/1 ${MONO}; background:var(--amber); color:var(--amber-ink); padding:3px 5px; border-radius:2px; letter-spacing:0.02em; }
.v-console .c-od { color:var(--alert); font-weight:500; }

/* split pane under the lanes */
.v-console .c-pane2 { margin:10px 16px 12px; border:1px solid var(--rule); border-radius:5px; background:var(--panel); }
.v-console .c-pv { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(0,1fr); }
.v-console .c-pv > div { padding:12px 14px; }
.v-console .c-pv > div + div { border-left:1px solid var(--rule); }
.v-console .c-kv { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px 14px; }
.v-console .c-kv dt { font-family:${MONO}; font-size:10px; text-transform:uppercase; letter-spacing:0.06em; color:var(--faint); }
.v-console .c-kv dd { font-size:12.5px; margin-top:2px; }
.v-console .c-kv dd.m { font-size:12px; }
.v-console .c-last { display:flex; flex-direction:column; gap:5px; }
.v-console .c-last p { color:var(--fg); line-height:1.5; }
.v-console .c-keys { display:flex; flex-wrap:wrap; gap:6px 14px; margin-top:6px; font-size:11.5px; color:var(--dim); }
.v-console .c-keys span { display:inline-flex; align-items:center; gap:5px; }

/* status line */
.v-console .c-status { margin-top:auto; display:flex; align-items:stretch; height:26px; background:var(--bar); border-top:1px solid var(--rule); font-family:${MONO}; font-size:11px; color:var(--dim); white-space:nowrap; }
.v-console .c-status > span { display:flex; align-items:center; padding:0 11px; border-right:1px solid var(--rule); gap:6px; }
.v-console .c-status .mode { background:var(--amber); color:var(--amber-ink); font-weight:600; letter-spacing:0.04em; border-right:0; }
.v-console .c-status .path { color:var(--fg); }
.v-console .c-status .fill { flex:1; border-right:0; }
.v-console .c-status .r { border-right:0; border-left:1px solid var(--rule); }
.v-console .c-status kbd { padding:2px 3px 1px; font-size:9.5px; min-width:14px; border-bottom-width:1px; }

/* contacts */
.v-console .c-split { display:grid; grid-template-columns:214px minmax(0,1fr); flex:1; }
.v-console .c-facets { border-right:1px solid var(--rule); background:var(--bar); padding-bottom:12px; }
.v-console .c-facet { padding:10px 0 4px; }
.v-console .c-facet h3 { display:flex; align-items:center; justify-content:space-between; padding:0 12px 6px; font-family:${MONO}; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.08em; color:var(--faint); }
.v-console .c-facet li { display:flex; align-items:center; gap:8px; padding:3px 12px; font-size:12.5px; color:var(--dim); }
.v-console .c-facet li .k { font-family:${MONO}; font-size:10.5px; color:var(--faint); margin-left:auto; }
.v-console .c-facet li.on { color:var(--fg); background:var(--raise); box-shadow:inset 2px 0 0 var(--fg); }
.v-console .c-facet li .dot { width:6px; height:6px; border:1px solid var(--faint); border-radius:50%; flex:none; }
.v-console .c-facet li.on .dot { background:var(--fg); border-color:var(--fg); }
.v-console .c-tbl { width:100%; border-collapse:collapse; table-layout:fixed; }
.v-console .c-tbl th { text-align:left; height:30px; padding:0 10px; font-family:${MONO}; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.07em; color:var(--faint); border-bottom:1px solid var(--rule); white-space:nowrap; }
.v-console .c-tbl th.num, .v-console .c-tbl td.num { text-align:right; }
.v-console .c-tbl td { padding:7px 10px; border-bottom:1px solid #26282c; vertical-align:middle; }
.v-console .c-tbl td.cur { padding:0 0 0 10px; font-family:${MONO}; color:var(--amber); }
.v-console .c-tbl tr.sel td { background:var(--amber-wash); }
.v-console .c-tbl tr.sel td.cur { box-shadow:inset 3px 0 0 var(--amber); }
.v-console .c-tbl tr.sel .nm { color:var(--amber); }
.v-console .c-tbl .nm { font-weight:600; font-size:13px; }
.v-console .c-tbl .sub { display:flex; flex-wrap:wrap; align-items:center; gap:4px 6px; margin-top:2px; font-size:11.5px; color:var(--dim); }
.v-console .c-hash { font-family:${MONO}; font-size:10px; color:#bdb8ac; background:var(--raise); border:1px solid var(--rule); padding:0 4px; border-radius:2px; }
.v-console .c-dnc { font-family:${MONO}; font-size:10px; color:var(--alert); border:1px solid rgba(240,127,105,.55); padding:0 4px; border-radius:2px; }
.v-console .c-tbl .m { font-size:11.5px; }
.v-console .c-tfoot { display:flex; gap:16px; padding:10px 16px; font-family:${MONO}; font-size:11px; color:var(--faint); }

/* detail */
.v-console .c-dh { display:grid; grid-template-columns:auto auto minmax(0,1fr) auto; align-items:center; gap:16px; padding:12px 16px; border-bottom:1px solid var(--rule); }
.v-console .c-back { display:inline-flex; align-items:center; gap:8px; color:var(--dim); font-weight:500; padding-right:16px; border-right:1px solid var(--rule); height:42px; }
.v-console .c-av { width:42px; height:42px; border-radius:5px; background:var(--raise); border:1px solid var(--rule2); display:flex; align-items:center; justify-content:center; font-family:${MONO}; font-weight:600; font-size:15px; }
.v-console .c-dh h1 { font-size:21px; font-weight:700; letter-spacing:-0.02em; line-height:1.15; }
.v-console .c-dh .who { color:var(--dim); font-size:13px; }
.v-console .c-acts { display:flex; gap:8px; }
.v-console .c-tri { display:grid; grid-template-columns:318px minmax(0,1fr) 336px; flex:1; }
.v-console .c-tri > * + * { border-left:1px solid var(--rule); }
.v-console .c-sec + .c-sec { border-top:1px solid var(--rule); }
.v-console .c-body { padding:10px 12px 14px; }
.v-console .c-dl { display:grid; grid-template-columns:62px minmax(0,1fr); gap:6px 10px; font-size:12.5px; }
.v-console .c-dl dt { font-family:${MONO}; font-size:10.5px; color:var(--faint); padding-top:1px; }
.v-console .c-dl dd { min-width:0; overflow-wrap:anywhere; }
.v-console .c-quote { margin:8px 0 2px; padding:7px 10px; border-left:2px solid var(--rule2); background:var(--panel); font-size:12.5px; line-height:1.45; color:var(--fg); }
.v-console .c-ok { color:var(--fg); }
.v-console .c-ok::before { content:"● "; color:#9fbf8a; font-size:9px; vertical-align:1px; }
.v-console .c-row3 { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
.v-console .c-notes { font-size:12.5px; line-height:1.55; color:var(--fg); }

.v-console .c-comp { padding:12px 14px; border-bottom:1px solid var(--rule); }
.v-console .c-types { display:flex; gap:4px; margin-bottom:8px; }
.v-console .c-types span { display:inline-flex; align-items:center; gap:6px; height:24px; padding:0 5px 0 9px; border:1px solid var(--rule2); border-radius:4px; color:var(--dim); font-weight:500; font-size:12px; }
.v-console .c-types span.on { color:var(--fg); background:var(--raise); border-color:var(--dim); }
.v-console .c-ta { height:66px; border:1px solid var(--rule2); border-radius:4px; background:var(--panel); padding:8px 10px; font-family:${MONO}; font-size:11.5px; color:var(--faint); }
.v-console .c-ta .c-caret { height:13px; width:6px; margin:0 1px 0 0; transform:translateY(2px); }
.v-console .c-cfoot { display:flex; align-items:center; gap:10px; margin-top:8px; }
.v-console .c-cfoot .sp { flex:1; }

.v-console .c-tl li { display:grid; grid-template-columns:76px minmax(0,1fr); gap:12px; padding:10px 14px; border-bottom:1px solid #26282c; position:relative; }
.v-console .c-tl li.sel { background:var(--amber-wash); box-shadow:inset 3px 0 0 var(--amber); }
.v-console .c-tl .when { font-family:${MONO}; font-size:10.5px; color:var(--faint); line-height:1.35; }
.v-console .c-tl .when b { display:block; color:var(--dim); font-weight:500; }
.v-console .c-tl .hd { display:flex; flex-wrap:wrap; align-items:center; gap:4px 8px; font-size:12px; color:var(--dim); }
.v-console .c-tl .ty { font-family:${MONO}; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--fg); border:1px solid var(--rule2); border-radius:3px; padding:1px 5px; }
.v-console .c-tl li.sel .ty { color:var(--amber); border-color:rgba(255,184,74,.55); }
.v-console .c-tl .au { color:var(--fg); font-weight:500; }
.v-console .c-tl .unv { color:var(--alert); font-family:${MONO}; font-size:10.5px; }
.v-console .c-tl .ln { font-family:${MONO}; font-size:10.5px; color:var(--faint); }
.v-console .c-tl .bd { margin-top:4px; font-size:13px; line-height:1.5; }
.v-console .c-tl .bd.done { text-decoration:line-through; text-decoration-color:var(--dim); color:var(--dim); }
.v-console .c-tl li.stage { padding-top:7px; padding-bottom:7px; }
.v-console .c-tl li.stage .mv { font-family:${MONO}; font-size:11px; color:var(--dim); display:flex; flex-wrap:wrap; gap:2px 8px; align-items:center; }
.v-console .c-tl li.stage .mv b { color:var(--fg); font-weight:500; }

.v-console .c-leads li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:2px 10px; padding:8px 12px; border-bottom:1px solid #26282c; }
.v-console .c-leads .lt { font-weight:600; font-size:12.5px; }
.v-console .c-leads .st { font-family:${MONO}; font-size:10.5px; color:var(--dim); }
.v-console .c-leads .v { font-family:${MONO}; font-size:12px; text-align:right; grid-row:span 2; align-self:center; }
.v-console .c-tot { display:grid; grid-template-columns:1fr 1fr; }
.v-console .c-tot div { padding:9px 12px; }
.v-console .c-tot div + div { border-left:1px solid var(--rule); }
.v-console .c-tot span { display:block; font-family:${MONO}; font-size:10px; text-transform:uppercase; letter-spacing:0.07em; color:var(--faint); }
.v-console .c-tot b { font-family:${MONO}; font-size:15px; font-weight:600; }
.v-console .c-tasks li { display:grid; grid-template-columns:16px minmax(0,1fr); gap:10px; padding:10px 12px; border-bottom:1px solid #26282c; }
.v-console .c-box { width:14px; height:14px; border:1px solid var(--dim); border-radius:3px; margin-top:2px; }
.v-console .c-tasks .b { font-size:12.5px; line-height:1.4; }
.v-console .c-tasks .meta { margin-top:4px; display:flex; flex-direction:column; gap:1px; font-family:${MONO}; font-size:10.5px; color:var(--dim); }
.v-console .c-tasks li.od .c-box { border-color:var(--alert); }
`;

  function chrome(d, h, active, body, status) {
    const nav = d.nav
      .map((n, i) => `<a class="${n === active ? "on" : ""}"><kbd>${i + 1}</kbd>${h.esc(n)}</a>`)
      .join("");
    return `<div class="c-app">
  <header class="c-top">
    <div class="c-brand">Lead Tracker<i class="c-caret" aria-hidden="true"></i></div>
    <nav class="c-nav" aria-label="Main">${nav}</nav>
    <div class="c-cmd"><span class="c-pr">›</span><span class="ph">Jump to a lead, contact or command…</span><kbd>⌘K</kbd></div>
    <div class="c-who"><div><b>${h.esc(d.org.name)}</b><span>${h.esc(d.viewer.name)} · ${h.esc(d.viewer.role.toLowerCase())}</span></div><a class="c-btn ghost">Sign out</a></div>
  </header>
  ${body}
  <footer class="c-status">${status}</footer>
</div>`;
  }

  function statusLine(path, segs, keys) {
    return `<span class="mode">NORMAL</span><span class="path">${path}</span>${segs.map((s) => `<span>${s}</span>`).join("")}<span class="fill"></span><span class="r">${keys}</span><span class="r">utf-8 · eur</span><span class="r">28 Oct 2026 09:41</span>`;
  }

  const owner = (h, name) =>
    name ? `<span class="c-own" title="${h.esc(name)}">${h.esc(h.initials(name))}</span>` : `<span class="c-own none" title="Unassigned">—</span>`;

  function meter(p) {
    const f = Math.round(p / 10);
    return `<span class="c-meter" aria-label="${p}% probability">${Array.from({ length: 10 }, (_, i) => `<i class="${i < f ? "f" : ""}"></i>`).join("")}</span>`;
  }

  function board(d, h) {
    const SEL = "l11";
    const open = d.leads.filter((l) => l.status === "open");
    const won = d.leads.filter((l) => l.status === "won");
    const lanes = d.stages
      .map((s, si) => {
        const list = h.leadsIn(s.id);
        const tag = s.is_won ? `<span class="c-tag won">✓ won</span>` : s.is_lost ? `<span class="c-tag lost">✕ lost</span>` : "";
        const cards = list
          .map((l) => {
            const date = l.closeDate
              ? l.overdue
                ? `<span class="c-od">! ${h.esc(h.day(l.closeDate))} overdue</span>`
                : `<span class="dim">${h.esc(h.day(l.closeDate))}</span>`
              : `<span class="faint">no date</span>`;
            return `<div class="c-card${l.id === SEL ? " sel" : ""}">
              ${l.id === SEL ? `<span class="c-cur">j/k ▸</span>` : ""}
              <div class="t">${h.esc(l.title)}</div>
              <div class="s">${h.esc(l.contact)} · ${h.esc(l.company)}</div>
              ${l.lostReason ? `<div class="why">✕ ${h.esc(l.lostReason)}</div>` : ""}
              <div class="f"><span class="amt">${h.esc(h.money(l.amount))}</span>${date}${owner(h, l.owner)}</div>
            </div>`;
          })
          .join("");
        return `<section class="c-lane">
          <div class="c-lh">
            <div class="c-ln"><span class="n">${si + 1}</span>${h.esc(s.name)}${tag}</div>
            <div class="c-lsum"><span class="m dim">${list.length} ${list.length === 1 ? "lead" : "leads"}</span><b>${h.esc(h.money(h.total(list)))}</b></div>
            ${meter(s.probability)}
          </div>
          <div class="c-cards">${cards}</div>
        </section>`;
      })
      .join("");

    const sel = d.leads.find((l) => l.id === SEL);
    const last = d.detail.timeline.find((t) => t.kind === "activity" && t.lead === sel.title);
    const body = `<div class="c-tool">
      <h1>Leads</h1><span class="count">${d.leads.length} leads</span>
      <div class="c-seg"><span class="on">Board <kbd>b</kbd></span><span>Table <kbd>t</kbd></span></div>
      <span class="c-field search"><kbd>/</kbd>Search leads</span>
      <span class="c-field">owner <b>anyone</b> <kbd>o</kbd></span>
      <span class="c-field">source <b>any</b> <kbd>s</kbd></span>
      <span class="sp"></span>
      <a class="c-btn">Export CSV <kbd>⇧E</kbd></a>
      <a class="c-btn pri">New lead <kbd>n</kbd></a>
    </div>
    <div class="c-lanes">${lanes}</div>
    <section class="c-pane2">
      <div class="c-ptitle"><i>2</i> preview — ${h.esc(sel.title)}<span class="r"><kbd>↵</kbd> open <kbd>⌃w</kbd> close pane</span></div>
      <div class="c-pv">
        <div><dl class="c-kv">
          <div><dt>Stage</dt><dd>${h.esc(h.stage(sel.stageId).name)}</dd></div>
          <div><dt>Amount</dt><dd class="m">${h.esc(h.money(sel.amount))}</dd></div>
          <div><dt>Close</dt><dd class="m">${h.esc(h.day(sel.closeDate))}</dd></div>
          <div><dt>Owner</dt><dd>${h.esc(sel.owner)}</dd></div>
          <div><dt>Contact</dt><dd>${h.esc(sel.contact)}</dd></div>
          <div><dt>Company</dt><dd>${h.esc(sel.company)}</dd></div>
          <div><dt>Source</dt><dd>${h.esc(sel.source)}</dd></div>
          <div><dt>Created</dt><dd class="m">${h.esc(h.day(sel.created))}</dd></div>
        </dl></div>
        <div class="c-last">
          <div class="m dim">last · ${h.esc(h.TYPE_LABELS[last.type].toLowerCase())} · ${h.esc(last.author)} · ${h.esc(h.dateTime(last.at))}</div>
          <p>${h.esc(last.body)}</p>
          <div class="c-keys"><span><kbd>m</kbd> move stage</span><span><kbd>a</kbd> assign</span><span><kbd>l</kbd> log activity</span><span><kbd>x</kbd> mark lost</span></div>
        </div>
      </div>
    </section>`;
    return chrome(
      d,
      h,
      "Leads",
      body,
      statusLine(
        "leads/board",
        [`${open.length} open · ${h.esc(h.money(h.total(open)))}`, `won ${h.esc(h.money(h.total(won)))}`, `cursor 4:2`],
        `<kbd>j</kbd><kbd>k</kbd> card <kbd>h</kbd><kbd>l</kbd> lane <kbd>?</kbd> help`,
      ),
    );
  }

  function contacts(d, h) {
    const tagCount = (t) => d.contacts.filter((c) => c.tags.includes(t)).length;
    const ownCount = (n) => d.contacts.filter((c) => c.owner === n).length;
    const facets = `<aside class="c-facets">
      <div class="c-facet"><h3>Tag <kbd>t</kbd></h3><ul>
        <li class="on"><span class="dot"></span>Any tag<span class="k">${d.contacts.length}</span></li>
        ${d.tags.map((t) => `<li><span class="dot"></span>${h.esc(t)}<span class="k">${tagCount(t)}</span></li>`).join("")}
      </ul></div>
      <div class="c-facet"><h3>Owner <kbd>o</kbd></h3><ul>
        <li class="on"><span class="dot"></span>Anyone<span class="k">${d.contacts.length}</span></li>
        ${d.members.map((m) => `<li><span class="dot"></span>${h.esc(m.name)}<span class="k">${ownCount(m.name)}</span></li>`).join("")}
        <li><span class="dot"></span>Unassigned<span class="k">${ownCount("")}</span></li>
      </ul></div>
    </aside>`;
    const rows = d.contacts
      .map((c, i) => {
        const tags = c.tags.map((t) => `<span class="c-hash">#${h.esc(t)}</span>`).join("");
        return `<tr class="${i === 0 ? "sel" : ""}">
          <td class="cur">${i === 0 ? "▸" : ""}</td>
          <td><div class="nm">${h.esc(c.name)}</div><div class="sub">${c.title ? `<span>${h.esc(c.title)}</span>` : `<span class="faint">No title</span>`}${tags}${c.doNotContact ? `<span class="c-dnc">⊘ Do not contact</span>` : ""}</div></td>
          <td class="m">${h.esc(c.email)}</td>
          <td class="m">${c.phone ? h.esc(c.phone) : `<span class="faint">—</span>`}</td>
          <td>${h.esc(c.company)}</td>
          <td>${c.owner ? h.esc(c.owner) : `<span class="faint">Unassigned</span>`}</td>
          <td class="m num">${c.openLeads ? c.openLeads : `<span class="faint">0</span>`}</td>
          <td class="m num dim">${h.esc(h.day(c.added))}</td>
        </tr>`;
      })
      .join("");
    const body = `<div class="c-tool">
      <h1>Contacts</h1><span class="count">${d.contacts.length} contacts</span>
      <span class="c-field search" style="width:300px"><kbd>/</kbd>Search name, email, company</span>
      <span class="sp"></span>
      <a class="c-btn">Import CSV <kbd>⇧I</kbd></a>
      <a class="c-btn">Export CSV <kbd>⇧E</kbd></a>
      <a class="c-btn pri">New contact <kbd>n</kbd></a>
    </div>
    <div class="c-split">${facets}
      <section>
        <table class="c-tbl">
          <colgroup><col style="width:26px"><col style="width:248px"><col style="width:220px"><col style="width:150px"><col style="width:150px"><col style="width:112px"><col style="width:50px"><col></colgroup>
          <thead><tr><th></th><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Owner</th><th class="num">Open</th><th class="num">Added</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="c-tfoot"><span>${d.contacts.length} of ${d.contacts.length} · sorted by name</span><span>1 do-not-contact</span></div>
      </section>
    </div>`;
    return chrome(
      d,
      h,
      "Contacts",
      body,
      statusLine("contacts", [`row 1/${d.contacts.length}`, `filters: none`], `<kbd>j</kbd><kbd>k</kbd> row <kbd>↵</kbd> open <kbd>x</kbd> select`),
    );
  }

  function detail(d, h) {
    const D = d.detail;
    const c = D.contact;
    const p = c.privacy;
    const tl = D.timeline.slice().sort((a, b) => (a.at < b.at ? 1 : -1));
    const selIdx = tl.findIndex((e) => e.kind === "activity");
    const items = tl
      .map((e, i) => {
        const when = `<div class="when"><b>${h.esc(h.day(e.at))}</b>${h.esc(e.at.slice(11, 16))}</div>`;
        if (e.kind === "stage") {
          const mv = e.from
            ? `Moved from <b>${h.esc(e.from)}</b> to <b>${h.esc(e.to)}</b> by ${h.esc(e.actor)}`
            : `Added in <b>${h.esc(e.to)}</b> by ${h.esc(e.actor)}`;
          return `<li class="stage">${when}<div class="mv"><span>→</span><span>${mv}</span><span class="ln">↳ ${h.esc(e.lead)}</span></div></li>`;
        }
        const who = e.source
          ? `<span class="unv">via ${h.esc(e.source)} · unverified</span>`
          : `<span class="au">${h.esc(e.author)}</span>`;
        const done = e.completedAt ? `<span class="m dim">✓ done ${h.esc(h.dateTime(e.completedAt))}</span>` : "";
        return `<li class="${i === selIdx ? "sel" : ""}">${when}<div>
          <div class="hd"><span class="ty">${h.esc(h.TYPE_LABELS[e.type])}</span>${who}${done}<span class="ln">↳ ${h.esc(e.lead)}</span></div>
          <p class="bd${e.completedAt ? " done" : ""}">${h.esc(e.body)}</p>
        </div></li>`;
      })
      .join("");

    const leads = D.leads
      .map((l) => `<li><span class="lt">${h.esc(l.title)}</span><span class="v">${h.esc(h.money(l.amount))}</span><span class="st">${h.esc(h.stage(l.stageId).name)}${h.stage(l.stageId).is_won ? " ✓" : ""}</span></li>`)
      .join("");
    const tasks = D.openTasks
      .map(
        (t) => `<li class="${t.overdue ? "od" : ""}"><span class="c-box" aria-label="Mark done"></span><div>
          <div class="b">${h.esc(t.body)}</div>
          <div class="meta"><span class="${t.overdue ? "alert" : ""}">${t.overdue ? "! overdue · " : "due "}${h.esc(h.dateTime(t.due))}</span><span>${h.esc(t.assignee)} · ↳ ${h.esc(t.lead)}</span></div>
        </div></li>`,
      )
      .join("");

    const body = `<div class="c-dh">
      <a class="c-back">← Contacts <kbd>esc</kbd></a>
      <div class="c-av">${h.esc(h.initials(c.name))}</div>
      <div><h1>${h.esc(c.name)}</h1><div class="who">${h.esc(c.title)} at ${h.esc(c.company)}</div></div>
      <div class="c-acts"><a class="c-btn pri">New lead <kbd>n</kbd></a><a class="c-btn">Edit <kbd>e</kbd></a><a class="c-btn danger">Delete <kbd>⇧D</kbd></a></div>
    </div>
    <div class="c-tri">
      <aside>
        <section class="c-sec"><div class="c-ptitle"><i>1</i> details</div><div class="c-body"><dl class="c-dl">
          <dt>email</dt><dd class="m">${h.esc(c.email)}</dd>
          <dt>phone</dt><dd class="m">${h.esc(c.phone)}</dd>
          <dt>company</dt><dd>${h.esc(c.company)}</dd>
          <dt>owner</dt><dd>${h.esc(c.owner)}</dd>
          <dt>tags</dt><dd>${c.tags.map((t) => `<span class="c-hash">#${h.esc(t)}</span>`).join(" ")}</dd>
          <dt>added</dt><dd class="m">${h.esc(h.day(c.added))}</dd>
        </dl></div></section>
        <section class="c-sec"><div class="c-ptitle"><i>2</i> privacy</div><div class="c-body"><dl class="c-dl">
          <dt>basis</dt><dd>${h.esc(p.lawfulBasis)}</dd>
          <dt>consent</dt><dd>Given ${h.esc(h.day(p.consent.given))} · via ${h.esc(p.consent.source)}</dd>
          <dt>contact</dt><dd>${p.contactAllowed ? `<span class="c-ok">Allowed</span>` : `<span class="alert">Not allowed</span>`}</dd>
        </dl>
        <p class="c-quote">“${h.esc(p.consent.text)}”</p>
        <div class="c-row3"><a class="c-btn sm">Withdraw consent</a><a class="c-btn sm danger">Stop contact</a><a class="c-btn sm">Export data</a></div>
        </div></section>
        <section class="c-sec"><div class="c-ptitle"><i>3</i> notes</div><div class="c-body"><p class="c-notes">${h.esc(c.notes)}</p></div></section>
      </aside>
      <section>
        <div class="c-comp">
          <div class="c-types"><span class="on">Note <kbd>1</kbd></span><span>Call <kbd>2</kbd></span><span>Email <kbd>3</kbd></span><span>Meeting <kbd>4</kbd></span><span>Task <kbd>5</kbd></span></div>
          <div class="c-ta"><i class="c-caret" aria-hidden="true"></i>What happened with ${h.esc(c.name.split(" ")[0])}?</div>
          <div class="c-cfoot"><span class="m faint">link to lead: <span class="dim">none</span> <kbd>⇥</kbd></span><span class="sp"></span><a class="c-btn pri">Log activity <kbd>⌘↵</kbd></a></div>
        </div>
        <div class="c-ptitle"><i>4</i> timeline<span class="r">${tl.length} events · newest first</span></div>
        <ul class="c-tl">${items}</ul>
      </section>
      <aside>
        <section class="c-sec"><div class="c-ptitle"><i>5</i> leads<span class="r">${D.leads.length}</span></div>
          <ul class="c-leads">${leads}</ul>
          <div class="c-tot"><div><span>Open</span><b>${h.esc(h.money(D.openValue))}</b></div><div><span>Won</span><b>${h.esc(h.money(D.wonValue))}</b></div></div>
        </section>
        <section class="c-sec"><div class="c-ptitle"><i>6</i> open tasks<span class="r">${D.openTasks.length}</span></div><ul class="c-tasks">${tasks}</ul></section>
      </aside>
    </div>`;
    return chrome(
      d,
      h,
      "Contacts",
      body,
      statusLine(
        `contacts/${h.esc(c.name.toLowerCase().replace(/\s+/g, "-"))}`,
        [`${D.leads.length} leads`, `${D.openTasks.length} tasks · 1 overdue`, `event 1/${tl.length}`],
        `<kbd>j</kbd><kbd>k</kbd> event <kbd>i</kbd> log <kbd>esc</kbd> back`,
      ),
    );
  }

  (window.LT_VARIANTS = window.LT_VARIANTS || []).push({
    id: "console",
    name: "Console",
    concept:
      "A keyboard-first instrument panel: graphite panes, a tmux-style status line and one phosphor-amber cursor, so a builder-in-public CRM feels like the tools its users already live in.",
    fonts: ["Azeret+Mono:wght@400;500;600", "Schibsted+Grotesk:wght@400;500;600;700"],
    tokens: {
      color: [
        { name: "Graphite", value: "#1b1c1f" },
        { name: "Pane", value: "#202226" },
        { name: "Phosphor amber", value: "#ffb84a" },
        { name: "Bone", value: "#e6e2d8" },
        { name: "Ash", value: "#9a968c" },
        { name: "Rule", value: "#2f3237" },
        { name: "Overdue", value: "#f07f69" },
      ],
      type: [
        { role: "Labels & titles", family: SANS, sample: "Negotiation", style: "font-weight:700;letter-spacing:-0.02em" },
        { role: "Data & keys", family: MONO, sample: "€27,500 · 3 Nov", style: "font-weight:500" },
      ],
      spacing: "2px base; 4/6/10/12/16 scale; 46px top bar, 26px status line, 28px controls and pane titles",
      shape: "3–5px radius on controls and panes; 1px rules split panes; keycap chips with a 2px bottom edge",
      signature: "The amber j/k cursor riding a lane card or row, echoed by the amber NORMAL block in a tmux-style status line.",
    },
    css,
    render: { board, contacts, detail },
  });
})();
