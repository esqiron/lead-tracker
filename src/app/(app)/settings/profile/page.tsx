import { Suspense } from "react";
import type { Metadata } from "next";
import { PageSpinner } from "@/components/page-spinner";
import { requireReadyOrg } from "@/lib/auth";
import { SettingsSection } from "../settings-section";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "Your profile" };

const ROLE_LABELS = { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" } as const;

async function ProfileContent() {
  const { user, org, role } = await requireReadyOrg();

  return (
    <div className="space-y-12">
      <SettingsSection title="Your profile" description={`You're ${role === "owner" || role === "admin" ? "an" : "a"} ${ROLE_LABELS[role].toLowerCase()} in ${org.name}.`}>
        <ProfileForm fullName={user.fullName ?? ""} email={user.email} />
      </SettingsSection>
      <SettingsSection title="Password">
        <PasswordForm />
      </SettingsSection>
    </div>
  );
}

// Request-time data lives behind this boundary so navigation stays instant.
export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ProfileContent />
    </Suspense>
  );
}
