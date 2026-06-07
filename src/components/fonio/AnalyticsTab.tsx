import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { CalendarRange, Clock, Users, TrendingUp, Phone } from "lucide-react";
import { useFonio } from "@/lib/fonio/store";
import type { OpenSlotDbState, SlotView } from "@/lib/fonio/types";

interface AnalyticsData {
  metrics: { label: string; value: string; delta: string }[];
  periodLabel: string;
  strategyComparison: StrategyComparison;
  fillRateOverTime: { day: string; rate: number }[];
  recoveredByProvider: { provider: string; count: number }[];
  declineReasons: { reason: string; count: number }[];
  contactVolumeByDay: { day: string; calls: number }[];
  escalationsByReason: { reason: string; count: number }[];
  insights: string[];
}

interface StrategyComparison {
  rows: {
    metric: string;
    fifo: string;
    algorithm: string;
    delta: string;
    tone: "positive" | "neutral";
  }[];
  algorithmRecovered: number;
  fifoRecovered: number;
  fillRateLift: number;
  runnerUpHonorRate: number;
  openings: number;
}

export function AnalyticsTab() {
  const { db, slots, simulationMode } = useFonio();
  const analyticsData = useMemo(() => buildAnalyticsData(db, slots), [db, slots]);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Automation Performance
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {simulationMode
            ? "Four-week simulated recovery run using local Fonio-style outcomes"
            : "Real-time insights on your automated call system for slot recovery"}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <CalendarRange className="h-3.5 w-3.5" />
          {analyticsData.periodLabel}
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={TrendingUp}
          label="Slots Recovered"
          value={analyticsData.metrics[0].value}
          subtext="Filled from cancellations"
          highlight={true}
        />
        <MetricCard
          icon={Phone}
          label="Call Attempts"
          value={analyticsData.metrics[7].value}
          subtext="Automated outreach"
        />
        <MetricCard
          icon={Users}
          label="Acceptance Rate"
          value={analyticsData.metrics[3].value}
          subtext="Successful conversions"
        />
        <MetricCard
          icon={Clock}
          label="Avg Lead Time"
          value={analyticsData.metrics[2].value}
          subtext="Before appointment"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Fill Rate - Primary Chart */}
        <div className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Fill Rate Trend
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={analyticsData.fillRateOverTime}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#f1f5f9" }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Contact Volume */}
        <ChartCard title="Call Volume by Day">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analyticsData.contactVolumeByDay}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#f1f5f9" }}
              />
              <Bar dataKey="calls" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Recovered Slots by Provider">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={analyticsData.recoveredByProvider}
              layout="vertical"
              margin={{ top: 5, right: 24, left: 36, bottom: 5 }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
              <YAxis dataKey="provider" type="category" stroke="#94a3b8" fontSize={12} width={86} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#f1f5f9" }}
              />
              <Bar dataKey="count" fill="#14b8a6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Call Outcomes */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Call Outcomes
          </h3>
          <div className="space-y-3">
            {analyticsData.declineReasons.map((outcome) => (
              <div key={outcome.reason} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{outcome.reason}</span>
                <span className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                  {outcome.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Same Pressure, Two Strategies
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                The current replay is evaluated two ways: actual OpenSlot ranking and a
                counterfactual FIFO list that calls the longest-waiting matching candidates first.
                Both use the same visible slots, candidates, and observed outcomes.
              </p>
            </div>
            <div className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {analyticsData.strategyComparison.openings} replayed openings
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr]">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <ProofMetric
                label="Improvement delivered"
                value={signed(
                  analyticsData.strategyComparison.algorithmRecovered -
                    analyticsData.strategyComparison.fifoRecovered,
                )}
                subtext="More appointments recovered in this replay"
              />
              <ProofMetric
                label="Fill-rate lift"
                value={`${signedNumber(analyticsData.strategyComparison.fillRateLift)}pp`}
                subtext="Computed from the current replay window"
              />
              <ProofMetric
                label="Runner-up honor rate"
                value={`${analyticsData.strategyComparison.runnerUpHonorRate.toFixed(1)}%`}
                subtext="Accepted-but-lost patients carried forward in replay"
              />
            </div>
            <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-[1.3fr_0.85fr_0.85fr_0.8fr] bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <div>Metric</div>
                <div>Naive FIFO</div>
                <div>OpenSlot Algo</div>
                <div>Impact</div>
              </div>
              {analyticsData.strategyComparison.rows.map((row) => (
                <div
                  key={row.metric}
                  className="grid grid-cols-[1.3fr_0.85fr_0.85fr_0.8fr] border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700"
                >
                  <div className="font-medium text-slate-700 dark:text-slate-200">{row.metric}</div>
                  <div className="text-slate-500 dark:text-slate-400">{row.fifo}</div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {row.algorithm}
                  </div>
                  <div
                    className={
                      row.tone === "positive"
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : "font-medium text-slate-500 dark:text-slate-400"
                    }
                  >
                    {row.delta}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Simulation Insights
          </h3>
          <div className="space-y-3">
            {analyticsData.insights.map((insight) => (
              <div
                key={insight}
                className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {insight}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAnalyticsData(db: OpenSlotDbState, slots: SlotView[]): AnalyticsData {
  const bookedSlots = slots.filter((slot) => slot.status === "BOOKED");
  const fillableSlots = slots.filter((slot) => slot.status !== "EXPIRED");
  const callAttempts = db.call_attempts;
  const declinedCalls = callAttempts.filter((attempt) => attempt.outcome === "declined");
  const noAnswerCalls = callAttempts.filter((attempt) => attempt.outcome === "no_answer");
  const acceptedCalls = callAttempts.filter(
    (attempt) => attempt.outcome === "accepted" || attempt.outcome === "booked",
  );

  const averageRecoveredLead = average(
    bookedSlots
      .map((slot) => slot.recoveredMinBeforeStart)
      .filter((value): value is number => typeof value === "number"),
  );
  const fillRate = fillableSlots.length
    ? Math.round((bookedSlots.length / fillableSlots.length) * 100)
    : 0;
  const callCount = Math.max(callAttempts.length, 1);

  return {
    metrics: [
      { label: "Slots recovered", value: String(bookedSlots.length), delta: "Live from slots" },
      {
        label: "Fill rate",
        value: `${fillRate}%`,
        delta: `${bookedSlots.length}/${fillableSlots.length} slots`,
      },
      {
        label: "Average recovered lead",
        value: averageRecoveredLead ? `${Math.round(averageRecoveredLead)} min` : "-",
        delta: "Before appointment start",
      },
      {
        label: "Acceptance rate",
        value: `${Math.round((acceptedCalls.length / callCount) * 100)}%`,
        delta: `${acceptedCalls.length}/${callAttempts.length} calls`,
      },
      {
        label: "No-answer rate",
        value: `${Math.round((noAnswerCalls.length / callCount) * 100)}%`,
        delta: `${noAnswerCalls.length}/${callAttempts.length} calls`,
      },
      {
        label: "Decline rate",
        value: `${Math.round((declinedCalls.length / callCount) * 100)}%`,
        delta: `${declinedCalls.length}/${callAttempts.length} calls`,
      },
      {
        label: "Avg contacts per slot",
        value: fillableSlots.length ? (callAttempts.length / fillableSlots.length).toFixed(1) : "-",
        delta: "Fonio attempts / total slots",
      },
      {
        label: "Total call attempts",
        value: String(callAttempts.length),
        delta: "Across all slots",
      },
    ],
    periodLabel: buildPeriodLabel(slots),
    strategyComparison: buildStrategyComparison(db, slots),
    fillRateOverTime: groupFillRateByDay(slots),
    recoveredByProvider: groupBookedByProvider(bookedSlots),
    declineReasons: groupOutcomes(callAttempts),
    contactVolumeByDay: groupCallsByDay(callAttempts),
    escalationsByReason: groupEscalations(slots),
    insights: buildInsights(slots, callAttempts),
  };
}

function buildStrategyComparison(db: OpenSlotDbState, slots: SlotView[]): StrategyComparison {
  const openings = slots.filter((slot) => slot.status !== "PAUSED_NEW_WAVES").length;
  const algorithmRecovered = slots.filter((slot) => slot.status === "BOOKED").length;
  const algorithmCalls = db.call_attempts.length;
  let fifoRecovered = 0;
  let fifoCalls = 0;
  let fifoRunnerUpHonored = 0;
  let fifoRunnerUpOpportunities = 0;
  let algorithmRunnerUpHonored = 0;
  let algorithmRunnerUpOpportunities = 0;

  const attemptsByOffer = new Map(
    db.call_attempts.map((attempt) => [attempt.slot_offer_id, attempt]),
  );

  for (const slot of slots) {
    const rankedByFifo = [...slot.candidates].sort((a, b) => {
      const aJoined = a.waitlistEntry
        ? Date.parse(a.waitlistEntry.joined_at)
        : Number.POSITIVE_INFINITY;
      const bJoined = b.waitlistEntry
        ? Date.parse(b.waitlistEntry.joined_at)
        : Number.POSITIVE_INFINITY;
      return aJoined - bJoined || a.rank - b.rank;
    });

    const algorithmAccepted = slot.candidates.filter((candidate) =>
      ["accepted", "booked", "runner_up"].includes(candidate.contactStatus),
    );
    if (algorithmAccepted.length > 1) {
      algorithmRunnerUpOpportunities += algorithmAccepted.length - 1;
      algorithmRunnerUpHonored += slot.candidates.filter(
        (candidate) => candidate.contactStatus === "runner_up" || candidate.runnerUpBoost,
      ).length;
    }

    for (const candidate of rankedByFifo) {
      if (!candidate.eligible) continue;
      const attempt = attemptsByOffer.get(candidate.offer.id);
      const outcome = attempt?.outcome ?? candidate.contactStatus;
      if (outcome === "not_contacted" || outcome === "skipped" || outcome === "ringing") continue;
      fifoCalls += 1;
      if (outcome === "accepted" || outcome === "booked") {
        fifoRecovered += 1;
        const laterAccepted = rankedByFifo.filter(
          (other) =>
            other.offer.rank !== candidate.offer.rank &&
            ["accepted", "booked", "runner_up"].includes(
              attemptsByOffer.get(other.offer.id)?.outcome ?? other.contactStatus,
            ),
        );
        if (laterAccepted.length) {
          fifoRunnerUpOpportunities += laterAccepted.length;
        }
        break;
      }
    }
  }

  const fifoFillRate = percent(fifoRecovered, openings);
  const algorithmFillRate = percent(algorithmRecovered, openings);
  const algorithmLost = Math.max(openings - algorithmRecovered, 0);
  const fifoLost = Math.max(openings - fifoRecovered, 0);
  const fillRateLift = algorithmFillRate - fifoFillRate;
  const runnerUpHonorRate = percent(algorithmRunnerUpHonored, algorithmRunnerUpOpportunities);

  return {
    openings,
    algorithmRecovered,
    fifoRecovered,
    fillRateLift,
    runnerUpHonorRate,
    rows: [
      {
        metric: "Recovered appointments",
        fifo: fifoRecovered.toLocaleString(),
        algorithm: algorithmRecovered.toLocaleString(),
        delta: signed(algorithmRecovered - fifoRecovered),
        tone: algorithmRecovered >= fifoRecovered ? "positive" : "neutral",
      },
      {
        metric: "Open-slot fill rate",
        fifo: `${fifoFillRate.toFixed(1)}%`,
        algorithm: `${algorithmFillRate.toFixed(1)}%`,
        delta: `${signedNumber(fillRateLift)}pp`,
        tone: fillRateLift >= 0 ? "positive" : "neutral",
      },
      {
        metric: "Lost slots",
        fifo: fifoLost.toLocaleString(),
        algorithm: algorithmLost.toLocaleString(),
        delta: signed(algorithmLost - fifoLost),
        tone: algorithmLost <= fifoLost ? "positive" : "neutral",
      },
      {
        metric: "Call attempts",
        fifo: fifoCalls.toLocaleString(),
        algorithm: algorithmCalls.toLocaleString(),
        delta: "same replay outcomes",
        tone: "neutral",
      },
      {
        metric: "Runner-up opportunities",
        fifo: fifoRunnerUpOpportunities.toLocaleString(),
        algorithm: algorithmRunnerUpOpportunities.toLocaleString(),
        delta: "tracked by algo",
        tone: "neutral",
      },
    ],
  };
}

function groupFillRateByDay(slots: SlotView[]) {
  const grouped = new Map<string, { booked: number; total: number }>();
  for (const slot of slots) {
    const day = dayLabel(slot.row.starts_at);
    const current = grouped.get(day) ?? { booked: 0, total: 0 };
    current.total += 1;
    if (slot.status === "BOOKED") current.booked += 1;
    grouped.set(day, current);
  }
  return Array.from(grouped.entries())
    .map(([day, value]) => ({
      day,
      rate: value.total ? Math.round((value.booked / value.total) * 100) : 0,
    }))
    .slice(-28);
}

function groupBookedByProvider(slots: SlotView[]) {
  const grouped = new Map<string, number>();
  for (const slot of slots) {
    grouped.set(slot.provider.display_name, (grouped.get(slot.provider.display_name) ?? 0) + 1);
  }
  return Array.from(grouped.entries())
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count);
}

function groupOutcomes(callAttempts: OpenSlotDbState["call_attempts"]) {
  const labels: Partial<Record<OpenSlotDbState["call_attempts"][number]["outcome"], string>> = {
    declined: "Declined",
    no_answer: "No answer",
    accepted: "Accepted",
    runner_up: "Runner-up",
    booked: "Booked",
    skipped: "Skipped",
  };
  const grouped = new Map<string, number>();
  for (const attempt of callAttempts) {
    const label = labels[attempt.outcome] ?? attempt.outcome.replace("_", " ");
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  }
  return Array.from(grouped.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

function groupCallsByDay(callAttempts: OpenSlotDbState["call_attempts"]) {
  const grouped = new Map<string, number>();
  for (const attempt of callAttempts) {
    const day = dayLabel(attempt.started_at ?? attempt.created_at);
    grouped.set(day, (grouped.get(day) ?? 0) + 1);
  }
  return Array.from(grouped.entries())
    .map(([day, calls]) => ({ day, calls }))
    .slice(-28);
}

function groupEscalations(slots: SlotView[]) {
  const grouped = new Map<string, number>();
  for (const slot of slots.filter((item) => item.status === "ESCALATED")) {
    const reason = slot.lastEvent || "Escalated";
    grouped.set(reason, (grouped.get(reason) ?? 0) + 1);
  }
  return Array.from(grouped.entries()).map(([reason, count]) => ({ reason, count }));
}

function buildInsights(slots: SlotView[], callAttempts: OpenSlotDbState["call_attempts"]) {
  const offering = slots.filter((slot) => slot.status === "OFFERING").length;
  const open = slots.filter((slot) => slot.status === "OPEN").length;
  const escalated = slots.filter((slot) => slot.status === "ESCALATED").length;
  const booked = slots.filter((slot) => slot.status === "BOOKED").length;
  const providers = new Set(slots.map((slot) => slot.provider.display_name)).size;
  const busiestDay = groupCallsByDay(callAttempts).sort((a, b) => b.calls - a.calls)[0];

  return [
    `${booked} recovered slots across ${providers} providers in the selected window.`,
    busiestDay
      ? `${busiestDay.day} had the highest simulated call volume (${busiestDay.calls} calls).`
      : "No call attempts yet.",
    `${offering} slots currently have active simulated outreach waves.`,
    `${open} slots are open and available for backend ranking.`,
    escalated > 0
      ? `${escalated} slots need attention (escalated).`
      : `${booked} slots successfully booked.`,
  ];
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percent(value: number, total: number) {
  return total ? (value / total) * 100 : 0;
}

function signed(value: number) {
  if (value > 0) return `+${value.toLocaleString()}`;
  return value.toLocaleString();
}

function signedNumber(value: number) {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function buildPeriodLabel(slots: SlotView[]) {
  if (!slots.length) return "No slot window";
  const timestamps = slots.map((slot) => Date.parse(slot.row.starts_at)).sort((a, b) => a - b);
  const start = new Date(timestamps[0]);
  const end = new Date(timestamps[timestamps.length - 1]);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function dayLabel(timestamp: string) {
  const date = new Date(timestamp);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  const day = date.getDate();
  const month = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
  return `${weekday} ${day} ${month}`;
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext: string;
  highlight?: boolean;
}

function MetricCard({ icon: Icon, label, value, subtext, highlight }: MetricCardProps) {
  return (
    <div
      className={`rounded-lg border p-6 transition-all ${
        highlight
          ? "border-blue-200 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md"
      } shadow-sm`}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2 rounded-lg ${
            highlight ? "bg-blue-200 dark:bg-blue-700" : "bg-slate-100 dark:bg-slate-700"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${highlight ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-300"}`}
          />
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p
        className={`text-3xl font-bold mb-2 ${highlight ? "text-blue-700 dark:text-blue-300" : "text-slate-900 dark:text-white"}`}
      >
        {value}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      {children}
    </div>
  );
}

function ProofMetric({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">{subtext}</p>
    </div>
  );
}
