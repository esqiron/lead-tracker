import { buttonClass } from "@/components/ui";

export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={buttonClass("ghost", "h-9 px-3")}>
        Sign out
      </button>
    </form>
  );
}
