// Card File — tactile office stationery: a kraft desk, manila folders, index cards,
// carbon-blue typewriter ink and rubber stamps for the verdicts.
(function () {

  function chrome(d, h, active, body) {
    const e = h.esc;
    return `
<header class="rx-top">
  <div class="rx-brand">
    <span class="rx-dymo" aria-label="Lead Tracker">Lead Tracker</span>
  </div>
  <div class="rx-who">
    <div class="rx-badge">
      <span class="rx-badge-org">${e(d.org.name)}</span>
      <span class="rx-badge-user">${e(d.viewer.name)} · ${e(d.viewer.role)}</span>
    </div>
    <span class="rx-mono-ring" aria-hidden="true">${e(h.initials(d.viewer.name))}</span>
    <a class="rx-signout" href="#">Sign out</a>
  </div>
</header>
<nav class="rx-tabs" aria-label="Main">
  ${d.nav.map((n) => `<a href="#" class="rx-tab${n === active ? " is-on" : ""}"${n === active ? ' aria-current="page"' : ""}>${e(n)}</a>`).join("")}
</nav>
<main class="rx-folder">${body}</main>`;
  }

  const field = (label, value, cls = "") =>
    `<div class="rx-field ${cls}"><span class="rx-fl">${label}</span><span class="rx-fv">${value}</span></div>`;
  const caret = `<i class="rx-caret" aria-hidden="true">▾</i>`;
  const stamp = (text, cls = "") => `<span class="rx-stamp ${cls}" aria-hidden="true">${text}</span>`;

  function leadCard(l, h) {
    const e = h.esc;
    const owner = l.owner
      ? `<span class="rx-own" title="Owner: ${e(l.owner)}">${e(h.initials(l.owner))}</span>`
      : `<span class="rx-own is-none" title="Unassigned">?</span>`;
    let date;
    if (!l.closeDate) date = `<p class="rx-close is-none">No close date</p>`;
    else if (l.overdue) date = `<p class="rx-close is-late"><span class="rx-late">Overdue</span> ${e(h.day(l.closeDate))}</p>`;
    else date = `<p class="rx-close">Close ${e(h.day(l.closeDate))}</p>`;
    return `<article class="rx-card${l.status !== "open" ? " is-" + l.status : ""}">
      <header><h3>${e(l.title)}</h3>${owner}</header>
      <div class="rx-ruled">
        <p class="rx-who-line">${e(l.contact)} · ${e(l.company)}</p>
        <p class="rx-amt">${e(h.money(l.amount))}</p>
        ${date}
        ${l.lostReason ? `<p class="rx-why">Reason: ${e(l.lostReason)}</p>` : ""}
        ${!l.owner ? `<p class="rx-unas">Unassigned</p>` : ""}
      </div>
      ${l.status === "won" ? stamp("Won", "is-ink rx-st-card") : ""}
      ${l.status === "lost" ? stamp("Lost", "rx-st-card") : ""}
    </article>`;
  }

  function pageHead(title, count, extra, buttons) {
    return `<div class="rx-head">
      <div class="rx-title">
        <h1>${title}</h1>
        <span class="rx-count">${count}</span>
        ${extra || ""}
      </div>
      <div class="rx-actions">${buttons}</div>
    </div>`;
  }

  const css = `
.v-rolodex {
  --rx-desk: #a9804f;
  --rx-kraft: #c9a678;
  --rx-manila: #e3cc98;
  --rx-card: #fbfaf5;
  --rx-ink: #24397a;
  --rx-red: #c2312a;
  --rx-rule: rgba(66, 104, 168, 0.28);
  --rx-graphite: #2b2620;
  --rx-type: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  --rx-label: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  --rx-body: 'Barlow', 'Segoe UI', system-ui, sans-serif;
  min-height: 820px;
  padding: 0 20px 28px;
  color: var(--rx-graphite);
  font-family: var(--rx-body);
  font-size: 14px;
  background-color: var(--rx-desk);
  background-image:
    radial-gradient(140% 70% at 15% 0%, rgba(255, 236, 200, 0.28), transparent 60%),
    repeating-linear-gradient(88deg, rgba(255, 245, 225, 0.05) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(178deg, rgba(70, 40, 10, 0.06) 0 2px, transparent 2px 9px),
    repeating-linear-gradient(33deg, rgba(70, 40, 10, 0.035) 0 1px, transparent 1px 13px);
}
.v-rolodex a { color: inherit; text-decoration: none; }
.v-rolodex h1, .v-rolodex h2, .v-rolodex h3, .v-rolodex p, .v-rolodex dl, .v-rolodex dd, .v-rolodex ul { margin: 0; padding: 0; }
.v-rolodex ul { list-style: none; }

/* ---------- chrome ---------- */
.v-rolodex .rx-top { display: flex; align-items: center; justify-content: space-between; padding: 18px 6px 14px; }
.v-rolodex .rx-dymo {
  display: inline-block; font: 700 19px/1 var(--rx-label); letter-spacing: 0.34em; text-transform: uppercase;
  color: #eef1f8; padding: 8px 14px 7px 20px; border-radius: 3px; transform: rotate(-1.4deg);
  background: linear-gradient(180deg, #31509e, #213a7c 55%, #1b3170);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45), 0 -1px 0 rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -2px 0 rgba(0, 0, 0, 0.2), 0 2px 4px rgba(40, 20, 0, 0.45);
}
.v-rolodex .rx-who { display: flex; align-items: center; gap: 12px; }
.v-rolodex .rx-badge {
  display: flex; flex-direction: column; gap: 1px; background: var(--rx-card); padding: 6px 12px 6px 12px;
  border-top: 3px solid var(--rx-red); box-shadow: 0 2px 4px rgba(40, 20, 0, 0.35); transform: rotate(0.8deg);
}
.v-rolodex .rx-badge-org { font: 700 13px/1.1 var(--rx-label); letter-spacing: 0.08em; text-transform: uppercase; }
.v-rolodex .rx-badge-user { font: 400 12px/1.2 var(--rx-type); color: var(--rx-ink); }
.v-rolodex .rx-mono-ring {
  width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
  font: 700 13px var(--rx-type); color: #f6efe0; border: 2px solid rgba(246, 239, 224, 0.85);
  box-shadow: inset 0 0 0 2px var(--rx-desk), inset 0 0 0 3px rgba(246, 239, 224, 0.6);
}
.v-rolodex .rx-signout { font: 600 13px var(--rx-label); letter-spacing: 0.1em; text-transform: uppercase; color: #fbf3e2; border-bottom: 1px solid rgba(251, 243, 226, 0.6); }

.v-rolodex .rx-tabs { display: flex; gap: 2px; padding-left: 14px; position: relative; z-index: 1; }
.v-rolodex .rx-tab {
  font: 600 14px/1 var(--rx-label); letter-spacing: 0.12em; text-transform: uppercase; color: #5a4223;
  padding: 11px 26px 10px; background: #d2b886; margin-bottom: -1px;
  clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 100%, 0 100%);
  box-shadow: inset 0 -6px 8px -6px rgba(60, 35, 10, 0.35);
}
.v-rolodex .rx-tab.is-on { background: var(--rx-manila); color: var(--rx-graphite); padding-top: 13px; margin-top: -2px; box-shadow: none; }
.v-rolodex .rx-folder {
  position: relative; background-color: var(--rx-manila); border-radius: 0 6px 6px 6px; padding: 22px 20px 26px;
  background-image:
    repeating-linear-gradient(91deg, rgba(120, 85, 30, 0.035) 0 1px, transparent 1px 5px),
    linear-gradient(180deg, rgba(255, 250, 235, 0.35), transparent 120px);
  box-shadow: 0 2px 0 #c7aa72, 0 3px 0 #b8996a, 0 22px 34px -20px rgba(40, 20, 0, 0.6);
}

/* ---------- page head + controls ---------- */
.v-rolodex .rx-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.v-rolodex .rx-title { display: flex; align-items: baseline; gap: 14px; }
.v-rolodex .rx-title h1 { font: 700 40px/0.95 var(--rx-label); letter-spacing: 0.01em; text-transform: uppercase; color: var(--rx-graphite); }
.v-rolodex .rx-count { font: 700 15px var(--rx-type); color: var(--rx-ink); border: 1.5px solid var(--rx-ink); padding: 2px 8px; transform: rotate(-1.5deg); display: inline-block; opacity: 0.9; }
.v-rolodex .rx-actions { display: flex; gap: 8px; align-items: center; }
.v-rolodex .rx-btn {
  font: 600 14px/1 var(--rx-label); letter-spacing: 0.08em; text-transform: uppercase; padding: 10px 16px 9px;
  border: 1.5px solid var(--rx-ink); color: var(--rx-ink); background: var(--rx-card); border-radius: 3px;
  box-shadow: 0 2px 0 rgba(36, 57, 122, 0.35); white-space: nowrap; display: inline-flex; gap: 6px; align-items: center;
}
.v-rolodex .rx-btn.is-primary { background: var(--rx-ink); color: #f4f2ea; box-shadow: 0 2px 0 #14214a; }
.v-rolodex .rx-btn.is-danger { color: var(--rx-red); border-color: var(--rx-red); box-shadow: 0 2px 0 rgba(194, 49, 42, 0.35); }
.v-rolodex .rx-btn.is-sm { font-size: 12.5px; padding: 7px 10px 6px; }
.v-rolodex .rx-controls { display: flex; align-items: flex-end; gap: 14px; margin-top: 18px; padding-top: 14px; border-top: 1.5px dashed rgba(90, 60, 25, 0.35); }
.v-rolodex .rx-field { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
.v-rolodex .rx-fl { font: 600 11px/1 var(--rx-label); letter-spacing: 0.16em; text-transform: uppercase; color: #6d5330; }
.v-rolodex .rx-fv {
  font: 400 13px/1 var(--rx-type); color: var(--rx-ink); background: var(--rx-card); padding: 9px 10px 8px;
  border-bottom: 2px solid var(--rx-ink); display: flex; justify-content: space-between; gap: 10px; box-shadow: 0 1px 2px rgba(60, 35, 10, 0.18);
}
.v-rolodex .rx-search { flex: 1; max-width: 420px; }
.v-rolodex .rx-search .rx-fv { color: #7f8aa8; }
.v-rolodex .rx-caret { font-style: normal; color: var(--rx-ink); }
.v-rolodex .rx-toggle { display: flex; align-items: flex-end; gap: 2px; margin-left: auto; }
.v-rolodex .rx-toggle span {
  font: 600 13px/1 var(--rx-label); letter-spacing: 0.12em; text-transform: uppercase; padding: 9px 14px 8px; color: #6d5330;
  background: rgba(255, 250, 235, 0.45); border-bottom: 2px solid transparent;
}
.v-rolodex .rx-toggle span.is-on { background: var(--rx-card); color: var(--rx-graphite); border-bottom-color: var(--rx-red); box-shadow: 0 1px 2px rgba(60, 35, 10, 0.2); }

/* ---------- rubber stamp ---------- */
.v-rolodex .rx-stamp {
  position: absolute; display: inline-block; white-space: nowrap; pointer-events: none;
  font: 800 22px/1 var(--rx-label); letter-spacing: 0.14em; text-transform: uppercase; color: var(--rx-red);
  padding: 6px 10px 4px 12px; border: 3px solid currentColor; border-radius: 5px;
  box-shadow: inset 0 0 0 2px transparent, inset 0 0 0 3.5px currentColor;
  opacity: 0.86; mix-blend-mode: multiply; transform: rotate(-11deg);
  -webkit-mask-image:
    repeating-radial-gradient(circle at 31% 42%, #000 0 2.1px, rgba(0, 0, 0, 0.35) 2.5px 3.1px, #000 3.6px 6.2px),
    repeating-linear-gradient(117deg, #000 0 3.2px, rgba(0, 0, 0, 0.55) 3.2px 4.1px, #000 4.1px 9.5px),
    linear-gradient(97deg, #000 0%, rgba(0, 0, 0, 0.62) 48%, #000 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    repeating-radial-gradient(circle at 31% 42%, #000 0 2.1px, rgba(0, 0, 0, 0.35) 2.5px 3.1px, #000 3.6px 6.2px),
    repeating-linear-gradient(117deg, #000 0 3.2px, rgba(0, 0, 0, 0.55) 3.2px 4.1px, #000 4.1px 9.5px),
    linear-gradient(97deg, #000 0%, rgba(0, 0, 0, 0.62) 48%, #000 100%);
  mask-composite: intersect;
}
.v-rolodex .rx-stamp.is-ink { color: var(--rx-ink); }
.v-rolodex .rx-st-card { right: 12px; bottom: 10px; }
.v-rolodex .rx-card.is-won, .v-rolodex .rx-card.is-lost { padding-bottom: 52px; }

/* ---------- board: card-catalogue drawers ---------- */
.v-rolodex .rx-drawers { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin-top: 20px; align-items: start; }
.v-rolodex .rx-drawer { background: #8b6439; border-radius: 4px; box-shadow: 0 2px 0 #6f4e2b, 0 10px 18px -12px rgba(30, 15, 0, 0.7); overflow: hidden; }
.v-rolodex .rx-front {
  position: relative; padding: 12px 10px 20px;
  background-color: #a57b4b;
  background-image: repeating-linear-gradient(90deg, rgba(60, 30, 5, 0.09) 0 2px, transparent 2px 7px), linear-gradient(180deg, rgba(255, 230, 190, 0.18), rgba(0, 0, 0, 0.08));
  border-bottom: 3px solid #5f421f;
}
.v-rolodex .rx-holder {
  padding: 4px; border-radius: 3px;
  background: linear-gradient(180deg, #e2cb86, #b4923f 60%, #9b7a2f);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 1px 2px rgba(30, 15, 0, 0.55);
}
.v-rolodex .rx-label { background: var(--rx-card); padding: 6px 8px 5px; display: flex; justify-content: space-between; align-items: baseline; gap: 6px; box-shadow: inset 0 1px 3px rgba(60, 35, 10, 0.3); }
.v-rolodex .rx-label b { font: 700 13.5px/1 var(--rx-type); text-transform: uppercase; letter-spacing: 0.04em; color: var(--rx-graphite); }
.v-rolodex .rx-prob { font: 400 12px/1 var(--rx-type); color: #6d5330; }
.v-rolodex .rx-mini { font: 800 11.5px/1 var(--rx-label); letter-spacing: 0.12em; text-transform: uppercase; border: 1.5px solid currentColor; padding: 2px 4px 1px; transform: rotate(-4deg); }
.v-rolodex .rx-mini.won { color: var(--rx-ink); }
.v-rolodex .rx-mini.lost { color: var(--rx-red); }
.v-rolodex .rx-tally { display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; color: #fbf1dc; }
.v-rolodex .rx-tally span { font: 600 12px/1 var(--rx-label); letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.9; }
.v-rolodex .rx-tally b { font: 700 14px/1 var(--rx-type); text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3); }
.v-rolodex .rx-pull {
  position: absolute; left: 50%; bottom: 5px; width: 46px; height: 9px; transform: translateX(-50%);
  border-radius: 0 0 23px 23px; background: linear-gradient(180deg, #c9a957, #8d6f2a); box-shadow: 0 1px 1px rgba(0, 0, 0, 0.45);
}
.v-rolodex .rx-slot {
  padding: 12px 8px 14px; display: flex; flex-direction: column; gap: 10px; min-height: 160px;
  background: linear-gradient(180deg, #5e4224 0, #7a5732 18px, #84603a 100%);
}
.v-rolodex .rx-card {
  position: relative; background: var(--rx-card); padding: 8px 10px 6px; border-radius: 2px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -2px rgba(30, 15, 0, 0.5);
}
.v-rolodex .rx-slot .rx-card:nth-child(odd) { transform: rotate(-0.5deg); }
.v-rolodex .rx-slot .rx-card:nth-child(even) { transform: rotate(0.45deg); }
.v-rolodex .rx-card header { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; padding-bottom: 6px; border-bottom: 1.5px solid var(--rx-red); }
.v-rolodex .rx-card h3 { font: 600 14px/1.25 var(--rx-body); color: var(--rx-graphite); }
.v-rolodex .rx-own {
  flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
  font: 700 11px var(--rx-type); color: var(--rx-ink); border: 1.5px solid var(--rx-ink); transform: rotate(-8deg);
}
.v-rolodex .rx-own.is-none { border-style: dashed; color: #8f99b6; border-color: #8f99b6; transform: none; }
.v-rolodex .rx-ruled { padding-top: 2px; background: repeating-linear-gradient(180deg, transparent 0 19px, var(--rx-rule) 19px 20px); background-position: 0 2px; }
.v-rolodex .rx-ruled p { font: 400 12.5px/20px var(--rx-type); color: var(--rx-ink); }
.v-rolodex .rx-ruled .rx-amt { font-weight: 700; font-size: 14px; color: var(--rx-graphite); }
.v-rolodex .rx-close.is-none { color: #8f99b6; }
.v-rolodex .rx-close.is-late { color: var(--rx-red); font-weight: 700; }
.v-rolodex .rx-late { font: 800 11px/1 var(--rx-label); letter-spacing: 0.12em; text-transform: uppercase; border: 1.5px solid var(--rx-red); padding: 2px 4px 1px; margin-right: 4px; display: inline-block; transform: rotate(-3deg) translateY(-1px); }
.v-rolodex .rx-why { color: var(--rx-red) !important; font-style: italic; }
.v-rolodex .rx-unas { color: #8f99b6 !important; }
.v-rolodex .rx-card.is-won, .v-rolodex .rx-card.is-lost { padding-bottom: 34px; }
.v-rolodex .rx-card.is-lost h3 { color: #6f655a; }

/* ---------- contacts: card file with A–Z dividers ---------- */
.v-rolodex .rx-az { display: flex; gap: 2px; align-items: flex-end; }
.v-rolodex .rx-az span { font: 700 12px/1 var(--rx-type); width: 19px; text-align: center; padding: 5px 0 4px; background: rgba(255, 250, 235, 0.5); color: #b59c72; border-radius: 3px 3px 0 0; }
.v-rolodex .rx-az span.has { background: var(--rx-kraft); color: var(--rx-graphite); }
.v-rolodex .rx-file { margin-top: 18px; padding: 6px 14px 16px; background: #8b6439; border-radius: 4px; box-shadow: inset 0 6px 12px -6px rgba(0, 0, 0, 0.55), inset 0 0 0 3px #6f4e2b; }
.v-rolodex .rx-divider { position: relative; margin: 26px 0 10px; height: 8px; background: var(--rx-kraft); border-radius: 2px; box-shadow: 0 2px 3px rgba(30, 15, 0, 0.45); }
.v-rolodex .rx-divider:first-child { margin-top: 30px; }
.v-rolodex .rx-divtab {
  position: absolute; bottom: 6px; left: calc(var(--off) * 36%); display: flex; gap: 10px; align-items: baseline;
  background: var(--rx-kraft); padding: 7px 18px 4px; border-radius: 6px 6px 0 0;
  background-image: repeating-linear-gradient(90deg, rgba(90, 55, 15, 0.06) 0 1px, transparent 1px 4px);
}
.v-rolodex .rx-divtab b { font: 700 18px/1 var(--rx-label); letter-spacing: 0.14em; color: var(--rx-graphite); }
.v-rolodex .rx-divtab span { font: 400 12px/1 var(--rx-type); color: #5a4223; }
.v-rolodex .rx-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.v-rolodex .rx-icard {
  position: relative; background: var(--rx-card); padding: 10px 12px 10px; border-radius: 2px; min-width: 0;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08), 0 4px 8px -3px rgba(30, 15, 0, 0.55);
}
.v-rolodex .rx-icard.is-lifted { transform: translateY(-4px) rotate(-0.8deg); box-shadow: 0 0 0 2px var(--rx-ink), 0 14px 18px -8px rgba(30, 15, 0, 0.6); }
.v-rolodex .rx-icard header { display: flex; justify-content: space-between; gap: 8px; padding-bottom: 6px; border-bottom: 1.5px solid var(--rx-red); }
.v-rolodex .rx-icard h3 { font: 700 15px/1.2 var(--rx-type); color: var(--rx-ink); }
.v-rolodex .rx-ttl { font: 400 13px/1.3 var(--rx-body); color: #5f564b; margin-top: 2px; }
.v-rolodex .rx-ttl.is-none { color: #a59a8a; font-style: italic; }
.v-rolodex .rx-letter { font: 700 22px/1 var(--rx-label); color: var(--rx-red); opacity: 0.75; }
.v-rolodex .rx-dl { padding-top: 2px; background: repeating-linear-gradient(180deg, transparent 0 19px, var(--rx-rule) 19px 20px); background-position: 0 2px; }
.v-rolodex .rx-dl div { display: flex; gap: 8px; font: 400 12.5px/20px var(--rx-type); min-width: 0; }
.v-rolodex .rx-dl dt { flex: none; width: 46px; font: 600 10.5px/20px var(--rx-label); letter-spacing: 0.14em; text-transform: uppercase; color: #8a7b67; }
.v-rolodex .rx-dl dd { color: var(--rx-ink); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v-rolodex .rx-dl dd.is-none { color: #9aa3bd; }
.v-rolodex .rx-dl .rx-split dd { flex: 1; }
.v-rolodex .rx-dl b { font-weight: 700; color: var(--rx-graphite); }
.v-rolodex .rx-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; min-height: 20px; }
.v-rolodex .rx-sticker { font: 600 11.5px/1 var(--rx-label); letter-spacing: 0.08em; text-transform: uppercase; color: #5a4223; padding: 4px 7px 3px; background: #ead9b2; border: 1px solid #c9ad7a; border-radius: 3px; }
.v-rolodex .rx-sticker.is-dnc { background: var(--rx-red); color: #fbf3ec; border-color: var(--rx-red); }
.v-rolodex .rx-notags { font: italic 400 12px/20px var(--rx-type); color: #a59a8a; }
.v-rolodex .rx-icard.is-dnc { background: #f1eee6; }
.v-rolodex .rx-icard.is-dnc .rx-dl dd, .v-rolodex .rx-icard.is-dnc h3 { color: #6e7690; }
.v-rolodex .rx-st-dnc { top: 64px; left: 22px; font-size: 21px; transform: rotate(-9deg); }

/* ---------- detail: an open folder ---------- */
.v-rolodex .rx-back { font: 700 13px var(--rx-type); color: var(--rx-ink); display: inline-block; margin-bottom: 14px; border-bottom: 1.5px solid var(--rx-ink); }
.v-rolodex .rx-open { display: grid; grid-template-columns: 384px minmax(0, 1fr); gap: 22px; align-items: start; }
.v-rolodex .rx-col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.v-rolodex .rx-sheet {
  position: relative; background: var(--rx-card); padding: 14px 16px 16px; border-radius: 2px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08), 0 6px 12px -6px rgba(30, 15, 0, 0.5);
}
.v-rolodex .rx-sheet > h2 {
  font: 700 15px/1 var(--rx-label); letter-spacing: 0.16em; text-transform: uppercase; color: var(--rx-graphite);
  padding-bottom: 8px; border-bottom: 1.5px solid var(--rx-red); margin-bottom: 4px; display: flex; justify-content: space-between; align-items: baseline;
}
.v-rolodex .rx-sheet > h2 small { font: 400 12px var(--rx-type); letter-spacing: 0; text-transform: none; color: #6d5330; }
.v-rolodex .rx-master { padding-top: 18px; }
.v-rolodex .rx-ident { display: flex; gap: 14px; align-items: center; }
.v-rolodex .rx-avatar {
  flex: none; width: 66px; height: 66px; border-radius: 50%; display: grid; place-items: center; transform: rotate(-9deg);
  font: 700 24px var(--rx-type); color: var(--rx-ink); border: 3px solid var(--rx-ink);
  box-shadow: inset 0 0 0 3px var(--rx-card), inset 0 0 0 4.5px var(--rx-ink); opacity: 0.9;
}
.v-rolodex .rx-ident h1 { font: 700 30px/1 var(--rx-label); text-transform: uppercase; letter-spacing: 0.02em; }
.v-rolodex .rx-ident p { font: 400 13px/1.35 var(--rx-type); color: var(--rx-ink); margin-top: 6px; }
.v-rolodex .rx-btnrow { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; padding-bottom: 14px; border-bottom: 1.5px solid var(--rx-red); }
.v-rolodex .rx-sheet .rx-dl { margin-top: 2px; }
.v-rolodex .rx-sheet .rx-dl dt { width: 74px; }
.v-rolodex .rx-sheet .rx-dl dd { white-space: normal; }
.v-rolodex .rx-dl .rx-tagline dd { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; padding: 2px 0; }
.v-rolodex .rx-dl .rx-tagline .rx-sticker { line-height: 1; }
.v-rolodex .rx-quote { font: italic 400 13px/20px var(--rx-type); color: var(--rx-ink); padding: 0 0 0 82px; }
.v-rolodex .rx-box { display: inline-block; width: 13px; height: 13px; border: 1.5px solid var(--rx-ink); vertical-align: -2px; margin-right: 6px; position: relative; background: var(--rx-card); }
.v-rolodex .rx-box.is-x::after { content: "×"; position: absolute; inset: -5px 0 0; text-align: center; font: 700 15px/1 var(--rx-type); color: var(--rx-ink); }
.v-rolodex .rx-privacy .rx-stamp { right: 14px; top: 40px; font-size: 15px; transform: rotate(8deg); padding: 5px 8px 3px; border-width: 2px; }
.v-rolodex .rx-privacy .rx-btnrow { border: 0; padding: 0; margin-top: 14px; }
.v-rolodex .rx-notes p { font: 400 13px/20px var(--rx-type); color: var(--rx-ink); padding-top: 2px; background: repeating-linear-gradient(180deg, transparent 0 19px, var(--rx-rule) 19px 20px); background-position: 0 2px; }

.v-rolodex .rx-leadtbl { width: 100%; border-collapse: collapse; }
.v-rolodex .rx-leadtbl td { font: 400 13px/1.2 var(--rx-type); color: var(--rx-ink); padding: 9px 0 8px; border-bottom: 1px solid var(--rx-rule); vertical-align: middle; }
.v-rolodex .rx-leadtbl td:first-child { font: 600 14px/1.2 var(--rx-body); color: var(--rx-graphite); }
.v-rolodex .rx-leadtbl td.num { text-align: right; font-weight: 700; width: 110px; }
.v-rolodex .rx-leadtbl td.stg { width: 170px; }
.v-rolodex .rx-stg { font: 600 12px/1 var(--rx-label); letter-spacing: 0.12em; text-transform: uppercase; padding: 4px 7px 3px; background: #ead9b2; color: #5a4223; border-radius: 2px; }
.v-rolodex .rx-stg.is-won { background: none; color: var(--rx-ink); border: 1.5px solid var(--rx-ink); transform: rotate(-4deg); display: inline-block; font-weight: 800; }
.v-rolodex .rx-totals { display: flex; justify-content: flex-end; gap: 28px; padding-top: 10px; font: 400 13px var(--rx-type); color: #6d5330; }
.v-rolodex .rx-totals b { font: 700 16px var(--rx-type); color: var(--rx-graphite); border-bottom: 3px double var(--rx-graphite); margin-left: 6px; }

.v-rolodex .rx-composer .rx-types { display: flex; gap: 18px; padding: 10px 0 10px; font: 400 13px var(--rx-type); color: var(--rx-ink); }
.v-rolodex .rx-composer .rx-types span.is-on { font-weight: 700; }
.v-rolodex .rx-typein {
  height: 82px; border: 1.5px solid rgba(36, 57, 122, 0.45); padding: 6px 10px; position: relative;
  background: repeating-linear-gradient(180deg, transparent 0 19px, var(--rx-rule) 19px 20px); background-position: 0 6px;
  font: 400 13px/20px var(--rx-type); color: #8f99b6;
}
.v-rolodex .rx-typein::before { content: ""; display: inline-block; width: 8px; height: 15px; background: var(--rx-ink); vertical-align: -3px; margin-right: 2px; opacity: 0.8; }
.v-rolodex .rx-composer footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font: 400 12px var(--rx-type); color: #6d5330; }

.v-rolodex .rx-tasks li { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 8px; padding: 10px 0 9px; border-bottom: 1px solid var(--rx-rule); align-items: start; }
.v-rolodex .rx-tasks li:last-child { border-bottom: 0; }
.v-rolodex .rx-tasks .rx-box { margin: 2px 0 0; width: 15px; height: 15px; }
.v-rolodex .rx-tasks p { font: 600 14px/1.3 var(--rx-body); }
.v-rolodex .rx-tasks small { display: block; font: 400 12.5px/1.5 var(--rx-type); color: var(--rx-ink); margin-top: 3px; }
.v-rolodex .rx-tasks .is-late small b { color: var(--rx-red); }
.v-rolodex .rx-tasks .rx-late { font-size: 12px; margin-top: 2px; color: var(--rx-red); }

.v-rolodex .rx-tl { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
.v-rolodex .rx-entry { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 14px; align-items: start; }
.v-rolodex .rx-date {
  font: 700 12px/1.25 var(--rx-type); color: var(--rx-ink); text-align: center; text-transform: uppercase; padding: 6px 4px 5px;
  border: 1.5px solid rgba(36, 57, 122, 0.75); transform: rotate(-2deg); margin-top: 6px; opacity: 0.88;
}
.v-rolodex .rx-date span { display: block; font-weight: 400; }
.v-rolodex .rx-act { position: relative; background: #fffefb; border: 1px solid rgba(90, 60, 25, 0.18); padding: 9px 12px 10px; border-radius: 2px; box-shadow: 0 2px 4px -2px rgba(30, 15, 0, 0.35); }
.v-rolodex .rx-act.is-unverified { border: 1.5px dashed var(--rx-red); background: #fffaf6; }
.v-rolodex .rx-act header { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; padding-bottom: 6px; border-bottom: 1px solid var(--rx-rule); }
.v-rolodex .rx-kind { font: 800 12px/1 var(--rx-label); letter-spacing: 0.16em; text-transform: uppercase; color: #f4f2ea; background: var(--rx-ink); padding: 4px 7px 3px; }
.v-rolodex .rx-act.is-unverified .rx-kind { background: var(--rx-red); }
.v-rolodex .rx-by { font: 600 13px var(--rx-body); color: var(--rx-graphite); }
.v-rolodex .rx-by.is-src { color: var(--rx-red); }
.v-rolodex .rx-re { font: 400 12.5px var(--rx-type); color: #6d5330; margin-left: auto; }
.v-rolodex .rx-act > p { font: 400 13px/20px var(--rx-type); color: var(--rx-ink); padding-top: 6px; }
.v-rolodex .rx-act.is-done > p { text-decoration: line-through; text-decoration-color: rgba(194, 49, 42, 0.8); color: #7c84a0; }
.v-rolodex .rx-act .rx-donenote { font: 400 12px var(--rx-type); color: #6d5330; padding-top: 2px; }
.v-rolodex .rx-move {
  background: var(--rx-kraft); padding: 8px 12px 7px; font: 400 13px/1.35 var(--rx-type); color: var(--rx-graphite); border-radius: 2px;
  background-image: repeating-linear-gradient(90deg, rgba(90, 55, 15, 0.06) 0 1px, transparent 1px 4px); box-shadow: 0 1px 2px rgba(30, 15, 0, 0.35);
  display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; margin-top: 4px;
}
.v-rolodex .rx-move b { font-weight: 700; }
.v-rolodex .rx-move .rx-re { color: #5a4223; }
`;

  (window.LT_VARIANTS = window.LT_VARIANTS || []).push({
    id: "rolodex",
    name: "Card File",
    concept:
      "The CRM as the office card file it replaced: every contact an index card behind A–Z dividers, every lead a card filed in a stage drawer, and the outcomes rubber-stamped — honest, human stationery for a product built in public.",
    fonts: [
      "Courier+Prime:ital,wght@0,400;0,700;1,400",
      "Barlow+Condensed:wght@500;600;700;800",
      "Barlow:ital,wght@0,400;0,500;0,600;1,400",
    ],
    tokens: {
      color: [
        { name: "Kraft desk", value: "#a9804f" },
        { name: "Manila folder", value: "#e3cc98" },
        { name: "Index card", value: "#fbfaf5" },
        { name: "Carbon ink", value: "#24397a" },
        { name: "Stamp red", value: "#c2312a" },
        { name: "Graphite", value: "#2b2620" },
        { name: "Divider kraft", value: "#c9a678" },
      ],
      type: [
        { role: "Labels & tabs", family: "'Barlow Condensed', 'Arial Narrow', sans-serif", sample: "NEGOTIATION", style: "font-weight:700;letter-spacing:0.12em" },
        { role: "Record data", family: "'Courier Prime', 'Courier New', monospace", sample: "€27,500 · 3 Nov", style: "color:#24397a" },
        { role: "Body", family: "'Barlow', system-ui, sans-serif", sample: "Dispatch console redesign", style: "font-weight:600" },
      ],
      spacing: "4px base; 20px ruled line pitch on every card (text sits on the rules); 10–12px gaps between filed cards; 18–22px between sheets.",
      shape: "2px card corners, trapezoid folder tabs, 3px label-tape radius; depth from paper shadows and ±0.5° hand-filed rotation; CSS-textured double-ring stamps.",
      signature: "Inked rubber stamps — WON, LOST, DO NOT CONTACT, OVERDUE — rotated and textured over index cards ruled in blue with a red header line.",
    },
    css,
    render: {
      board(d, h) {
        const e = h.esc;
        const drawers = d.stages
          .map((s) => {
            const list = h.leadsIn(s.id);
            const mark = s.is_won
              ? `<span class="rx-mini won">✓ Won</span>`
              : s.is_lost
                ? `<span class="rx-mini lost">✕ Lost</span>`
                : `<span class="rx-prob">${s.probability}%</span>`;
            return `<section class="rx-drawer" aria-label="${e(s.name)}">
              <div class="rx-front">
                <div class="rx-holder"><div class="rx-label"><b>${e(s.name)}</b>${mark}</div></div>
                <div class="rx-tally"><span>${list.length} ${list.length === 1 ? "card" : "cards"}</span><b>${e(h.money(h.total(list)))}</b></div>
                <span class="rx-pull" aria-hidden="true"></span>
              </div>
              <div class="rx-slot">${list.map((l) => leadCard(l, h)).join("")}</div>
            </section>`;
          })
          .join("");
        const body = `
          ${pageHead("Leads", `${d.leads.length} leads`, "", `<a class="rx-btn" href="#">Export CSV</a><a class="rx-btn is-primary" href="#">+ New lead</a>`)}
          <div class="rx-controls">
            ${field("Search", `Title, contact or company…`, "rx-search")}
            ${field("Owner", `All owners ${caret}`)}
            ${field("Source", `All sources ${caret}`)}
            <div class="rx-toggle" role="group" aria-label="View"><span class="is-on">Board</span><span>Table</span></div>
          </div>
          <div class="rx-drawers">${drawers}</div>`;
        return chrome(d, h, "Leads", body);
      },

      contacts(d, h) {
        const e = h.esc;
        const sorted = [...d.contacts].sort((a, b) => a.name.localeCompare(b.name));
        const present = new Set(sorted.map((c) => c.name[0].toUpperCase()));
        const az = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
          .split("")
          .map((L) => `<span class="${present.has(L) ? "has" : ""}">${L}</span>`)
          .join("");
        const ranges = [["A", "E"], ["F", "L"], ["M", "Z"]];
        const card = (c) => {
          const dnc = c.doNotContact;
          const tags = c.tags.map((t) => `<span class="rx-sticker">${e(t)}</span>`).join("");
          return `<article class="rx-icard${dnc ? " is-dnc" : ""}${c.id === "c1" ? " is-lifted" : ""}">
            <header>
              <div><h3>${e(c.name)}</h3><p class="rx-ttl${c.title ? "" : " is-none"}">${c.title ? e(c.title) : "No title"}</p></div>
              <span class="rx-letter" aria-hidden="true">${e(c.name[0])}</span>
            </header>
            <dl class="rx-dl">
              <div><dt>Co.</dt><dd>${e(c.company)}</dd></div>
              <div><dt>Email</dt><dd>${e(c.email)}</dd></div>
              <div><dt>Tel</dt><dd class="${c.phone ? "" : "is-none"}">${c.phone ? e(c.phone) : "—"}</dd></div>
              <div><dt>Owner</dt><dd class="${c.owner ? "" : "is-none"}">${c.owner ? e(c.owner) : "Unassigned"}</dd></div>
              <div class="rx-split"><dt>Leads</dt><dd><b>${c.openLeads}</b> open</dd><dt>Added</dt><dd>${e(h.date(c.added))}</dd></div>
            </dl>
            <div class="rx-tags">${tags}${dnc ? `<span class="rx-sticker is-dnc">Do not contact</span>` : ""}${!tags && !dnc ? `<span class="rx-notags">no tags</span>` : ""}</div>
            ${dnc ? stamp("Do not contact", "rx-st-dnc") : ""}
          </article>`;
        };
        const groups = ranges
          .map(([a, z], i) => {
            const list = sorted.filter((c) => {
              const L = c.name[0].toUpperCase();
              return L >= a && L <= z;
            });
            return `<div class="rx-divider" style="--off:${i}"><span class="rx-divtab"><b>${a}–${z}</b><span>${list.length} cards</span></span></div>
              <div class="rx-cards">${list.map(card).join("")}</div>`;
          })
          .join("");
        const body = `
          ${pageHead(
            "Contacts",
            `${d.contacts.length} contacts`,
            "",
            `<a class="rx-btn" href="#">Import CSV</a><a class="rx-btn" href="#">Export CSV</a><a class="rx-btn is-primary" href="#">+ New contact</a>`,
          )}
          <div class="rx-controls">
            ${field("Search", `Name, email or company…`, "rx-search")}
            ${field("Tag", `All tags ${caret}`)}
            ${field("Owner", `All owners ${caret}`)}
            <div class="rx-field" style="margin-left:auto;min-width:0"><span class="rx-fl">Jump to</span><div class="rx-az">${az}</div></div>
          </div>
          <div class="rx-file">${groups}</div>`;
        return chrome(d, h, "Contacts", body);
      },

      detail(d, h) {
        const e = h.esc;
        const D = d.detail;
        const c = D.contact;
        const p = c.privacy;

        const leadsRows = D.leads
          .map((l) => {
            const st = h.stage(l.stageId);
            return `<tr><td>${e(l.title)}</td><td class="stg"><span class="rx-stg${st.is_won ? " is-won" : ""}">${st.is_won ? "✓ " : ""}${e(st.name)}</span></td><td class="num">${e(h.money(l.amount))}</td></tr>`;
          })
          .join("");

        const tasks = D.openTasks
          .map(
            (t) => `<li class="${t.overdue ? "is-late" : ""}">
              <span class="rx-box" aria-hidden="true"></span>
              <div><p>${e(t.body)}</p><small><b>Due ${e(h.dateTime(t.due))}</b> · ${e(t.assignee)} · re: ${e(t.lead)}</small></div>
              ${t.overdue ? `<span class="rx-late">Overdue</span>` : ""}
            </li>`,
          )
          .join("");

        const tl = D.timeline
          .map((it) => {
            const [dt, time] = it.at.split("T");
            const date = `${h.day(dt)}<span>${time}</span>`;
            if (it.kind === "stage") {
              const move = it.from
                ? `Moved from <b>${e(it.from)}</b> to <b>${e(it.to)}</b> by ${e(it.actor)}`
                : `Added to <b>${e(it.to)}</b> by ${e(it.actor)}`;
              return `<div class="rx-entry"><div class="rx-date">${date}</div><div class="rx-move"><span>${move}</span><span class="rx-re">re: ${e(it.lead)}</span></div></div>`;
            }
            const by = it.source
              ? `<span class="rx-by is-src">via ${e(it.source)} · unverified</span>`
              : `<span class="rx-by">${e(it.author)}</span>`;
            const done = it.completedAt;
            return `<div class="rx-entry"><div class="rx-date">${date}</div>
              <article class="rx-act${it.source ? " is-unverified" : ""}${done ? " is-done" : ""}">
                <header><span class="rx-kind">${done ? "✓ " : ""}${e(h.TYPE_LABELS[it.type])}</span>${by}<span class="rx-re">re: ${e(it.lead)}</span></header>
                <p>${e(it.body)}</p>
                ${done ? `<p class="rx-donenote">Completed ${e(h.dateTime(done))}</p>` : ""}
              </article></div>`;
          })
          .join("");

        const body = `
          <a class="rx-back" href="#">← Contacts</a>
          <div class="rx-open">
            <div class="rx-col">
              <section class="rx-sheet rx-master">
                <div class="rx-ident">
                  <span class="rx-avatar" aria-hidden="true">${e(h.initials(c.name))}</span>
                  <div><h1>${e(c.name)}</h1><p>${e(c.title)} at ${e(c.company)}</p></div>
                </div>
                <div class="rx-btnrow">
                  <a class="rx-btn is-primary is-sm" href="#">+ New lead</a>
                  <a class="rx-btn is-sm" href="#">Edit</a>
                  <a class="rx-btn is-danger is-sm" href="#">Delete</a>
                </div>
                <h2 style="font:700 15px/1 var(--rx-label);letter-spacing:.16em;text-transform:uppercase;padding:12px 0 6px">Details</h2>
                <dl class="rx-dl">
                  <div><dt>Email</dt><dd>${e(c.email)}</dd></div>
                  <div><dt>Phone</dt><dd>${e(c.phone)}</dd></div>
                  <div><dt>Company</dt><dd>${e(c.company)}</dd></div>
                  <div><dt>Owner</dt><dd>${e(c.owner)}</dd></div>
                  <div class="rx-tagline"><dt>Tags</dt><dd>${c.tags.map((t) => `<span class="rx-sticker">${e(t)}</span>`).join("")}</dd></div>
                  <div><dt>Added</dt><dd>${e(h.date(c.added))}</dd></div>
                </dl>
              </section>

              <section class="rx-sheet rx-privacy">
                <h2>Privacy <small>GDPR</small></h2>
                <dl class="rx-dl">
                  <div><dt>Basis</dt><dd>${e(p.lawfulBasis)}</dd></div>
                  <div><dt>Consent</dt><dd><span class="rx-box is-x"></span>Given ${e(h.date(p.consent.given))}</dd></div>
                  <div><dt>Source</dt><dd>${e(p.consent.source)}</dd></div>
                </dl>
                <p class="rx-quote">“${e(p.consent.text)}”</p>
                <dl class="rx-dl">
                  <div><dt>Contact</dt><dd><span class="rx-box${p.contactAllowed ? " is-x" : ""}"></span>${p.contactAllowed ? "Allowed" : "Not allowed"}</dd></div>
                </dl>
                ${p.contactAllowed ? stamp("Cleared to contact", "is-ink") : stamp("Do not contact")}
                <div class="rx-btnrow">
                  <a class="rx-btn is-sm" href="#">Withdraw consent</a>
                  <a class="rx-btn is-danger is-sm" href="#">Stop contact</a>
                  <a class="rx-btn is-sm" href="#">Export data</a>
                </div>
              </section>

              <section class="rx-sheet rx-notes">
                <h2>Notes</h2>
                <p>${e(c.notes)}</p>
              </section>
            </div>

            <div class="rx-col">
              <section class="rx-sheet">
                <h2>Leads on file <small>${D.leads.length} cards</small></h2>
                <table class="rx-leadtbl"><tbody>${leadsRows}</tbody></table>
                <div class="rx-totals"><span>Open<b>${e(h.money(D.openValue))}</b></span><span>Won<b>${e(h.money(D.wonValue))}</b></span></div>
              </section>

              <section class="rx-sheet rx-composer">
                <h2>Log activity</h2>
                <div class="rx-types" role="radiogroup" aria-label="Activity type">
                  ${["note", "call", "email", "meeting", "task"].map((t, i) => `<span class="${i === 0 ? "is-on" : ""}"><span class="rx-box${i === 0 ? " is-x" : ""}"></span>${h.TYPE_LABELS[t]}</span>`).join("")}
                </div>
                <div class="rx-typein">Type what happened…</div>
                <footer><span>Filed under ${e(c.name)}</span><a class="rx-btn is-primary" href="#">Log activity</a></footer>
              </section>

              <section class="rx-sheet">
                <h2>Open tasks <small>${D.openTasks.length} pending</small></h2>
                <ul class="rx-tasks">${tasks}</ul>
              </section>

              <section class="rx-sheet">
                <h2>Activity <small>newest first</small></h2>
                <div class="rx-tl">${tl}</div>
              </section>
            </div>
          </div>`;
        return chrome(d, h, "Contacts", body);
      },
    },
  });
})();
