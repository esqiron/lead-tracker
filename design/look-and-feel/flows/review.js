// Weekly review — keeping the CRM honest as a short guided ritual: one deal at a
// time, three questions, one-tap answers, and a clear record of what changed. Studio look.
(function () {
  const TODAY = "2026-10-28";
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const toUTC = (iso) => { const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); };
  const dow = (iso) => DOW[new Date(toUTC(iso)).getUTCDay()];

  const I = {
    out: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4.5H5.5a1 1 0 00-1 1v9a1 1 0 001 1H8M12 7l3 3-3 3M15 10H8"/></svg>`,
    arrowR: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M11 6l4 4-4 4"/></svg>`,
    check: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3L15 6.5"/></svg>`,
    keep: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M7 10.3l2 2 4-4.3"/></svg>`,
    push: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="12" rx="2"/><path d="M3.5 8.5h13M7 3v3M13 3v3M8 12.5h4.5M11 11l1.5 1.5L11 14"/></svg>`,
    lost: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M7.5 7.5l5 5M12.5 7.5l-5 5"/></svg>`,
    pause: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 5.5v9M12.5 5.5v9"/></svg>`,
    clock: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.6"/></svg>`,
    flag: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 17V3.5M5 4h9l-2 3.2 2 3.3H5"/></svg>`,
    hist: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10a6 6 0 106-6 6 6 0 00-4.5 2"/><path d="M4.5 3.5v3h3"/></svg>`,
    move: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M12 6l4 4-4 4"/></svg>`,
    person: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="7.5" r="3"/><path d="M4.5 16c.7-2.8 2.8-4.3 5.5-4.3s4.8 1.5 5.5 4.3"/></svg>`,
    copy: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="2"/><path d="M13 7V5.5a1.5 1.5 0 00-1.5-1.5h-6A1.5 1.5 0 004 5.5v6A1.5 1.5 0 005.5 13H7"/></svg>`,
  };
  const ic = (k, cls = "") => `<span class="st-i ${cls}">${I[k]}</span>`;

  function chrome(d, h, body, center) {
    const e = h.esc;
    const nav = center || `<nav class="st-nav" aria-label="Main">${d.nav.map((n) => `<a href="#" class="${n === "Dashboard" ? "is-on" : ""}"${n === "Dashboard" ? ' aria-current="page"' : ""}>${e(n)}</a>`).join("")}</nav>`;
    return `
<header class="st-top">
  <a class="st-brand" href="#"><span class="st-mark" aria-hidden="true"><i></i></span><span>Lead Tracker</span></a>
  ${nav}
  <div class="st-who">
    <span class="st-org"><i aria-hidden="true"></i>${e(d.org.name)}</span>
    <span class="st-user"><span class="st-av is-sm">${e(h.initials(d.viewer.name))}</span><span class="st-user-t"><b>${e(d.viewer.name)}</b><small>${e(d.viewer.role)}</small></span></span>
    <a class="st-iconbtn" href="#" aria-label="Sign out" title="Sign out">${I.out}</a>
  </div>
</header>
<main class="st-main rv-main">${body}</main>`;
  }

  // A deal needs a look when its close date has passed, nobody has touched it in 14+ days,
  // or nobody owns it. Review order: furthest stage first, then biggest first.
  const stageIdx = (id) => Number(id.slice(1));
  function plan(d) {
    const open = d.leads.filter((l) => l.status === "open");
    const needs = (l) => l.overdue || d.touch[l.id].days >= 14 || !l.owner;
    const order = (a, b) => stageIdx(b.stageId) - stageIdx(a.stageId) || b.amount - a.amount;
    const attention = open.filter(needs).sort(order);
    const fine = open.filter((l) => !needs(l)).sort(order);
    return { open, attention, fine, all: attention.concat(fine) };
  }
  function reasons(l, d, h) {
    const t = d.touch[l.id];
    const out = [];
    if (l.overdue) out.push(`<span class="rv-why is-date">${ic("clock")}Close date passed · ${h.esc(h.day(l.closeDate))}</span>`);
    if (t.days >= 14) out.push(`<span class="rv-why">${t.days} days since last touch</span>`);
    if (!l.owner) out.push(`<span class="rv-why">No owner</span>`);
    return out.join("");
  }
  const weighted = (list, h, over = {}) =>
    list.reduce((s, l) => {
      const o = over[l.id] || {};
      if (o.lost) return s;
      return s + (l.amount * h.stage(o.stageId || l.stageId).probability) / 100;
    }, 0);

  // What the review decided (shown mid-way on screen 2 and summed up on screen 3).
  const DECISIONS = {
    l8: { label: "Kept · next step Thu 29 Oct" },
    l9: { label: "Lost · timing", lost: true, reason: "Timing" },
    l5: { label: "Kept · follow-up Mon 2 Nov" },
    l6: { closeDate: "2027-01-15" },
    l3: { owner: "Priya Nair", closeDate: "2026-12-15" },
    l7: { stageId: "s4" },
  };

  const css = `
.f-review .rv-main { margin-top: 34px; }
.f-review ol { list-style: none; margin: 0; padding: 0; }
.f-review kbd { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 7px; font: 600 11px/1 var(--st-body); color: var(--st-muted); background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.1), inset 0 -1.5px 0 rgba(21,24,29,.08); }

/* ---------- start ---------- */
.f-review .rv-start { display: grid; grid-template-columns: minmax(0, 1fr) 600px; gap: 48px; align-items: start; padding: 18px 8px 0 16px; }
.f-review .rv-start h1 { font: 600 58px/1.02 var(--st-display); letter-spacing: -0.04em; text-wrap: balance; }
.f-review .rv-start h1 span { color: var(--st-faint); }
.f-review .rv-lede { margin-top: 18px; max-width: 46ch; font: 400 17px/1.55 var(--st-body); color: var(--st-muted); }
.f-review .rv-lede b { color: var(--st-ink); font-weight: 500; }
.f-review .rv-qs-h { margin-top: 34px; font: 600 14px var(--st-body); }
.f-review .rv-qs { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; counter-reset: q; }
.f-review .rv-qs li { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 14px; align-items: start; padding: 14px 16px; border-radius: 20px; background: rgba(255,255,255,.6); box-shadow: inset 0 0 0 1px rgba(255,255,255,.8), 0 0 0 1px var(--st-hair); counter-increment: q; }
.f-review .rv-qs li::before { content: counter(q); width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; font: 600 13px/1 var(--st-display); background: var(--st-ink); color: #fff; }
.f-review .rv-qs b { display: block; font: 600 15px/1.3 var(--st-body); }
.f-review .rv-qs small { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; font: 400 13px/1.4 var(--st-body); color: var(--st-muted); }
.f-review .rv-ans { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px 5px 6px; border-radius: 999px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.07); font: 500 12.5px/1 var(--st-body); color: #2c313a; }
.f-review .rv-ans kbd { min-width: 18px; height: 18px; font-size: 10.5px; border-radius: 5px; padding: 0 4px; }
.f-review .rv-go { margin-top: 30px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.f-review .rv-go .st-btn { height: 52px; padding-left: 24px; font-size: 15px; }
.f-review .rv-go .st-btn .st-btn-ic { width: 40px; height: 40px; }
.f-review .rv-go .st-btn.is-ghost { padding: 0 20px; }
.f-review .rv-go-k { display: inline-flex; align-items: center; gap: 6px; font: 400 12.5px var(--st-body); color: var(--st-faint); }
.f-review .rv-foot { margin-top: 16px; font: 400 13px/1.5 var(--st-body); color: var(--st-faint); max-width: 52ch; }

.f-review .rv-deck .st-core { padding: 22px 22px 18px; }
.f-review .rv-ph { display: flex; align-items: center; gap: 10px; margin: 0 4px 12px; }
.f-review .rv-ph h2 { font: 600 17px/1.2 var(--st-display); letter-spacing: -0.015em; }
.f-review .rv-ph .st-n { font-family: var(--st-body); }
.f-review .rv-ph small { margin-left: auto; font: 400 12.5px var(--st-body); color: var(--st-faint); }
.f-review .rv-q { display: flex; flex-direction: column; gap: 6px; }
.f-review .rv-qi { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 14px 14px; border-radius: 18px; background: #f7f8f9; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-review .rv-qi:first-child { background: var(--st-surface); box-shadow: 0 0 0 1px rgba(11,116,128,.25), 0 14px 28px -18px rgba(16,24,40,.35); }
.f-review .rv-num { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font: 600 12px/1 var(--st-display); color: var(--st-muted); background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08); }
.f-review .rv-qi:first-child .rv-num { background: var(--st-accent); color: #fff; box-shadow: none; }
.f-review .rv-qi b { font: 600 14px/1.3 var(--st-body); }
.f-review .rv-qi p { margin-top: 3px; font: 400 12.5px/1.35 var(--st-body); color: var(--st-muted); }
.f-review .rv-whys { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }
.f-review .rv-why { display: inline-flex; align-items: center; gap: 5px; font: 500 11.5px/1 var(--st-body); color: var(--st-muted); padding: 5px 9px; border-radius: 999px; background: #eceef1; }
.f-review .rv-why .st-i { width: 12px; height: 12px; }
.f-review .rv-why.is-date { color: var(--st-amber); background: var(--st-amber-soft); }
.f-review .rv-amt { font: 600 15px/1.2 var(--st-display); letter-spacing: -0.01em; font-variant-numeric: tabular-nums; text-align: right; }
.f-review .rv-amt small { display: block; margin-top: 4px; font: 400 11.5px var(--st-body); color: var(--st-faint); letter-spacing: 0; }
.f-review .rv-fine { margin-top: 16px; padding: 14px 4px 0; border-top: 1px solid rgba(21,24,29,.06); }
.f-review .rv-fine p { margin: 0 0 10px; font: 400 13px/1.45 var(--st-body); color: var(--st-muted); }
.f-review .rv-fine p b { color: var(--st-ink); font-weight: 600; }
.f-review .rv-fine ul { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
.f-review .rv-fine li { display: flex; justify-content: space-between; gap: 8px; font: 400 12.5px/1.6 var(--st-body); color: #2c313a; min-width: 0; }
.f-review .rv-fine li span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-review .rv-fine li em { font-style: normal; color: var(--st-faint); font-variant-numeric: tabular-nums; white-space: nowrap; }
.f-review .rv-now { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 16px; background: var(--st-accent-soft); color: #075a63; font: 500 13px var(--st-body); }
.f-review .rv-now b { font: 600 18px/1 var(--st-display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

/* ---------- mid-review ---------- */
.f-review .rv-bar { display: flex; align-items: center; gap: 14px; padding: 6px 6px 6px 18px; border-radius: 999px; background: rgba(255,255,255,.8); box-shadow: 0 0 0 1px var(--st-hair), 0 10px 30px -12px rgba(16,24,40,.18), inset 0 1px 0 #fff; }
.f-review .rv-bar > b { font: 600 13.5px/1 var(--st-body); white-space: nowrap; }
.f-review .rv-ticks { display: flex; gap: 3px; }
.f-review .rv-ticks i { width: 14px; height: 6px; border-radius: 999px; background: rgba(21,24,29,.1); }
.f-review .rv-ticks i.is-done { background: var(--st-accent); }
.f-review .rv-ticks i.is-now { background: var(--st-ink); width: 26px; }
.f-review .rv-bar > span { font: 500 13px/1 var(--st-body); color: var(--st-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.f-review .rv-pause { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px 0 9px; border-radius: 999px; background: var(--st-ink); color: #fff; font: 500 12.5px/1 var(--st-body); }
.f-review .rv-pause .st-i { width: 14px; height: 14px; }

.f-review .rv-mid { display: grid; grid-template-columns: 256px minmax(0, 1fr); gap: 20px; align-items: start; }
.f-review .rv-rail { padding-top: 6px; display: flex; flex-direction: column; gap: 4px; }
.f-review .rv-rail h3 { font: 500 12px/1 var(--st-body); color: var(--st-faint); padding: 14px 12px 8px; }
.f-review .rv-rail h3:first-child { padding-top: 0; }
.f-review .rv-ri { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 10px; align-items: start; padding: 9px 12px; border-radius: 14px; }
.f-review .rv-ri .rv-dot { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; box-shadow: inset 0 0 0 1.4px rgba(21,24,29,.18); margin-top: 1px; }
.f-review .rv-ri.is-done .rv-dot { background: var(--st-accent); box-shadow: none; color: #fff; }
.f-review .rv-ri.is-done .rv-dot .st-i { width: 12px; height: 12px; }
.f-review .rv-ri.is-done .rv-dot svg { stroke-width: 2.2; }
.f-review .rv-ri.is-now { background: var(--st-surface); box-shadow: var(--st-shadow), 0 0 0 1px var(--st-hair); }
.f-review .rv-ri.is-now .rv-dot { box-shadow: inset 0 0 0 6px var(--st-ink); }
.f-review .rv-ri b { display: block; font: 500 13px/1.3 var(--st-body); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.f-review .rv-ri.is-now b { font-weight: 600; }
.f-review .rv-ri small { display: block; margin-top: 2px; font: 400 11.5px/1.3 var(--st-body); color: var(--st-faint); }
.f-review .rv-ri.is-done small { color: #0a5560; }
.f-review .rv-ri.is-done small.is-lost { color: var(--st-rose); }
.f-review .rv-ri.is-fine { padding-block: 5px; }
.f-review .rv-ri.is-fine .rv-dot { width: 8px; height: 8px; margin: 5px 6px; box-shadow: none; background: rgba(21,24,29,.15); }
.f-review .rv-ri.is-fine b { font-weight: 400; color: var(--st-muted); }

.f-review .rv-card .st-core { padding: 28px 32px 0; overflow: hidden; }
.f-review .rv-ch { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: start; }
.f-review .rv-ch h1 { font: 600 38px/1.05 var(--st-display); letter-spacing: -0.035em; }
.f-review .rv-ch > div > p { margin-top: 8px; font: 400 14.5px var(--st-body); color: var(--st-muted); }
.f-review .rv-ch > div > p b { color: var(--st-ink); font-weight: 500; }
.f-review .rv-money { text-align: right; }
.f-review .rv-money b { display: block; font: 600 30px/1 var(--st-display); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.f-review .rv-money span { display: inline-flex; margin-top: 10px; font: 500 12px/1 var(--st-body); color: var(--st-muted); padding: 6px 10px; border-radius: 999px; background: #f2f3f5; }
.f-review .rv-ctx { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
.f-review .rv-ctx > div { padding: 14px 16px; border-radius: 18px; background: #f7f8f9; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-review .rv-ctx h4 { display: flex; align-items: center; gap: 7px; font: 600 12.5px/1.2 var(--st-body); color: var(--st-muted); }
.f-review .rv-ctx h4 .st-i { width: 14px; height: 14px; }
.f-review .rv-ctx p { margin-top: 7px; font: 400 13.5px/1.5 var(--st-body); color: #2c313a; }
.f-review .rv-ctx .rv-whys { margin-top: 10px; }
.f-review .rv-ctx .is-warn { background: var(--st-rose-soft); box-shadow: inset 0 0 0 1px rgba(180,35,69,.12); }
.f-review .rv-ctx .is-warn h4 { color: var(--st-rose); }

.f-review .rv-ask { margin-top: 22px; padding-top: 20px; border-top: 1px solid rgba(21,24,29,.06); }
.f-review .rv-ask + .rv-ask { margin-top: 0; }
.f-review .rv-ask-h { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.f-review .rv-ask-h b { font: 600 17px/1.2 var(--st-display); letter-spacing: -0.015em; }
.f-review .rv-ask-h small { font: 500 12px var(--st-body); color: var(--st-faint); }
.f-review .rv-ask-h em { margin-left: auto; font: normal 500 12px var(--st-body); color: #0a5560; display: inline-flex; gap: 5px; align-items: center; }
.f-review .rv-ask-h em .st-i { width: 14px; height: 14px; }
.f-review .rv-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.f-review .rv-tile { position: relative; display: flex; flex-direction: column; gap: 6px; min-height: 120px; padding: 16px 18px; border-radius: 22px; background: var(--st-surface); box-shadow: 0 0 0 1px rgba(21,24,29,.08), 0 8px 18px -14px rgba(16,24,40,.3); }
.f-review .rv-tile > .st-i { width: 22px; height: 22px; color: var(--st-muted); }
.f-review .rv-tile b { font: 600 17px/1.2 var(--st-display); letter-spacing: -0.015em; }
.f-review .rv-tile p { font: 400 12.5px/1.4 var(--st-body); color: var(--st-muted); }
.f-review .rv-tile kbd { position: absolute; top: 14px; right: 14px; }
.f-review .rv-tile.is-on { background: var(--st-ink); color: #fff; box-shadow: 0 0 0 4px rgba(21,24,29,.1), 0 18px 32px -16px rgba(16,24,40,.7); }
.f-review .rv-tile.is-on > .st-i { color: #7fd0d8; }
.f-review .rv-tile.is-on p { color: rgba(255,255,255,.66); }
.f-review .rv-tile.is-on kbd { background: rgba(255,255,255,.14); color: #fff; box-shadow: none; }
.f-review .rv-tile.is-lost > .st-i { color: var(--st-rose); }
.f-review .rv-reasons { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.f-review .rv-reasons span { font: 500 11.5px/1 var(--st-body); padding: 6px 9px; border-radius: 999px; background: var(--st-rose-soft); color: var(--st-rose); }
.f-review .rv-picks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.f-review .rv-pick { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 13px 16px; border-radius: 18px; background: #f5f6f8; box-shadow: inset 0 0 0 1px var(--st-hair); }
.f-review .rv-pick b { font: 600 15px/1.2 var(--st-display); letter-spacing: -0.01em; }
.f-review .rv-pick small { font: 400 12px var(--st-body); color: var(--st-muted); }
.f-review .rv-pick kbd { position: absolute; top: 11px; right: 11px; min-width: 20px; height: 20px; font-size: 10.5px; }
.f-review .rv-pick.is-on { background: var(--st-accent-soft); box-shadow: inset 0 0 0 1.5px var(--st-accent); }
.f-review .rv-pick.is-on b, .f-review .rv-pick.is-on small { color: #075a63; }
.f-review .rv-next { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: center; }
.f-review .rv-input { display: flex; align-items: center; gap: 10px; height: 50px; padding: 0 18px; border-radius: 16px; background: var(--st-surface); box-shadow: 0 0 0 1.5px var(--st-accent), 0 0 0 5px rgba(11,116,128,.1); font: 400 15px var(--st-body); color: var(--st-ink); }
.f-review .rv-caret { width: 1.5px; height: 20px; background: var(--st-accent); margin-left: -8px; }
.f-review .rv-field { display: inline-flex; align-items: center; gap: 8px; height: 50px; padding: 0 16px; border-radius: 16px; background: #f5f6f8; box-shadow: inset 0 0 0 1px var(--st-hair); font: 500 13.5px var(--st-body); white-space: nowrap; }
.f-review .rv-field small { font: 400 12px var(--st-body); color: var(--st-faint); }
.f-review .rv-field .st-av { width: 24px; height: 24px; font-size: 10px; }
.f-review .rv-was { margin-top: 8px; font: 400 12.5px var(--st-body); color: var(--st-faint); }
.f-review .rv-was s { text-decoration-color: rgba(21,24,29,.3); }
.f-review .rv-cf { margin: 24px -32px 0; padding: 14px 16px 14px 32px; display: flex; align-items: center; gap: 12px; background: #f7f8f9; border-top: 1px solid rgba(21,24,29,.05); }
.f-review .rv-delta { font: 400 13px/1.4 var(--st-body); color: var(--st-muted); }
.f-review .rv-delta b { color: var(--st-ink); font-weight: 600; }
.f-review .rv-cf .st-btn { margin-left: auto; }
.f-review .rv-cf .st-btn:last-child { margin-left: 0; }
.f-review .rv-keys { margin-top: 14px; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px; font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-review .rv-keys span { display: inline-flex; align-items: center; gap: 6px; }

/* ---------- done ---------- */
.f-review .rv-done-h { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: end; padding: 8px 8px 0; }
.f-review .rv-done-h h1 { font: 600 46px/1.05 var(--st-display); letter-spacing: -0.035em; }
.f-review .rv-done-h p { margin-top: 10px; font: 400 16px/1.5 var(--st-body); color: var(--st-muted); max-width: 60ch; }
.f-review .rv-tally { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 16px; }
.f-review .rv-tally span { font: 500 12.5px/1 var(--st-body); padding: 7px 11px; border-radius: 999px; background: rgba(255,255,255,.7); box-shadow: 0 0 0 1px var(--st-hair); color: #2c313a; }
.f-review .rv-tally span b { font-weight: 600; }
.f-review .rv-done-grid { margin-top: 24px; display: grid; grid-template-columns: minmax(0, 1fr) 470px; gap: 14px; align-items: start; }
.f-review .rv-panel .st-core { padding: 22px 24px 20px; }
.f-review .rv-chg { display: flex; flex-direction: column; }
.f-review .rv-chg li { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 13px 0; border-top: 1px solid rgba(21,24,29,.05); }
.f-review .rv-chg li:first-child { border-top: 0; padding-top: 4px; }
.f-review .rv-chg-ic { width: 34px; height: 34px; border-radius: 12px; display: grid; place-items: center; background: #f2f3f5; color: var(--st-muted); }
.f-review .rv-chg-ic .st-i { width: 17px; height: 17px; }
.f-review .rv-chg-ic.is-move { background: var(--st-accent-soft); color: var(--st-accent); }
.f-review .rv-chg-ic.is-lost { background: var(--st-rose-soft); color: var(--st-rose); }
.f-review .rv-chg-ic.is-date { background: var(--st-amber-soft); color: var(--st-amber); }
.f-review .rv-chg b { display: block; font: 600 14px/1.3 var(--st-body); }
.f-review .rv-chg small { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; font: 400 12.5px var(--st-body); color: var(--st-muted); }
.f-review .rv-from { text-decoration: line-through; text-decoration-color: rgba(21,24,29,.3); color: var(--st-faint); }
.f-review .rv-to { font-weight: 600; color: var(--st-ink); }
.f-review .rv-chg small .st-i { width: 13px; height: 13px; color: var(--st-faint); }
.f-review .rv-chg .rv-amt { font-size: 14px; }
.f-review .rv-kept { margin-top: 6px; padding: 12px 14px; border-radius: 16px; background: #f7f8f9; font: 400 12.5px/1.5 var(--st-body); color: var(--st-muted); }
.f-review .rv-kept b { color: var(--st-ink); font-weight: 600; }

.f-review .rv-fc-top { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center; margin-bottom: 18px; }
.f-review .rv-fc-top > div { padding: 14px 16px; border-radius: 18px; background: #f5f6f8; }
.f-review .rv-fc-top > div.is-after { background: var(--st-accent-soft); }
.f-review .rv-fc-top small { display: block; font: 500 12px var(--st-body); color: var(--st-muted); }
.f-review .rv-fc-top .is-after small { color: #0a5560; }
.f-review .rv-fc-top b { display: block; margin-top: 6px; font: 600 25px/1 var(--st-display); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.f-review .rv-fc-top .is-after b { color: #075a63; }
.f-review .rv-fc-top > .st-i { width: 18px; height: 18px; color: var(--st-faint); }
.f-review .rv-bridge { display: flex; flex-direction: column; gap: 10px; }
.f-review .rv-br { display: grid; grid-template-columns: minmax(0, 1fr) 150px 74px; gap: 12px; align-items: center; font: 400 13px/1.35 var(--st-body); color: #2c313a; }
.f-review .rv-br small { display: block; font-size: 12px; color: var(--st-faint); }
.f-review .rv-br-bar { height: 10px; border-radius: 999px; background: #eef0f2; position: relative; }
.f-review .rv-br-bar i { position: absolute; top: 0; bottom: 0; border-radius: 999px; }
.f-review .rv-br-v { text-align: right; font: 600 13.5px var(--st-display); font-variant-numeric: tabular-nums; }
.f-review .rv-br-v.is-neg { color: var(--st-rose); }
.f-review .rv-br-v.is-pos { color: var(--st-accent); }
.f-review .rv-br-v.is-zero { color: var(--st-faint); font-weight: 500; }
.f-review .rv-note { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(21,24,29,.06); font: 400 12.5px/1.5 var(--st-body); color: var(--st-muted); }
.f-review .rv-note b { color: var(--st-ink); font-weight: 600; font-variant-numeric: tabular-nums; }

.f-review .rv-steps { margin-top: 14px; }
.f-review .rv-steps li { display: grid; grid-template-columns: 22px minmax(0, 1fr) 210px 150px 96px; gap: 14px; align-items: center; padding: 12px 0; border-top: 1px solid rgba(21,24,29,.05); font: 400 13px var(--st-body); color: var(--st-muted); }
.f-review .rv-steps li:first-child { border-top: 0; padding-top: 2px; }
.f-review .rv-steps .st-box { width: 20px; height: 20px; border-radius: 7px; box-shadow: inset 0 0 0 1.4px rgba(21,24,29,.22); }
.f-review .rv-steps b { font: 500 14px/1.35 var(--st-body); color: var(--st-ink); }
.f-review .rv-steps .st-owner { display: inline-flex; gap: 8px; align-items: center; color: #2c313a; white-space: nowrap; }
.f-review .rv-steps .st-av { width: 24px; height: 24px; font-size: 10px; }
.f-review .rv-steps .rv-d { justify-self: end; font: 500 12px/1 var(--st-body); color: var(--st-muted); padding: 6px 10px; border-radius: 999px; background: #f2f3f5; white-space: nowrap; }
.f-review .rv-steps .rv-d.is-soon { color: #075a63; background: var(--st-accent-soft); }
.f-review .rv-steps-f { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding-top: 16px; border-top: 1px solid rgba(21,24,29,.06); font: 400 13px var(--st-body); color: var(--st-muted); }
.f-review .rv-steps-f > span { margin-right: auto; }
.f-review .rv-steps-f b { color: var(--st-ink); font-weight: 600; }
.f-review .st-btn.is-ghost .st-i { width: 15px; height: 15px; }
`;

  (window.LT_FLOWS = window.LT_FLOWS || []).push({
    id: "review",
    name: "Weekly review",
    look: "studio",
    pitch: "Once a week, six minutes, one deal at a time: Lead Tracker asks three questions about each deal and your pipeline is true again.",
    problem:
      "Boards rot quietly. Close dates pass, deals nobody has touched in a month still count toward the forecast, and cleaning that up means opening every card and editing fields. Nobody does it until the numbers are embarrassing, so the pipeline report is fiction most weeks.",
    principles: [
      "A short ritual instead of a chore: it shows how many deals, how many need attention and how long it will take, then walks you through them.",
      "Three questions per deal, always the same: Still on track? When will it close? What's the next step?",
      "Big one-tap answers with keyboard keys (Keep, Push date, Mark lost with a reason), so a healthy deal takes two seconds.",
      "The deals that need attention come first; the healthy ones are confirmed together at the end.",
      "It ends with a receipt: what changed, how the forecast moved and why, and the next steps it created for each owner.",
    ],
    tradeoffs:
      "It's a weekly habit, not a daily workspace, so it sits alongside the board or inbox rather than replacing them. It assumes someone (an owner or a manager) will actually set aside the time; teams with hundreds of open deals would need it split by owner.",
    fonts: [],
    css,
    screens: [
      {
        id: "start",
        title: "Start the review",
        caption: "Wednesday morning. Lead Tracker says what the review covers, how long it will take and what it will ask, before Ana commits to it.",
        render(d, h) {
          const e = h.esc;
          const p = plan(d);
          const rows = p.attention
            .map(
              (l, i) => `<li class="rv-qi"><span class="rv-num">${i + 1}</span>
                <div><b>${e(l.title)}</b><p>${e(l.contact)} · ${e(l.company)} · ${e(h.stage(l.stageId).name)}</p><div class="rv-whys">${reasons(l, d, h)}</div></div>
                <span class="rv-amt">${e(h.money(l.amount))}<small>${l.owner ? e(l.owner.split(" ")[0]) : "Unassigned"}</small></span></li>`,
            )
            .join("");
          const fine = p.fine.map((l) => `<li><span>${e(l.title)}</span><em>${e(h.moneyShort(l.amount))}</em></li>`).join("");
          const minutes = Math.round((p.attention.length * 60 + p.fine.length * 8) / 60);
          const body = `<div class="rv-start">
            <div>
              <h1>${p.open.length} open deals.<br><span>${p.attention.length} need a look.</span></h1>
              <p class="rv-lede">About <b>${minutes} minutes</b>, one deal at a time. Furthest stage first, so the money closest to closing gets checked first.</p>
              <p class="rv-qs-h">For each deal you'll answer three questions</p>
              <ol class="rv-qs">
                <li><div><b>Is it still on track?</b><small><span class="rv-ans"><kbd>K</kbd>Keep</span><span class="rv-ans"><kbd>P</kbd>Push the date</span><span class="rv-ans"><kbd>L</kbd>Mark lost, with a reason</span></small></div></li>
                <li><div><b>When will it close?</b><small>Keep the date, or pick a new one in one tap</small></div></li>
                <li><div><b>What's the next step?</b><small>Who does what, by when. It lands in their Today list.</small></div></li>
              </ol>
              <div class="rv-go">
                <a href="#" class="st-btn is-primary">Start with ${e(p.attention[0].title)}<span class="st-btn-ic">${I.arrowR}</span></a>
                <a href="#" class="st-btn is-ghost">Remind me Friday</a>
                <span class="rv-go-k"><kbd>↵</kbd> to start</span>
              </div>
              <p class="rv-foot">You can pause at any point. Answers save as you go, and nothing changes on a deal you skip.</p>
            </div>
            <section class="st-shell rv-deck"><div class="st-core">
              <div class="rv-ph"><h2>Needs a look</h2><span class="st-n">${p.attention.length}</span><small>In review order</small></div>
              <ol class="rv-q">${rows}</ol>
              <div class="rv-fine">
                <p><b>${p.fine.length} look fine.</b> Touched in the last two weeks, close date ahead, owner set. You'll confirm them together at the end.</p>
                <ul>${fine}</ul>
              </div>
              <div class="rv-now"><span>Weighted forecast before the review</span><b>${e(h.money(Math.round(weighted(p.open, h))))}</b></div>
            </div></section>
          </div>`;
          return chrome(d, h, body);
        },
      },
      {
        id: "deal",
        title: "One deal, three questions",
        caption: "Deal 4 of 12. Membership portal has been silent for 28 days and its close date passed a week ago. Ana pushes it to January, sets a real next step and moves on.",
        render(d, h) {
          const e = h.esc;
          const p = plan(d);
          const l = d.leads.find((x) => x.id === "l6");
          const t = d.touch[l.id];
          const pos = p.all.indexOf(l);
          const sibling = d.leads.find((x) => x.company === l.company && x.status === "lost");
          const ticks = p.all.map((x, i) => `<i class="${i < pos ? "is-done" : i === pos ? "is-now" : ""}"></i>`).join("");
          const bar = `<div class="rv-bar" role="group" aria-label="Review progress"><b>Weekly review</b><span class="rv-ticks" aria-hidden="true">${ticks}</span><span>${pos + 1} of ${p.all.length}</span><a href="#" class="rv-pause">${ic("pause")}Pause</a></div>`;
          const rail = `<aside class="rv-rail" aria-label="Review queue">
            <h3>Needs a look</h3>
            ${p.attention
              .map((x, i) => {
                const dec = DECISIONS[x.id] || {};
                const state = i < pos ? "is-done" : i === pos ? "is-now" : "";
                const sub = i < pos ? `<small class="${dec.lost ? "is-lost" : ""}">${e(dec.label)}</small>` : i === pos ? `<small>Now</small>` : `<small>${x.owner ? "Up next" : "No owner"}</small>`;
                return `<div class="rv-ri ${state}"><span class="rv-dot">${i < pos ? ic("check") : ""}</span><div><b>${e(x.title)}</b>${sub}</div></div>`;
              })
              .join("")}
            <h3>Look fine · confirm at the end</h3>
            ${p.fine.map((x) => `<div class="rv-ri is-fine"><span class="rv-dot"></span><div><b>${e(x.title)}</b></div></div>`).join("")}
          </aside>`;
          const lostNow = weighted([l], h);
          const card = `<section class="st-shell rv-card"><div class="st-core">
            <div class="rv-ch">
              <div><h1>${e(l.title)}</h1><p><b>${e(l.contact)}</b> · ${e(l.company)} · owned by ${e(l.owner)}</p></div>
              <div class="rv-money"><b>${e(h.money(l.amount))}</b><span>${e(h.stage(l.stageId).name)} · ${h.stage(l.stageId).probability}%</span></div>
            </div>
            <div class="rv-ctx">
              <div><h4>${ic("hist")}Why it's here</h4><p>Last touch was an email on ${e(h.day(t.last))}. The next step, “${e(t.next)}”, was due ${e(h.day(t.nextDue))}.</p><div class="rv-whys">${reasons(l, d, h)}</div></div>
              <div class="is-warn"><h4>${ic("lost")}Same company, recently lost</h4><p>${e(sibling.title)} (${e(h.money(sibling.amount))}) was lost on ${e(h.day(sibling.closeDate))}: “${e(sibling.lostReason)}”.</p></div>
            </div>
            <div class="rv-ask">
              <div class="rv-ask-h"><b>Is it still on track?</b><small>1 of 3</small><em>${ic("check")}Answered</em></div>
              <div class="rv-tiles">
                <div class="rv-tile">${ic("keep")}<kbd>K</kbd><b>Keep it</b><p>Nothing changes. It comes back next week if it's still quiet.</p></div>
                <div class="rv-tile is-on">${ic("push")}<kbd>P</kbd><b>Push the date</b><p>Still alive, just later than planned.</p></div>
                <div class="rv-tile is-lost">${ic("lost")}<kbd>L</kbd><b>Mark lost</b><div class="rv-reasons"><span>No reply</span><span>Budget</span><span>Went elsewhere</span><span>Timing</span></div></div>
              </div>
            </div>
            <div class="rv-ask">
              <div class="rv-ask-h"><b>When will it close now?</b><small>2 of 3 · was ${e(h.day(l.closeDate))}</small><em>${ic("check")}15 Jan 2027</em></div>
              <div class="rv-picks">
                <div class="rv-pick"><kbd>1</kbd><b>Wed 11 Nov</b><small>In two weeks</small></div>
                <div class="rv-pick"><kbd>2</kbd><b>Mon 30 Nov</b><small>End of month</small></div>
                <div class="rv-pick is-on"><kbd>3</kbd><b>Fri 15 Jan</b><small>Next quarter, 2027</small></div>
                <div class="rv-pick"><kbd>4</kbd><b>Pick a date</b><small>Open the calendar</small></div>
              </div>
            </div>
            <div class="rv-ask">
              <div class="rv-ask-h"><b>What's the next step?</b><small>3 of 3</small></div>
              <div class="rv-next">
                <div class="rv-input">Call Hannah and ask straight out if the project is still on<span class="rv-caret"></span></div>
                <span class="rv-field"><small>Due</small>Fri 30 Oct</span>
                <span class="rv-field"><span class="st-av">${e(h.initials(l.owner))}</span>${e(l.owner)}</span>
              </div>
              <p class="rv-was">Replaces <s>${e(t.next)} · due ${e(h.day(t.nextDue))}</s></p>
            </div>
            <div class="rv-cf">
              <span class="rv-delta">This leaves November's forecast: <b>−${e(h.money(lostNow))}</b> weighted</span>
              <a href="#" class="st-btn is-ghost is-sm">Skip</a>
              <a href="#" class="st-btn is-ink">Save and go to ${e(p.all[pos + 1].title)}<span class="st-btn-ic">${I.arrowR}</span></a>
            </div>
          </div></section>
          <div class="rv-keys"><span><kbd>K</kbd><kbd>P</kbd><kbd>L</kbd> answer</span><span><kbd>1</kbd>–<kbd>4</kbd> pick a date</span><span><kbd>Tab</kbd> next question</span><span><kbd>↵</kbd> save and next</span><span><kbd>S</kbd> skip</span><span><kbd>Esc</kbd> pause</span></div>`;
          const body = `<div class="rv-mid">${rail}<div>${card}</div></div>`;
          return chrome(d, h, body, bar);
        },
      },
      {
        id: "done",
        title: "What changed",
        caption: "All 12 checked. A receipt of every change, how the forecast moved and why, and the next steps now sitting in each owner's Today list.",
        render(d, h) {
          const e = h.esc;
          const p = plan(d);
          const L = (id) => d.leads.find((x) => x.id === id);
          const before = Math.round(weighted(p.open, h));
          const after = Math.round(weighted(p.open, h, DECISIONS));
          const lostV = -(L("l9").amount * h.stage("s3").probability) / 100;
          const moveV = (L("l7").amount * (h.stage("s4").probability - h.stage("s3").probability)) / 100;
          const max = Math.max(Math.abs(lostV), Math.abs(moveV));
          const brRow = (title, sub, v) => {
            const w = (Math.abs(v) / max) * 50;
            const bar = v === 0 ? "" : v < 0 ? `<i style="right:50%;width:${w}%;background:var(--st-rose)"></i>` : `<i style="left:50%;width:${w}%;background:var(--st-accent)"></i>`;
            const val = v === 0 ? "€0" : `${v < 0 ? "−" : "+"}${h.money(Math.abs(v))}`;
            return `<div class="rv-br"><span>${title}<small>${sub}</small></span><span class="rv-br-bar">${bar}<i style="left:50%;width:1px;background:rgba(21,24,29,.25);border-radius:0"></i></span><span class="rv-br-v ${v < 0 ? "is-neg" : v > 0 ? "is-pos" : "is-zero"}">${e(val)}</span></div>`;
          };
          // Closing by the end of November, before and after.
          const byNov = (list, over = {}) =>
            list.reduce((s, l) => {
              const o = over[l.id] || {};
              const cd = o.closeDate || l.closeDate;
              if (o.lost || !cd || cd > "2026-11-30") return s;
              return s + (l.amount * h.stage(o.stageId || l.stageId).probability) / 100;
            }, 0);
          const novBefore = Math.round(byNov(p.open));
          const novAfter = Math.round(byNov(p.open, DECISIONS));
          const kept = p.open.length - 4;

          const changes = `<ul class="rv-chg">
            <li><span class="rv-chg-ic is-move">${ic("move")}</span><div><b>${e(L("l7").title)}</b><small><span class="rv-from">Proposal</span>${ic("arrowR")}<span class="rv-to">Negotiation</span>· volume and start date agreed on the call</small></div><span class="rv-amt">${e(h.money(L("l7").amount))}</span></li>
            <li><span class="rv-chg-ic is-lost">${ic("lost")}</span><div><b>${e(L("l9").title)}</b><small>Marked lost · reason: Timing · ${e(L("l9").contact)}, ${e(L("l9").company)}</small></div><span class="rv-amt">${e(h.money(L("l9").amount))}</span></li>
            <li><span class="rv-chg-ic is-date">${ic("push")}</span><div><b>${e(L("l6").title)}</b><small>Close date <span class="rv-from">${e(h.day(L("l6").closeDate))}</span>${ic("arrowR")}<span class="rv-to">${e(h.day("2027-01-15"))}</span></small></div><span class="rv-amt">${e(h.money(L("l6").amount))}</span></li>
            <li><span class="rv-chg-ic">${ic("person")}</span><div><b>${e(L("l3").title)}</b><small>Owner set to <span class="rv-to">Priya Nair</span>· close date set to <span class="rv-to">${e(h.day("2026-12-15"))}</span></small></div><span class="rv-amt">${e(h.money(L("l3").amount))}</span></li>
          </ul>
          <p class="rv-kept"><b>${kept} kept as they are:</b> ${p.all.filter((x) => !["l7", "l9", "l6", "l3"].includes(x.id)).map((x) => e(x.title)).join(", ")}.</p>`;

          const steps = [
            { body: "Call Hannah and ask straight out if the project is still on", lead: "l6", who: "Tomás Reyes", due: "2026-10-30" },
            { body: d.touch.l8.next, lead: "l8", who: "Priya Nair", due: "2026-10-29" },
            { body: d.touch.l7.next, lead: "l7", who: "Ana Dobre", due: "2026-10-29" },
            { body: d.touch.l5.next, lead: "l5", who: "Jonas Weber", due: "2026-11-02" },
            { body: "Qualify scope and budget with Sofia", lead: "l3", who: "Priya Nair", due: "2026-11-03" },
          ]
            .map(
              (s) => `<li><span class="st-box" aria-hidden="true"></span><b>${e(s.body)}</b><span>${e(L(s.lead).title)}</span><span class="st-owner"><span class="st-av">${e(h.initials(s.who))}</span>${e(s.who)}</span><span class="rv-d${s.due <= "2026-10-30" ? " is-soon" : ""}">${dow(s.due)} ${e(h.day(s.due))}</span></li>`,
            )
            .join("");

          const body = `
            <div class="rv-done-h">
              <div>
                <h1>All ${p.all.length} deals checked.</h1>
                <p>Four deals changed and five next steps went out to their owners. The forecast now counts only what you said is real.</p>
                <div class="rv-tally"><span><b>1</b> moved</span><span><b>1</b> lost</span><span><b>1</b> date pushed</span><span><b>1</b> owner and date set</span><span><b>${kept}</b> kept</span></div>
              </div>
              <a href="#" class="st-btn is-ghost">${ic("copy")}Copy summary for the team</a>
            </div>
            <div class="rv-done-grid">
              <section class="st-shell rv-panel"><div class="st-core">
                <div class="rv-ph"><h2>What changed</h2><span class="st-n">4</span><small>Each change is in the deal's history, marked “weekly review”</small></div>
                ${changes}
              </div></section>
              <section class="st-shell rv-panel"><div class="st-core">
                <div class="rv-ph"><h2>Forecast</h2><small>Weighted by stage probability</small></div>
                <div class="rv-fc-top">
                  <div><small>Before</small><b>${e(h.money(before))}</b></div>
                  ${ic("arrowR")}
                  <div class="is-after"><small>After</small><b>${e(h.money(after))}</b></div>
                </div>
                <div class="rv-bridge">
                  ${brRow(e(L("l9").title), "Lost, was 50% likely", lostV)}
                  ${brRow(e(L("l7").title), "Proposal 50% → Negotiation 75%", moveV)}
                  ${brRow(e(L("l6").title), "Pushed to January, same total", 0)}
                </div>
                <p class="rv-note">Closing by the end of November: <b>${e(h.money(novBefore))}</b> → <b>${e(h.money(novAfter))}</b>. Smaller, but nothing in it is past its date.</p>
              </div></section>
            </div>
            <section class="st-shell rv-panel" style="margin-top:14px"><div class="st-core">
              <div class="rv-ph"><h2>Next steps it created</h2><span class="st-n">5</span><small>Sent to each owner's Today list</small></div>
              <ul class="rv-steps">${steps}</ul>
              <div class="rv-steps-f"><span>Next review: <b>Wed 4 Nov, 9:00</b>, same time every week</span><a href="#" class="st-btn is-ghost is-sm">Change schedule</a><a href="#" class="st-btn is-primary">Back to dashboard<span class="st-btn-ic">${I.arrowR}</span></a></div>
            </div></section>`;
          return chrome(d, h, body);
        },
      },
    ],
  });
})();
