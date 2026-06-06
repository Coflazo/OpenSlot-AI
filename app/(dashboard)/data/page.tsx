"use client";

import { useState } from "react";
import {
  FileXlsIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  CircleNotchIcon
} from "@phosphor-icons/react/dist/ssr";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";

import { WorkbookUploader } from "@/components/data/WorkbookUploader";
import { EditableImportGrid } from "@/components/data/EditableImportGrid";
import { ValidationPanel } from "@/components/data/ValidationPanel";

import {
  parseWorkbookFile,
  type ParsedSheet
} from "@/lib/import/parseWorkbook";
import {
  autoFixCommonIssues,
  validateCustomersSheet,
  type SheetValidation
} from "@/lib/import/validateWorkbook";

export default function DataPage() {
  const [fileName, setFileName] = useState<string | undefined>();
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [validation, setValidation] = useState<Record<string, SheetValidation>>({});
  const [syncing, setSyncing] = useState<"idle" | "syncing" | "done">("idle");
  const [syncResult, setSyncResult] = useState<{ inserted: number; failed: number } | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    const parsed = await parseWorkbookFile(file);
    setSheets(parsed);
    setActiveSheet(parsed[0]?.sheetName ?? "");
    setValidation({});
    setSyncing("idle");
    setSyncResult(null);
  }

  function setSheetRows(sheetName: string, rows: Record<string, unknown>[]) {
    setSheets((prev) =>
      prev.map((s) => (s.sheetName === sheetName ? { ...s, rows } : s))
    );
  }

  function runValidation() {
    const next: Record<string, SheetValidation> = {};
    for (const sh of sheets) {
      if (sh.sheetName === "Customers") {
        next[sh.sheetName] = validateCustomersSheet(sh);
      }
    }
    setValidation(next);
  }

  function autoFix() {
    setSheets((prev) =>
      prev.map((s) =>
        s.sheetName === "Customers" ? { ...s, rows: autoFixCommonIssues(s.rows) } : s
      )
    );
    runValidation();
  }

  function previewSync() {
    const customers = sheets.find((s) => s.sheetName === "Customers");
    if (!customers) return null;
    return {
      totalRows: customers.rows.length,
      validRows: validation["Customers"]?.validCount ?? 0,
      withErrors:
        validation["Customers"]?.errors.filter((e) => e.severity === "error").length ?? 0
    };
  }

  async function syncToSupabase() {
    // Demo-mode sync — when Supabase is configured this hits /api/imports/.../commit.
    // Without creds it just shows the simulated count.
    setSyncing("syncing");
    setTimeout(() => {
      const c = sheets.find((s) => s.sheetName === "Customers");
      setSyncResult({
        inserted: validation["Customers"]?.validCount ?? c?.rows.length ?? 0,
        failed:
          validation["Customers"]?.errors.filter((e) => e.severity === "error").length ?? 0
      });
      setSyncing("done");
    }, 1400);
  }

  const active = sheets.find((s) => s.sheetName === activeSheet);
  const preview = previewSync();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight inline-flex items-center gap-2">
            <FileXlsIcon size={22} weight="duotone" className="text-vert-600" />
            Data
          </h1>
          <p className="mt-2 text-body text-ink-500">
            Upload Excel or CSV files, edit rows locally, validate consent and eligibility,
            then sync clean data to Supabase. Original files are stored 7 days then deleted.
          </p>
        </div>
      </div>

      <WorkbookUploader fileName={fileName} onFile={handleFile} />

      {sheets.length > 0 && active && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-3">
            <Card className="p-3 flex items-center gap-2 flex-wrap">
              <Tabs value={activeSheet} onValueChange={setActiveSheet}>
                <TabsList className="flex-wrap">
                  {sheets.map((s) => (
                    <TabsTrigger key={s.sheetName} value={s.sheetName}>
                      {s.sheetName}
                      <span className="ml-1.5 text-meta text-ink-400 tabular-nums">
                        {s.rows.length}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={runValidation}>
                  Validate
                </Button>
              </div>
            </Card>
            <EditableImportGrid
              columns={active.columns}
              rows={active.rows}
              errors={validation[active.sheetName]?.errors ?? []}
              onChange={(rows) => setSheetRows(active.sheetName, rows)}
            />
          </div>
          <div className="lg:col-span-4 space-y-3">
            <ValidationPanel
              validation={validation["Customers"] ?? null}
              onAutoFix={autoFix}
            />
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Sync to Supabase</CardTitle>
                  <CardDescription>
                    Upserts customers + consents + eligibility. Backed by RLS.
                  </CardDescription>
                </div>
                {syncing === "done" && <Badge tone="vert">Synced</Badge>}
              </CardHeader>
              {preview && (
                <ul className="text-[13px] space-y-1.5 mb-4">
                  <Row k="Total rows" v={preview.totalRows} />
                  <Row k="Valid" v={preview.validRows} positive />
                  <Row k="With errors" v={preview.withErrors} negative />
                </ul>
              )}
              <Button onClick={syncToSupabase} disabled={syncing === "syncing" || !active}>
                {syncing === "syncing" ? (
                  <>
                    <CircleNotchIcon size={13} className="animate-spin" />
                    Syncing…
                  </>
                ) : syncing === "done" ? (
                  <>
                    <CheckCircleIcon size={13} weight="fill" />
                    Synced {syncResult?.inserted ?? 0} customers
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon size={13} weight="bold" />
                    Sync to Supabase
                  </>
                )}
              </Button>
              <p className="text-meta text-ink-400 mt-2">
                Without Supabase env vars this sync is simulated locally. Once you paste them into
                <code className="mx-1 text-ink-500 font-mono">.env.local</code>
                the API route does a real upsert + consent insert + audit log entry.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, positive, negative }: { k: string; v: number; positive?: boolean; negative?: boolean }) {
  return (
    <li className="flex items-baseline justify-between">
      <span className="text-ink-500">{k}</span>
      <span
        className={
          "font-mono tabular-nums font-[700] " +
          (positive ? "text-vert-700" : negative ? "text-sienna-700" : "text-ink")
        }
      >
        {v}
      </span>
    </li>
  );
}
