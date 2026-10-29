"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditRole, isAdminRole, requireReadyOrg } from "@/lib/auth";
import { userMessage } from "@/lib/errors";
import { field } from "@/lib/forms";
import { zonedToISO } from "@/lib/format";
import { getCandidates, getSession, type ReviewScope } from "@/lib/review";
import { createClient } from "@/lib/supabase/server";

const isUuid = (value: string) => /^[0-9a-f-]{36}$/.test(value);

function refresh() {
  revalidatePath("/inbox", "layout");
  revalidatePath("/leads");
}

// Where to go after answering: the next deal that needs a look, else the end.
async function nextPath(orgId: string, sessionId: string) {
  const state = await getSession(orgId, sessionId);
  if (!state) return "/inbox/review";
  const next = (await getCandidates(orgId, state.session.scope as ReviewScope)).find((c) => c.needsLook && !state.answered.has(c.leadId));
  return next ? `/inbox/review/${sessionId}/${next.leadId}` : null;
}

export async function startReview(formData: FormData) {
  const { org, role } = await requireReadyOrg();
  if (!canEditRole(role)) redirect("/inbox");
  const scope: ReviewScope = field(formData, "scope") === "everyone" && isAdminRole(role) ? "everyone" : "mine";
  const supabase = await createClient();
  const { data: sessionId, error } = await supabase.rpc("start_review", { p_org: org.id, p_scope: scope });
  if (error) throw new Error(userMessage(error));
  const path = await nextPath(org.id, sessionId);
  if (path) redirect(path);
  // Nothing needs a look: confirm everything and show the summary.
  await supabase.rpc("finish_review", { p_org: org.id, p_session: sessionId });
  refresh();
  redirect(`/inbox/review/${sessionId}/done`);
}

export type ReviewAnswer = {
  sessionId: string;
  leadId: string;
  answer: "kept" | "pushed" | "lost" | "skipped";
  closeTo?: string;
  lostReason?: string;
  next?: { body?: string; due?: string };
};

// Saves one deal's answers and returns where to go next.
export async function answerReview(input: ReviewAnswer): Promise<{ error?: string; path?: string }> {
  const { org, role } = await requireReadyOrg();
  if (!canEditRole(role)) return { error: "You have view-only access." };
  if (!isUuid(input.sessionId) || !isUuid(input.leadId)) return { error: "Reload and try again." };
  if (!["kept", "pushed", "lost", "skipped"].includes(input.answer)) return { error: "Pick an answer." };
  if (input.answer === "pushed" && !/^\d{4}-\d{2}-\d{2}$/.test(input.closeTo ?? "")) return { error: "Pick the new close date." };

  const nextBody = (input.next?.body ?? "").trim().slice(0, 500);
  const due = (input.next?.due ?? "").slice(0, 16);
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_lead", {
    p_org: org.id,
    p_session: input.sessionId,
    p_lead: input.leadId,
    p_payload: {
      answer: input.answer,
      close_to: input.answer === "pushed" ? input.closeTo : null,
      lost_reason: input.answer === "lost" ? (input.lostReason ?? "").trim().slice(0, 300) || null : null,
      next: { body: nextBody, due_at: nextBody && due ? zonedToISO(due, org.timezone) : null },
    },
  });
  if (error) return { error: userMessage(error) };
  const path = await nextPath(org.id, input.sessionId);
  if (!path) {
    // That was the last deal that needed a look: confirm the rest and finish.
    const { error: finishError } = await supabase.rpc("finish_review", { p_org: org.id, p_session: input.sessionId });
    if (finishError) return { error: userMessage(finishError) };
  }
  refresh();
  return { path: path ?? `/inbox/review/${input.sessionId}/done` };
}

export async function finishReview(formData: FormData) {
  const { org } = await requireReadyOrg();
  const sessionId = field(formData, "session_id");
  if (!isUuid(sessionId)) redirect("/inbox/review");
  const supabase = await createClient();
  const { error } = await supabase.rpc("finish_review", { p_org: org.id, p_session: sessionId });
  if (error) throw new Error(userMessage(error));
  refresh();
  redirect(`/inbox/review/${sessionId}/done`);
}
