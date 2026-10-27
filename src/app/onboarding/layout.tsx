import { Logo } from "@/components/ui";
import { SignOutButton } from "@/components/sign-out-button";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950">
        <Logo />
        <SignOutButton />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
