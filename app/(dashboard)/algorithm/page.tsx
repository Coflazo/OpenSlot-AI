"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GraphIcon, SlidersHorizontalIcon, InfoIcon } from "@phosphor-icons/react/dist/ssr";

import { Card } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/primitives/select";
import { Slider } from "@/components/primitives/slider";
import { Label } from "@/components/primitives/input";

import { AlgorithmFlow } from "@/components/algorithm/AlgorithmFlow";
import { HardFilterGate } from "@/components/algorithm/HardFilterGate";
import { RouteFeasibilityMap } from "@/components/algorithm/RouteFeasibilityMap";
import { ScoreStack } from "@/components/algorithm/ScoreStack";
import { AggressionDial } from "@/components/algorithm/AggressionDial";
import { CandidateRace } from "@/components/algorithm/CandidateRace";
import { CascadePreview } from "@/components/algorithm/CascadePreview";

import { useStore } from "@/lib/store";
import { HERO_SLOT_ID } from "@/lib/mock/slots";
import { explainCandidate } from "@/lib/algo/explainCandidate";
import type { AlgorithmExplanation } from "@/lib/algo/types";
import { differenceInMinutes } from "date-fns";

export default function AlgorithmPage() {
  const slots = useStore((s) => s.slots);
  const customers = useStore((s) => s.customers);
  const rules = useStore((s) => s.rules);
  const hydrateFromApi = useStore((s) => s.hydrateFromApi);

  useEffect(() => {
    void hydrateFromApi();
  }, [hydrateFromApi]);

  const [slotId, setSlotId] = useState<string>(HERO_SLOT_ID);
  const [override, setOverride] = useState<number | null>(null);

  const slot = slots.find((s) => s.id === slotId) ?? slots[0];

  const baselineLeft = useMemo(
    () => Math.max(0, slot ? differenceInMinutes(new Date(slot.startTime), new Date()) : 0),
    [slot]
  );
  const effectiveTimeLeft = override ?? baselineLeft;

  const candidates = useMemo<AlgorithmExplanation[]>(() => {
    if (!slot) return [];
    return customers
      .filter((c) => !c.optedOut)
      .map((c) =>
        explainCandidate(c, slot, {
          rules,
          travelWeight: rules.travelFeasibilityWeight,
          arrivalBufferMinutes: rules.minimumArrivalBufferMinutes,
          source: c.currentBookingId ? "upgrade" : "waitlist"
        })
      )
      .map((c) => {
        // Apply override to the route metric (for the visualizer's what-if slider)
        if (override !== null) {
          const newFeasible = c.route.travelMinutes + c.route.arrivalBufferMinutes <= override;
          const slack = Math.max(0, override - c.route.arrivalBufferMinutes - c.route.travelMinutes);
          const newScore = override > 0 ? Math.max(0, Math.min(1, slack / override)) : 0;
          const blocks = c.blocks.filter((b) => !b.startsWith("Travel blocked"));
          if (!newFeasible && c.route.timeLeftMinutes > 0) {
            blocks.push(
              `Travel blocked: ${c.route.travelMinutes}m drive + ${c.route.arrivalBufferMinutes}m buffer > ${override}m left`
            );
          }
          return {
            ...c,
            route: { ...c.route, feasible: newFeasible, timeLeftMinutes: override },
            scoreParts: { ...c.scoreParts, travelFeasibility: newScore },
            weightedContributions: {
              ...c.weightedContributions,
              travelFeasibility: rules.travelFeasibilityWeight * newScore
            },
            blocks,
            finalScore:
              blocks.length === 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      100 *
                        (c.weightedContributions.eligibilityFit +
                          c.weightedContributions.urgency +
                          c.weightedContributions.waitTime +
                          c.weightedContributions.pickupProbability +
                          c.weightedContributions.businessPriority +
                          c.weightedContributions.preferenceMatch +
                          rules.travelFeasibilityWeight * newScore -
                          c.weightedContributions.cooldownPenalty)
                    )
                  )
                : 0,
            status: !newFeasible && c.route.timeLeftMinutes > 0 ? "travel_blocked" : c.status
          } as AlgorithmExplanation;
        }
        return c;
      });
  }, [customers, slot, rules, override]);

  const [selectedId, setSelectedId] = useState<string>(candidates[0]?.customerId ?? "");
  const selected = candidates.find((c) => c.customerId === selectedId) ?? candidates[0];

  if (!slot) {
    return (
      <div className="space-y-6">
        <h1 className="text-title-xl tracking-tight inline-flex items-center gap-2">
          <GraphIcon size={22} weight="duotone" className="text-violet" />
          Algorithm
        </h1>
        <Card className="p-8 text-center text-ink-500">
          No slot data yet. Open the Calendar to see live slots, then come back here to inspect the ranking algorithm against a real cancellation.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight inline-flex items-center gap-2">
            <GraphIcon size={22} weight="duotone" className="text-violet" />
            Algorithm
          </h1>
          <p className="mt-2 text-body text-ink-500">
            See how OpenSlot AI chooses who to call, who to skip, and how fast to move when a slot is about to expire.
            Every panel reacts live to the weights you change on{" "}
            <Link href="/rules" className="text-peacock font-[650] hover:underline">
              <SlidersHorizontalIcon size={12} weight="bold" className="inline -mt-0.5" /> Rules
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="flex flex-wrap items-end gap-4">
        <div className="space-y-1 min-w-[260px]">
          <Label>Slot to evaluate</Label>
          <Select value={slot.id} onValueChange={setSlotId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {slots
                .filter((s) => s.status !== "expired")
                .slice(0, 14)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.service} · {new Date(s.startTime).toLocaleString("de-AT")}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-baseline justify-between mb-1.5">
            <Label>Time-left override (what-if)</Label>
            <span className="font-mono tabular-nums text-[12.5px] font-[700] text-ink">
              {override ?? baselineLeft}m
            </span>
          </div>
          <Slider
            value={[override ?? baselineLeft]}
            min={5}
            max={Math.max(60, baselineLeft)}
            step={5}
            onValueChange={([v]) => setOverride(v)}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-meta text-ink-400 inline-flex items-center gap-1">
              <InfoIcon size={11} /> Drag to make the slot more urgent and watch travel-blocked candidates drop out.
            </span>
            {override !== null && (
              <Button variant="ghost" size="sm" onClick={() => setOverride(null)}>
                Reset to real time-left ({baselineLeft}m)
              </Button>
            )}
          </div>
        </div>
      </Card>

      <AlgorithmFlow />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <HardFilterGate candidates={candidates} />
          {selected && <RouteFeasibilityMap candidate={selected} />}
        </div>
        <div className="lg:col-span-5 space-y-4">
          <AggressionDial
            minutesLeft={effectiveTimeLeft}
            rules={{
              aggressiveMinutes: rules.aggression.aggressiveMinutes,
              emergencyMinutes: rules.aggression.emergencyMinutes,
              focusedHours: rules.aggression.focusedHours
            }}
          />
          <CandidateRace candidates={candidates} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="lg:col-span-7">{selected && <ScoreStack candidate={selected} />}</div>
        <div className="lg:col-span-5">
          <CascadePreview topCandidate={candidates.find((c) => c.status === "call_now")} />
        </div>
      </div>
    </div>
  );
}
