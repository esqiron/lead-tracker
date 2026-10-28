"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isAdminRole, requireReadyOrg } from "@/lib/auth";
import { isEmail } from "@/lib/forms";
import { IMPORT_BATCH_SIZE, type ImportRow } from "@/lib/import-fields";
import { parseAmount, parseDay, parseTags, splitName } from "@/lib/import-parse";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { userMessage } from "@/lib/errors";
import { logEvent } from "@/lib/audit";

export type ImportOptions = { updateExisting: boolean };
export type BatchResult = {
  created: number;
  updated: number;
  unchanged: number;
  leads: number;
  errors: { row: number; message: string }[];
  notes: string[];
};

const clip = (v: string | undefined, max: number) => (v ? v.trim().slice(0, max) : "");

// Imports one batch of already-mapped rows. The browser sends the file in
// batches so large imports show progress and stay under request limits.
export async function importBatch(rows: { row: number; data: ImportRow }[], options: ImportOptions): Promise<BatchResult | { error: string }> {
  const { org, role, user } = await requireReadyOrg();
  if (!isAdminRole(role)) return { error: "Only admins can import." };
  if (!Array.isArray(rows) || rows.length > IMPORT_BATCH_SIZE) return { error: "Batch too large." };

  const supabase = await createClient();
  const result: BatchResult = { created: 0, updated: 0, unchanged: 0, leads: 0, errors: [], notes: [] };
  const note = (message: string) => {
    if (!result.notes.includes(message)) result.notes.push(message);
  };

  // --- Normalize rows -----------------------------------------------------------
  type Clean = {
    row: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    title: string;
    company: string;
    tags: string[];
    notes: string;
    owner_email: string;
    lead: { title: string; value: string; stage: string; source: string; close: string } | null;
  };
  const clean: Clean[] = [];
  const seenEmails = new Map<string, number>();

  for (const { row, data } of rows) {
    let first = clip(data.first_name, 100);
    let last = clip(data.last_name, 100);
    if (!first && !last && data.full_name) {
      const split = splitName(clip(data.full_name, 200));
      first = split.first;
      last = split.last;
    }
    const email = clip(data.email, 254).toLowerCase();
    if (email && !isEmail(email)) {
      result.errors.push({ row, message: `“${email}” isn't a valid email.` });
      continue;
    }
    if (!first && !last && !email) {
      result.errors.push({ row, message: "No name or email." });
      continue;
    }
    if (email) {
      const earlier = seenEmails.get(email);
      if (earlier !== undefined) {
        result.errors.push({ row, message: `Same email as row ${earlier}.` });
        continue;
      }
      seenEmails.set(email, row);
    }
    const leadTitle = clip(data.lead_title, 200);
    clean.push({
      row,
      first_name: first,
      last_name: last,
      email,
      phone: clip(data.phone, 50),
      title: clip(data.title, 120),
      company: clip(data.company, 200),
      tags: parseTags(data.tags ?? ""),
      notes: clip(data.notes, 5000),
      owner_email: clip(data.owner_email, 254).toLowerCase(),
      lead: leadTitle
        ? {
            title: leadTitle,
            value: data.lead_value ?? "",
            stage: clip(data.lead_stage, 60),
            source: clip(data.lead_source, 60),
            close: data.lead_close_date ?? "",
          }
        : null,
    });
  }
  if (!clean.length) return result;

  // --- Lookups (one query each per batch) ---------------------------------------
  const companyNames = [...new Set(clean.map((c) => c.company).filter(Boolean))];
  const emails = clean.map((c) => c.email).filter(Boolean);

  const [{ data: members }, { data: companies }, { data: existing }, { data: stages }, { data: sources }] = await Promise.all([
    supabase.from("memberships").select("user_id, profiles!memberships_user_id_fkey(email)").eq("org_id", org.id).eq("status", "active"),
    companyNames.length
      ? supabase.from("companies").select("id, name").eq("org_id", org.id).is("deleted_at", null).limit(20000)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    emails.length
      ? supabase.from("contacts").select("id, email, company_id, tags").eq("org_id", org.id).is("deleted_at", null).in("email", emails)
      : Promise.resolve({ data: [] as { id: string; email: string | null; company_id: string | null; tags: string[] }[] }),
    supabase.from("pipeline_stages").select("id, name, is_won, is_lost, position").eq("org_id", org.id).order("position"),
    supabase.from("lead_sources").select("id, name, position").eq("org_id", org.id),
  ]);

  const memberByEmail = new Map((members ?? []).map((m) => [m.profiles.email.toLowerCase(), m.user_id]));
  const ownerFor = (c: Clean) => {
    if (!c.owner_email) return user.id;
    const id = memberByEmail.get(c.owner_email);
    if (!id) note(`Owner ${c.owner_email} isn't a member here; those records are assigned to you.`);
    return id ?? user.id;
  };

  // Companies: reuse case-insensitive matches, create the rest.
  const companyId = new Map((companies ?? []).map((c) => [c.name.toLowerCase(), c.id]));
  const newCompanies = companyNames
    .filter((n) => !companyId.has(n.toLowerCase()))
    .filter((n, i, all) => all.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i)
    .map((name) => ({ id: randomUUID(), org_id: org.id, name, owner_id: user.id }));
  if (newCompanies.length) {
    const { error } = await supabase.from("companies").insert(newCompanies);
    if (error) return { error: `Couldn't create companies: ${userMessage(error)}` };
    for (const c of newCompanies) companyId.set(c.name.toLowerCase(), c.id);
  }

  // --- Contacts -------------------------------------------------------------------
  const existingByEmail = new Map((existing ?? []).map((c) => [c.email!.toLowerCase(), c]));
  const contactIdForRow = new Map<number, string>();
  const inserts = [];

  for (const c of clean) {
    const company_id = c.company ? (companyId.get(c.company.toLowerCase()) ?? null) : null;
    const match = c.email ? existingByEmail.get(c.email) : undefined;
    if (match) {
      contactIdForRow.set(c.row, match.id);
      if (!options.updateExisting) {
        result.unchanged++;
        continue;
      }
      // Only overwrite with values the file actually has.
      const patch: Database["public"]["Tables"]["contacts"]["Update"] = {};
      if (c.first_name) patch.first_name = c.first_name;
      if (c.last_name) patch.last_name = c.last_name;
      if (c.phone) patch.phone = c.phone;
      if (c.title) patch.title = c.title;
      if (company_id) patch.company_id = company_id;
      // Tags are added to the existing ones, never replaced.
      const mergedTags = [...new Set([...match.tags, ...c.tags])];
      if (mergedTags.length > match.tags.length) patch.tags = mergedTags;
      if (c.notes) patch.notes = c.notes;
      if (c.owner_email) patch.owner_id = ownerFor(c);
      if (!Object.keys(patch).length) {
        result.unchanged++;
        continue;
      }
      const { error } = await supabase.from("contacts").update(patch).eq("id", match.id);
      if (error) result.errors.push({ row: c.row, message: userMessage(error) });
      else result.updated++;
      continue;
    }

    const id = randomUUID();
    contactIdForRow.set(c.row, id);
    inserts.push({
      row: c.row,
      values: {
        id,
        org_id: org.id,
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        email: c.email || null,
        phone: c.phone || null,
        title: c.title || null,
        company_id,
        tags: c.tags,
        notes: c.notes || null,
        owner_id: ownerFor(c),
      },
    });
  }

  if (inserts.length) {
    const { error } = await supabase.from("contacts").insert(inserts.map((i) => i.values));
    if (error) {
      // Fall back to row-by-row so one bad row doesn't sink the batch.
      for (const i of inserts) {
        const { error: rowError } = await supabase.from("contacts").insert(i.values);
        if (rowError) {
          contactIdForRow.delete(i.row);
          result.errors.push({ row: i.row, message: rowError.code === "23505" ? "A contact with this email already exists." : userMessage(rowError) });
        } else {
          result.created++;
        }
      }
    } else {
      result.created += inserts.length;
    }
  }

  // --- Leads ----------------------------------------------------------------------
  let withLeads = clean.filter((c) => c.lead && contactIdForRow.has(c.row));

  // Re-importing the same file shouldn't duplicate leads: skip a lead when
  // its contact already has one with the same name.
  if (withLeads.length) {
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("contact_id, title")
      .eq("org_id", org.id)
      .is("deleted_at", null)
      .in("contact_id", withLeads.map((c) => contactIdForRow.get(c.row)!));
    const taken = new Set((existingLeads ?? []).map((l) => `${l.contact_id}|${l.title.toLowerCase()}`));
    const before = withLeads.length;
    withLeads = withLeads.filter((c) => !taken.has(`${contactIdForRow.get(c.row)}|${c.lead!.title.toLowerCase()}`));
    if (withLeads.length < before) note("Leads that already exist for the same contact and name were skipped.");
  }

  if (withLeads.length) {
    const stageList = stages ?? [];
    const defaultStage = stageList.find((s) => !s.is_won && !s.is_lost);
    if (!defaultStage) return { error: "The pipeline has no open stages." };
    const stageByName = new Map(stageList.map((s) => [s.name.toLowerCase(), s]));

    // Unknown sources are added to the org's list.
    const sourceId = new Map((sources ?? []).map((s) => [s.name.toLowerCase(), s.id]));
    let nextPosition = Math.max(-1, ...(sources ?? []).map((s) => s.position)) + 1;
    const newSources = [...new Set(withLeads.map((c) => c.lead!.source).filter((s) => s && !sourceId.has(s.toLowerCase())))]
      .filter((n, i, all) => all.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i)
      .map((name) => ({ id: randomUUID(), org_id: org.id, name, position: nextPosition++ }));
    if (newSources.length) {
      const { error } = await supabase.from("lead_sources").insert(newSources);
      if (error) return { error: `Couldn't create lead sources: ${userMessage(error)}` };
      for (const s of newSources) sourceId.set(s.name.toLowerCase(), s.id);
      note(`Added new lead source${newSources.length > 1 ? "s" : ""}: ${newSources.map((s) => s.name).join(", ")}.`);
    }

    const leadRows = withLeads.map((c) => {
      const lead = c.lead!;
      let stage = lead.stage ? stageByName.get(lead.stage.toLowerCase()) : undefined;
      if (lead.stage && !stage) note(`Stage “${lead.stage}” doesn't exist; those leads start in “${defaultStage.name}”.`);
      stage ??= defaultStage;
      const value = lead.value.trim() ? parseAmount(lead.value) : 0;
      if (value === null) note(`Some lead values couldn't be read and were set to 0.`);
      const close = lead.close.trim() ? parseDay(lead.close, org.date_format) : null;
      if (lead.close.trim() && !close) note(`Some close dates couldn't be read and were left empty.`);
      const match = c.email ? existingByEmail.get(c.email) : undefined;
      return {
        row: c.row,
        values: {
          org_id: org.id,
          title: lead.title,
          contact_id: contactIdForRow.get(c.row)!,
          company_id: (c.company ? companyId.get(c.company.toLowerCase()) : undefined) ?? match?.company_id ?? null,
          owner_id: ownerFor(c),
          stage_id: stage.id,
          source_id: lead.source ? (sourceId.get(lead.source.toLowerCase()) ?? null) : null,
          value: value ?? 0,
          expected_close_date: close,
        },
      };
    });

    const { error } = await supabase.from("leads").insert(leadRows.map((l) => l.values));
    if (error) {
      for (const l of leadRows) {
        const { error: rowError } = await supabase.from("leads").insert(l.values);
        if (rowError) result.errors.push({ row: l.row, message: `Lead not created: ${userMessage(rowError)}` });
        else result.leads++;
      }
    } else {
      result.leads += leadRows.length;
    }
  }

  await logEvent({
    orgId: org.id,
    actorId: user.id,
    action: "import",
    entity: "contacts",
    details: { rows: rows.length, created: result.created, updated: result.updated, leads: result.leads, skipped: result.errors.length },
  });
  revalidatePath("/contacts");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return result;
}
