export type ExportableReport = {
  title: string;
  description: string;
  format: "csv" | "json" | "summary";
  sourceType: "manual" | "prometheus";
  status: "draft" | "ready";
  content: string;
  generatedPreview: string;
  generatedAt: string;
  updatedAt: string;
};

type CsvCell = string | number | boolean | null;
type CsvRow = Record<string, CsvCell>;

function safeParseJson(value: string): unknown | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function toCellValue(value: unknown): CsvCell {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function objectToRow(value: Record<string, unknown>): CsvRow {
  return Object.entries(value).reduce<CsvRow>((row, [key, entryValue]) => {
    row[key] = toCellValue(entryValue);
    return row;
  }, {});
}

function normalizeRows(value: unknown): CsvRow[] {
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        return objectToRow(entry as Record<string, unknown>);
      }

      return { value: toCellValue(entry) };
    });
  }

  if (value && typeof value === "object") {
    return [objectToRow(value as Record<string, unknown>)];
  }

  if (typeof value === "string") {
    return [{ summary: value }];
  }

  return [{ value: toCellValue(value) }];
}

function collectHeaders(rows: CsvRow[]) {
  const headers: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }

  return headers.length > 0 ? headers : ["value"];
}

function escapeCsvCell(value: CsvCell) {
  const raw = value === null ? "" : String(value);
  if (!/[",\n]/.test(raw)) {
    return raw;
  }

  return `"${raw.replace(/"/g, '""')}"`;
}

function pickReportPayload(report: ExportableReport): unknown {
  const preferred = report.generatedPreview.trim() ? report.generatedPreview : report.content;
  const parsed = safeParseJson(preferred);
  if (parsed !== null) {
    return parsed;
  }

  return preferred || `Report: ${report.title}`;
}

export function buildCsvTable(report: ExportableReport) {
  const rows = normalizeRows(pickReportPayload(report));
  const headers = collectHeaders(rows);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? null)).join(",")),
  ];

  return lines.join("\n");
}

export function buildJsonPayload(report: ExportableReport) {
  const parsedPayload = pickReportPayload(report);
  const structured =
    typeof parsedPayload === "string"
      ? {
          title: report.title,
          description: report.description,
          sourceType: report.sourceType,
          status: report.status,
          content: parsedPayload,
        }
      : parsedPayload;

  return JSON.stringify(structured, null, 2);
}

export function safeReportFilename(title: string) {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "report";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function buildReportPdf(report: ExportableReport): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "pt", format: "a4", compress: true });

  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - margin;

  let y = margin;
  const lineHeight = 14;

  function ensureRoom(lines = 1) {
    if (y + lines * lineHeight <= bottomLimit) {
      return;
    }

    document.addPage();
    y = margin;
  }

  function writeLine(text: string, options?: { bold?: boolean; fontSize?: number; mono?: boolean }) {
    document.setFontSize(options?.fontSize ?? 11);
    if (options?.mono) {
      document.setFont("courier", options?.bold ? "bold" : "normal");
    } else {
      document.setFont("helvetica", options?.bold ? "bold" : "normal");
    }

    const wrapped = document.splitTextToSize(text, contentWidth) as string[];
    ensureRoom(wrapped.length);

    for (const entry of wrapped) {
      document.text(entry, margin, y);
      y += lineHeight;
    }
  }

  writeLine(report.title, { bold: true, fontSize: 16 });
  y += 2;
  writeLine(`Format: ${report.format.toUpperCase()}   Source: ${report.sourceType.toUpperCase()}   Status: ${report.status.toUpperCase()}`);
  writeLine(`Generated: ${report.generatedAt || "n/a"}`);
  writeLine(`Updated: ${report.updatedAt || "n/a"}`);

  if (report.description.trim()) {
    y += 4;
    writeLine("Description", { bold: true });
    writeLine(report.description);
  }

  y += 6;
  writeLine("Tabular preview", { bold: true });

  const csvLines = buildCsvTable(report).split("\n").slice(0, 80);
  for (const line of csvLines) {
    writeLine(line, { mono: true, fontSize: 9 });
  }

  return document.output("blob") as Blob;
}
