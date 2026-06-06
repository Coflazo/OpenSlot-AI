"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/primitives/dialog";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Badge } from "@/components/primitives/badge";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/format";

export function ManualFillDialog({
  slotId,
  open,
  onOpenChange
}: {
  slotId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const customers = useStore((s) => s.customers);
  const slot = useStore((s) => s.slots.find((x) => x.id === slotId));
  const manuallyFillSlot = useStore((s) => s.manuallyFillSlot);
  const appendAudit = useStore((s) => s.appendAudit);

  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return customers
      .filter(
        (c) =>
          !c.optedOut &&
          (!q ||
            c.name.toLowerCase().includes(needle) ||
            (c.email ?? "").toLowerCase().includes(needle) ||
            (c.phone ?? "").includes(q))
      )
      .slice(0, 30);
  }, [customers, q]);

  function submit() {
    if (!picked || !slot) return;
    manuallyFillSlot(slot.id, picked);
    appendAudit({
      actor: "user",
      action: "slot.manual_fill",
      object: slot.id,
      result: "success",
      details: `Filled by ${customers.find((c) => c.id === picked)?.name ?? picked}`
    });
    onOpenChange(false);
    setPicked(null);
    setQ("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 mb-3">
          <DialogTitle>Manually fill slot</DialogTitle>
          <DialogDescription>
            Choose any customer to override the cascade and lock this slot.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <div className="relative">
            <MagnifyingGlassIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, phone…" className="pl-9" />
          </div>
        </div>
        <div className="px-3 py-3 max-h-[320px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-meta text-ink-400">No customers match.</div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setPicked(c.id)}
                    className={
                      "w-full flex items-center gap-3 px-3 py-2 rounded-btn text-left transition " +
                      (picked === c.id ? "bg-peacock-50 ring-1 ring-peacock-200" : "hover:bg-porcelain2")
                    }
                  >
                    <span className="h-8 w-8 rounded-full bg-gradient-to-br from-violet to-peacock text-white flex items-center justify-center font-[700] text-[11px]">
                      {initials(c.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-[650] truncate">{c.name}</div>
                      <div className="text-meta text-ink-400 truncate">
                        {c.email} · {c.requestedService ?? "no preference"}
                      </div>
                    </div>
                    {c.requestedService === slot?.service && <Badge tone="vert">Match</Badge>}
                    {picked === c.id && <CheckCircleIcon size={14} weight="fill" className="text-peacock" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter className="px-6 pb-6 pt-3 border-t border-stone/70">
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={submit} disabled={!picked}>
            Confirm and lock slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
