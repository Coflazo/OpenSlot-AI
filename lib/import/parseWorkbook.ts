import * as XLSX from "xlsx";

export interface ParsedSheet {
  sheetName: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export function parseWorkbookFromArrayBuffer(buffer: ArrayBuffer): ParsedSheet[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const columns = rows.length ? Object.keys(rows[0]) : [];
    return { sheetName, columns, rows };
  });
}

export async function parseWorkbookFile(file: File): Promise<ParsedSheet[]> {
  const buffer = await file.arrayBuffer();
  return parseWorkbookFromArrayBuffer(buffer);
}

export function workbookFromSheets(sheets: ParsedSheet[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const sh of sheets) {
    const ws = XLSX.utils.json_to_sheet(sh.rows, { header: sh.columns });
    XLSX.utils.book_append_sheet(wb, ws, sh.sheetName.slice(0, 31));
  }
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}
