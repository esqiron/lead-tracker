// Shared sample data + helpers for every look & feel variant.
// Shapes mirror the real app (src/app/(app)/leads, contacts, contacts/[id]).
(function () {
  const today = "2026-10-28";

  const org = { name: "Brightwater Studio", currency: "EUR", timezone: "Europe/Bucharest" };
  const viewer = { name: "Ana Dobre", email: "ana@brightwater.studio", role: "Admin" };

  const members = [
    { id: "m1", name: "Ana Dobre" },
    { id: "m2", name: "Tomás Reyes" },
    { id: "m3", name: "Priya Nair" },
    { id: "m4", name: "Jonas Weber" },
  ];

  const stages = [
    { id: "s1", name: "New", probability: 10, is_won: false, is_lost: false },
    { id: "s2", name: "Qualified", probability: 25, is_won: false, is_lost: false },
    { id: "s3", name: "Proposal", probability: 50, is_won: false, is_lost: false },
    { id: "s4", name: "Negotiation", probability: 75, is_won: false, is_lost: false },
    { id: "s5", name: "Won", probability: 100, is_won: true, is_lost: false },
    { id: "s6", name: "Lost", probability: 0, is_won: false, is_lost: true },
  ];

  const sources = ["Website form", "Referral", "LinkedIn", "Event", "Cold outreach", "API"];

  // Board cards. closeDate is ISO; overdue = open and before today.
  const leads = [
    { id: "l1", title: "Warehouse dashboard rebuild", amount: 24000, stageId: "s1", contact: "Marta Kowalska", company: "Northline Freight", owner: "Tomás Reyes", closeDate: "2026-12-12", source: "Website form", created: "2026-10-26" },
    { id: "l2", title: "Brand refresh for spring launch", amount: 8500, stageId: "s1", contact: "Daniel Okafor", company: "Kettle & Crumb", owner: "Priya Nair", closeDate: "2026-11-30", source: "LinkedIn", created: "2026-10-25" },
    { id: "l3", title: "Booking flow audit", amount: 3200, stageId: "s1", contact: "Sofia Lindqvist", company: "Fjord Stays", owner: "", closeDate: "", source: "API", created: "2026-10-27" },
    { id: "l4", title: "Driver app — phase 2", amount: 42000, stageId: "s2", contact: "Ioana Petrescu", company: "Brightline Logistics", owner: "Ana Dobre", closeDate: "2027-01-15", source: "Referral", created: "2026-10-02" },
    { id: "l5", title: "Patient intake forms", amount: 15600, stageId: "s2", contact: "Rahul Mehta", company: "Clearview Clinics", owner: "Jonas Weber", closeDate: "2026-11-20", source: "Event", created: "2026-10-09" },
    { id: "l6", title: "Membership portal", amount: 11000, stageId: "s2", contact: "Hannah Brooks", company: "Ridgeback Climbing", owner: "Tomás Reyes", closeDate: "2026-10-21", source: "Website form", created: "2026-09-18" },
    { id: "l7", title: "Fleet tracking pilot", amount: 18500, stageId: "s3", contact: "Ioana Petrescu", company: "Brightline Logistics", owner: "Ana Dobre", closeDate: "2026-11-14", source: "Referral", created: "2026-09-04" },
    { id: "l8", title: "E-commerce replatform", amount: 56000, stageId: "s3", contact: "Lucas Moreau", company: "Atelier Moreau", owner: "Priya Nair", closeDate: "2026-12-01", source: "Cold outreach", created: "2026-08-29" },
    { id: "l9", title: "Annual report microsite", amount: 6400, stageId: "s3", contact: "Grace Adeyemi", company: "Open Harbour Trust", owner: "Jonas Weber", closeDate: "2026-10-24", source: "Referral", created: "2026-09-11" },
    { id: "l10", title: "Loyalty program app", amount: 31000, stageId: "s4", contact: "Daniel Okafor", company: "Kettle & Crumb", owner: "Priya Nair", closeDate: "2026-11-07", source: "LinkedIn", created: "2026-08-12" },
    { id: "l11", title: "Dispatch console redesign", amount: 27500, stageId: "s4", contact: "Ioana Petrescu", company: "Brightline Logistics", owner: "Ana Dobre", closeDate: "2026-11-03", source: "Referral", created: "2026-07-30" },
    { id: "l12", title: "Design system retainer", amount: 36000, stageId: "s5", contact: "Lucas Moreau", company: "Atelier Moreau", owner: "Tomás Reyes", closeDate: "2026-10-15", source: "Event", created: "2026-07-02" },
    { id: "l13", title: "Grant application portal", amount: 9800, stageId: "s5", contact: "Grace Adeyemi", company: "Open Harbour Trust", owner: "Jonas Weber", closeDate: "2026-10-08", source: "Referral", created: "2026-08-20" },
    { id: "l14", title: "Ticketing kiosk UI", amount: 12000, stageId: "s6", contact: "Hannah Brooks", company: "Ridgeback Climbing", owner: "Tomás Reyes", closeDate: "2026-10-10", source: "Website form", created: "2026-08-05", lostReason: "Went with in-house team" },
    { id: "l15", title: "Pricing page experiments", amount: 4200, stageId: "s2", contact: "Elif Yıldız", company: "Tessellate", owner: "Priya Nair", closeDate: "2026-11-25", source: "API", created: "2026-10-20" },
  ].map((l) => ({
    ...l,
    status: l.stageId === "s5" ? "won" : l.stageId === "s6" ? "lost" : "open",
    overdue: !["s5", "s6"].includes(l.stageId) && Boolean(l.closeDate) && l.closeDate < today,
  }));

  const contacts = [
    { id: "c1", name: "Ioana Petrescu", title: "Head of Operations", company: "Brightline Logistics", email: "ioana.petrescu@brightline.eu", phone: "+40 721 384 902", owner: "Ana Dobre", openLeads: 3, added: "2026-06-14", tags: ["key account", "logistics"] },
    { id: "c2", name: "Lucas Moreau", title: "Founder", company: "Atelier Moreau", email: "lucas@ateliermoreau.fr", phone: "+33 6 41 22 09 87", owner: "Tomás Reyes", openLeads: 1, added: "2026-05-02", tags: ["retail"] },
    { id: "c3", name: "Daniel Okafor", title: "Marketing Director", company: "Kettle & Crumb", email: "daniel@kettleandcrumb.co.uk", phone: "+44 7700 900 412", owner: "Priya Nair", openLeads: 2, added: "2026-07-21", tags: ["hospitality"] },
    { id: "c4", name: "Grace Adeyemi", title: "Programme Lead", company: "Open Harbour Trust", email: "g.adeyemi@openharbour.org", phone: "+44 20 7946 0331", owner: "Jonas Weber", openLeads: 1, added: "2026-04-11", tags: ["nonprofit"] },
    { id: "c5", name: "Hannah Brooks", title: "General Manager", company: "Ridgeback Climbing", email: "hannah@ridgebackclimbing.com", phone: "+1 503 555 0148", owner: "Tomás Reyes", openLeads: 1, added: "2026-03-28", tags: [] },
    { id: "c6", name: "Rahul Mehta", title: "CTO", company: "Clearview Clinics", email: "rahul.mehta@clearview.health", phone: "+91 98201 44718", owner: "Jonas Weber", openLeads: 1, added: "2026-10-09", tags: ["healthcare", "event lead"] },
    { id: "c7", name: "Marta Kowalska", title: "Product Owner", company: "Northline Freight", email: "m.kowalska@northline.pl", phone: "+48 512 908 331", owner: "Tomás Reyes", openLeads: 1, added: "2026-10-26", tags: ["logistics"] },
    { id: "c8", name: "Sofia Lindqvist", title: "", company: "Fjord Stays", email: "sofia@fjordstays.no", phone: "", owner: "", openLeads: 1, added: "2026-10-27", tags: [] },
    { id: "c9", name: "Elif Yıldız", title: "Growth Lead", company: "Tessellate", email: "elif@tessellate.io", phone: "+90 532 118 4420", owner: "Priya Nair", openLeads: 1, added: "2026-10-20", tags: ["saas"] },
    { id: "c10", name: "Mateo Rossi", title: "Owner", company: "Rossi Ceramics", email: "mateo@rossiceramics.it", phone: "+39 347 220 1934", owner: "Ana Dobre", openLeads: 0, added: "2026-02-17", tags: ["retail"], doNotContact: true },
    { id: "c11", name: "Aiko Tanaka", title: "Design Manager", company: "Kumo Robotics", email: "aiko.tanaka@kumo.jp", phone: "+81 90 4418 2207", owner: "Priya Nair", openLeads: 0, added: "2026-01-30", tags: ["hardware"] },
    { id: "c12", name: "Ben Carter", title: "Operations Analyst", company: "Brightline Logistics", email: "ben.carter@brightline.eu", phone: "+40 744 019 552", owner: "Ana Dobre", openLeads: 0, added: "2026-08-03", tags: ["logistics"] },
  ];

  // Detail page subject: Ioana Petrescu.
  const detail = {
    contact: {
      ...contacts[0],
      website: "https://brightline.eu",
      notes: "Prefers short calls before 10:00 EET. Budget owner for anything under €50k; CFO signs above that.",
      privacy: {
        lawfulBasis: "Legitimate interest",
        consent: { given: "2026-06-14", text: "I agree to be contacted about my enquiry.", source: "Website form" },
        contactAllowed: true,
      },
    },
    leads: [
      { id: "l11", title: "Dispatch console redesign", stageId: "s4", amount: 27500 },
      { id: "l7", title: "Fleet tracking pilot", stageId: "s3", amount: 18500 },
      { id: "l4", title: "Driver app — phase 2", stageId: "s2", amount: 42000 },
      { id: "l16", title: "Driver app — phase 1", stageId: "s5", amount: 22000 },
    ],
    openValue: 88000,
    wonValue: 22000,
    openTasks: [
      { id: "t1", body: "Send revised proposal with the 3-month pilot option", due: "2026-10-27T15:00", overdue: true, assignee: "Ana Dobre", lead: "Fleet tracking pilot" },
      { id: "t2", body: "Book workshop with dispatch supervisors", due: "2026-10-31T10:00", overdue: false, assignee: "Tomás Reyes", lead: "Dispatch console redesign" },
    ],
    // Newest first. kind: "activity" | "stage".
    timeline: [
      { kind: "activity", type: "call", author: "Ana Dobre", at: "2026-10-27T09:40", lead: "Dispatch console redesign", body: "Walked through the clickable prototype with Ioana and two supervisors. They want night-shift mode and a bigger map. Legal needs the DPA before signature." },
      { kind: "stage", from: "Proposal", to: "Negotiation", actor: "Ana Dobre", at: "2026-10-27T09:52", lead: "Dispatch console redesign" },
      { kind: "activity", type: "email", author: "Ana Dobre", at: "2026-10-24T16:05", lead: "Fleet tracking pilot", body: "Sent pricing for 40 vs 120 vehicles. Asked whether the pilot can start before the December freeze." },
      { kind: "activity", type: "note", author: null, source: "Website form", at: "2026-10-22T21:13", lead: "Driver app — phase 2", body: "Hi again, we'd like to extend the driver app to subcontractors. Can you quote phase 2 by mid-November? — Ioana" },
      { kind: "activity", type: "meeting", author: "Tomás Reyes", at: "2026-10-18T11:00", lead: "Fleet tracking pilot", body: "On-site at the Cluj depot. Mapped the current dispatch flow; 6 manual hand-offs per shipment." },
      { kind: "activity", type: "task", author: "Ana Dobre", at: "2026-10-14T10:00", completedAt: "2026-10-15T17:20", lead: "Fleet tracking pilot", body: "Share case study from Northline Freight" },
      { kind: "stage", from: "Qualified", to: "Proposal", actor: "Ana Dobre", at: "2026-10-10T14:30", lead: "Fleet tracking pilot" },
      { kind: "stage", from: null, to: "Qualified", actor: "Ana Dobre", at: "2026-10-02T08:15", lead: "Driver app — phase 2" },
    ],
  };

  // Extras for the UX concepts (flows.html): last touch, the agreed next step and a
  // simple health signal per open lead. "days" = days since last touch as of `today`.
  const touch = {
    l1: { last: "2026-10-26", days: 2, via: "Website form", next: "Qualify: budget and timeline call", nextDue: "2026-10-30" },
    l2: { last: "2026-10-25", days: 3, via: "LinkedIn DM", next: "Send portfolio + 2 references", nextDue: "2026-10-29" },
    l3: { last: "2026-10-27", days: 1, via: "API", next: "Assign an owner", nextDue: "" },
    l4: { last: "2026-10-22", days: 6, via: "Website form", next: "Scope phase 2 with subcontractor list", nextDue: "2026-11-05" },
    l5: { last: "2026-10-09", days: 19, via: "Event", next: "Follow up after the conference", nextDue: "2026-10-16" },
    l6: { last: "2026-09-30", days: 28, via: "Email", next: "Ask if the project is still on", nextDue: "2026-10-21" },
    l7: { last: "2026-10-24", days: 4, via: "Email", next: "Send revised proposal with pilot option", nextDue: "2026-10-27" },
    l8: { last: "2026-10-12", days: 16, via: "Meeting", next: "Chase feedback on proposal v2", nextDue: "2026-10-26" },
    l9: { last: "2026-10-03", days: 25, via: "Email", next: "Confirm sign-off date with the board", nextDue: "2026-10-20" },
    l10: { last: "2026-10-26", days: 2, via: "Call", next: "Send contract redlines back", nextDue: "2026-10-30" },
    l11: { last: "2026-10-27", days: 1, via: "Call", next: "Send DPA to legal", nextDue: "2026-10-29" },
    l15: { last: "2026-10-20", days: 8, via: "API", next: "Book discovery call", nextDue: "2026-10-28" },
  };
  // Email thread for the Ioana / Dispatch console lead (for conversation-style views).
  const thread = [
    { from: "Ioana Petrescu", dir: "in", at: "2026-10-22T21:13", channel: "Website form", body: "Hi again, we'd like to extend the driver app to subcontractors. Can you quote phase 2 by mid-November?" },
    { from: "Ana Dobre", dir: "out", at: "2026-10-23T09:02", channel: "Email", body: "Thanks Ioana. Yes, mid-November works. Could you send the subcontractor list so we can size it?" },
    { from: "Ana Dobre", dir: "out", at: "2026-10-24T16:05", channel: "Email", body: "Pricing for 40 vs 120 vehicles attached. Can the pilot start before the December freeze?" },
    { from: "Ioana Petrescu", dir: "in", at: "2026-10-25T08:47", channel: "Email", body: "120 vehicles. Start 1 Dec if legal clears the DPA in time. Can we see the dispatch prototype this week?" },
    { from: "Ana Dobre", dir: "log", at: "2026-10-27T09:40", channel: "Call", body: "Walked through the clickable prototype with Ioana and two supervisors. They want night-shift mode and a bigger map. Legal needs the DPA before signature." },
  ];
  // Week-over-week pipeline for summary sparklines (open pipeline value, € thousands).
  const weekly = [182, 190, 205, 199, 214, 228, 241, 247.9];

  const nav = ["Dashboard", "Leads", "Contacts", "Reports", "Settings"];
  const tags = ["key account", "logistics", "retail", "hospitality", "healthcare", "nonprofit", "saas", "hardware", "event lead"];

  window.LT_DATA = { today, org, viewer, members, stages, sources, leads, contacts, detail, nav, tags, touch, thread, weekly };

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  window.LT_H = {
    esc,
    money: (n, currency = "EUR") =>
      new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(n)),
    // €24k style for tight spots
    moneyShort: (n) => (n >= 1000 ? `€${Math.round(n / 100) / 10}k`.replace(".0k", "k") : `€${n}`),
    initials: (name) =>
      String(name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join(""),
    // "2026-11-14" -> "14 Nov"; with year if not 2026
    day: (iso) => {
      if (!iso) return "";
      const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
      return `${d} ${MONTHS[m - 1]}${y !== 2026 ? ` ${y}` : ""}`;
    },
    date: (iso) => {
      if (!iso) return "";
      const [y, m, d] = iso.slice(0, 10).split("-");
      return `${d}.${m}.${y}`;
    },
    dateTime: (iso) => {
      const [date, time] = iso.split("T");
      const [, m, d] = date.split("-").map(Number);
      return `${d} ${MONTHS[m - 1]}, ${time}`;
    },
    stage: (id) => window.LT_DATA.stages.find((s) => s.id === id),
    leadsIn: (stageId) => window.LT_DATA.leads.filter((l) => l.stageId === stageId),
    total: (list) => list.reduce((s, l) => s + l.amount, 0),
    TYPE_LABELS: { note: "Note", call: "Call", email: "Email", meeting: "Meeting", task: "Task" },
  };
})();
