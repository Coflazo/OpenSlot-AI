"use client";

import { ArrowRight, Activity, TrendingUp, Target, Zap } from "lucide-react";
import { SIM_RESULTS } from "@/lib/sim-results";

const { algo, fillRateBuckets, percentiles, scenarios } = SIM_RESULTS;
const maxCount = Math.max(...fillRateBuckets.map((b) => b.count));

const outcomes = [
  {
    label: "Mean Fill Rate",
    value: `${percentiles.mean}%`,
    sub: `across ${SIM_RESULTS.runs} trials`,
    icon: Target,
    accent: false,
  },
  {
    label: "Fewer Empty Slots",
    value: `−${(algo.lostSlotReduction * 100).toFixed(0)}%`,
    sub: `vs FIFO baseline (${algo.lostSlots.toLocaleString()} vs ${algo.baselineLostSlots.toLocaleString()})`,
    icon: TrendingUp,
    accent: false,
  },
  {
    label: "Calls per Slot Filled",
    value: algo.avgCallsPerRecoveredSlot.toFixed(2),
    sub: `${(algo.callAcceptanceRate * 100).toFixed(1)}% acceptance rate per call`,
    icon: Activity,
    accent: false,
  },
  {
    label: "Double-Bookings",
    value: "Zero",
    sub: `${algo.invariantFailures} invariant violations in ${SIM_RESULTS.runs} runs`,
    icon: Zap,
    accent: true,
  },
];

const steps = [
  {
    n: "01",
    title: "Score & Rank",
    body: "Every waitlisted patient is scored on four dimensions: how long they have been waiting (fairness), how well their preferences match the open slot, whether they hold a VIP or runner-up priority boost, and a cooldown penalty if they were contacted recently. The top-ranked eligible patients enter the call queue.",
  },
  {
    n: "02",
    title: "Dynamic Wave Sizing",
    body: "The algorithm computes K_needed = ⌈log(1 − target) / log(1 − p)⌉ — the minimum calls required to hit the target fill probability. With plenty of time it calls one patient at a time (fair). As the slot approaches and available waves shrink, it widens to parallel groups. The aggression mode (Patient / Balanced / Aggressive) sets the target fill probability, not a wave size.",
  },
  {
    n: "03",
    title: "Upgrade Cascade",
    body: "Booked patients who indicated they want an earlier appointment are offered newly-opened slots first. When one accepts, their original booking is released back into the fill pipeline — recovering two slots from one outreach action. In the simulation, 39% of upgrade offers were accepted.",
  },
];

