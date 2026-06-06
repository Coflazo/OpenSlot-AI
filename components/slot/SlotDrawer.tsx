"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  CoinIcon,
  TimerIcon,
  PhoneIcon,
  PauseIcon,
  PlayIcon,
  HandIcon,
  CheckIcon
} from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/primitives/sheet";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { useStore } from "@/lib/store";
import { money, secondsToClock, shortDate, duration } from "@/lib/format";
import { StatusChip } from "./StatusChip";
import { TimeLeftPill } from "./TimeLeftPill";
import { SlotWorkflowTimeline } from "./SlotWorkflowTimeline";
import { CascadeChainView } from "./CascadeChainView";
import { ManualFillDialog } from "./ManualFillDialog";
import { CloseSlotDialog } from "./CloseSlotDialog";

export function SlotDrawer() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const id = params.get("id");

  const slot = useStore((s) => (id ? s.slots.find((x) => x.id === id) : undefined));
  const pauseSlot = useStore((s) => s.pauseSlot);
  const resumeSlot = useStore((s) => s.resumeSlot);
  const cascadeChains = useStore((s) => s.cascadeChains);
  const allCalls = useStore((s) => s.calls);
  const customers = useStore((s) => s.customers);
  const calls = useMemo(() => (id ? allCalls.filter((c) => c.slotId === id) : []), [allCalls, id]);

  const [manualOpen, setManualOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const open = Boolean(slot);
  const chain = slot
    ? cascadeChains.find((c) => c.rootSlotId === slot.id || c.steps.some((st) => st.slotId === slot.id))
    : undefined;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) router.push(pathname);
      }}
    >
      {slot && (
        <SheetContent>
          <SheetHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle>{slot.service}</SheetTitle>
                <SheetDescription>
                  {shortDate(slot.startTime)} · {duration(slot.durationMinutes)} · {slot.location}
                </SheetDescription>
              </div>
              <StatusChip status={slot.status} pulse />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Value" value={money(slot.estimatedValue)} icon={<CoinIcon size={12} />} tone="saffron" />
              <Metric label="Time left" value={<TimeLeftPill iso={slot.startTime} />} icon={<TimerIcon size={12} />} />
              <Metric label="Calls" value={`${calls.length}`} icon={<PhoneIcon size={12} />} />
            </div>

            <section>
              <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700] mb-2.5">Workflow</div>
              <SlotWorkflowTimeline slotId={slot.id} />
            </section>

            {chain && <CascadeChainView chainId={chain.id} />}

            <section>
              <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700] mb-2.5">Slot details</div>
              <div className="rounded-card bg-porcelain p-4 grid grid-cols-2 gap-3 text-[13px]">
                <Detail k="Origin">
                  <Badge tone={slot.origin === "upgrade_cascade" ? "violet" : "neutral"}>
                    {slot.origin === "patient_cancellation"
                      ? "Patient cancellation"
                      : slot.origin === "upgrade_cascade"
                        ? "Upgrade cascade"
                        : "Manual opening"}
                  </Badge>
                </Detail>
                <Detail k="Cascade depth">{slot.cascadeDepth}</Detail>
                <Detail k="Safety form">
                  <Req on={slot.requirements.safetyForm} />
                </Detail>
                <Detail k="Referral">
                  <Req on={slot.requirements.referral} />
                </Detail>
                <Detail k="Payment ready">
                  <Req on={slot.requirements.paymentReady} />
                </Detail>
                <Detail k="Contrast">
                  <Req on={slot.requirements.contrast} label={slot.requirements.contrast ? "Required" : "Not required"} />
                </Detail>
              </div>
            </section>

            <section>
              <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700] mb-2.5">
                Calls in this workflow
              </div>
              {calls.length === 0 ? (
                <div className="rounded-card border border-dashed border-stone p-4 text-meta text-ink-400">
                  No calls yet. Start the cascade simulation to see candidates being contacted.
                </div>
              ) : (
                <ul className="space-y-2">
                  {calls.map((c) => {
                    const cust = customers.find((cu) => cu.id === c.customerId);
                    return (
                      <li key={c.id} className="flex items-center gap-3 p-3 rounded-card border border-stone bg-white">
                        <span className="h-7 w-7 rounded-full bg-porcelain2 flex items-center justify-center text-[10.5px] font-[700]">
                          {c.type === "upgrade_offer" ? "UP" : c.type === "waitlist_offer" ? "WL" : "CF"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-[600] truncate">{cust?.name ?? c.customerId}</div>
                          <div className="text-meta text-ink-400">
                            {c.type.replace("_", " ")} · {c.transcript.length} turns
                            {typeof c.durationSeconds === "number" ? ` · ${secondsToClock(c.durationSeconds)}` : ""}
                          </div>
                        </div>
                        <StatusChip status={statusFromCall(c.status)} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <div className="px-6 py-4 border-t border-stone/70 bg-porcelain/70 flex items-center gap-2">
            {slot.status === "paused" ? (
              <Button variant="success" onClick={() => resumeSlot(slot.id)}>
                <PlayIcon size={13} weight="fill" />
                Resume workflow
              </Button>
            ) : (
              <Button variant="danger" onClick={() => pauseSlot(slot.id)}>
                <PauseIcon size={13} />
                Pause workflow
              </Button>
            )}
            <Button variant="secondary" onClick={() => setManualOpen(true)}>
              <HandIcon size={13} />
              Manually fill
            </Button>
            <Button variant="ghost" className="ml-auto text-ink-500" onClick={() => setCloseOpen(true)}>
              <CheckIcon size={13} />
              Close slot
            </Button>
          </div>

          <ManualFillDialog slotId={slot.id} open={manualOpen} onOpenChange={setManualOpen} />
          <CloseSlotDialog slotId={slot.id} open={closeOpen} onOpenChange={setCloseOpen} />
        </SheetContent>
      )}
    </Sheet>
  );
}

function statusFromCall(status: string): "calling" | "filled" | "expired" | "paused" {
  if (status === "accepted") return "filled";
  if (status === "declined" || status === "no_answer" || status === "voicemail" || status === "failed") return "expired";
  if (status === "ringing" || status === "in_progress") return "calling";
  return "paused";
}

function Detail({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700]">{k}</div>
      <div className="mt-1 text-[13px] text-ink">{children}</div>
    </div>
  );
}

function Req({ on, label }: { on: boolean; label?: string }) {
  return (
    <span className={"inline-flex items-center gap-1.5 text-[12.5px] font-[600] " + (on ? "text-vert-700" : "text-ink-400")}>
      <span className={"h-1.5 w-1.5 rounded-full " + (on ? "bg-vert" : "bg-stone2")} />
      {label ?? (on ? "Required" : "Not required")}
    </span>
  );
}

function Metric({
  label,
  value,
  icon,
  tone = "neutral"
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "neutral" | "saffron";
}) {
  return (
    <div className={"rounded-card border border-stone/80 p-3 " + (tone === "saffron" ? "bg-saffron-50" : "bg-porcelain")}>
      <div className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700] flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className={"mt-1.5 font-mono tabular-nums text-[18px] font-[700] " + (tone === "saffron" ? "text-saffron-700" : "text-ink")}>
        {value}
      </div>
    </div>
  );
}
