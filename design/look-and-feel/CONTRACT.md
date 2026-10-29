# Variant contract

Each variant is one file `variants/<id>.js` that registers itself:

```js
(window.LT_VARIANTS = window.LT_VARIANTS || []).push({
  id: "ledger",                       // must match the filename
  name: "Ledger",
  concept: "One sentence: the idea and why it fits a CRM built in public.",
  fonts: ["IBM+Plex+Mono:wght@400;500", "IBM+Plex+Sans+Condensed:wght@400;600"], // Google Fonts css2 `family=` values
  tokens: {
    color: [{ name: "Paper", value: "#eef3ec" }, ...],      // 4–7 named hex values, first 5 shown as swatches
    type: [{ role: "Display", family: "'IBM Plex Sans Condensed', sans-serif", sample: "Negotiation", style: "font-weight:600" }, ...],
    spacing: "4px base; 8/12/16/24/40 scale; dense 32px table rows",
    shape: "0 radius; 1px rules; double rule under totals",
    signature: "The one thing this variant is remembered by.",
  },
  css: `...`,                         // EVERY selector prefixed with .v-<id> (e.g. `.v-ledger .card {}`); no bare element/global selectors, no :root, no @import
  render: {
    board(d, h)    { return "<html string>"; },
    contacts(d, h) { return "<html string>"; },
    detail(d, h)   { return "<html string>"; },
  },
});
```

- `d` = `window.LT_DATA`, `h` = `window.LT_H` (see `data.js`). Use only that data; escape text with `h.esc`.
- Each render returns the whole screen, **including the app chrome** (logo/wordmark "Lead Tracker", main nav Dashboard/Leads/Contacts/Reports/Settings with the right item active, org + user, sign out). The frame is a 1280px-wide box (`.lt-frame.v-<id>`); set your own background and min-height on the frame (`.v-<id>` itself is the frame element). It's scaled down in the gallery, so keep everything legible at 1280.
- Static mock: no JS behaviour, no event handlers, no external images. Inline SVG is fine. Interactive-looking states (hover, focus, a selected row) can be shown statically.
- Fonts come only from Google Fonts via `fonts`. Give every font-family a fallback stack.

## What each screen must show (same info as the real app)

**board** — Page title "Leads", count ("15 leads"), Board/Table view toggle (Board active), search, Owner filter, Source filter, Export CSV + New lead buttons. Six stage columns from `d.stages` with name, card count, column total (`h.total(h.leadsIn(id))`), won/lost marked. Cards: title, `contact · company`, amount, close date (overdue in a warning treatment), owner initials (blank owner = unassigned). Lost card can show its `lostReason`.

**contacts** — Title "Contacts", count, search, Tag filter, Owner filter, Import CSV / Export CSV / New contact buttons. Table (or your equivalent) for all `d.contacts`: name + title + tags (+ "Do not contact" for the flagged one), email, phone, company, owner, open leads (number), added date.

**detail** — `d.detail`: back link "← Contacts", avatar initials, name, "title at company", actions New lead / Edit / Delete. Leads list with stage + value and the open/won totals. Activity composer (type picker Note/Call/Email/Meeting/Task, text box, "Log activity" button). Open tasks (overdue one flagged, assignee, linked lead, checkbox). Activity timeline newest first: activities (type, author or "via Website form · unverified" when `source`, time, linked lead, body; the completed task struck through) and stage changes ("Moved from X to Y by Z"). Sidebar/secondary: Details (email, phone, company, owner, tags, added), Privacy (lawful basis, consent given + quoted text + source, contact allowed; buttons Withdraw consent / Stop contact / Export data), Notes.

The layout may change radically per variant (a board doesn't have to be columns), but none of the information above may be dropped.

## Check your work

Open `preview.html#<id>-board`, `#<id>-contacts`, `#<id>-detail` (and `#compare-board`) and screenshot them. No console errors, no overflow outside the 1280 frame, nothing clipped, text legible.
