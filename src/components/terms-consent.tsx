import type { ReactNode } from "react";

const link = "font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100";

function Doc({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className={link}>
      {children}
    </a>
  );
}

// The two acceptances for a hosted instance. Kept as separate checkboxes:
// under Romanian law (Civil Code art. 1203) standard-term clauses that exclude
// liability, allow suspension or unilateral changes, or pick the courts only
// bind if they are expressly accepted on their own.
export function TermsConsent({ errors }: { errors?: Record<string, string> }) {
  return (
    <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
      <Checkbox name="accept_terms" error={errors?.accept_terms}>
        I accept the <Doc href="/terms">Terms of service</Doc>, including the <Doc href="/dpa">Data processing agreement</Doc>, on
        behalf of my organization, and have read the <Doc href="/privacy">Privacy policy</Doc>.
      </Checkbox>
      <Checkbox name="accept_special_clauses" error={errors?.accept_special_clauses}>
        I expressly accept the clauses in the <Doc href="/terms">Terms</Doc> that exclude liability (section 9), allow suspension and
        termination (section 8), changes to the service and the terms (sections 7 and 10), and set the governing law and courts
        (section 11).
      </Checkbox>
    </div>
  );
}

function Checkbox({ name, error, children }: { name: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="flex items-start gap-2.5">
        <input type="checkbox" name={name} value="on" required aria-invalid={error ? true : undefined} className="mt-0.5 size-4 shrink-0" />
        <span>{children}</span>
      </label>
      {error ? <p className="mt-1 pl-6.5 text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
