# Lead Tracker: look & feel exploration

Gallery: https://claude.ai/artifact/DYg3PfQaBSC8ugwzbD1wH7 (private, so share it from the page's Share menu before posting).
Local: `preview.html` (needs a static server: the `looks` entry in `.claude/launch.json`, port 4747).

These are static mocks. Nothing in `src/` changed. Every variant renders the same three screens (leads board, contacts, contact detail with the timeline) from `data.js`. `CONTRACT.md` describes the file format if you add a variant.

| | Variant | Idea |
|---|---|---|
| A | Ledger | The pipeline as a bookkeeper's ledger. Each stage is an account with carried-forward totals, plus a trial balance with a weighted pipeline. |
| B | Transit | The pipeline as a metro line. Stages are stations with their own line colours, and the contact history is a route map. |
| C | Card File | Index cards in kraft folders, typewriter data, rubber stamps for Won, Lost and Do not contact. |
| D | Console | Dark and keyboard-first: ⌘K bar, keycap hints, an amber j/k cursor, a tmux-style status line. |
| E | Blueprint | An engineering drawing set: cyanotype paper, giant stage numerals, dimension-line totals, a revision block. |
| F | Studio | Soft premium SaaS: double-bezel trays, a floating pill nav, one lagoon-teal accent. This is the safe benchmark. |
| G | Bauhaus | Colour-blocked poster. Every stage owns a glyph and a colour, and the stage blocks rise like a bar chart. |
| H | Quiet | Editorial minimal: stages as flat rows, light numerals, pastel tags, a sidebar nav. |

## Which ones I'd push further

1. **Transit.** The metaphor is the product: a deal moving through stages is a train moving down a line. That gives the app a natural logo (○–○–○) and a colour per stage that means something wherever it appears. It also screenshots well for LinkedIn and still reads like a normal CRM. Risk: it needs restraint so it doesn't get cute.
2. **Ledger.** No other CRM looks like this. It leads with numbers and "shows its working", which suits building in public, and the trial balance (weighted pipeline) could become a real feature. Risk: density. Contacts and settings need a lighter touch than the board.
3. **Console**, as the dark, power-user counterpart. It fits an audience of open-source builders, and its keyboard layer (⌘K, j/k, keycaps) can sit on top of either of the first two.

A mix worth trying: Transit's stage colours and line motif for brand and board, Ledger's mono figures and ruled money columns for tables and totals, and Console as the dark theme.

Fun but likely tiring as daily drivers: Bauhaus (great for marketing pages), Blueprint and Card File (heavily themed). Studio and Quiet are well executed but less ownable.

---

# Round 2: new ways of working (`flows.html`)

Gallery: https://claude.ai/artifact/AmCviEPj1mdcPZXdEPNBDY (private). Six UX concepts in the shortlisted looks, three screens each (arrive → act → bigger picture). Format: `FLOWS-CONTRACT.md`.

| # | Concept | Look | Idea |
|---|---|---|---|
| 1 | Focus queue | Quiet | Home is "Today": one ranked list of next actions with the reason each is there; you log a call in place and the pipeline sits in the margin. |
| 2 | Threads | Studio | Every lead is a conversation in an inbox; logging is typing (/call, /move); the pipeline is the inbox grouped by stage. |
| 3 | Command line | Console | Type what happened in a sentence, check what it understood, press Enter; ask the pipeline questions and save answers as views. |
| 4 | Weekly review | Studio | A six-minute guided ritual: three questions per deal, then a receipt of what changed and the forecast before/after. |
| 5 | Runway | Console | Time is the main axis: deals as bars to their close date, silent gaps flagged, dragging a date shows the forecast impact. |
| 6 | People first | Quiet | Companies and people are home; deals happen inside a relationship; the pipeline is ranked by account. |

## Which ones I'd push

Make **Focus queue the home screen** and add **Weekly review** as the weekly habit. Together they answer "what do I do now" and "is my pipeline true", which a board answers poorly. Both are cheap to build on today's schema: a next step is the earliest open task, "going cold" is days since the last activity, and a review just walks open leads and writes ordinary activities and stage changes. Add the **⌘K command bar** from Command line as a layer on top (start with structured commands; free-text parsing later). Keep the board/table as a secondary "Pipeline" view.

Strong ideas that are heavier to build: **Threads** only shines once email is synced in (the app only sends mail today). **Command line**'s free-text parsing needs an LLM call and a privacy story. **Runway** and **People first** work better as extra views than as the home; companies already exist in the data model, so a Brightline-style company page is a reasonable later add.

---

# Round 3: chosen direction, Inbox + review (`flows/inbox.js`)

The owner picked Threads + Weekly review. They're merged into one 8-screen flow (Studio look), the first concept in the flows gallery:
1. Monday inbox, with the review as a folder
2. A website lead arriving as an unowned, unverified thread with its consent
3. Slash-command logging
4. Review start
5. Reviewing a deal inside its thread, with the questions where the composer usually is
6. The review summary, with events written back into threads
7. The pipeline grouped by stage
8. A person page with privacy controls

Adding things (added after review): a "New" button (key C) with New conversation / Add a person / Log on an existing deal / Import CSV / Share your lead form; a compose sheet like writing an email (With → About → What happened, duplicate check, company from email domain, lawful basis, paste-a-signature fill); the result lands as a new thread with Undo. Screens 3–6 of the flow.

Open decisions: should Pipeline keep a nav slot (it duplicates the "By stage" view)? Should review mode replace the nav? Email stays log-only, with a "set up forwarding" hint, until a mailbox sync exists.
