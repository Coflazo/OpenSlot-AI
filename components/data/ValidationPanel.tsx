"use client";

import { WarningCircleIcon, CheckCircleIcon, XCircleIcon, MagicWandIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/primitives/button";
import type { ValidationError } from "@/lib/import/validateWorkbook";

export function ValidationPanel({
  validation,
  onAutoFix
}: {
  validation: {
    errors: ValidationError[];
    validCount: number;
    totalCount: number;
  } | null;
  onAutoFix: () => void;
}) {
  if (!validation) {
    return (
      <div className="rounded-card bg-white shadow-card p-4 text-meta text-ink-400">
        Click "Validate" to run consent + format checks.
      </div>
    );
  }
  const errors = validation.errors.filter((e) => e.severity === "error").length;
  const warnings = validation.errors.filter((e) => e.severity === "warning").length;

  return (
    <div className="rounded-card bg-white shadow-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        {errors === 0 ? (
          <CheckCircleIcon size={16} weight="fill" className="text-vert-600" />
        ) : (
          <WarningCircleIcon size={16} weight="fill" className="text-sienna-600" />
        )}
        <span className="text-section">Validation</span>
        <span className="ml-auto font-mono tabular-nums text-meta text-ink-500">
          {validation.validCount}/{validation.totalCount} valid
        </span>
      </div>
      <div className="flex gap-3 text-[13px]">
        <span className="text-sienna-700 font-[650]">{errors} errors</span>
        <span className="text-saffron-700 font-[650]">{warnings} warnings</span>
      </div>
      <div className="max-h-[180px] overflow-y-auto rounded-card border border-stone/80 divide-y divide-stone/60">
        {validation.errors.slice(0, 30).map((e, i) => (
          <div key={i} className="px-3 py-1.5 text-[12.5px] flex items-start gap-2">
            {e.severity === "error" ? (
              <XCircleIcon size={12} weight="fill" className="text-sienna-600 mt-0.5" />
            ) : (
              <WarningCircleIcon size={12} weight="fill" className="text-saffron-600 mt-0.5" />
            )}
            <span className="font-mono text-ink-400 tabular-nums shrink-0">row {e.rowIndex + 1}</span>
            <span className="text-ink-600">{e.field}</span>
            <span className="text-ink-500 ml-auto truncate max-w-[60%] text-right">{e.message}</span>
          </div>
        ))}
        {validation.errors.length === 0 && (
          <div className="px-3 py-3 text-meta text-ink-400 text-center">No issues. Ready to sync.</div>
        )}
      </div>
      <Button size="sm" variant="secondary" onClick={onAutoFix} className="w-full">
        <MagicWandIcon size={13} weight="duotone" />
        Auto-fix obvious issues (trim, lowercase email, normalize phone)
      </Button>
    </div>
  );
}
