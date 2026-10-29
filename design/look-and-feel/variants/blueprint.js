// Blueprint — the CRM as a declassified engineering drawing set on cyanotype paper.
(function () {
  const DISP = "'Big Shoulders Display', 'Arial Narrow', 'Helvetica Neue Condensed', Impact, sans-serif";
  const MONO = "'Martian Mono', ui-monospace, 'SF Mono', Menlo, monospace";
  const BODY = "'Barlow', 'DIN Alternate', 'Helvetica Neue', Arial, sans-serif";

  const css = `
.v-blueprint { --ink:#164a8a; --ink-deep:#103b72; --line:#eef4ff; --line2:rgba(238,244,255,.55); --line3:rgba(238,244,255,.28); --soft:#b3cbea; --red:#ff8a6e;
  box-sizing:border-box; position:relative; padding:30px; min-height:900px; color:var(--line); font-family:${BODY}; font-size:14px; line-height:1.35;
  background-color:var(--ink);
  background-image:
    linear-gradient(rgba(238,244,255,.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(238,244,255,.13) 1px, transparent 1px),
    linear-gradient(rgba(238,244,255,.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(238,244,255,.055) 1px, transparent 1px);
  background-size:80px 80px, 80px 80px, 16px 16px, 16px 16px;
  background-position:-1px -1px; }
.v-blueprint * { border-radius:0; }
.v-blueprint h1, .v-blueprint h2, .v-blueprint h3, .v-blueprint p, .v-blueprint dl, .v-blueprint dd, .v-blueprint ul, .v-blueprint ol { margin:0; padding:0; }
.v-blueprint ul, .v-blueprint ol { list-style:none; }
.v-blueprint a { color:inherit; text-decoration:none; }
.v-blueprint .mono, .v-blueprint .lbl { font-family:${MONO}; font-stretch:75%; }
.v-blueprint .lbl { font-size:9px; letter-spacing:0.12em; text-transform:uppercase; color:var(--soft); font-weight:400; }
.v-blueprint .red { color:var(--red); }

/* print furniture: crop + registration marks */
.v-blueprint .b-crop { position:absolute; width:18px; height:18px; }
.v-blueprint .b-crop::before, .v-blueprint .b-crop::after { content:""; position:absolute; background:var(--line); }
.v-blueprint .b-crop::before { width:18px; height:1px; }
.v-blueprint .b-crop::after { width:1px; height:18px; }
.v-blueprint .b-crop.tl { top:4px; left:4px; } .v-blueprint .b-crop.tl::before { top:18px; left:0; } .v-blueprint .b-crop.tl::after { left:18px; top:0; }
.v-blueprint .b-crop.tr { top:4px; right:4px; } .v-blueprint .b-crop.tr::before { top:18px; right:0; } .v-blueprint .b-crop.tr::after { right:18px; top:0; }
.v-blueprint .b-crop.bl { bottom:4px; left:4px; } .v-blueprint .b-crop.bl::before { bottom:18px; left:0; } .v-blueprint .b-crop.bl::after { left:18px; bottom:0; }
.v-blueprint .b-crop.br { bottom:4px; right:4px; } .v-blueprint .b-crop.br::before { bottom:18px; right:0; } .v-blueprint .b-crop.br::after { right:18px; bottom:0; }
.v-blueprint .b-reg { position:absolute; width:22px; height:22px; color:var(--line); }
.v-blueprint .b-reg.t { top:4px; left:calc(50% - 11px); } .v-blueprint .b-reg.b { bottom:4px; left:calc(50% - 11px); }
.v-blueprint .b-reg.l { left:4px; top:calc(50% - 11px); } .v-blueprint .b-reg.r { right:4px; top:calc(50% - 11px); }
.v-blueprint .b-slug { position:absolute; top:9px; left:44px; font-family:${MONO}; font-stretch:75%; font-size:8.5px; letter-spacing:0.14em; color:var(--soft); text-transform:uppercase; }
.v-blueprint .b-slug.r { left:auto; right:44px; }

/* the drawing sheet with zone rulers */
.v-blueprint .b-sheet { border:2px solid var(--line); display:grid; grid-template-columns:18px minmax(0,1fr) 18px; grid-template-rows:18px auto 18px; }
.v-blueprint .b-rx { display:grid; grid-template-columns:repeat(8,1fr); }
.v-blueprint .b-rx span, .v-blueprint .b-ry span { font-family:${MONO}; font-stretch:75%; font-size:9px; color:var(--soft); display:flex; align-items:center; justify-content:center; }
.v-blueprint .b-rx span + span { border-left:1px solid var(--line2); }
.v-blueprint .b-ry { display:grid; grid-template-rows:repeat(6,1fr); }
.v-blueprint .b-ry span + span { border-top:1px solid var(--line2); }
.v-blueprint .b-in { border:1px solid var(--line); background:transparent; min-width:0; display:flex; flex-direction:column; }
.v-blueprint .solid { background:var(--ink); }

/* header strip */
.v-blueprint .b-head { display:grid; grid-template-columns:250px minmax(0,1fr) 290px; border-bottom:1px solid var(--line); background:var(--ink); }
.v-blueprint .b-brand { padding:10px 14px 9px; display:flex; flex-direction:column; justify-content:center; gap:4px; }
.v-blueprint .b-brand b { font-family:${DISP}; font-weight:900; font-size:30px; line-height:0.85; letter-spacing:0.01em; text-transform:uppercase; }
.v-blueprint .b-nav { display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); border-left:1px solid var(--line); }
.v-blueprint .b-nav a { padding:10px 12px; display:flex; flex-direction:column; justify-content:space-between; gap:6px; }
.v-blueprint .b-nav a + a { border-left:1px solid var(--line2); }
.v-blueprint .b-nav a b { font-family:${MONO}; font-stretch:87.5%; font-weight:500; font-size:11.5px; letter-spacing:0.08em; text-transform:uppercase; }
.v-blueprint .b-nav a.on { background:var(--line); color:var(--ink); }
.v-blueprint .b-nav a.on .lbl { color:var(--ink); }
.v-blueprint .b-who { border-left:1px solid var(--line); display:grid; grid-template-columns:1fr auto; }
.v-blueprint .b-who dl { padding:8px 12px; display:grid; grid-template-columns:44px 1fr; gap:3px 8px; align-content:center; }
.v-blueprint .b-who dd { font-size:13px; font-weight:500; }
.v-blueprint .b-out { border-left:1px solid var(--line2); display:flex; align-items:center; padding:0 12px; font-family:${MONO}; font-stretch:75%; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; }

/* title row */
.v-blueprint .b-title { display:grid; grid-template-columns:minmax(0,1fr) 430px; border-bottom:1px solid var(--line); }
.v-blueprint .b-tleft { display:flex; align-items:flex-end; gap:22px; padding:18px 20px 14px; }
.v-blueprint .b-giant { font-family:${DISP}; font-weight:900; font-size:176px; line-height:0.74; letter-spacing:-0.03em; }
.v-blueprint .b-word { display:flex; flex-direction:column; gap:8px; padding-bottom:2px; }
.v-blueprint .b-word h1 { font-family:${DISP}; font-weight:900; font-size:64px; line-height:0.8; text-transform:uppercase; letter-spacing:0; }
.v-blueprint .b-word .meta { display:flex; flex-wrap:wrap; gap:4px 16px; }
.v-blueprint .b-word .meta span { font-family:${MONO}; font-stretch:75%; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; }
.v-blueprint .b-rev { border-left:1px solid var(--line); display:flex; flex-direction:column; background:var(--ink); }
.v-blueprint .b-rev table { width:100%; border-collapse:collapse; }
.v-blueprint .b-rev th { font-family:${MONO}; font-stretch:75%; font-size:9px; font-weight:400; letter-spacing:0.12em; color:var(--soft); text-align:left; padding:5px 8px; border-bottom:1px solid var(--line); }
.v-blueprint .b-rev td { padding:6px 8px; border-bottom:1px solid var(--line3); font-size:12px; vertical-align:top; }
.v-blueprint .b-rev td.mono { font-size:10px; }
.v-blueprint .b-rev th + th, .v-blueprint .b-rev td + td { border-left:1px solid var(--line3); }
.v-blueprint .b-rev .cap { padding:6px 8px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; }

/* toolbar as a row of form fields */
.v-blueprint .b-tools { display:grid; border-bottom:1px solid var(--line); background:var(--ink); }
.v-blueprint .b-f { padding:7px 12px 8px; display:flex; flex-direction:column; gap:5px; min-width:0; }
.v-blueprint .b-f + .b-f { border-left:1px solid var(--line); }
.v-blueprint .b-f .v { font-family:${MONO}; font-stretch:87.5%; font-size:11.5px; letter-spacing:0.04em; text-transform:uppercase; display:flex; align-items:center; gap:10px; white-space:nowrap; }
.v-blueprint .b-f .ph { color:var(--soft); text-transform:none; letter-spacing:0; border-bottom:1px dashed var(--line2); flex:1; padding-bottom:1px; }
.v-blueprint .b-opt { display:inline-flex; align-items:center; gap:6px; color:var(--soft); }
.v-blueprint .b-opt i { width:10px; height:10px; border:1px solid currentColor; display:inline-block; }
.v-blueprint .b-opt.on { color:var(--line); }
.v-blueprint .b-opt.on i { background:var(--line); }
.v-blueprint .b-act { display:flex; align-items:center; justify-content:center; gap:8px; font-family:${MONO}; font-stretch:87.5%; font-weight:500; font-size:11.5px; letter-spacing:0.08em; text-transform:uppercase; white-space:nowrap; padding:0 12px; }
.v-blueprint .b-act + .b-act, .v-blueprint .b-f + .b-act { border-left:1px solid var(--line); }
.v-blueprint .b-act.pri { background:var(--line); color:var(--ink); }
.v-blueprint .b-act.del { color:var(--red); }

/* board: six stage columns */
.v-blueprint .b-board { display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); border-bottom:1px solid var(--line); flex:1; }
.v-blueprint .b-col { display:flex; flex-direction:column; min-width:0; }
.v-blueprint .b-col + .b-col { border-left:1px solid var(--line); }
.v-blueprint .b-ch { background:var(--ink); padding:10px 10px 8px; border-bottom:1px solid var(--line); display:flex; flex-direction:column; gap:6px; }
.v-blueprint .b-ch .top { display:flex; justify-content:space-between; align-items:flex-start; }
.v-blueprint .b-num { font-family:${DISP}; font-weight:900; font-size:104px; line-height:0.76; letter-spacing:-0.04em; margin-top:4px; }
.v-blueprint .b-sn { font-family:${MONO}; font-stretch:87.5%; font-weight:700; font-size:13px; letter-spacing:0.12em; text-transform:uppercase; display:flex; align-items:center; gap:8px; }
.v-blueprint .b-stamp { font-family:${MONO}; font-stretch:75%; font-size:9px; letter-spacing:0.12em; text-transform:uppercase; white-space:nowrap; line-height:1.2; border:1px solid currentColor; padding:2px 4px 1px; font-weight:500; }
.v-blueprint .b-stamp.won { background:var(--line); color:var(--ink); border-color:var(--line); }
.v-blueprint .b-stamp.lost { color:var(--red); }
.v-blueprint .b-dim { display:flex; align-items:center; gap:6px; height:16px; position:relative; padding:0 1px; }
.v-blueprint .b-dim::before, .v-blueprint .b-dim::after { content:""; position:absolute; top:0; bottom:0; width:1px; background:var(--line); }
.v-blueprint .b-dim::before { left:0; } .v-blueprint .b-dim::after { right:0; }
.v-blueprint .b-dim i { flex:1; height:1px; background:var(--line); position:relative; }
.v-blueprint .b-dim i:first-child::before, .v-blueprint .b-dim i:last-child::after { content:""; position:absolute; top:-3px; border:3.5px solid transparent; }
.v-blueprint .b-dim i:first-child::before { left:0; border-right:6px solid var(--line); border-left:0; }
.v-blueprint .b-dim i:last-child::after { right:0; border-left:6px solid var(--line); border-right:0; }
.v-blueprint .b-dim b { font-family:${MONO}; font-stretch:87.5%; font-weight:500; font-size:11.5px; letter-spacing:0.02em; }
.v-blueprint .b-parts { padding:10px 8px 14px; display:flex; flex-direction:column; gap:10px; }
.v-blueprint .b-part { background:var(--ink); border:1px solid var(--line); position:relative; }
.v-blueprint .b-part .pid { display:flex; justify-content:space-between; align-items:center; padding:4px 7px; border-bottom:1px solid var(--line3); }
.v-blueprint .b-part .pid span { font-family:${MONO}; font-stretch:75%; font-size:9.5px; letter-spacing:0.1em; }
.v-blueprint .b-own { font-family:${MONO}; font-stretch:75%; font-size:9.5px; font-weight:700; letter-spacing:0.06em; border:1px solid var(--line); padding:1px 4px 0; min-width:24px; text-align:center; }
.v-blueprint .b-own.none { border-style:dashed; border-color:var(--line2); color:var(--soft); font-weight:400; }
.v-blueprint .b-part .pt { padding:7px 8px 0; font-weight:600; font-size:14.5px; line-height:1.15; }
.v-blueprint .b-part .pc { padding:3px 8px 8px; font-size:12px; color:var(--soft); line-height:1.25; }
.v-blueprint .b-part .pf { display:flex; justify-content:space-between; align-items:baseline; gap:6px; padding:5px 8px 6px; border-top:1px dashed var(--line2); }
.v-blueprint .b-part .amt { font-family:${DISP}; font-weight:700; font-size:23px; line-height:1; letter-spacing:0.01em; }
.v-blueprint .b-part .dt { font-family:${MONO}; font-stretch:75%; font-size:10px; letter-spacing:0.04em; text-align:right; }
.v-blueprint .b-part.od { border:1.5px dashed var(--red); }
.v-blueprint .b-delta { display:flex; align-items:center; gap:6px; padding:4px 8px; border-top:1px solid var(--red); color:var(--red); font-family:${MONO}; font-stretch:75%; font-size:9.5px; letter-spacing:0.1em; text-transform:uppercase; }
.v-blueprint .b-delta svg { flex:none; }
.v-blueprint .b-reason { padding:5px 8px 6px; border-top:1px solid var(--red); color:var(--red); font-size:12px; line-height:1.25; }
.v-blueprint .b-reason .lbl { color:var(--red); display:block; margin-bottom:1px; }

/* foot: notes + title block */
.v-blueprint .b-foot { display:grid; grid-template-columns:minmax(0,1fr) 470px; background:var(--ink); }
.v-blueprint .b-notes { padding:10px 14px; display:flex; flex-direction:column; gap:5px; }
.v-blueprint .b-notes ol { display:flex; flex-direction:column; gap:3px; font-family:${MONO}; font-stretch:75%; font-size:10px; letter-spacing:0.05em; text-transform:uppercase; counter-reset:n; }
.v-blueprint .b-notes li { counter-increment:n; }
.v-blueprint .b-notes li::before { content:counter(n) ". "; color:var(--soft); }
.v-blueprint .b-tb { border-left:2px solid var(--line); display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); }
.v-blueprint .b-tb > div { padding:5px 8px 6px; border-left:1px solid var(--line2); border-top:1px solid var(--line2); display:flex; flex-direction:column; gap:3px; min-width:0; }
.v-blueprint .b-tb > div.w2 { grid-column:span 2; } .v-blueprint .b-tb > div.w4 { grid-column:span 4; border-top:0; }
.v-blueprint .b-tb > div.l0 { border-left:0; }
.v-blueprint .b-tb b { font-family:${MONO}; font-stretch:87.5%; font-weight:500; font-size:11px; letter-spacing:0.06em; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.v-blueprint .b-tb .big b { font-family:${DISP}; font-weight:900; font-size:26px; line-height:0.9; letter-spacing:0.01em; }

/* contacts schedule */
.v-blueprint .b-legend { border-left:1px solid var(--line); background:var(--ink); padding:10px 14px; display:flex; flex-direction:column; gap:8px; }
.v-blueprint .b-legend ul { display:grid; grid-template-columns:auto 1fr; gap:6px 12px; align-items:center; font-family:${MONO}; font-stretch:75%; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; }
.v-blueprint .b-sch { width:100%; border-collapse:collapse; table-layout:fixed; background:var(--ink); }
.v-blueprint .b-sch th { font-family:${MONO}; font-stretch:75%; font-size:9px; font-weight:400; letter-spacing:0.12em; color:var(--soft); text-transform:uppercase; text-align:left; padding:7px 10px; border-bottom:1px solid var(--line); }
.v-blueprint .b-sch th + th, .v-blueprint .b-sch td + td { border-left:1px solid var(--line3); }
.v-blueprint .b-sch td { padding:8px 10px; border-bottom:1px solid var(--line3); vertical-align:middle; }
.v-blueprint .b-sch td.mono { font-size:11px; letter-spacing:0.01em; }
.v-blueprint .b-sch .mk { font-family:${MONO}; font-stretch:75%; font-size:10px; letter-spacing:0.1em; color:var(--soft); }
.v-blueprint .b-sch .nm { font-weight:600; font-size:15px; line-height:1.15; }
.v-blueprint .b-sch .ti { font-size:12.5px; color:var(--soft); margin-top:1px; }
.v-blueprint .b-sch .tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
.v-blueprint .b-tag { font-family:${MONO}; font-stretch:75%; font-size:9.5px; letter-spacing:0.08em; text-transform:uppercase; border:1px solid var(--line2); padding:1px 4px 0; }
.v-blueprint .b-dnc { font-family:${MONO}; font-stretch:75%; font-size:9.5px; letter-spacing:0.1em; text-transform:uppercase; color:var(--red); border:1px solid var(--red); padding:1px 4px 0; font-weight:500; }
.v-blueprint .b-sch tr.dnc td { background:repeating-linear-gradient(135deg, transparent 0 9px, rgba(255,138,110,.08) 9px 10px); }
.v-blueprint .b-sch .open { font-family:${DISP}; font-weight:900; font-size:30px; line-height:0.9; text-align:right; }
.v-blueprint .b-sch .open.z { color:var(--line3); }
.v-blueprint .b-sch th.r { text-align:right; }
.v-blueprint .b-sch .co { font-weight:500; }

/* detail */
.v-blueprint .b-dbar { display:grid; grid-template-columns:180px minmax(0,1fr) repeat(3, auto); border-bottom:1px solid var(--line); background:var(--ink); }
.v-blueprint .b-dbar .b-act { padding:0 18px; height:40px; }
.v-blueprint .b-dbar .back { justify-content:flex-start; border-right:1px solid var(--line); }
.v-blueprint .b-dbar .doc { display:flex; align-items:center; padding:0 14px; gap:14px; }
.v-blueprint .b-hero { display:grid; grid-template-columns:184px minmax(0,1fr) 360px; border-bottom:1px solid var(--line); }
.v-blueprint .b-av { margin:18px; width:148px; height:148px; border:2px solid var(--line); position:relative; display:flex; align-items:center; justify-content:center; background:var(--ink); font-family:${DISP}; font-weight:900; font-size:96px; letter-spacing:-0.02em; line-height:1; }
.v-blueprint .b-av::before, .v-blueprint .b-av::after { content:""; position:absolute; background:var(--line3); }
.v-blueprint .b-av::before { left:-12px; right:-12px; top:50%; height:1px; }
.v-blueprint .b-av::after { top:-12px; bottom:-12px; left:50%; width:1px; }
.v-blueprint .b-av span { position:relative; z-index:1; background:var(--ink); padding:0 4px; }
.v-blueprint .b-who2 { padding:22px 10px 18px 6px; display:flex; flex-direction:column; justify-content:flex-end; gap:10px; }
.v-blueprint .b-who2 h1 { font-family:${DISP}; font-weight:900; font-size:92px; line-height:0.8; text-transform:uppercase; letter-spacing:-0.01em; }
.v-blueprint .b-who2 .sub { font-size:19px; font-weight:500; }
.v-blueprint .b-who2 .sub span { color:var(--soft); font-weight:400; }
.v-blueprint .b-vals { border-left:1px solid var(--line); display:grid; grid-template-rows:1fr 1fr; background:var(--ink); }
.v-blueprint .b-vals > div { padding:12px 16px; display:flex; justify-content:space-between; align-items:flex-end; }
.v-blueprint .b-vals > div + div { border-top:1px solid var(--line); }
.v-blueprint .b-vals b { font-family:${DISP}; font-weight:900; font-size:72px; line-height:0.78; letter-spacing:-0.02em; }
.v-blueprint .b-vals > div + div b { font-size:52px; color:var(--soft); }
.v-blueprint .b-dbody { display:grid; grid-template-columns:minmax(0,1fr) 400px; flex:1; }
.v-blueprint .b-main { display:flex; flex-direction:column; min-width:0; }
.v-blueprint .b-side { border-left:1px solid var(--line); display:flex; flex-direction:column; min-width:0; background:var(--ink); }
.v-blueprint .b-sh { display:flex; align-items:center; justify-content:space-between; padding:7px 14px; border-bottom:1px solid var(--line); background:var(--ink); }
.v-blueprint .b-sh h2 { font-family:${MONO}; font-stretch:87.5%; font-weight:700; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; }
.v-blueprint .b-block { border-bottom:1px solid var(--line); }
.v-blueprint .b-bom { width:100%; border-collapse:collapse; background:var(--ink); }
.v-blueprint .b-bom th { font-family:${MONO}; font-stretch:75%; font-size:9px; font-weight:400; letter-spacing:0.12em; color:var(--soft); text-transform:uppercase; text-align:left; padding:5px 14px; border-bottom:1px solid var(--line3); }
.v-blueprint .b-bom td { padding:7px 14px; border-bottom:1px solid var(--line3); }
.v-blueprint .b-bom .r { text-align:right; }
.v-blueprint .b-bom td.mono { font-size:10.5px; letter-spacing:0.08em; text-transform:uppercase; }
.v-blueprint .b-bom td.val { font-family:${DISP}; font-weight:700; font-size:20px; line-height:1; text-align:right; }
.v-blueprint .b-bom tfoot td { border-bottom:0; border-top:3px double var(--line); font-family:${MONO}; font-stretch:75%; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; }
.v-blueprint .b-bom tfoot tr.won td { border-top:1px solid var(--line3); }
.v-blueprint .b-bom tfoot td.val { font-family:${DISP}; font-size:22px; letter-spacing:0.01em; }
.v-blueprint .b-comp { padding:12px 14px 14px; background:var(--ink); display:flex; flex-direction:column; gap:10px; }
.v-blueprint .b-types { display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); border:1px solid var(--line); }
.v-blueprint .b-types span { padding:6px 0; text-align:center; font-family:${MONO}; font-stretch:87.5%; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; }
.v-blueprint .b-types span + span { border-left:1px solid var(--line); }
.v-blueprint .b-types span.on { background:var(--line); color:var(--ink); font-weight:500; }
.v-blueprint .b-ta { height:78px; border:1px solid var(--line); padding:6px 10px; color:var(--soft); font-size:14px; line-height:24px; background-image:repeating-linear-gradient(transparent 0 23px, var(--line3) 23px 24px); background-position:0 6px; }
.v-blueprint .b-crow { display:flex; justify-content:space-between; align-items:stretch; }
.v-blueprint .b-crow .b-act { border:1px solid var(--line); height:34px; padding:0 18px; }
.v-blueprint .b-tl { position:relative; padding:6px 0 10px; }
.v-blueprint .b-tl::before { content:""; position:absolute; top:0; bottom:0; left:142px; width:1px; background:var(--line); }
.v-blueprint .b-tl li { display:grid; grid-template-columns:128px 28px minmax(0,1fr); padding:9px 18px 9px 0; position:relative; }
.v-blueprint .b-tl .when { text-align:right; font-family:${MONO}; font-stretch:75%; font-size:10px; letter-spacing:0.06em; line-height:1.4; padding-top:2px; }
.v-blueprint .b-tl .when span { display:block; color:var(--soft); }
.v-blueprint .b-node { width:11px; height:11px; background:var(--line); border:2px solid var(--ink); box-sizing:content-box; margin:2px 0 0 7px; position:relative; z-index:1; }
.v-blueprint .b-node.stage { background:var(--ink); border:1px solid var(--line); transform:rotate(45deg); width:9px; height:9px; margin:4px 0 0 8px; }
.v-blueprint .b-node.ext { background:var(--ink); border:1.5px solid var(--red); }
.v-blueprint .b-ev { background:var(--ink); padding:6px 10px 8px; border:1px solid var(--line3); }
.v-blueprint .b-ev .hd { display:flex; flex-wrap:wrap; gap:4px 12px; align-items:baseline; font-family:${MONO}; font-stretch:75%; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; }
.v-blueprint .b-ev .ty { font-weight:700; font-stretch:87.5%; }
.v-blueprint .b-ev .ln { color:var(--soft); }
.v-blueprint .b-ev .bd { margin-top:5px; font-size:14px; line-height:1.45; }
.v-blueprint .b-ev .bd.done { text-decoration:line-through; color:var(--soft); }
.v-blueprint .b-unv { color:var(--red); border:1px solid var(--red); padding:1px 4px 0; }
.v-blueprint .b-mv { padding:4px 0 0; font-family:${MONO}; font-stretch:75%; font-size:10.5px; letter-spacing:0.08em; text-transform:uppercase; line-height:1.5; }
.v-blueprint .b-mv b { font-weight:700; }
.v-blueprint .b-mv .ln { color:var(--soft); display:block; }
.v-blueprint .b-tasks li { display:grid; grid-template-columns:18px minmax(0,1fr); gap:10px; padding:10px 14px; border-bottom:1px solid var(--line3); }
.v-blueprint .b-chk { width:16px; height:16px; border:1.5px solid var(--line); margin-top:1px; }
.v-blueprint .b-tasks li.od .b-chk { border-color:var(--red); }
.v-blueprint .b-tasks .bd { font-size:14px; font-weight:500; line-height:1.3; }
.v-blueprint .b-tasks dl { margin-top:6px; display:grid; grid-template-columns:58px 1fr; gap:2px 8px; }
.v-blueprint .b-tasks dd { font-size:12px; }
.v-blueprint .b-spec { display:grid; grid-template-columns:96px minmax(0,1fr); }
.v-blueprint .b-spec dt, .v-blueprint .b-spec dd { padding:6px 14px; border-bottom:1px solid var(--line3); }
.v-blueprint .b-spec dt { padding-right:0; padding-top:8px; }
.v-blueprint .b-spec dd { font-size:13px; overflow-wrap:anywhere; }
.v-blueprint .b-spec dd.mono { font-size:11px; letter-spacing:0.02em; padding-top:7px; }
.v-blueprint .b-quote { margin:10px 14px 4px; padding:8px 10px 8px 12px; border-left:3px solid var(--line); font-size:15px; font-style:italic; line-height:1.35; }
.v-blueprint .b-qsrc { padding:0 14px 10px; }
.v-blueprint .b-pbtn { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); border-top:1px solid var(--line); }
.v-blueprint .b-pbtn .b-act { height:34px; padding:0 6px; font-size:10px; letter-spacing:0.06em; }
.v-blueprint .b-pbtn .b-act + .b-act { border-left:1px solid var(--line); }
.v-blueprint .b-note { padding:10px 14px 14px; font-size:14px; line-height:24px; background-image:repeating-linear-gradient(transparent 0 23px, var(--line3) 23px 24px); background-position:0 10px; }
.v-blueprint .b-side .b-tb { border-left:0; border-top:2px solid var(--line); margin-top:auto; }
`;

  const reg = (pos) =>
    `<svg class="b-reg ${pos}" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1"/><path d="M11 0v22M0 11h22" stroke="currentColor" stroke-width="1"/><circle cx="11" cy="11" r="2.4" fill="currentColor"/></svg>`;

  const delta = `<svg width="11" height="10" viewBox="0 0 11 10" aria-hidden="true"><path d="M5.5 1 10 9H1z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;

  const docId = (id) => "LT-" + String(id).replace(/\D/g, "").padStart(4, "0");

  function sheet(d, h, active, inner, slug) {
    const nav = d.nav
      .map(
        (n, i) =>
          `<a class="${n === active ? "on" : ""}"><span class="lbl">SHT.${String(i + 1).padStart(2, "0")}${n === active ? " ◼" : ""}</span><b>${h.esc(n)}</b></a>`,
      )
      .join("");
    return `<span class="b-crop tl"></span><span class="b-crop tr"></span><span class="b-crop bl"></span><span class="b-crop br"></span>
${reg("t")}${reg("b")}${reg("l")}${reg("r")}
<span class="b-slug">${slug} · Brightwater Studio · Issued for use</span>
<span class="b-slug r">Plot 28.10.2026 · Cyan / Ink 1 of 1</span>
<div class="b-sheet">
  <span></span><div class="b-rx">${"ABCDEFGH".split("").map((c) => `<span>${c}</span>`).join("")}</div><span></span>
  <div class="b-ry">${[1, 2, 3, 4, 5, 6].map((n) => `<span>${n}</span>`).join("")}</div>
  <div class="b-in">
    <header class="b-head">
      <div class="b-brand"><b>Lead Tracker</b><span class="lbl">Open-source CRM · Drawing set LT</span></div>
      <nav class="b-nav" aria-label="Main">${nav}</nav>
      <div class="b-who">
        <dl><dt class="lbl">Org</dt><dd>${h.esc(d.org.name)}</dd><dt class="lbl">User</dt><dd>${h.esc(d.viewer.name)} <span class="lbl">${h.esc(d.viewer.role)}</span></dd></dl>
        <a class="b-out">Sign out</a>
      </div>
    </header>
    ${inner}
  </div>
  <div class="b-ry">${[1, 2, 3, 4, 5, 6].map((n) => `<span>${n}</span>`).join("")}</div>
  <span></span><div class="b-rx">${"ABCDEFGH".split("").map((c) => `<span>${c}</span>`).join("")}</div><span></span>
</div>`;
  }

  function titleBlock(h, title, dwg, sheetNo, extraClass) {
    return `<div class="b-tb${extraClass ? " " + extraClass : ""}">
      <div class="w4 l0 big"><span class="lbl">Title</span><b>${h.esc(title)}</b></div>
      <div class="w2 l0"><span class="lbl">Dwg no.</span><b>${dwg}</b></div>
      <div><span class="lbl">Rev</span><b>C</b></div>
      <div><span class="lbl">Sheet</span><b>${sheetNo} of 03</b></div>
      <div class="l0"><span class="lbl">Scale</span><b>1 : 1</b></div>
      <div><span class="lbl">Drawn</span><b>A. Dobre</b></div>
      <div><span class="lbl">Date</span><b>28.10.2026</b></div>
      <div><span class="lbl">Ccy / TZ</span><b>EUR · BUC</b></div>
    </div>`;
  }

  function revBlock(d, h) {
    const revs = d.detail.timeline
      .filter((e) => e.kind === "stage")
      .slice()
      .sort((a, b) => (a.at < b.at ? 1 : -1));
    const letters = ["C", "B", "A"];
    return `<div class="b-rev">
      <div class="cap"><span class="lbl">Revisions</span><span class="lbl">Latest first</span></div>
      <table><thead><tr><th style="width:34px">Rev</th><th>Description</th><th style="width:84px">Date</th><th style="width:36px">By</th></tr></thead>
      <tbody>${revs
        .map(
          (e, i) =>
            `<tr><td class="mono">${letters[i] || "—"}</td><td>${h.esc(e.lead)} → ${h.esc(e.to)}</td><td class="mono">${h.esc(h.date(e.at))}</td><td class="mono">${h.esc(h.initials(e.actor))}</td></tr>`,
        )
        .join("")}</tbody></table>
    </div>`;
  }

  function board(d, h) {
    const cols = d.stages
      .map((s, si) => {
        const list = h.leadsIn(s.id);
        const letter = "ABCDEF"[si];
        const stamp = s.is_won ? `<span class="b-stamp won">✓ Won</span>` : s.is_lost ? `<span class="b-stamp lost">✕ Lost</span>` : "";
        const parts = list
          .map((l, li) => {
            const date = l.closeDate ? h.date(l.closeDate) : "No date";
            return `<article class="b-part${l.overdue ? " od" : ""}">
              <div class="pid"><span>${docId(l.id)} · ${letter}${li + 1}</span>${
                l.owner ? `<span class="b-own" title="${h.esc(l.owner)}">${h.esc(h.initials(l.owner))}</span>` : `<span class="b-own none" title="Unassigned">N/A</span>`
              }</div>
              <div class="pt">${h.esc(l.title)}</div>
              <div class="pc">${h.esc(l.contact)} · ${h.esc(l.company)}</div>
              <div class="pf"><span class="amt">${h.esc(h.money(l.amount))}</span><span class="dt${l.overdue ? " red" : ""}"><span class="lbl${l.overdue ? " red" : ""}">Close</span><br>${h.esc(date)}</span></div>
              ${l.overdue ? `<div class="b-delta">${delta} Overdue · revise date</div>` : ""}
              ${l.lostReason ? `<div class="b-reason"><span class="lbl">Reason lost</span>${h.esc(l.lostReason)}</div>` : ""}
            </article>`;
          })
          .join("");
        return `<section class="b-col">
          <div class="b-ch">
            <div class="top"><span class="lbl">ST.${String(si + 1).padStart(2, "0")} · P ${s.probability}%</span>${stamp}</div>
            <div class="b-num">${list.length}</div>
            <div class="b-sn${s.is_lost ? " red" : ""}">${h.esc(s.name)}</div>
            <div class="b-dim" aria-label="Column total"><i></i><b>${h.esc(h.money(h.total(list)))}</b><i></i></div>
          </div>
          <div class="b-parts">${parts}</div>
        </section>`;
      })
      .join("");

    const inner = `<div class="b-title">
      <div class="b-tleft solid">
        <div class="b-giant">${d.leads.length}</div>
        <div class="b-word"><h1>Leads</h1><div class="meta"><span>${d.leads.length} leads</span><span>Dwg LT-0042</span><span>View: board</span><span>Values in EUR</span></div></div>
      </div>
      ${revBlock(d, h)}
    </div>
    <div class="b-tools" style="grid-template-columns:210px minmax(0,1fr) 160px 160px 150px 160px">
      <div class="b-f"><span class="lbl">View</span><span class="v"><span class="b-opt on"><i></i>Board</span><span class="b-opt"><i></i>Table</span></span></div>
      <div class="b-f"><span class="lbl">Search</span><span class="v"><span class="ph">Title, contact or company</span></span></div>
      <div class="b-f"><span class="lbl">Owner</span><span class="v">All owners ▾</span></div>
      <div class="b-f"><span class="lbl">Source</span><span class="v">All sources ▾</span></div>
      <a class="b-act">↓ Export CSV</a>
      <a class="b-act pri">+ New lead</a>
    </div>
    <div class="b-board">${cols}</div>
    <div class="b-foot">
      <div class="b-notes"><span class="lbl">General notes</span><ol>
        <li>Large numeral = leads in stage. Dimension line = stage total.</li>
        <li>Part no. LT-#### = lead record; grid ref = column + position.</li>
        <li>Red dashed outline = close date passed while open.</li>
        <li>N/A owner box = unassigned lead.</li>
      </ol></div>
      ${titleBlock(h, "Leads — pipeline board", "LT-0042", "01")}
    </div>`;
    return sheet(d, h, "Leads", inner, "LT-0042 Leads");
  }

  function contacts(d, h) {
    const rows = d.contacts
      .map((c, i) => {
        const tags = c.tags.map((t) => `<span class="b-tag">${h.esc(t)}</span>`).join("");
        return `<tr class="${c.doNotContact ? "dnc" : ""}">
          <td class="mk">C-${String(i + 1).padStart(2, "0")}</td>
          <td><div class="nm">${h.esc(c.name)}</div><div class="ti">${c.title ? h.esc(c.title) : "No title recorded"}</div>${
            tags || c.doNotContact ? `<div class="tags">${c.doNotContact ? `<span class="b-dnc">⊘ Do not contact</span>` : ""}${tags}</div>` : ""
          }</td>
          <td class="mono">${h.esc(c.email)}</td>
          <td class="mono">${c.phone ? h.esc(c.phone) : `<span class="lbl">Not recorded</span>`}</td>
          <td class="co">${h.esc(c.company)}</td>
          <td>${c.owner ? h.esc(c.owner) : `<span class="lbl">Unassigned</span>`}</td>
          <td class="open${c.openLeads ? "" : " z"}">${c.openLeads}</td>
          <td class="mono">${h.esc(h.date(c.added))}</td>
        </tr>`;
      })
      .join("");
    const inner = `<div class="b-title">
      <div class="b-tleft solid">
        <div class="b-giant">${d.contacts.length}</div>
        <div class="b-word"><h1>Contacts</h1><div class="meta"><span>${d.contacts.length} contacts</span><span>Schedule LT-0043</span><span>1 restricted</span></div></div>
      </div>
      <div class="b-legend"><span class="lbl">Legend</span><ul>
        <li><span class="b-dnc">⊘ Do not contact</span></li><li>Contact restricted · GDPR</li>
        <li><span class="b-tag">Tag</span></li><li>Segment label</li>
        <li style="font-family:${DISP};font-weight:900;font-size:26px;line-height:.9;letter-spacing:0">3</li><li>Open leads on contact</li>
        <li><span class="mk">C-01</span></li><li>Schedule mark</li>
      </ul></div>
    </div>
    <div class="b-tools" style="grid-template-columns:minmax(0,1fr) 170px 170px 150px 150px 180px">
      <div class="b-f"><span class="lbl">Search</span><span class="v"><span class="ph">Name, email or company</span></span></div>
      <div class="b-f"><span class="lbl">Tag</span><span class="v">All tags ▾</span></div>
      <div class="b-f"><span class="lbl">Owner</span><span class="v">All owners ▾</span></div>
      <a class="b-act">↑ Import CSV</a>
      <a class="b-act">↓ Export CSV</a>
      <a class="b-act pri">+ New contact</a>
    </div>
    <table class="b-sch">
      <colgroup><col style="width:62px"><col style="width:250px"><col style="width:226px"><col style="width:142px"><col style="width:164px"><col style="width:120px"><col style="width:64px"><col></colgroup>
      <thead><tr><th>Mark</th><th>Name · title · tags</th><th>Email</th><th>Phone</th><th>Company</th><th>Owner</th><th class="r">Open</th><th>Added</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="b-foot" style="border-top:1px solid var(--line)">
      <div class="b-notes"><span class="lbl">General notes</span><ol>
        <li>Schedule lists every contact in the workspace, sorted by name.</li>
        <li>Hatched rows are flagged do not contact; exclude from outreach.</li>
        <li>Dates are DD.MM.YYYY, Europe/Bucharest.</li>
      </ol></div>
      ${titleBlock(h, "Contacts — schedule", "LT-0043", "02")}
    </div>`;
    return sheet(d, h, "Contacts", inner, "LT-0043 Contacts");
  }

  function detail(d, h) {
    const D = d.detail;
    const c = D.contact;
    const p = c.privacy;
    const tl = D.timeline.slice().sort((a, b) => (a.at < b.at ? 1 : -1));
    const events = tl
      .map((e) => {
        const when = `<div class="when">${h.esc(h.date(e.at))}<span>${h.esc(e.at.slice(11, 16))}</span></div>`;
        if (e.kind === "stage") {
          const txt = e.from
            ? `Moved from <b>${h.esc(e.from)}</b> to <b>${h.esc(e.to)}</b> by ${h.esc(e.actor)}`
            : `Entered <b>${h.esc(e.to)}</b> by ${h.esc(e.actor)}`;
          return `<li>${when}<span class="b-node stage"></span><div class="b-mv">${txt}<span class="ln">Re: ${h.esc(e.lead)}</span></div></li>`;
        }
        const who = e.source ? `<span class="b-unv">Via ${h.esc(e.source)} · unverified</span>` : `<span>${h.esc(e.author)}</span>`;
        const done = e.completedAt ? `<span class="ln">Done ${h.esc(h.date(e.completedAt))} ${h.esc(e.completedAt.slice(11, 16))}</span>` : "";
        return `<li>${when}<span class="b-node${e.source ? " ext" : ""}"></span><div class="b-ev">
          <div class="hd"><span class="ty">${h.esc(h.TYPE_LABELS[e.type])}</span>${who}<span class="ln">Re: ${h.esc(e.lead)}</span>${done}</div>
          <p class="bd${e.completedAt ? " done" : ""}">${h.esc(e.body)}</p>
        </div></li>`;
      })
      .join("");

    const bom = D.leads
      .map((l, i) => {
        const st = h.stage(l.stageId);
        return `<tr><td class="mono" style="width:70px">${String(i + 1).padStart(2, "0")}</td><td style="font-weight:600">${h.esc(l.title)}</td><td class="mono">${h.esc(st.name)}${st.is_won ? " ✓" : ""}</td><td class="mono">${docId(l.id)}</td><td class="val">${h.esc(h.money(l.amount))}</td></tr>`;
      })
      .join("");

    const tasks = D.openTasks
      .map(
        (t) => `<li class="${t.overdue ? "od" : ""}"><span class="b-chk" aria-label="Mark done"></span><div>
          <p class="bd">${h.esc(t.body)}</p>
          <dl>
            <dt class="lbl${t.overdue ? " red" : ""}">Due</dt><dd class="${t.overdue ? "red" : ""}">${h.esc(h.date(t.due))} ${h.esc(t.due.slice(11, 16))}${t.overdue ? ` <span class="b-dnc">Δ Overdue</span>` : ""}</dd>
            <dt class="lbl">Assignee</dt><dd>${h.esc(t.assignee)}</dd>
            <dt class="lbl">Lead</dt><dd>${h.esc(t.lead)}</dd>
          </dl>
        </div></li>`,
      )
      .join("");

    const inner = `<div class="b-dbar">
      <a class="b-act back">← Contacts</a>
      <div class="doc"><span class="lbl">Contact record · Dwg LT-0044 · ${h.esc(h.initials(c.name))}-${String(c.id).replace(/\D/g, "").padStart(3, "0")}</span></div>
      <a class="b-act pri">+ New lead</a><a class="b-act">Edit</a><a class="b-act del">Delete</a>
    </div>
    <div class="b-hero">
      <div class="b-av" aria-hidden="true"><span>${h.esc(h.initials(c.name))}</span></div>
      <div class="b-who2"><span class="lbl">Contact · added ${h.esc(h.date(c.added))}</span><h1>${h.esc(c.name)}</h1><p class="sub">${h.esc(c.title)} <span>at</span> ${h.esc(c.company)}</p></div>
      <div class="b-vals">
        <div><span class="lbl">Open value<br>3 leads · EUR</span><b>${h.esc(h.money(D.openValue))}</b></div>
        <div><span class="lbl">Won value<br>1 lead · EUR</span><b>${h.esc(h.money(D.wonValue))}</b></div>
      </div>
    </div>
    <div class="b-dbody">
      <div class="b-main">
        <section class="b-block"><div class="b-sh"><h2>Leads — bill of materials</h2><span class="lbl">${D.leads.length} items</span></div>
          <table class="b-bom"><thead><tr><th>Item</th><th>Lead</th><th>Stage</th><th>Part no.</th><th class="r">Value</th></tr></thead>
          <tbody>${bom}</tbody>
          <tfoot><tr><td></td><td colspan="2">Open total</td><td></td><td class="val">${h.esc(h.money(D.openValue))}</td></tr><tr class="won"><td></td><td colspan="2">Won total</td><td></td><td class="val">${h.esc(h.money(D.wonValue))}</td></tr></tfoot></table>
        </section>
        <section class="b-block"><div class="b-sh"><h2>Log activity</h2><span class="lbl">Entry form</span></div>
          <div class="b-comp">
            <div class="b-types"><span class="on">Note</span><span>Call</span><span>Email</span><span>Meeting</span><span>Task</span></div>
            <div class="b-ta">What happened with ${h.esc(c.name.split(" ")[0])}? Write it down…</div>
            <div class="b-crow"><span class="lbl" style="align-self:center">Link to lead: none</span><a class="b-act pri">Log activity →</a></div>
          </div>
        </section>
        <section><div class="b-sh"><h2>Activity timeline</h2><span class="lbl">${tl.length} entries · newest first</span></div>
          <ol class="b-tl">${events}</ol>
        </section>
      </div>
      <aside class="b-side">
        <section class="b-block"><div class="b-sh"><h2>Open tasks</h2><span class="lbl">${D.openTasks.length} open · 1 overdue</span></div><ul class="b-tasks">${tasks}</ul></section>
        <section class="b-block"><div class="b-sh"><h2>Details</h2><span class="lbl">Spec</span></div>
          <dl class="b-spec">
            <dt class="lbl">Email</dt><dd class="mono">${h.esc(c.email)}</dd>
            <dt class="lbl">Phone</dt><dd class="mono">${h.esc(c.phone)}</dd>
            <dt class="lbl">Company</dt><dd>${h.esc(c.company)}</dd>
            <dt class="lbl">Owner</dt><dd>${h.esc(c.owner)}</dd>
            <dt class="lbl">Tags</dt><dd>${c.tags.map((t) => `<span class="b-tag">${h.esc(t)}</span>`).join(" ")}</dd>
            <dt class="lbl">Added</dt><dd class="mono">${h.esc(h.date(c.added))}</dd>
          </dl>
        </section>
        <section class="b-block"><div class="b-sh"><h2>Privacy</h2><span class="lbl">GDPR</span></div>
          <dl class="b-spec">
            <dt class="lbl">Lawful basis</dt><dd>${h.esc(p.lawfulBasis)}</dd>
            <dt class="lbl">Consent</dt><dd>Given ${h.esc(h.date(p.consent.given))} · source ${h.esc(p.consent.source)}</dd>
            <dt class="lbl">Contact</dt><dd>${p.contactAllowed ? "✓ Allowed" : `<span class="red">Not allowed</span>`}</dd>
          </dl>
          <p class="b-quote">“${h.esc(p.consent.text)}”</p>
          <p class="b-qsrc lbl">Consent text as captured · ${h.esc(p.consent.source)}</p>
          <div class="b-pbtn"><a class="b-act">Withdraw consent</a><a class="b-act del">Stop contact</a><a class="b-act">Export data</a></div>
        </section>
        <section class="b-block"><div class="b-sh"><h2>Notes</h2></div><p class="b-note">${h.esc(c.notes)}</p></section>
        ${titleBlock(h, "Contact — " + c.name, "LT-0044", "03")}
      </aside>
    </div>`;
    return sheet(d, h, "Contacts", inner, "LT-0044 Contact record");
  }

  (window.LT_VARIANTS = window.LT_VARIANTS || []).push({
    id: "blueprint",
    name: "Blueprint",
    concept:
      "Every screen is a sheet from a declassified engineering drawing set — cyanotype paper, zone rulers, title and revision blocks — because a CRM built in public is a system you're drafting where everyone can see it.",
    fonts: ["Big+Shoulders+Display:wght@700;900", "Martian+Mono:wdth,wght@75..112.5,400..700", "Barlow:ital,wght@0,400;0,500;0,600;1,400"],
    tokens: {
      color: [
        { name: "Cyanotype", value: "#164a8a" },
        { name: "Linework", value: "#eef4ff" },
        { name: "Faded line", value: "#b3cbea" },
        { name: "Redline", value: "#ff8a6e" },
        { name: "Deep cyan", value: "#103b72" },
      ],
      type: [
        { role: "Stage numerals", family: DISP, sample: "15 LEADS", style: "font-weight:900;text-transform:uppercase" },
        { role: "Labels & data", family: MONO, sample: "LT-0042 · REV C", style: "font-stretch:75%;letter-spacing:.1em" },
        { role: "Body", family: BODY, sample: "Dispatch console redesign", style: "font-weight:600" },
      ],
      spacing: "16px drafting grid with 80px major lines; 8/10/14/18 padding inside cells; 30px plot margin for crop marks",
      shape: "0 radius everywhere; 2px sheet border, 1px cell rules, dashed redline outline for overdue, 3px double rule under totals",
      signature: "Giant stage numerals over dimension-line totals, framed by zone rulers, crop marks and a live revision block.",
    },
    css,
    render: { board, contacts, detail },
  });
})();
