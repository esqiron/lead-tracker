import { Logo } from "@/components/ui";
import { SignOutButton } from "@/components/sign-out-button";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="studio-canvas flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
        <Logo />
        <SignOutButton />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-2 pb-12 sm:pt-4 sm:pb-20">{children}</main>
    </div>
  );
}
