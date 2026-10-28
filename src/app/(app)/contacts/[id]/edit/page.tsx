import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageSpinner } from "@/components/page-spinner";
import { PageHeader } from "@/components/ui";
import { canEditRole, requireReadyOrg } from "@/lib/auth";
import { getCompanyNames, getMembers } from "@/lib/crm";
import { contactName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { saveContact } from "../../actions";
import { ContactForm } from "../../contact-form";

export const metadata: Metadata = { title: "Edit contact" };

async function EditContactContent({ params }: PageProps<"/contacts/[id]/edit">) {
  const ctx = await requireReadyOrg();
  const { id } = await params;
  if (!canEditRole(ctx.role)) redirect(`/contacts/${id}`);

  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, title, owner_id, tags, notes, lawful_basis, company:companies!contacts_org_id_company_id_fkey(name)")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!contact) notFound();

  const [members, companies] = await Promise.all([getMembers(ctx.org.id), getCompanyNames(ctx.org.id)]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Edit contact" description={contactName(contact)} />
      <ContactForm
        action={saveContact.bind(null, contact.id)}
        initial={{
          first_name: contact.first_name ?? "",
          last_name: contact.last_name ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          title: contact.title ?? "",
          company: contact.company?.name ?? "",
          owner_id: contact.owner_id ?? "",
          tags: contact.tags.join(", "),
          notes: contact.notes ?? "",
          lawful_basis: contact.lawful_basis ?? "",
        }}
        members={members}
        companies={companies}
        submitLabel="Save changes"
        cancelHref={`/contacts/${contact.id}`}
      />
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function EditContactPage(props: PageProps<"/contacts/[id]/edit">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <EditContactContent {...props} />
    </Suspense>
  );
}
