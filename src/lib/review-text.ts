import { formatDay } from "@/lib/format";

type ReviewEntry = { answer: "kept" | "pushed" | "lost"; closeFrom: string | null; closeTo: string | null; lostReason: string | null; actor: string };

// One line for a weekly review answer in a timeline.
export function reviewText(item: ReviewEntry, org: { date_format: string; timezone: string }) {
  const who = item.actor || "Someone";
  if (item.answer === "pushed") {
    return `${who} reviewed it: close date ${item.closeFrom ? formatDay(item.closeFrom, org) : "not set"} → ${formatDay(item.closeTo, org)}`;
  }
  if (item.answer === "lost") return `${who} reviewed it: marked lost${item.lostReason ? ` (${item.lostReason})` : ""}`;
  return `${who} reviewed it: still on track`;
}
