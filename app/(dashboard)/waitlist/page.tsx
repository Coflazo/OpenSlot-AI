"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UsersThreeIcon, UserCircleIcon, FunnelSimpleIcon, DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/primitives/tabs";
import { Card } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { CandidateRow } from "@/components/waitlist/CandidateRow";
import { CandidateScoreBreakdown } from "@/components/waitlist/CandidateScoreBreakdown";
import { AddCustomerDialog } from "@/components/waitlist/AddCustomerDialog";

import { useStore } from "@/lib/store";
import { HERO_SLOT_ID } from "@/lib/mock/slots";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/primitives/select";

export default function WaitlistPage() {
  const slots = useStore((s) => s.slots);
  const customers = useStore((s) => s.customers);
  const rank = useStore((s) => s.rankCandidatesForSlot);
  const hydrateFromApi = useStore((s) => s.hydrateFromApi);

  useEffect(() => {
    void hydrateFromApi();
  }, [hydrateFromApi]);

  const cancellable = useMemo(
    () => slots.filter((s) => s.status === "open" || s.status === "calling" || s.status === "booked"),
    [slots]
  );

  // Default to the legacy HERO id; fall back to first cancellable once hydrated.
  const [contextSlot, setContextSlot] = useState(HERO_SLOT_ID);
  useEffect(() => {
    if (!slots.some((s) => s.id === contextSlot) && cancellable[0]) {
      setContextSlot(cancellable[0].id);
    }
  }, [slots, cancellable, contextSlot]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ranked = useMemo(() => rank(contextSlot), [rank, contextSlot, slots, customers]);
  const allCandidates = [...ranked.upgrade, ...ranked.waitlist];
  const selected = allCandidates.find((c) => c.customerId === selectedId) ?? allCandidates[0];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight">Waitlist</h1>
          <p className="mt-2 text-body text-ink-500">
            See who is waiting, who is eligible, and who OpenSlot AI should contact first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <DownloadSimpleIcon size={14} />
            Import CSV
          </Button>
          <AddCustomerDialog />
        </div>
      </div>

      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2">
          <FunnelSimpleIcon size={14} className="text-ink-400" />
          <span className="text-meta text-ink-500 font-[600]">Ranking for slot</span>
        </div>
        <Select value={contextSlot} onValueChange={setContextSlot}>
          <SelectTrigger className="w-[360px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cancellable.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.service} · {new Date(s.startTime).toLocaleString("de-AT")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Badge tone="violet">{ranked.upgrade.filter((u) => !u.blocks.length).length} upgrade candidates</Badge>
          <Badge tone="vert">{ranked.waitlist.filter((w) => !w.blocks.length).length} waitlist</Badge>
          <Badge tone="sienna">{allCandidates.filter((c) => c.blocks.length).length} blocked</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <Tabs defaultValue="upgrade">
            <TabsList>
              <TabsTrigger value="upgrade">
                <UsersThreeIcon size={13} className="mr-1.5" />
                Upgrade candidates
              </TabsTrigger>
              <TabsTrigger value="waitlist">
                <UserCircleIcon size={13} className="mr-1.5" />
                Pure waitlist
              </TabsTrigger>
              <TabsTrigger value="blocked">Blocked</TabsTrigger>
            </TabsList>

            <TabsContent value="upgrade">
              <CandidateList
                items={ranked.upgrade.filter((c) => !c.blocks.length)}
                selectedId={selected?.customerId ?? null}
                onSelect={setSelectedId}
              />
            </TabsContent>
            <TabsContent value="waitlist">
              <CandidateList
                items={ranked.waitlist.filter((c) => !c.blocks.length)}
                selectedId={selected?.customerId ?? null}
                onSelect={setSelectedId}
              />
            </TabsContent>
            <TabsContent value="blocked">
              <CandidateList
                items={allCandidates.filter((c) => c.blocks.length)}
                selectedId={selected?.customerId ?? null}
                onSelect={setSelectedId}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-3">
          {selected ? (
            <>
              <Card>
                <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700]">
                  Selected candidate
                </div>
                <div className="mt-2 text-section">
                  {useStore.getState().customers.find((c) => c.id === selected.customerId)?.name}
                </div>
                <div className="mt-1 text-meta text-ink-500">
                  {selected.source === "upgrade" ? "Upgrade pool" : "Pure waitlist"} ·{" "}
                  Score{" "}
                  <span className="font-mono tabular-nums font-[700] text-ink">
                    {selected.score.toFixed(1)}
                  </span>
                </div>
              </Card>
              <CandidateScoreBreakdown candidate={selected} />
            </>
          ) : (
            <Card>
              <div className="text-meta text-ink-400">Select a candidate to see the score breakdown.</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateList({
  items,
  selectedId,
  onSelect
}: {
  items: { customerId: string; score: number; reasons: string[]; blocks: string[]; source: "upgrade" | "waitlist" }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-stone p-8 text-center text-meta text-ink-400">
        No candidates in this list.
      </div>
    );
  }
  return (
    <AnimatePresence initial={false}>
      <motion.ul layout className="space-y-2">
        {items.map((c, i) => (
          <CandidateRow
            key={c.customerId}
            candidate={c}
            rank={i + 1}
            selected={c.customerId === selectedId}
            onSelect={() => onSelect(c.customerId)}
          />
        ))}
      </motion.ul>
    </AnimatePresence>
  );
}
