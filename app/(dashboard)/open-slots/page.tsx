"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FunnelSimpleIcon,
  PlusIcon,
  DownloadSimpleIcon,
  CaretRightIcon,
  ArrowsClockwiseIcon
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { StatusChip } from "@/components/slot/StatusChip";
import { TimeLeftPill } from "@/components/slot/TimeLeftPill";
import { SlotDrawer } from "@/components/slot/SlotDrawer";
import { CreateOpenSlotDialog } from "@/components/slot/CreateOpenSlotDialog";
import { ImportCalendarDialog } from "@/components/slot/ImportCalendarDialog";

import { useStore } from "@/lib/store";
import { money, longDate, duration } from "@/lib/format";

const STATUSES = ["all", "open", "calling", "held", "filled", "expired", "paused"] as const;

export default function OpenSlotsPage() {
  const router = useRouter();
  const slots = useStore((s) => s.slots);
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("all");

  const list = useMemo(() => {
    const base = slots.filter((s) => s.status !== "booked");
    return filter === "all" ? base : base.filter((s) => s.status === filter);
  }, [slots, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight">Open Slots</h1>
          <p className="mt-2 text-body text-ink-500">
            Manage every cancelled appointment until it is filled, expired, or closed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <DownloadSimpleIcon size={14} />
            Export report
          </Button>
          <ImportCalendarDialog
            trigger={
              <Button variant="secondary">
                <ArrowsClockwiseIcon size={14} />
                Import cancellations
              </Button>
            }
          />
          <CreateOpenSlotDialog />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-card shadow-card">
        <span className="inline-flex items-center gap-1.5 text-meta text-ink-500 px-2 font-[600]">
          <FunnelSimpleIcon size={13} />
          Status
        </span>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              filter === s
                ? "px-2.5 py-1 rounded-chip bg-ink text-white text-[12px] font-[600] capitalize"
                : "px-2.5 py-1 rounded-chip bg-porcelain2 text-ink-600 hover:bg-stone text-[12px] font-[600] capitalize"
            }
          >
            {s}
          </button>
        ))}
        <div className="ml-auto text-meta text-ink-400 px-2">
          {list.length} {list.length === 1 ? "slot" : "slots"}
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-section text-ink mb-1">No open slots match this filter</p>
            <p className="text-meta text-ink-400">Try a different status filter or run the cascade simulation.</p>
          </div>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead className="bg-porcelain/70 border-b border-stone/80">
              <tr className="text-left text-meta text-ink-500 [&>th]:py-2.5 [&>th]:px-4 [&>th]:font-[600] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-[11px]">
                <th>Slot</th>
                <th>When</th>
                <th>Value</th>
                <th>Status</th>
                <th>Origin</th>
                <th>Time left</th>
                <th className="text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((slot) => (
                <tr
                  key={slot.id}
                  className="border-b border-stone/60 hover:bg-porcelain2/60 cursor-pointer transition"
                  onClick={() => router.push(`/open-slots?id=${slot.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-[650] text-ink">{slot.service}</div>
                    <div className="text-meta text-ink-400">{slot.location}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {longDate(slot.startTime)}
                    <div className="text-meta text-ink-400">{duration(slot.durationMinutes)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono tabular-nums font-[700] text-saffron-700">
                      {money(slot.estimatedValue)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={slot.status} pulse={slot.status === "calling"} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={slot.origin === "upgrade_cascade" ? "violet" : slot.origin === "patient_cancellation" ? "sienna" : "neutral"}>
                      {slot.origin === "patient_cancellation"
                        ? "Patient cancelled"
                        : slot.origin === "upgrade_cascade"
                          ? "Cascade vacated"
                          : "Manual"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3"><TimeLeftPill iso={slot.startTime} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/open-slots?id=${slot.id}`}
                      className="inline-flex items-center gap-1 text-peacock text-[12.5px] font-[650]"
                    >
                      Open
                      <CaretRightIcon size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Suspense fallback={null}>
        <SlotDrawer />
      </Suspense>
    </div>
  );
}