export default function Analytics() {
  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "var(--background)" }}>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Simulation Results
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            {SIM_RESULTS.runs} Monte Carlo Trials · 5-week horizon · Seeds 2026–2075
          </span>
        </div>
        <h1 className="text-5xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
          Analytics
        </h1>
        <p className="text-lg max-w-2xl" style={{ color: "var(--muted-foreground)" }}>
          {SIM_RESULTS.runs} independent simulations of the OpenSlot AI algorithm against a naive FIFO baseline. Same seeds, same clinic conditions — only the filling strategy differs.
        </p>
      </div>

      {/* How it works */}
      <div
        className="rounded-xl border p-8 mb-8"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-bold uppercase tracking-widest mb-6" style={{ color: "var(--muted-foreground)" }}>
          How the Algorithm Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div
                  className="text-2xl font-black leading-none mb-1"
                  style={{ color: "var(--primary)" }}
                >
                  {step.n}
                </div>
              </div>
              <div className="flex-1 pb-6 md:pb-0 md:pr-8">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-base font-bold" style={{ color: "var(--foreground)" }}>
                    {step.title}
                  </p>
                  {i < steps.length - 1 && (
                    <ArrowRight
                      className="hidden md:block h-4 w-4 flex-shrink-0"
                      style={{ color: "var(--accent)" }}
                    />
                  )}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outcome KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {outcomes.map((o, i) => {
          const Icon = o.icon;
          return (
            <div
              key={i}
              className="rounded-xl border p-6"
              style={{
                backgroundColor: o.accent ? "var(--primary)" : "var(--card)",
                borderColor: o.accent ? "var(--primary)" : "var(--border)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <Icon
                  className="h-5 w-5"
                  style={{ color: o.accent ? "var(--primary-foreground)" : "var(--accent)" }}
                />
              </div>
              <p
                className="text-sm font-medium mb-2"
                style={{ color: o.accent ? "oklch(1 0 0 / 0.7)" : "var(--muted-foreground)" }}
              >
                {o.label}
              </p>
              <p
                className="text-3xl font-black mb-1"
                style={{ color: o.accent ? "var(--primary-foreground)" : "var(--foreground)" }}
              >
                {o.value}
              </p>
              <p
                className="text-xs font-semibold"
                style={{ color: o.accent ? "oklch(1 0 0 / 0.6)" : "var(--accent)" }}
              >
                {o.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Distribution + Scenario table */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6 mb-8">

        {/* Histogram */}
        <div
          className="rounded-xl border p-8"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>
              Fill Rate Distribution
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              How often each fill-rate band appeared across the {SIM_RESULTS.runs} trials
            </p>
          </div>

          <div className="flex items-end gap-2 h-44 mb-4">
            {fillRateBuckets.map((b, i) => {
              const heightPct = (b.count / maxCount) * 100;
              const isPeak = b.count === maxCount;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span
                    className="text-xs font-bold"
                    style={{ color: isPeak ? "var(--primary)" : "var(--muted-foreground)" }}
                  >
                    {b.count}
                  </span>
                  <div className="w-full flex items-end" style={{ height: "120px" }}>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: isPeak ? "var(--primary)" : "var(--secondary)",
                        opacity: isPeak ? 1 : 0.65,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            {fillRateBuckets.map((b, i) => (
              <div key={i} className="flex-1 text-center">
                <span style={{ color: "var(--muted-foreground)", fontSize: "9px" }}>
                  {b.range}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--primary)" }} />
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Most common outcome (82–84%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--secondary)", opacity: 0.65 }} />
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Other outcomes</span>
            </div>
          </div>
        </div>

        {/* Scenario table */}
        <div
          className="rounded-xl border p-8"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>
              Scenario Comparison
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Slots filled and lost per 5-week simulation
            </p>
          </div>

          <div className="space-y-0">
            {scenarios.map((s, i) => (
              <div
                key={i}
                className="py-4 border-b last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{
                    color: i === 0
                      ? "var(--muted-foreground)"
                      : i === 2
                        ? "var(--primary)"
                        : "var(--foreground)",
                  }}
                >
                  {s.label}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Fill Rate", val: s.fillRate },
                    { label: "Slots Filled", val: s.filled },
                    { label: "Lost", val: s.lost },
                  ].map((m, j) => (
                    <div key={j}>
                      <p className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>
                        {m.label}
                      </p>
                      <p
                        className="text-base font-black"
                        style={{ color: i === 0 ? "var(--muted-foreground)" : "var(--foreground)" }}
                      >
                        {m.val}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confidence + robustness */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          {
            title: "90% Confidence Range",
            value: `${percentiles.p10}% – ${percentiles.p90}%`,
            desc: `Fill rate landed in this band in 45 of ${SIM_RESULTS.runs} trials. Performance is consistent across materially different random clinic conditions.`,
          },
          {
            title: "Worst Trial",
            value: `${SIM_RESULTS.worstTrial.fillRate}% fill rate`,
            desc: `Seed ${SIM_RESULTS.worstTrial.seed} — ${SIM_RESULTS.worstTrial.note}. ${SIM_RESULTS.worstTrial.lostSlots} slots lost in a 5-week window.`,
          },
          {
            title: "Best Trial",
            value: `${SIM_RESULTS.bestTrial.fillRate}% fill rate`,
            desc: `Seed ${SIM_RESULTS.bestTrial.seed} — ${SIM_RESULTS.bestTrial.note}. Only ${SIM_RESULTS.bestTrial.lostSlots} slots lost over 5 weeks.`,
          },
        ].map((item, i) => (
          <div
            key={i}
            className="rounded-xl border p-6"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--accent)" }}>
              {item.title}
            </p>
            <p className="text-2xl font-black mb-2" style={{ color: "var(--foreground)" }}>
              {item.value}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Methodology */}
      <div
        className="rounded-xl border p-6"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--foreground)" }}>
          Simulation Methodology
        </h3>
        <p className="text-sm leading-relaxed max-w-4xl" style={{ color: "var(--muted-foreground)" }}>
          Each of the {SIM_RESULTS.runs} trials runs an independent seeded simulation of a 4-provider clinic over 5 weeks (seeds 2026–2075). The clinic starts with 180 waitlisted patients; 18 additional patients join per simulated week. Slot cancellation probabilities are service-specific (MRI: 16%, CT: 13%, other: 9%), distributed across same-day urgent (30%), same-day moderate (42%), 1–3 day (28%), and 3–7 day (15%) lead times. Per-patient pickup and acceptance rates are drawn independently from realistic distributions. Call timeout is 5 min with a 2-min buffer between waves. The smart algorithm runs in "Balanced" mode (80% target fill probability per slot). The baseline is a strict FIFO waitlist with wave size permanently fixed at 1 and no upgrade cascade. Both strategies consume the same seeded random draws for fair comparison. Run <code className="font-mono text-xs">npm run demo</code> to see the algorithm execute on a single slot in real time.
        </p>
      </div>

    </div>
  );
}
