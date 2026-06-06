"use client";

import { useState } from "react";
import { DownloadSimpleIcon, CheckCircleIcon, CircleNotchIcon } from "@phosphor-icons/react/dist/ssr";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { useStore } from "@/lib/store";

const SOURCES = [
  { id: "google", label: "Google Calendar", body: "Two-way sync of bookings and cancellations." },
  { id: "outlook", label: "Outlook", body: "Read-only sync for now." },
  { id: "ical", label: "iCal feed (.ics)", body: "Pull-only with 30-minute refresh." },
  { id: "csv", label: "CSV upload", body: "One-shot import for migrations." }
];

export function ImportCalendarDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("google");
  const [status, setStatus] = useState<"idle" | "syncing" | "done">("idle");
  const appendAudit = useStore((s) => s.appendAudit);

  function run() {
    setStatus("syncing");
    setTimeout(() => {
      setStatus("done");
      appendAudit({
        actor: "user",
        action: "calendar.import",
        object: source,
        result: "success",
        details: "32 appointments imported"
      });
    }, 1400);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(() => setStatus("idle"), 300);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary">
            <DownloadSimpleIcon size={14} />
            Import calendar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import calendar</DialogTitle>
          <DialogDescription>Pick a source to sync existing bookings and watch for cancellations.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          {SOURCES.map((s) => (
            <label
              key={s.id}
              className={
                "flex items-start gap-3 p-3 rounded-btn border transition cursor-pointer " +
                (source === s.id ? "border-peacock bg-peacock-50/40" : "border-stone hover:bg-porcelain2")
              }
            >
              <input
                type="radio"
                name="cal-source"
                checked={source === s.id}
                onChange={() => setSource(s.id)}
                className="accent-peacock mt-1"
              />
              <div>
                <div className="text-[13.5px] font-[650]">{s.label}</div>
                <div className="text-meta text-ink-500">{s.body}</div>
              </div>
            </label>
          ))}
        </div>
        {status === "done" && (
          <div className="mt-2 flex items-center gap-2 text-vert-700 text-[13px] font-[600]">
            <CheckCircleIcon size={14} weight="fill" />
            Imported 32 appointments from {SOURCES.find((s) => s.id === source)?.label}.
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
          <Button onClick={run} disabled={status === "syncing"}>
            {status === "syncing" ? (
              <>
                <CircleNotchIcon size={13} className="animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <DownloadSimpleIcon size={13} />
                Start sync
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
