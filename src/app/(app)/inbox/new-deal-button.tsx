"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { PersonMatch } from "./actions";
import { ComposeSheet, type ComposeOptions } from "./compose-sheet";

// "New deal with …" on a person's page: the compose sheet with them filled in.
export function NewDealButton({ person, options, label }: { person: PersonMatch; options: ComposeOptions; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open ? <ComposeSheet open onClose={() => setOpen(false)} options={options} prefill={person} /> : null}
    </>
  );
}
