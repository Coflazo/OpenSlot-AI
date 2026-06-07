"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PhoneCallIcon,
  CopySimpleIcon,
  CheckIcon,
  PhoneSlashIcon
} from "@phosphor-icons/react/dist/ssr";

import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Card } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { TranscriptView } from "@/components/calls/TranscriptView";
import { StructuredExtraction } from "@/components/calls/StructuredExtraction";
import { RecordingPlayer } from "@/components/calls/RecordingPlayer";

import { useStore } from "@/lib/store";
import { initials, longDate, relative, secondsToClock, timeOfDay } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { CallSession } from "@/lib/types";

const FILTERS = ["all", "accepted", "declined", "voicemail", "no_answer", "needs_review", "failed"] as const;

export default function CallsPage() {
  const calls = useStore((s) => s.calls);
  const customers = useStore((s) => s.customers);
  const slots = useStore((s) => s.slots);
  const markReviewed = useStore((s) => s.markCallReviewed);
  const appendCall = useStore((s) => s.appendCall);
  const hydrateFromApi = useStore((s) => s.hydrateFromApi);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void hydrateFromApi();
    fetch("/api/calls", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok) return;
        for (const c of d.calls ?? []) {
          appendCall({
            id: c.id,
            offerId: c.offer_id ?? c.id,
            slotId: c.slot_id ?? "",
            customerId: c.customer_id ?? "",
            type: c.call_type ?? "waitlist_offer",
            status: c.status,
            startedAt: c.started_at ?? new Date().toISOString(),
            endedAt: c.ended_at ?? undefined,
            durationSeconds: c.duration_seconds ?? undefined,
            transcript: [],
            extraction: c.extraction ?? undefined,
            recordingUrl: c.recording_url ?? undefined,
            needsReview: Boolean(c.needs_review),
            reviewReason: c.review_reason ?? undefined
          } as CallSession);
        }
      })
      .catch(() => {});
  }, [hydrateFromApi, appendCall]);

  const list = useMemo(() => {
    const sorted = [...calls].sort((a, b) =>
      (b.startedAt ?? "").localeCompare(a.startedAt ?? "")
    );
    if (filter === "all") return sorted;
    if (filter === "needs_review") return sorted.filter((c) => c.needsReview);
    return sorted.filter((c) => c.status === filter);
  }, [calls, filter]);

  useEffect(() => {
    if (!selectedId && list[0]) setSelectedId(list[0].id);
  }, [list, selectedId]);

  const selected = list.find((c) => c.id === selectedId) ?? list[0];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight">Calls</h1>
          <p className="mt-2 text-body text-ink-500">
            Review outbound calls, transcripts, outcomes, and follow-up actions.
          </p>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f} className="capitalize">
                {f.replace("_", " ")}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* List */}
        <div className="lg:col-span-5">
          <Card className="p-0 overflow-hidden">
            {list.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-stone/60">
                {list.map((c) => {
                  const customer = customers.find((cu) => cu.id === c.customerId);
                  const slot = slots.find((s) => s.id === c.slotId);
                  const isActive = selected?.id === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-porcelain2/60 transition",
                          isActive && "bg-porcelain2"
                        )}
                      >
                        <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-violet to-peacock text-white flex items-center justify-center font-[700] text-[11.5px]">
                          {customer ? initials(customer.name) : "?"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-[650] truncate">{customer?.name ?? "Unknown"}</span>
                            <CallTypePill type={c.type} />
                          </div>
                          <div className="text-meta text-ink-500 truncate">
                            {slot?.service} · {slot ? timeOfDay(slot.startTime) : "-"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <CallStatusChip status={c.status} />
                          {c.startedAt && (
                            <div className="text-meta text-ink-400 mt-0.5 tabular-nums">
                              {relative(c.startedAt)}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Detail */}
        <div className="lg:col-span-7">
          {selected ? (
            <Card className="p-0 overflow-hidden">
              <CallHeader call={selected} onMarkReviewed={() => markReviewed(selected.id)} />
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <MetaTile k="Duration" v={selected.durationSeconds ? secondsToClock(selected.durationSeconds) : "-"} />
                  <MetaTile
                    k="Time offered"
                    v={(() => {
                      const slot = slots.find((s) => s.id === selected.slotId);
                      return slot ? longDate(slot.startTime) : "-";
                    })()}
                  />
                  <MetaTile k="Recording" v={selected.recordingUrl ? "Stored 7d" : "Not stored"} />
                  <MetaTile k="Channel" v="Fonio · outbound voice" />
                </div>

                {selected.recordingUrl && (
                  <section>
                    <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700] mb-2">
                      Recording
                    </div>
                    <RecordingPlayer
                      totalSeconds={selected.durationSeconds ?? 60}
                      seed={selected.id.length}
                    />
                  </section>
                )}

                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700]">
                      Transcript
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-ink-500"
                      onClick={() => {
                        const text = selected.transcript
                          .map((t) => `${t.speaker === "agent" ? "AI" : "Customer"}: ${t.text}`)
                          .join("\n");
                        navigator.clipboard?.writeText(text).catch(() => {});
                      }}
                    >
                      <CopySimpleIcon size={12} /> Copy transcript
                    </Button>
                  </div>
                  <TranscriptView call={selected} />
                </section>

                <StructuredExtraction call={selected} />
              </div>
            </Card>
          ) : (
            <Card>
              <Empty />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CallHeader({ call, onMarkReviewed }: { call: CallSession; onMarkReviewed: () => void }) {
  const customer = useStore((s) => s.customers.find((c) => c.id === call.customerId));
  return (
    <div className="px-5 py-4 border-b border-stone/70 flex items-start gap-3">
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet to-peacock text-white flex items-center justify-center font-[700] text-[12px]">
        {customer ? initials(customer.name) : "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-section">{customer?.name}</span>
          <CallStatusChip status={call.status} />
          <CallTypePill type={call.type} />
        </div>
        <div className="text-meta text-ink-500 mt-0.5">
          {customer?.phone} · {customer?.email}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {call.needsReview && (
          <Button variant="secondary" size="sm" onClick={onMarkReviewed}>
            <CheckIcon size={12} /> Mark reviewed
          </Button>
        )}
        <Button variant="ghost" size="sm">
          <PhoneSlashIcon size={12} /> Create follow-up
        </Button>
      </div>
    </div>
  );
}

function MetaTile({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-card bg-porcelain border border-stone/80 p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700]">{k}</div>
      <div className="text-[13px] text-ink mt-0.5 font-[600]">{v}</div>
    </div>
  );
}

function CallTypePill({ type }: { type: CallSession["type"] }) {
  const tone = type === "upgrade_offer" ? "violet" : type === "cascade_fill" ? "saffron" : "vert";
  const label =
    type === "upgrade_offer" ? "Upgrade offer" : type === "cascade_fill" ? "Cascade fill" : "Waitlist offer";
  return <Badge tone={tone}>{label}</Badge>;
}

function CallStatusChip({ status }: { status: CallSession["status"] }) {
  const map: Record<CallSession["status"], { tone: "vert" | "sienna" | "saffron" | "violet" | "peacock" | "neutral"; label: string }> = {
    queued: { tone: "neutral", label: "Queued" },
    ringing: { tone: "peacock", label: "Ringing" },
    in_progress: { tone: "peacock", label: "Live" },
    accepted: { tone: "vert", label: "Accepted" },
    declined: { tone: "sienna", label: "Declined" },
    no_answer: { tone: "saffron", label: "No answer" },
    voicemail: { tone: "saffron", label: "Voicemail" },
    failed: { tone: "sienna", label: "Failed" }
  };
  const m = map[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function Empty() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-porcelain2 flex items-center justify-center mb-2">
        <PhoneCallIcon size={18} className="text-ink-400" />
      </div>
      <div className="text-section">No calls yet</div>
      <div className="text-meta text-ink-400 mt-1">
        Run the cascade simulation to populate the inbox.
      </div>
    </div>
  );
}
