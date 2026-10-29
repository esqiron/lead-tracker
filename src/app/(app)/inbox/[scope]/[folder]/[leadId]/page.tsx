import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { getTimeline } from "@/lib/activities";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { getMembers, getStages } from "@/lib/crm";
import { folderByKey, getThread, inboxPath, isScope, type FolderKey } from "@/lib/inbox";
import { StartedToast, ThreadComposer } from "../../../thread-composer";
import { ThreadView } from "../../../thread-view";

export const metadata: Metadata = { title: "Conversation" };

const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/.test(value);

async function ThreadPage({ params, searchParams }: PageProps<"/inbox/[scope]/[folder]/[leadId]">) {
  const ctx = await requireReadyOrg();
  const { org, user } = ctx;
  const { scope, folder, leadId } = await params;
  if (!isScope(scope) || !folderByKey(folder) || !isUuid(leadId)) notFound();

  const thread = await getThread(org.id, leadId);
  if (!thread) notFound();
  const [stages, members, timeline, sp] = await Promise.all([getStages(org.id), getMembers(org.id), getTimeline(org.id, { leadIds: [leadId] }), searchParams]);

  const canEdit = canEditRole(ctx.role);
  const backHref = inboxPath(scope, folder as FolderKey);

  return (
    <ThreadView
      thread={thread}
      timeline={timeline}
      stages={stages}
      members={members}
      org={org}
      userId={user.id}
      canEdit={canEdit}
      path={inboxPath(scope, folder as FolderKey, leadId)}
      backLink={{ href: backHref, label: folderByKey(folder)!.label }}
      banner={
        sp.started === leadId ? (
          <StartedToast leadId={leadId} personId={isUuid(sp.person) ? sp.person : undefined} companyId={isUuid(sp.company) ? sp.company : undefined} backHref={backHref} />
        ) : null
      }
      footer={
        canEdit ? (
          <div className="border-t border-hairline p-3">
            <ThreadComposer
              key={thread.id}
              leadId={thread.id}
              stages={stages}
              stageId={thread.stageId}
              nextStep={thread.nextStep ? { id: thread.nextStep.id, body: thread.nextStep.body } : null}
              members={members}
              currentUserId={user.id}
              contactFirstName={thread.contact?.name.split(" ")[0] ?? null}
            />
          </div>
        ) : null
      }
    />
  );
}

export default function Page(props: PageProps<"/inbox/[scope]/[folder]/[leadId]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ThreadPage {...props} />
    </Suspense>
  );
}
