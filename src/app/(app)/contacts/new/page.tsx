import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { PageHeader } from "@/components/ui";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { getCompanyNames, getMembers } from "@/lib/crm";
import { saveContact } from "../actions";
import { ContactForm } from "../contact-form";

export const metadata: Metadata = { title: "New contact" };

async function NewContactContent() {
  const ctx = await requireReadyOrg();
  if (!canEditRole(ctx.role)) redirect("/contacts");
  const [members, companies] = await Promise.all([getMembers(ctx.org.id), getCompanyNames(ctx.org.id)]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="New contact" />
      <ContactForm
        action={saveContact.bind(null, null)}
        initial={{ first_name: "", last_name: "", email: "", phone: "", title: "", company: "", owner_id: ctx.user.id, tags: "", notes: "" }}
        members={members}
        companies={companies}
        submitLabel="Create contact"
        cancelHref="/contacts"
      />
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function NewContactPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <NewContactContent />
    </Suspense>
  );
}
