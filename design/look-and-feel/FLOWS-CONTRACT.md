# UX concept contract (flows.html)

The owner liked three looks: **Console**, **Studio** and **Quiet** (`variants/console.js`, `studio.js`, `quiet.js`). Now we're exploring *different ways of working*: new interaction models that make Lead Tracker friendlier and less like a standard "kanban + table + detail page" CRM. Each concept is rendered in one of those three looks.

Each concept is one file `flows/<id>.js`:

```js
(window.LT_FLOWS = window.LT_FLOWS || []).push({
  id: "focus",
  name: "Focus queue",
  look: "quiet",                 // "console" | "studio" | "quiet": the frame gets class `v-<look> f-<id>`
  pitch: "One sentence a salesperson would nod at.",
  problem: "What's wrong with today's board/table/detail flow that this fixes (2–3 sentences, plain words).",
  principles: ["3–5 short bullets: how the concept works"],
  tradeoffs: "What it gives up, and who it's not for (1–2 sentences).",
  fonts: [],                     // extra Google Fonts only if needed; the look's fonts are already loaded
  css: `...`,                    // EVERY selector prefixed with .f-<id> (e.g. `.f-focus .queue {}`); no globals
  screens: [                     // 3 screens telling a short story: arrive → act → see the bigger picture
    { id: "home", title: "Morning queue", caption: "One line on what the user is doing here.", render(d, h) { return "<html>"; } },
    ...
  ],
});
```

- The look's CSS is already loaded (all its rules are scoped to `.v-<look>`), so reuse its classes and custom properties (e.g. `--st-accent`, the look's chrome/nav markup) to stay on-look; read the look's file to see them. Your own additions go in `css`, scoped to `.f-<id>`. Don't edit the variant files.
- `d` = `window.LT_DATA`, `h` = `window.LT_H` (see `data.js`). The UX concepts can also use `d.touch` (last touch, days since, next step + due per open lead), `d.thread` (the Ioana email/call thread) and `d.weekly` (open pipeline € k by week). Use only this data; escape text with `h.esc`.
- Every screen is a full 1280px-wide app screen with its app chrome (wordmark "Lead Tracker", nav, org/user). The nav can change if the concept changes the app's structure, e.g. "Today / Pipeline / People". Static mock: no JS, no event handlers, no external images. Show mid-interaction states statically (an open popover, a typed command, a focused card, a toast).
- Across its three screens a concept must still let the user: see what needs doing, log an activity or move a lead, and see the pipeline (stages + values). It doesn't need the same screens as today.
- Copy is part of the UX: sentence case, plain verbs, buttons say exactly what they do.

## Check your work

Open `http://127.0.0.1:4747/flows-preview.html#<id>` and `#compare` and screenshot them (full page). No console errors, nothing past the 1280px frame, nothing clipped, text legible.
