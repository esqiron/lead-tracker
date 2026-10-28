import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Security events that don't come from a row change (exports, imports,
// admin-triggered password resets). Record changes are logged by database
// triggers. Written with the service role: users can't insert audit rows.
export async function logEvent(event: {
  orgId: string;
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const { error } = await createAdminClient().from("audit_log").insert({
    org_id: event.orgId,
    actor_id: event.actorId,
    action: event.action,
    entity: event.entity,
    entity_id: event.entityId ?? null,
    diff: (event.details ?? null) as never,
  });
  if (error) console.error("Failed to write audit event", event.action, error);
}
