// Minimal RFC 4180 CSV reading and writing, shared by the browser (import
// preview) and the server (exports). No dependencies on purpose.

// Picks the delimiter that splits the header line into the most columns.
// Spreadsheet apps in many European locales export with ";".
function detectDelimiter(text: string) {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const counts = [",", ";", "\t"].map((d) => ({ d, n: firstLine.split(d).length }));
  return counts.sort((a, b) => b.n - a.n)[0]!.d;
}

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"' && cell === "") {
      quoted = true;
    } else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  // Drop trailing empty lines (common at the end of exported files). Empty
  // lines in the middle stay so row numbers match the spreadsheet.
  while (rows.length && isEmptyRow(rows[rows.length - 1]!)) rows.pop();
  return rows;
}

export function isEmptyRow(row: string[]) {
  return row.every((v) => v.trim() === "");
}

// Cells starting with these characters are run as formulas by spreadsheet
// apps ("CSV injection"), so exported values get a leading apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = Array.isArray(value) ? value.join("; ") : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",;\t\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]) {
  // BOM so Excel opens UTF-8 (accents, €) correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}
