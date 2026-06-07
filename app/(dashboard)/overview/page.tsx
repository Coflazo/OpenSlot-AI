"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CoinIcon,
  TimerIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  CalendarBlankIcon,
  WarningIcon,
  CaretRightIcon,
  ClockClockwiseIcon
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/primitives/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { KPICard } from "@/components/kpi/KPICard";
import { CountUp } from "@/components/kpi/CountUp";
import { OpenSlotCard } from "@/components/slot/OpenSlotCard";
import { CreateOpenSlotDialog } from "@/components/slot/CreateOpenSlotDialog";
import { ImportCalendarDialog } from "@/components/slot/ImportCalendarDialog";

import { useStore } from "@/lib/store";
import { secondsToClock } from "@/lib/format";

interface DashboardSummary {
  slot_status_counts: Record<string, number>;
  waitlist_active_count: number;
  customers_count: number;
  recent_audit: { id: string; action: string; object_type: string; object_id: string; result: string; at: string }[];
}

export default function OverviewPage() {
  const slots = useStore((s) => s.slots);
  const hydrateFromApi = useStore((s) => s.hydrateFromApi);
  const audit = useStore((s) => s.audit);
  const recoveredRevenue = useStore((s) => s.recoveredRevenue);
  const slotsSaved = useStore((s) => s.slotsSaved);
  const scannerMinutesRecovered = useStore((s) => s.scannerMinutesRecovered);
  const averageTimeToFillSec = useStore((s) => s.averageTimeToFillSec);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    void hydrateFromApi();
    fetch("/api/get-data", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setSummary(d);
      })
      .catch(() => {});
  }, [hydrateFromApi]);

  const openSlots = slots.filter((s) => ["open", "calling", "held"].includes(s.status));
  const summaryAudit = (summary?.recent_audit ?? []).map((e) => ({
    id: e.id,
    at: e.at,
    actor: "system" as const,
    action: e.action,
    object: e.object_id,
    result: e.result as "info" | "success" | "warning" | "error",
    details: undefined as string | undefined
  }));
  const recentActivity = [...audit, ...summaryAudit].slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <Badge tone="peacock" className="mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-peacock animate-pulse" />
            Live recovery
          </Badge>
          <h1 className="text-title-xl tracking-tight">Overview</h1>
          <p className="mt-2 text-body text-ink-500 max-w-xl">
            Track recovered revenue, open slots, and waitlist performance in real time.
            One cancellation, one cascade, every slot accounted for.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCalendarDialog />
          <CreateOpenSlotDialog />
        </div>
      </div>

      {/* KPI bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <KPICard
            label="Recovered revenue"
            value={
              <span className="text-saffron-600">
                <span className="text-[22px] mr-0.5">€</span>
                <CountUp value={recoveredRevenue} format={(n) => Math.round(n).toLocaleString("de-AT")} />
              </span>
            }
            delta="+18% vs last month"
            hint="Revenue from appointments filled after a cancellation."
            icon={<CoinIcon size={14} weight="duotone" />}
            tone="saffron"
          />
        </div>
        <div className="lg:col-span-3">
          <KPICard
            label="Slots saved"
            value={<CountUp value={slotsSaved} />}
            delta="This month"
            hint="Cancelled appointments that were successfully filled from the waitlist."
            icon={<CheckCircleIcon size={14} weight="duotone" />}
            tone="vert"
          />
        </div>
        <div className="lg:col-span-2">
          <KPICard
            label="Time to fill"
            value={<span>{secondsToClock(averageTimeToFillSec)}</span>}
            delta="Median"
            hint="Time between cancellation detection and confirmed replacement booking."
            icon={<TimerIcon size={14} weight="duotone" />}
            tone="peacock"
          />
        </div>
        <div className="lg:col-span-3">
          <KPICard
            label="Consent-safe calls"
            value={<span className="text-vert-700">100%</span>}
            delta="No blocked calls"
            hint="Only customers with valid call consent were contacted."
            icon={<ShieldCheckIcon size={14} weight="duotone" />}
            tone="violet"
          />
        </div>
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Open slots now</CardTitle>
                <CardDescription>
                  Cancellations detected in your live calendar.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/open-slots">
                  View all
                  <CaretRightIcon size={12} />
                </Link>
              </Button>
            </CardHeader>
            {openSlots.length === 0 ? (
              <EmptyOpenSlots />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {openSlots.map((s) => (
                  <OpenSlotCard key={s.id} slotId={s.id} />
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Scanner time recovered</CardTitle>
                <CardDescription>This month, across both locations.</CardDescription>
              </div>
            </CardHeader>
            <div className="font-mono text-kpi tabular-nums">
              <CountUp value={Math.floor(scannerMinutesRecovered / 60)} />
              <span className="text-ink-400 text-[20px]">h</span>{" "}
              <CountUp value={scannerMinutesRecovered % 60} />
              <span className="text-ink-400 text-[20px]">m</span>
            </div>
            <div className="mt-4 text-meta text-ink-500">
              Equivalent to <span className="font-mono tabular-nums text-ink">{slotsSaved}</span> MRI Knee
              sessions reclaimed from cancellations.
            </div>
            <NeedsAttention />
          </Card>
        </div>
      </div>

      {/* Activity timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Latest recovery activity</CardTitle>
                <CardDescription>Auto-generated audit trail from the cascade engine.</CardDescription>
              </div>
            </CardHeader>
            <ol className="relative border-l border-stone/80 pl-5 space-y-3">
              {recentActivity.map((entry) => (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="relative"
                >
                  <span className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full bg-peacock ring-4 ring-porcelain" />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-[12px] text-ink-400 tabular-nums">
                      {new Date(entry.at).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-[13.5px] text-ink font-[600]">{entry.action.replace(".", " · ")}</span>
                    <span className="text-meta text-ink-500">{entry.object}</span>
                  </div>
                  {entry.details && (
                    <div className="text-meta text-ink-400 mt-0.5">{entry.details}</div>
                  )}
                </motion.li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>How OpenSlot AI chooses who to call</CardTitle>
                <CardDescription>The cascade in five lines.</CardDescription>
              </div>
            </CardHeader>
            <ul className="space-y-3 text-[13.5px]">
              <Reason index={1} title="Safety first" body="Only customers with consent and matching eligibility are considered." />
              <Reason index={2} title="Ready customers first" body="Completed forms, referrals, payment status come before raw priority." />
              <Reason index={3} title="Fairness matters" body="Longer wait times get a higher score in the waitlist pool." />
              <Reason index={4} title="Time changes behavior" body="Closer to the appointment, the engine moves faster through candidates." />
              <Reason index={5} title="No double-booking" body="The first confirmed customer locks the slot. Other calls stop automatically." />
            </ul>
            <div className="mt-5 flex items-center gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/rules">
                  Edit ranking rules
                  <CaretRightIcon size={12} />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyOpenSlots() {
  return (
    <div className="rounded-card border border-dashed border-stone/80 p-8 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-porcelain2 flex items-center justify-center mb-3">
        <CalendarBlankIcon size={18} className="text-ink-400" />
      </div>
      <p className="text-[14px] font-[650] text-ink">No open slots right now</p>
      <p className="text-meta text-ink-400 mt-1">
        When a cancellation is detected, it will appear here automatically.
      </p>
      <div className="mt-4">
        <Button variant="secondary" size="sm">
          <ClockClockwiseIcon size={13} />
          Replay last cascade
        </Button>
      </div>
    </div>
  );
}

function NeedsAttention() {
  const items = [
    { label: "2 customers need safety review", tone: "saffron" as const },
    { label: "1 slot expired without fill", tone: "sienna" as const },
    { label: "3 calls require manual follow-up", tone: "saffron" as const }
  ];
  return (
    <div className="mt-5 pt-4 border-t border-stone/70">
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700] mb-2 flex items-center gap-1.5">
        <WarningIcon size={11} weight="fill" className="text-saffron-600" />
        Needs attention
      </div>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-between text-[13px]">
            <span className="text-ink">{i.label}</span>
            <Badge tone={i.tone}>Review</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Reason({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="font-mono text-[12px] font-[700] text-violet w-5 shrink-0 pt-0.5">0{index}</span>
      <div>
        <div className="font-[650] text-ink">{title}</div>
        <div className="text-meta text-ink-500">{body}</div>
      </div>
    </li>
  );
}
