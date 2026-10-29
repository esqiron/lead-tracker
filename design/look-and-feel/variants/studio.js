// Studio — the calm, "expensive" SaaS benchmark: soft silver surfaces, machined
// double-bezel cards, a floating pill nav and one confident lagoon accent.
(function () {
  const I = {
    search: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="M13 13l3.5 3.5"/></svg>`,
    chev: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 8l4 4 4-4"/></svg>`,
    plus: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11"/></svg>`,
    arrowUp: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15V5M6 9l4-4 4 4"/></svg>`,
    arrowDown: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5v10M6 11l4 4 4-4"/></svg>`,
    arrowR: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M11 6l4 4-4 4"/></svg>`,
    back: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15 10H5M9 6l-4 4 4 4"/></svg>`,
    board: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="4" height="12" rx="1.2"/><rect x="8.5" y="4" width="4" height="8" rx="1.2"/><rect x="14" y="4" width="3" height="10" rx="1.2"/></svg>`,
    table: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"/></svg>`,
    out: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4.5H5.5a1 1 0 00-1 1v9a1 1 0 001 1H8M12 7l3 3-3 3M15 10H8"/></svg>`,
    check: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3L15 6.5"/></svg>`,
    note: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 3.5h6l3 3v10h-9z"/><path d="M8 10h4.5M8 13h4.5"/></svg>`,
    call: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6.5 3.5l2 3.5-1.6 1.4a8 8 0 004.7 4.7L13 11.5l3.5 2-.7 2.3c-.2.6-.8 1-1.4.9C8.6 16 4 11.4 3.3 5.6c-.1-.6.3-1.2.9-1.4z"/></svg>`,
    email: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="5" width="14" height="10.5" rx="2"/><path d="M3.5 6l6.5 5 6.5-5"/></svg>`,
    meeting: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/></svg>`,
    task: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="3"/><path d="M7 10.2l2 2 4-4.2"/></svg>`,
    stage: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M12 6l4 4-4 4"/></svg>`,
    globe: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M3.5 10h13M10 3.5c2 2 2 11 0 13M10 3.5c-2 2-2 11 0 13"/></svg>`,
    shield: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3l5.5 2v4.5c0 3.5-2.4 6-5.5 7.5-3.1-1.5-5.5-4-5.5-7.5V5z"/></svg>`,
  };
  const icon = (k, cls = "") => `<span class="st-i ${cls}">${I[k]}</span>`;

  function chrome(d, h, active, body) {
    const e = h.esc;
    return `
<header class="st-top">
  <a class="st-brand" href="#"><span class="st-mark" aria-hidden="true"><i></i></span><span>Lead Tracker</span></a>
  <nav class="st-nav" aria-label="Main">
    ${d.nav.map((n) => `<a href="#" class="${n === active ? "is-on" : ""}"${n === active ? ' aria-current="page"' : ""}>${e(n)}</a>`).join("")}
  </nav>
  <div class="st-who">
    <span class="st-org"><i aria-hidden="true"></i>${e(d.org.name)}</span>
    <span class="st-user"><span class="st-av is-sm">${e(h.initials(d.viewer.name))}</span><span class="st-user-t"><b>${e(d.viewer.name)}</b><small>${e(d.viewer.role)}</small></span></span>
    <a class="st-iconbtn" href="#" aria-label="Sign out" title="Sign out">${I.out}</a>
  </div>
</header>
<main class="st-main">${body}</main>`;
  }

  const btn = (label, cls = "", ic = "") =>
    `<a href="#" class="st-btn ${cls}">${label}${ic ? `<span class="st-btn-ic">${I[ic]}</span>` : ""}</a>`;
  const pill = (label, value) => `<span class="st-select"><small>${label}</small>${value}${icon("chev")}</span>`;
  const avatar = (name, h, cls = "") =>
    name ? `<span class="st-av ${cls}" title="${h.esc(name)}">${h.esc(h.initials(name))}</span>` : `<span class="st-av is-empty ${cls}" title="Unassigned"></span>`;

  function pageHead(eyebrow, title, count, actions) {
    return `<div class="st-head">
      <div>
        <span class="st-eyebrow">${eyebrow}</span>
        <h1>${title}<span class="st-count">${count}</span></h1>
      </div>
      <div class="st-actions">${actions}</div>
    </div>`;
  }

  const css = `
.v-studio {
  --st-bg: #e9ebee;
  --st-surface: #ffffff;
  --st-ink: #15181d;
  --st-muted: #687080;
  --st-faint: #9aa1ad;
  --st-accent: #0b7480;
  --st-accent-soft: #e1f0f1;
  --st-amber: #a15c07;
  --st-amber-soft: #fbf0df;
  --st-rose: #b42345;
  --st-rose-soft: #fbe9ed;
  --st-hair: rgba(21, 24, 29, 0.06);
  --st-shell: rgba(21, 24, 29, 0.035);
  --st-ease: cubic-bezier(0.32, 0.72, 0, 1);
  --st-display: 'Manrope', 'Segoe UI', system-ui, sans-serif;
  --st-body: 'Onest', 'Segoe UI', system-ui, sans-serif;
  --st-shadow: 0 1px 1px rgba(16, 24, 40, 0.04), 0 2px 4px -1px rgba(16, 24, 40, 0.04), 0 16px 32px -16px rgba(16, 24, 40, 0.14);
  min-height: 820px;
  padding: 22px 32px 48px;
  color: var(--st-ink);
  font-family: var(--st-body);
  font-size: 14px;
  background:
    radial-gradient(900px 420px at 50% -160px, rgba(255, 255, 255, 0.9), transparent 70%),
    radial-gradient(700px 500px at 100% 100%, rgba(11, 116, 128, 0.05), transparent 70%),
    linear-gradient(180deg, #eef0f2, var(--st-bg));
}
.v-studio a { color: inherit; text-decoration: none; }
.v-studio h1, .v-studio h2, .v-studio h3, .v-studio p, .v-studio ul, .v-studio dl, .v-studio dd { margin: 0; padding: 0; }
.v-studio ul { list-style: none; }
.v-studio .st-i { display: inline-flex; width: 16px; height: 16px; flex: none; }
.v-studio svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.35; stroke-linecap: round; stroke-linejoin: round; }

/* ---------- floating chrome ---------- */
.v-studio .st-top { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; }
.v-studio .st-brand { display: inline-flex; align-items: center; gap: 10px; font: 700 16px/1 var(--st-display); letter-spacing: -0.02em; justify-self: start; }
.v-studio .st-mark { width: 30px; height: 30px; border-radius: 10px; background: var(--st-ink); display: grid; place-items: center; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 6px 14px -6px rgba(16, 24, 40, 0.5); }
.v-studio .st-mark i { width: 10px; height: 10px; border-radius: 50%; background: var(--st-accent); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.14); }
.v-studio .st-nav {
  display: flex; gap: 2px; padding: 5px; border-radius: 999px; background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 0 0 1px var(--st-hair), 0 10px 30px -12px rgba(16, 24, 40, 0.18), inset 0 1px 0 #fff; backdrop-filter: blur(12px);
}
.v-studio .st-nav a { padding: 8px 16px; border-radius: 999px; font: 500 13.5px/1.2 var(--st-body); color: var(--st-muted); transition: background 0.5s var(--st-ease), color 0.5s var(--st-ease); }
.v-studio .st-nav a.is-on { background: var(--st-ink); color: #fff; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 4px 10px -4px rgba(16, 24, 40, 0.45); }
.v-studio .st-who { display: flex; align-items: center; gap: 8px; justify-self: end; }
.v-studio .st-org { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.6); box-shadow: 0 0 0 1px var(--st-hair); font: 500 12.5px/1.2 var(--st-body); color: var(--st-muted); }
.v-studio .st-org i { width: 7px; height: 7px; border-radius: 50%; background: var(--st-accent); }
.v-studio .st-user { display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px 4px 4px; border-radius: 999px; background: var(--st-surface); box-shadow: var(--st-shadow), 0 0 0 1px var(--st-hair); }
.v-studio .st-user-t { display: flex; flex-direction: column; }
.v-studio .st-user-t b { font: 600 12.5px/1.15 var(--st-body); }
.v-studio .st-user-t small { font: 400 11px/1.2 var(--st-body); color: var(--st-faint); }
.v-studio .st-iconbtn { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: var(--st-muted); background: rgba(255, 255, 255, 0.6); box-shadow: 0 0 0 1px var(--st-hair); }
.v-studio .st-iconbtn svg { width: 17px; height: 17px; }

.v-studio .st-main { margin-top: 40px; }
.v-studio .st-av {
  width: 28px; height: 28px; border-radius: 50%; display: inline-grid; place-items: center; flex: none;
  font: 600 11px/1 var(--st-display); color: #0a5560; background: var(--st-accent-soft); box-shadow: inset 0 0 0 1px rgba(11, 116, 128, 0.12);
}
.v-studio .st-av.is-sm { width: 28px; height: 28px; }
.v-studio .st-av.is-xs { width: 24px; height: 24px; font-size: 10px; }
.v-studio .st-av.is-empty { background: transparent; box-shadow: inset 0 0 0 1.2px var(--st-faint); border: 0; }
.v-studio .st-av.is-empty::after { content: ""; width: 6px; height: 1.2px; background: var(--st-faint); }

/* ---------- heading + controls ---------- */
.v-studio .st-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
.v-studio .st-eyebrow { display: inline-block; padding: 5px 11px; border-radius: 999px; background: rgba(255, 255, 255, 0.7); box-shadow: 0 0 0 1px var(--st-hair); font: 600 10px/1 var(--st-body); letter-spacing: 0.18em; text-transform: uppercase; color: var(--st-muted); }
.v-studio .st-head h1 { margin-top: 14px; font: 600 44px/1 var(--st-display); letter-spacing: -0.035em; display: flex; align-items: baseline; gap: 14px; }
.v-studio .st-count { font: 500 15px/1 var(--st-body); letter-spacing: 0; color: var(--st-faint); }
.v-studio .st-actions { display: flex; gap: 8px; align-items: center; }
.v-studio .st-btn {
  display: inline-flex; align-items: center; gap: 10px; height: 42px; padding: 0 18px; border-radius: 999px; white-space: nowrap;
  font: 500 13.5px/1 var(--st-body); color: var(--st-ink); background: var(--st-surface); box-shadow: var(--st-shadow), 0 0 0 1px var(--st-hair);
  transition: transform 0.6s var(--st-ease);
}
.v-studio .st-btn.is-primary { background: var(--st-accent); color: #fff; padding-right: 5px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 10px 22px -10px rgba(11, 116, 128, 0.8); }
.v-studio .st-btn.is-ink { background: var(--st-ink); color: #fff; padding-right: 5px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 10px 22px -12px rgba(16, 24, 40, 0.7); }
.v-studio .st-btn-ic { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: rgba(255, 255, 255, 0.18); }
.v-studio .st-btn-ic svg { width: 16px; height: 16px; stroke-width: 1.6; }
.v-studio .st-btn.is-ghost { background: transparent; box-shadow: 0 0 0 1px rgba(21, 24, 29, 0.1); }
.v-studio .st-btn.is-danger { color: var(--st-rose); }
.v-studio .st-btn.is-sm { height: 34px; padding: 0 14px; font-size: 12.5px; }

.v-studio .st-toolbar { display: flex; align-items: center; gap: 10px; margin-top: 28px; }
.v-studio .st-search { flex: 1; max-width: 440px; display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 18px; border-radius: 999px; background: var(--st-surface); box-shadow: var(--st-shadow), 0 0 0 1px var(--st-hair); color: var(--st-faint); font: 400 13.5px var(--st-body); }
.v-studio .st-search .st-i { width: 17px; height: 17px; color: var(--st-muted); }
.v-studio .st-search kbd { margin-left: auto; font: 500 11px var(--st-body); color: var(--st-faint); padding: 3px 7px; border-radius: 6px; background: #f2f3f5; }
.v-studio .st-select { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px 0 18px; border-radius: 999px; background: rgba(255, 255, 255, 0.6); box-shadow: 0 0 0 1px rgba(21, 24, 29, 0.08); font: 500 13.5px var(--st-body); white-space: nowrap; }
.v-studio .st-select small { font: 400 13.5px var(--st-body); color: var(--st-faint); }
.v-studio .st-select .st-i { color: var(--st-faint); width: 15px; height: 15px; }
.v-studio .st-seg { display: inline-flex; padding: 4px; border-radius: 999px; background: var(--st-shell); box-shadow: inset 0 0 0 1px var(--st-hair); margin-left: auto; }
.v-studio .st-seg span { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px; border-radius: 999px; font: 500 13px var(--st-body); color: var(--st-muted); }
.v-studio .st-seg span.is-on { background: var(--st-surface); color: var(--st-ink); box-shadow: 0 1px 2px rgba(16, 24, 40, 0.08), 0 4px 10px -4px rgba(16, 24, 40, 0.12); }

/* ---------- double bezel ---------- */
.v-studio .st-shell { padding: 7px; border-radius: 30px; background: var(--st-shell); box-shadow: inset 0 0 0 1px var(--st-hair); }
.v-studio .st-core { background: var(--st-surface); border-radius: 23px; box-shadow: inset 0 1px 0 #fff, 0 0 0 1px rgba(21, 24, 29, 0.04), 0 18px 40px -24px rgba(16, 24, 40, 0.22); }

/* ---------- board ---------- */
.v-studio .st-lanes { margin-top: 24px; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 7px; }
.v-studio .st-lane { border-radius: 23px; background: rgba(255, 255, 255, 0.5); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7); padding: 8px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.v-studio .st-lane-h { padding: 10px 10px 12px; }
.v-studio .st-lane-t { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.v-studio .st-lane-t b { font: 600 13.5px/1.2 var(--st-body); display: inline-flex; align-items: center; gap: 7px; }
.v-studio .st-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(21, 24, 29, 0.18); }
.v-studio .st-lane.is-won .st-dot { background: var(--st-accent); }
.v-studio .st-lane.is-lost .st-dot { background: var(--st-rose); }
.v-studio .st-n { font: 600 11.5px/1 var(--st-body); color: var(--st-muted); background: rgba(21, 24, 29, 0.05); padding: 4px 8px; border-radius: 999px; }
.v-studio .st-lane-v { margin-top: 10px; font: 600 19px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.v-studio .st-lane-m { margin-top: 5px; font: 400 11.5px/1.2 var(--st-body); color: var(--st-faint); }
.v-studio .st-lane.is-won .st-lane-m { color: var(--st-accent); }
.v-studio .st-lane.is-lost .st-lane-m { color: var(--st-rose); }
.v-studio .st-lane.is-won { background: linear-gradient(180deg, rgba(225, 240, 241, 0.9), rgba(255, 255, 255, 0.5) 140px); }
.v-studio .st-card { background: var(--st-surface); border-radius: 17px; padding: 13px 13px 12px; box-shadow: 0 0 0 1px rgba(21, 24, 29, 0.04), 0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 24px -14px rgba(16, 24, 40, 0.2); }
.v-studio .st-card.is-hover { transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(11, 116, 128, 0.25), 0 18px 30px -16px rgba(16, 24, 40, 0.3); }
.v-studio .st-card h3 { font: 600 13.5px/1.3 var(--st-body); letter-spacing: -0.005em; }
.v-studio .st-card .st-sub { margin-top: 4px; font: 400 12px/1.4 var(--st-body); color: var(--st-muted); }
.v-studio .st-card-f { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(21, 24, 29, 0.05); }
.v-studio .st-amt { font: 600 14px/1 var(--st-display); font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.v-studio .st-date { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; font: 500 11.5px/1 var(--st-body); color: var(--st-muted); }
.v-studio .st-date.is-late { color: var(--st-amber); background: var(--st-amber-soft); padding: 5px 8px; border-radius: 999px; }
.v-studio .st-date.is-late::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.v-studio .st-date.is-none { color: var(--st-faint); }
.v-studio .st-why { margin-top: 8px; font: 400 11.5px/1.35 var(--st-body); color: var(--st-rose); background: var(--st-rose-soft); padding: 7px 9px; border-radius: 10px; }
.v-studio .st-card.is-lost h3, .v-studio .st-card.is-lost .st-amt { color: var(--st-muted); }
.v-studio .st-card.is-lost .st-amt { text-decoration: line-through; text-decoration-color: rgba(180, 35, 69, 0.5); }
.v-studio .st-won { display: inline-flex; align-items: center; gap: 4px; font: 600 11px/1 var(--st-body); color: var(--st-accent); }
.v-studio .st-won .st-i { width: 14px; height: 14px; }

/* ---------- contacts ---------- */
.v-studio .st-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
.v-studio .st-table th { text-align: left; font: 600 10.5px/1 var(--st-body); letter-spacing: 0.14em; text-transform: uppercase; color: var(--st-faint); padding: 20px 14px 14px; }
.v-studio .st-table th:first-child, .v-studio .st-table td:first-child { padding-left: 24px; }
.v-studio .st-table th:last-child, .v-studio .st-table td:last-child { padding-right: 24px; }
.v-studio .st-table td { padding: 14px 14px; border-top: 1px solid rgba(21, 24, 29, 0.05); vertical-align: middle; font: 400 13px/1.35 var(--st-body); color: var(--st-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.v-studio .st-table tr.is-sel td { background: #f6f8f9; }
.v-studio .st-table tr.is-sel td:first-child { box-shadow: inset 3px 0 0 var(--st-accent); }
.v-studio .st-table tr.is-dnc td { color: var(--st-faint); }
.v-studio .st-table td.num { text-align: right; font: 600 13.5px var(--st-display); color: var(--st-ink); font-variant-numeric: tabular-nums; }
.v-studio .st-table td.num.is-zero { color: var(--st-faint); font-weight: 500; }
.v-studio .st-table th.num { text-align: right; }
.v-studio .st-person { display: flex; gap: 12px; align-items: center; min-width: 0; }
.v-studio .st-person .st-av { width: 38px; height: 38px; font-size: 12.5px; }
.v-studio .st-person-t { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.v-studio .st-person-t b { font: 600 14px/1.2 var(--st-body); color: var(--st-ink); }
.v-studio .st-person-t small { font: 400 12.5px/1.2 var(--st-body); color: var(--st-muted); }
.v-studio .st-person-t small.is-none { color: var(--st-faint); font-style: italic; }
.v-studio .st-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px; }
.v-studio .st-tag { font: 500 11px/1 var(--st-body); color: var(--st-muted); background: #f1f2f4; padding: 4px 8px; border-radius: 999px; }
.v-studio .st-tag.is-dnc { color: var(--st-rose); background: var(--st-rose-soft); display: inline-flex; gap: 5px; align-items: center; }
.v-studio .st-tag.is-dnc::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.v-studio .st-owner { display: inline-flex; gap: 8px; align-items: center; color: var(--st-ink); }
.v-studio .st-owner.is-none { color: var(--st-faint); }
.v-studio .st-ink { color: var(--st-ink); }
.v-studio .st-tfoot { display: flex; justify-content: space-between; padding: 14px 24px 16px; border-top: 1px solid rgba(21, 24, 29, 0.05); font: 400 12.5px var(--st-body); color: var(--st-faint); }

/* ---------- detail ---------- */
.v-studio .st-back { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px 0 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.6); box-shadow: 0 0 0 1px var(--st-hair); font: 500 13px var(--st-body); color: var(--st-muted); }
.v-studio .st-hero { margin-top: 18px; }
.v-studio .st-hero .st-core { padding: 28px 30px; display: flex; align-items: center; gap: 22px; }
.v-studio .st-hero .st-av { width: 76px; height: 76px; font-size: 24px; border-radius: 26px; background: linear-gradient(160deg, #e6f3f4, #cfe7e9); box-shadow: inset 0 1px 0 #fff, 0 0 0 1px rgba(11, 116, 128, 0.12); }
.v-studio .st-hero h1 { font: 600 36px/1.05 var(--st-display); letter-spacing: -0.035em; }
.v-studio .st-hero p { margin-top: 8px; font: 400 15px var(--st-body); color: var(--st-muted); }
.v-studio .st-hero p b { color: var(--st-ink); font-weight: 500; }
.v-studio .st-hero .st-actions { margin-left: auto; }
.v-studio .st-bento { margin-top: 14px; display: grid; grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr); gap: 14px; align-items: start; }
.v-studio .st-stack { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.v-studio .st-panel .st-core { padding: 22px 24px 24px; }
.v-studio .st-ph { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.v-studio .st-ph h2 { font: 600 16px/1.2 var(--st-display); letter-spacing: -0.015em; display: inline-flex; gap: 8px; align-items: center; }
.v-studio .st-ph h2 .st-n { font-family: var(--st-body); }
.v-studio .st-ph .st-meta { font: 400 12.5px var(--st-body); color: var(--st-faint); }

.v-studio .st-sums { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.v-studio .st-sum { border-radius: 18px; padding: 14px 16px; background: #f5f6f8; }
.v-studio .st-sum small { font: 500 11.5px var(--st-body); color: var(--st-muted); display: block; }
.v-studio .st-sum b { display: block; margin-top: 6px; font: 600 24px/1 var(--st-display); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.v-studio .st-sum.is-acc { background: var(--st-accent-soft); }
.v-studio .st-sum.is-acc small, .v-studio .st-sum.is-acc b { color: #075a63; }
.v-studio .st-leads li { display: grid; grid-template-columns: minmax(0, 1fr) 130px 100px; gap: 12px; align-items: center; padding: 12px 4px; border-top: 1px solid rgba(21, 24, 29, 0.05); }
.v-studio .st-leads li b { font: 500 14px var(--st-body); }
.v-studio .st-leads .st-amt { text-align: right; }
.v-studio .st-stage { justify-self: start; display: inline-flex; align-items: center; gap: 6px; font: 500 12px/1 var(--st-body); color: var(--st-muted); padding: 6px 10px; border-radius: 999px; background: #f2f3f5; }
.v-studio .st-stage::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: rgba(21, 24, 29, 0.25); }
.v-studio .st-stage.is-won { color: #075a63; background: var(--st-accent-soft); }
.v-studio .st-stage.is-won::before { background: var(--st-accent); }

.v-studio .st-compose { border-radius: 20px; background: #f5f6f8; padding: 6px; box-shadow: inset 0 0 0 1px var(--st-hair); }
.v-studio .st-compose .st-seg { margin: 0; background: transparent; box-shadow: none; padding: 2px; }
.v-studio .st-compose .st-seg span { height: 32px; padding: 0 12px; }
.v-studio .st-compose .st-seg .st-i { width: 15px; height: 15px; }
.v-studio .st-textarea { margin-top: 4px; min-height: 92px; border-radius: 15px; background: var(--st-surface); padding: 14px 16px; font: 400 14px/1.5 var(--st-body); color: var(--st-faint); box-shadow: 0 0 0 1px rgba(21, 24, 29, 0.05), 0 2px 6px -3px rgba(16, 24, 40, 0.12); }
.v-studio .st-compose-f { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px 2px 10px; font: 400 12.5px var(--st-body); color: var(--st-faint); }

.v-studio .st-tl { position: relative; }
.v-studio .st-tl::before { content: ""; position: absolute; left: 17px; top: 18px; bottom: 18px; width: 1px; background: linear-gradient(180deg, rgba(21, 24, 29, 0.1), rgba(21, 24, 29, 0.04)); }
.v-studio .st-ev { position: relative; display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 14px; padding: 8px 0; }
.v-studio .st-ev-ic { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--st-surface); color: var(--st-ink); box-shadow: 0 0 0 1px rgba(21, 24, 29, 0.08), 0 4px 10px -6px rgba(16, 24, 40, 0.25); z-index: 1; }
.v-studio .st-ev-ic .st-i { width: 17px; height: 17px; }
.v-studio .st-ev.is-stage .st-ev-ic { width: 26px; height: 26px; margin: 5px; background: #f2f3f5; color: var(--st-muted); box-shadow: none; }
.v-studio .st-ev.is-stage .st-ev-ic .st-i { width: 14px; height: 14px; }
.v-studio .st-ev-b { border-radius: 18px; padding: 14px 16px; background: #f7f8f9; box-shadow: inset 0 0 0 1px var(--st-hair); }
.v-studio .st-ev-h { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; font: 400 12.5px var(--st-body); color: var(--st-faint); }
.v-studio .st-ev-h b { font: 600 13px var(--st-body); color: var(--st-ink); }
.v-studio .st-ev-h .st-lead { color: var(--st-muted); display: inline-flex; gap: 6px; align-items: center; }
.v-studio .st-ev-h .st-lead::before { content: ""; width: 3px; height: 3px; border-radius: 50%; background: var(--st-faint); }
.v-studio .st-ev-h time { margin-left: auto; font-variant-numeric: tabular-nums; }
.v-studio .st-ev-b p { margin-top: 8px; font: 400 14px/1.55 var(--st-body); color: #2c313a; }
.v-studio .st-ev.is-done .st-ev-b p { text-decoration: line-through; text-decoration-color: rgba(21, 24, 29, 0.3); color: var(--st-faint); }
.v-studio .st-ev.is-done .st-ev-ic { background: var(--st-accent-soft); color: var(--st-accent); }
.v-studio .st-src { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px; background: var(--st-amber-soft); color: var(--st-amber); font: 500 12px var(--st-body); }
.v-studio .st-src .st-i { width: 13px; height: 13px; }
.v-studio .st-ev.is-src .st-ev-b { background: #fffaf2; box-shadow: inset 0 0 0 1px rgba(161, 92, 7, 0.14); }
.v-studio .st-ev-s { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; padding: 8px 0; font: 400 13px var(--st-body); color: var(--st-muted); }
.v-studio .st-ev-s .st-chip { font: 500 12px var(--st-body); padding: 4px 9px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21, 24, 29, 0.08); color: var(--st-ink); }
.v-studio .st-ev-s .st-chip.is-to { background: var(--st-ink); color: #fff; box-shadow: none; }
.v-studio .st-ev-s time { margin-left: auto; color: var(--st-faint); font-size: 12.5px; }
.v-studio .st-ev-s .st-lead { color: var(--st-faint); }
.v-studio .st-done { margin-top: 8px; font: 500 12px var(--st-body); color: var(--st-accent); display: inline-flex; gap: 5px; align-items: center; }
.v-studio .st-done .st-i { width: 14px; height: 14px; }

.v-studio .st-tasks li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 12px; padding: 12px 0; border-top: 1px solid rgba(21, 24, 29, 0.05); }
.v-studio .st-tasks li:first-child { border-top: 0; padding-top: 2px; }
.v-studio .st-box { width: 20px; height: 20px; border-radius: 7px; box-shadow: inset 0 0 0 1.4px rgba(21, 24, 29, 0.22); background: var(--st-surface); margin-top: 1px; }
.v-studio .st-tasks p { font: 500 13.5px/1.4 var(--st-body); }
.v-studio .st-tasks .st-tm { margin-top: 7px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font: 400 12px var(--st-body); color: var(--st-muted); }
.v-studio .st-tasks .st-tm .st-date { margin: 0; }
.v-studio .st-tasks .st-tm .st-tag { background: #f2f3f5; }

.v-studio .st-dl div { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 12px; padding: 10px 0; border-top: 1px solid rgba(21, 24, 29, 0.05); align-items: baseline; }
.v-studio .st-dl div:first-child { border-top: 0; padding-top: 0; }
.v-studio .st-dl dt { font: 400 12.5px var(--st-body); color: var(--st-faint); }
.v-studio .st-dl dd { font: 500 13px/1.4 var(--st-body); color: var(--st-ink); overflow-wrap: anywhere; }
.v-studio .st-dl dd .st-tags { margin: 0; }
.v-studio .st-quote { margin: 4px 0 2px; padding: 12px 14px; border-radius: 14px; background: #f5f6f8; font: 400 13px/1.5 var(--st-body); color: #2c313a; }
.v-studio .st-quote small { display: block; margin-top: 6px; color: var(--st-faint); font-size: 12px; }
.v-studio .st-ok { display: inline-flex; align-items: center; gap: 6px; color: #075a63; }
.v-studio .st-ok::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--st-accent); box-shadow: 0 0 0 3px var(--st-accent-soft); }
.v-studio .st-pbtns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.v-studio .st-notes { font: 400 14px/1.6 var(--st-body); color: #2c313a; }
`;

  (window.LT_VARIANTS = window.LT_VARIANTS || []).push({
    id: "studio",
    name: "Studio",
    concept:
      "The calm, expensive SaaS benchmark: soft silver surfaces, machined double-bezel cards and a floating pill nav, with one lagoon accent reserved for what moves money — the version a buyer trusts on first sight.",
    fonts: ["Manrope:wght@500;600;700", "Onest:wght@400;500;600"],
    tokens: {
      color: [
        { name: "Mist", value: "#e9ebee" },
        { name: "Porcelain", value: "#ffffff" },
        { name: "Graphite", value: "#15181d" },
        { name: "Lagoon", value: "#0b7480" },
        { name: "Lagoon tint", value: "#e1f0f1" },
        { name: "Slate", value: "#687080" },
        { name: "Amber (overdue)", value: "#a15c07" },
      ],
      type: [
        { role: "Display & numbers", family: "'Manrope', 'Segoe UI', sans-serif", sample: "Negotiation €27,500", style: "font-weight:600;letter-spacing:-0.03em" },
        { role: "Body & UI", family: "'Onest', 'Segoe UI', sans-serif", sample: "Ioana Petrescu · Brightline Logistics", style: "font-weight:400" },
      ],
      spacing: "4px base; 8/14/24/40 scale; 7px bezel padding; 40px under the floating nav; 44px pill controls.",
      shape: "Concentric radii: 30px shell → 23px core → 17px cards → full pills; hairline rings at 6% ink, shadows diffused to 14% over 32px.",
      signature: "Double-bezel trays — every panel is a white core seated in a faint silver shell, under a floating pill nav with an ink active state.",
    },
    css,
    render: {
      board(d, h) {
        const e = h.esc;
        const lanes = d.stages
          .map((s) => {
            const list = h.leadsIn(s.id);
            const meta = s.is_won ? "Closed won" : s.is_lost ? "Closed lost" : `${s.probability}% probability`;
            const cards = list
              .map((l, i) => {
                let date;
                if (!l.closeDate) date = `<span class="st-date is-none">No close date</span>`;
                else if (l.overdue) date = `<span class="st-date is-late">Overdue · ${e(h.day(l.closeDate))}</span>`;
                else date = `<span class="st-date">${l.status === "open" ? "Closes" : "Closed"} ${e(h.day(l.closeDate))}</span>`;
                return `<article class="st-card${l.status === "lost" ? " is-lost" : ""}${l.id === "l8" ? " is-hover" : ""}">
                  <h3>${e(l.title)}</h3>
                  <p class="st-sub">${e(l.contact)} · ${e(l.company)}</p>
                  ${date}
                  ${l.lostReason ? `<p class="st-why">${e(l.lostReason)}</p>` : ""}
                  <div class="st-card-f"><span class="st-amt">${e(h.money(l.amount))}</span>${l.status === "won" ? `<span class="st-won">${icon("check")}Won</span>` : ""}${avatar(l.owner, h, "is-xs")}</div>
                </article>`;
              })
              .join("");
            return `<section class="st-lane${s.is_won ? " is-won" : ""}${s.is_lost ? " is-lost" : ""}" aria-label="${e(s.name)}">
              <div class="st-lane-h">
                <div class="st-lane-t"><b><i class="st-dot"></i>${e(s.name)}</b><span class="st-n">${list.length}</span></div>
                <div class="st-lane-v">${e(h.money(h.total(list)))}</div>
                <div class="st-lane-m">${meta}</div>
              </div>
              ${cards}
            </section>`;
          })
          .join("");
        const body = `
          ${pageHead("Pipeline", "Leads", `${d.leads.length} leads`, `${btn("Export CSV", "is-ghost")}${btn("New lead", "is-primary", "plus")}`)}
          <div class="st-toolbar">
            <span class="st-search">${icon("search")}Search leads, contacts, companies<kbd>/</kbd></span>
            ${pill("Owner", "Anyone")}
            ${pill("Source", "All")}
            <span class="st-seg" role="group" aria-label="View"><span class="is-on">${icon("board")}Board</span><span>${icon("table")}Table</span></span>
          </div>
          <div class="st-shell" style="margin-top:24px"><div class="st-lanes" style="margin:0">${lanes}</div></div>`;
        return chrome(d, h, "Leads", body);
      },

      contacts(d, h) {
        const e = h.esc;
        const rows = d.contacts
          .map((c) => {
            const tags = c.tags.map((t) => `<span class="st-tag">${e(t)}</span>`).join("");
            const dnc = c.doNotContact ? `<span class="st-tag is-dnc">Do not contact</span>` : "";
            return `<tr class="${c.id === "c1" ? "is-sel" : ""}${c.doNotContact ? " is-dnc" : ""}">
              <td><div class="st-person">${avatar(c.name, h)}<div class="st-person-t"><b>${e(c.name)}</b><small class="${c.title ? "" : "is-none"}">${c.title ? e(c.title) : "No title"}</small>${tags || dnc ? `<div class="st-tags">${dnc}${tags}</div>` : ""}</div></div></td>
              <td class="st-ink">${e(c.email)}</td>
              <td>${c.phone ? e(c.phone) : `<span style="color:var(--st-faint)">—</span>`}</td>
              <td class="st-ink">${e(c.company)}</td>
              <td>${c.owner ? `<span class="st-owner">${avatar(c.owner, h, "is-xs")}${e(c.owner)}</span>` : `<span class="st-owner is-none">${avatar("", h, "is-xs")}Unassigned</span>`}</td>
              <td class="num${c.openLeads ? "" : " is-zero"}">${c.openLeads}</td>
              <td>${e(h.day(c.added))}</td>
            </tr>`;
          })
          .join("");
        const body = `
          ${pageHead("People", "Contacts", `${d.contacts.length} contacts`, `${btn("Import CSV", "is-ghost")}${btn("Export CSV", "is-ghost")}${btn("New contact", "is-primary", "plus")}`)}
          <div class="st-toolbar">
            <span class="st-search">${icon("search")}Search name, email or company<kbd>/</kbd></span>
            ${pill("Tag", "Any")}
            ${pill("Owner", "Anyone")}
          </div>
          <div class="st-shell" style="margin-top:24px"><div class="st-core">
            <table class="st-table">
              <colgroup><col style="width:300px"><col style="width:232px"><col style="width:156px"><col style="width:170px"><col style="width:150px"><col style="width:94px"><col style="width:80px"></colgroup>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Owner</th><th class="num">Open leads</th><th>Added</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="st-tfoot"><span>Showing ${d.contacts.length} of ${d.contacts.length}</span><span>Sorted by most recently updated</span></div>
          </div></div>`;
        return chrome(d, h, "Contacts", body);
      },

      detail(d, h) {
        const e = h.esc;
        const D = d.detail;
        const c = D.contact;
        const p = c.privacy;
        const panel = (title, meta, inner, cls = "") =>
          `<section class="st-shell st-panel ${cls}"><div class="st-core"><div class="st-ph"><h2>${title}</h2>${meta ? `<span class="st-meta">${meta}</span>` : ""}</div>${inner}</div></section>`;

        const leads = `
          <div class="st-sums">
            <div class="st-sum is-acc"><small>Open pipeline</small><b>${e(h.money(D.openValue))}</b></div>
            <div class="st-sum"><small>Won to date</small><b>${e(h.money(D.wonValue))}</b></div>
          </div>
          <ul class="st-leads">${D.leads
            .map((l) => {
              const st = h.stage(l.stageId);
              return `<li><b>${e(l.title)}</b><span class="st-stage${st.is_won ? " is-won" : ""}">${e(st.name)}</span><span class="st-amt">${e(h.money(l.amount))}</span></li>`;
            })
            .join("")}</ul>`;

        const types = ["note", "call", "email", "meeting", "task"];
        const composer = `
          <div class="st-compose">
            <span class="st-seg" role="radiogroup" aria-label="Activity type">${types.map((t, i) => `<span class="${i === 0 ? "is-on" : ""}">${icon(t)}${h.TYPE_LABELS[t]}</span>`).join("")}</span>
            <div class="st-textarea">What happened with Ioana?</div>
            <div class="st-compose-f"><span>Linked to no lead · visible to your team</span>${btn("Log activity", "is-ink is-sm", "arrowR")}</div>
          </div>`;

        const timeline = `<div class="st-tl">${D.timeline
          .map((it) => {
            if (it.kind === "stage") {
              const text = it.from
                ? `<span class="st-chip">${e(it.from)}</span>${icon("arrowR")}<span class="st-chip is-to">${e(it.to)}</span>`
                : `Created in <span class="st-chip is-to">${e(it.to)}</span>`;
              return `<div class="st-ev is-stage"><span class="st-ev-ic">${icon("stage")}</span><div class="st-ev-s">${it.from ? "Moved from" : ""} ${text} <span>by ${e(it.actor)}</span><span class="st-lead">· ${e(it.lead)}</span><time>${e(h.dateTime(it.at))}</time></div></div>`;
            }
            const who = it.source
              ? `<span class="st-src">${icon("globe")}via ${e(it.source)} · unverified</span>`
              : `<b>${e(it.author)}</b>`;
            return `<div class="st-ev${it.completedAt ? " is-done" : ""}${it.source ? " is-src" : ""}">
              <span class="st-ev-ic">${icon(it.completedAt ? "check" : it.type)}</span>
              <div class="st-ev-b">
                <div class="st-ev-h"><b>${e(h.TYPE_LABELS[it.type])}</b>${who}<span class="st-lead">${e(it.lead)}</span><time>${e(h.dateTime(it.at))}</time></div>
                <p>${e(it.body)}</p>
                ${it.completedAt ? `<span class="st-done">${icon("check")}Completed ${e(h.dateTime(it.completedAt))}</span>` : ""}
              </div>
            </div>`;
          })
          .join("")}</div>`;

        const tasks = `<ul class="st-tasks">${D.openTasks
          .map(
            (t) => `<li><span class="st-box" aria-hidden="true"></span><div><p>${e(t.body)}</p>
              <div class="st-tm"><span class="st-date${t.overdue ? " is-late" : ""}">${t.overdue ? "Overdue · " : "Due "}${e(h.dateTime(t.due))}</span><span class="st-owner">${avatar(t.assignee, h, "is-xs")}${e(t.assignee)}</span><span class="st-tag">${e(t.lead)}</span></div></div></li>`,
          )
          .join("")}</ul>`;

        const details = `<dl class="st-dl">
          <div><dt>Email</dt><dd>${e(c.email)}</dd></div>
          <div><dt>Phone</dt><dd>${e(c.phone)}</dd></div>
          <div><dt>Company</dt><dd>${e(c.company)}</dd></div>
          <div><dt>Owner</dt><dd><span class="st-owner">${avatar(c.owner, h, "is-xs")}${e(c.owner)}</span></dd></div>
          <div><dt>Tags</dt><dd><div class="st-tags">${c.tags.map((t) => `<span class="st-tag">${e(t)}</span>`).join("")}</div></dd></div>
          <div><dt>Added</dt><dd>${e(h.day(c.added))}</dd></div>
        </dl>`;

        const privacy = `<dl class="st-dl">
          <div><dt>Lawful basis</dt><dd>${e(p.lawfulBasis)}</dd></div>
          <div><dt>Consent</dt><dd>Given ${e(h.day(p.consent.given))} · ${e(p.consent.source)}</dd></div>
        </dl>
        <div class="st-quote">“${e(p.consent.text)}”<small>Captured via ${e(p.consent.source)} on ${e(h.date(p.consent.given))}</small></div>
        <dl class="st-dl" style="margin-top:10px">
          <div><dt>Contact</dt><dd>${p.contactAllowed ? `<span class="st-ok">Allowed</span>` : "Not allowed"}</dd></div>
        </dl>
        <div class="st-pbtns">${btn("Withdraw consent", "is-ghost is-sm")}${btn("Stop contact", "is-ghost is-sm is-danger")}${btn("Export data", "is-ghost is-sm")}</div>`;

        const body = `
          <a class="st-back" href="#">${icon("back")}Contacts</a>
          <section class="st-shell st-hero"><div class="st-core">
            <span class="st-av">${e(h.initials(c.name))}</span>
            <div><h1>${e(c.name)}</h1><p>${e(c.title)} at <b>${e(c.company)}</b></p></div>
            <div class="st-actions">${btn("Delete", "is-ghost is-danger")}${btn("Edit", "is-ghost")}${btn("New lead", "is-primary", "plus")}</div>
          </div></section>
          <div class="st-bento">
            <div class="st-stack">
              ${panel(`Leads <span class="st-n">${D.leads.length}</span>`, "", leads)}
              ${panel("Log activity", "", composer)}
              ${panel("Activity", "Newest first", timeline)}
            </div>
            <div class="st-stack">
              ${panel(`Open tasks <span class="st-n">${D.openTasks.length}</span>`, "", tasks)}
              ${panel("Details", "", details)}
              ${panel(`<span class="st-i" style="width:17px;height:17px;color:var(--st-muted)">${I.shield}</span>Privacy`, "GDPR", privacy)}
              ${panel("Notes", "", `<p class="st-notes">${e(c.notes)}</p>`)}
            </div>
          </div>`;
        return chrome(d, h, "Contacts", body);
      },
    },
  });
})();
