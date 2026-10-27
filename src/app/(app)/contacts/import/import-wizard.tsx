"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Alert, Button, buttonClass, Card, cx, Select } from "@/components/ui";
import { isEmptyRow, parseCsv } from "@/lib/csv";
import { guessMapping, IMPORT_BATCH_SIZE, IMPORT_FIELDS, IMPORT_MAX_ROWS, type ImportFieldKey, type ImportRow } from "@/lib/import-fields";
import { importBatch, type BatchResult } from "./actions";

type Parsed = { fileName: string; headers: string[]; rows: { row: number; cells: string[] }[]; truncated: boolean };
type Totals = Omit<BatchResult, "notes"> & { notes: string[] };

const EMPTY_TOTALS: Totals = { created: 0, updated: 0, unchanged: 0, leads: 0, errors: [], notes: [] };
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function ImportWizard({ stageNames }: { stageNames: string[] }) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<(ImportFieldKey | "")[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_BYTES) return setError("That file is over 10 MB. Split it into smaller files.");
    const rows = parseCsv(await file.text());
    const [headers, ...lines] = rows;
    // Row numbers as people see them in a spreadsheet (header is row 1).
    const data = lines.map((cells, i) => ({ row: i + 2, cells })).filter((r) => !isEmptyRow(r.cells));
    if (!headers || !data.length) return setError("The file needs a header row and at least one row of data.");
    setParsed({
      fileName: file.name,
      headers: headers.map((h, i) => h.trim() || `Column ${i + 1}`),
      rows: data.slice(0, IMPORT_MAX_ROWS),
      truncated: data.length > IMPORT_MAX_ROWS,
    });
    setMapping(guessMapping(headers));
  };

  const mapped = new Set(mapping.filter(Boolean));
  const hasIdentity = mapped.has("email") || mapped.has("first_name") || mapped.has("last_name") || mapped.has("full_name");
  const createsLeads = mapped.has("lead_title");

  const run = async () => {
    if (!parsed) return;
    setError(null);
    const records = parsed.rows.map(({ row, cells }) => {
      const data: ImportRow = {};
      mapping.forEach((key, col) => {
        if (key && cells[col]?.trim()) data[key] = cells[col]!.trim();
      });
      return { row, data };
    });

    const sum: Totals = { ...EMPTY_TOTALS, errors: [], notes: [] };
    setProgress({ done: 0, total: records.length });
    for (let i = 0; i < records.length; i += IMPORT_BATCH_SIZE) {
      const batch = records.slice(i, i + IMPORT_BATCH_SIZE);
      try {
        const result = await importBatch(batch, { updateExisting });
        if ("error" in result) {
          setError(`Stopped at row ${batch[0]!.row}: ${result.error}`);
          break;
        }
        sum.created += result.created;
        sum.updated += result.updated;
        sum.unchanged += result.unchanged;
        sum.leads += result.leads;
        sum.errors.push(...result.errors);
        for (const n of result.notes) if (!sum.notes.includes(n)) sum.notes.push(n);
      } catch {
        setError(`Stopped at row ${batch[0]!.row}: the server didn't respond. Rows before it were imported.`);
        break;
      }
      setProgress({ done: Math.min(i + IMPORT_BATCH_SIZE, records.length), total: records.length });
    }
    setTotals(sum);
  };

  const reset = () => {
    setParsed(null);
    setMapping([]);
    setProgress(null);
    setTotals(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // --- Done --------------------------------------------------------------------
  if (totals) {
    return (
      <div className="space-y-6">
        {error ? <Alert>{error}</Alert> : null}
        <Card className="p-5">
          <h2 className="font-medium">Import finished</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["New contacts", totals.created],
              ["Updated", totals.updated],
              ["Already existed", totals.unchanged],
              ["Leads created", totals.leads],
            ].map(([label, n]) => (
              <div key={label}>
                <dt className="text-sm text-zinc-500">{label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
        </Card>
        {totals.notes.length ? (
          <Alert tone="info">
            <ul className="list-disc space-y-1 pl-4">
              {totals.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        {totals.errors.length ? (
          <div>
            <h3 className="mb-2 text-sm font-medium">
              {totals.errors.length} row{totals.errors.length === 1 ? "" : "s"} skipped
            </h3>
            <ul className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200 text-sm dark:divide-zinc-900 dark:border-zinc-800">
              {totals.errors.slice(0, 500).map((e) => (
                <li key={`${e.row}-${e.message}`} className="flex gap-3 px-3 py-2">
                  <span className="w-16 shrink-0 tabular-nums text-zinc-500">Row {e.row}</span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link href="/contacts" className={buttonClass("primary")}>
            View contacts
          </Link>
          {totals.leads ? (
            <Link href="/leads" className={buttonClass("secondary")}>
              View leads
            </Link>
          ) : null}
          <Button variant="ghost" onClick={reset}>
            Import another file
          </Button>
        </div>
      </div>
    );
  }

  // --- Running -------------------------------------------------------------------
  if (progress) {
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <Card className="space-y-3 p-5">
        <p className="text-sm font-medium">
          Importing {progress.done} of {progress.total} rows…
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-zinc-900 transition-all dark:bg-zinc-100" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-zinc-500">Keep this page open until it finishes.</p>
      </Card>
    );
  }

  // --- Pick a file -------------------------------------------------------------
  if (!parsed) {
    return (
      <div className="space-y-4">
        {error ? <Alert>{error}</Alert> : null}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) void readFile(file);
          }}
          className={cx(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center",
            dragOver ? "border-zinc-900 bg-zinc-50 dark:border-zinc-300 dark:bg-zinc-900" : "border-zinc-300 dark:border-zinc-700",
          )}
        >
          <span className="font-medium">Drop a CSV file here, or click to choose one</span>
          <span className="mt-1 text-sm text-zinc-500">Export from Excel, Google Sheets, HubSpot, Pipedrive… Up to {IMPORT_MAX_ROWS.toLocaleString("en")} rows.</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </label>
        <p className="text-sm text-zinc-500">
          Not sure about the format?{" "}
          <a href="/contacts/import/template" download className="text-zinc-900 underline underline-offset-4 dark:text-zinc-100">
            Download a sample CSV
          </a>
          .
        </p>
      </div>
    );
  }

  // --- Map columns ---------------------------------------------------------------
  return (
    <div className="space-y-6">
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">{parsed.fileName}</span>
          <span className="text-zinc-500">
            {" "}
            · {parsed.rows.length.toLocaleString("en")} rows · {parsed.headers.length} columns
          </span>
        </p>
        <Button variant="ghost" className="h-8 px-2 text-sm" onClick={reset}>
          Choose a different file
        </Button>
      </div>
      {parsed.truncated ? <Alert tone="info">Only the first {IMPORT_MAX_ROWS.toLocaleString("en")} rows will be imported. Split the file to import the rest.</Alert> : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Column in your file</th>
              <th scope="col" className="px-3 py-2 font-medium">Sample values</th>
              <th scope="col" className="px-3 py-2 font-medium">Import as</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {parsed.headers.map((header, col) => {
              const samples = parsed.rows
                .map((r) => r.cells[col]?.trim())
                .filter(Boolean)
                .slice(0, 3);
              return (
                <tr key={col}>
                  <td className="px-3 py-2 font-medium">{header}</td>
                  <td className="max-w-72 truncate px-3 py-2 text-zinc-500">{samples.join(" · ") || "—"}</td>
                  <td className="px-3 py-2">
                    <Select
                      aria-label={`Import ${header} as`}
                      value={mapping[col] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value as ImportFieldKey | "";
                        setMapping((m) => m.map((k, i) => (i === col ? value : k === value && value ? "" : k)));
                      }}
                      className="h-9 w-56"
                    >
                      <option value="">Don&apos;t import</option>
                      {(["Contact", "Lead"] as const).map((group) => (
                        <optgroup key={group} label={group}>
                          {IMPORT_FIELDS.filter((f) => f.group === group).map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          {createsLeads
            ? "Each row with a lead name also creates a lead for that contact."
            : "Map a “Lead name” column to also create a lead for each row."}
          {createsLeads && mapped.has("lead_stage") ? ` Stage names should match your pipeline: ${stageNames.join(", ")}.` : ""}
        </p>
        <p>Companies are matched by name and created when missing.</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">When a contact with the same email already exists</legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          {[
            { value: false, label: "Leave it as it is" },
            { value: true, label: "Update it with values from the file" },
          ].map((o) => (
            <label key={String(o.value)} className="flex items-center gap-2 text-sm">
              <input type="radio" name="update_existing" checked={updateExisting === o.value} onChange={() => setUpdateExisting(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Empty cells never overwrite existing values. Leads in the file are created either way.</p>
      </fieldset>

      {!hasIdentity ? <Alert>Map at least an email or a name column.</Alert> : null}
      <div className="flex justify-end">
        <Button onClick={run} disabled={!hasIdentity}>
          Import {parsed.rows.length.toLocaleString("en")} rows
        </Button>
      </div>
    </div>
  );
}
