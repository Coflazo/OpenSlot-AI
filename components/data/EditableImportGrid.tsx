"use client";

import { useMemo, useState } from "react";
import type { ValidationError } from "@/lib/import/validateWorkbook";
import { cn } from "@/lib/cn";

export function EditableImportGrid({
  columns,
  rows,
  errors,
  onChange
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  errors: ValidationError[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const errorsByCell = useMemo(() => {
    const m = new Map<string, ValidationError[]>();
    for (const e of errors) {
      const key = `${e.rowIndex}_${e.field}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    }
    return m;
  }, [errors]);

  function updateCell(rowIndex: number, col: string, value: string) {
    const next = rows.map((r, i) => (i === rowIndex ? { ...r, [col]: value } : r));
    setDirty((prev) => {
      const n = new Set(prev);
      n.add(`${rowIndex}_${col}`);
      return n;
    });
    onChange(next);
  }

  return (
    <div className="rounded-card bg-white shadow-card overflow-hidden">
      <div className="overflow-x-auto max-h-[520px]">
        <table className="w-full text-[12.5px] border-collapse">
          <thead className="sticky top-0 bg-porcelain z-10">
            <tr>
              <th className="text-meta text-ink-400 font-[700] uppercase tracking-wider text-[10.5px] px-2 py-2 text-left border-b border-stone/70">
                #
              </th>
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-meta text-ink-400 font-[700] uppercase tracking-wider text-[10.5px] px-2 py-2 text-left border-b border-stone/70 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((row, i) => (
              <tr key={i} className="hover:bg-porcelain2/40">
                <td className="font-mono tabular-nums text-ink-400 px-2 py-1 border-b border-stone/40">
                  {i + 1}
                </td>
                {columns.map((c) => {
                  const cellKey = `${i}_${c}`;
                  const isDirty = dirty.has(cellKey);
                  const cellErrors = errorsByCell.get(cellKey) ?? [];
                  const hasErr = cellErrors.some((e) => e.severity === "error");
                  const hasWarn = cellErrors.some((e) => e.severity === "warning");
                  return (
                    <td
                      key={c}
                      className={cn(
                        "px-1 py-0.5 border-b border-stone/40 min-w-[120px]",
                        isDirty && "bg-saffron-50",
                        hasErr && "bg-sienna-50",
                        hasWarn && !hasErr && "bg-saffron-100/60"
                      )}
                      title={cellErrors.map((e) => e.message).join("\n")}
                    >
                      <input
                        value={String(row[c] ?? "")}
                        onChange={(e) => updateCell(i, c, e.target.value)}
                        className={cn(
                          "w-full bg-transparent px-1.5 py-0.5 text-[12.5px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-peacock rounded-sm",
                          hasErr && "text-sienna-700",
                          hasWarn && !hasErr && "text-saffron-700"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length > 200 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-3 text-meta text-ink-400 text-center">
                  Showing first 200 of {rows.length} rows. Use validate to scan everything.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
