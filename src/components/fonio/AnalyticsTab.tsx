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
import { Clock, Users, TrendingUp, Phone } from "lucide-react";
import { useFonio } from "@/lib/fonio/store";
import type { OpenSlotDbState, SlotView } from "@/lib/fonio/types";

interface AnalyticsData {
  metrics: { label: string; value: string; delta: string }[];
  fillRateOverTime: { day: string; rate: number }[];
  recoveredByProvider: { provider: string; count: number }[];
  declineReasons: { reason: string; count: number }[];
  contactVolumeByDay: { day: string; calls: number }[];
  escalationsByReason: { reason: string; count: number }[];
  insights: string[];
}

export function AnalyticsTab() {
  const { db, slots } = useFonio();
  const analyticsData = useMemo(() => buildAnalyticsData(db, slots), [db, slots]);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Automation Performance
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Real-time insights on your automated call system for slot recovery
        </p>
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
            <LineChart data={analyticsData.fillRateOverTime} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
  const acceptedCalls = callAttempts.filter((attempt) => attempt.outcome === "accepted");

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
    fillRateOverTime: groupFillRateByDay(slots),
    recoveredByProvider: groupBookedByProvider(bookedSlots),
    declineReasons: groupOutcomes(callAttempts),
    contactVolumeByDay: groupCallsByDay(callAttempts),
    escalationsByReason: groupEscalations(slots),
    insights: buildInsights(slots),
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
  return Array.from(grouped.entries()).map(([day, value]) => ({
    day,
    rate: value.total ? Math.round((value.booked / value.total) * 100) : 0,
  }));
}

function groupBookedByProvider(slots: SlotView[]) {
  const grouped = new Map<string, number>();
  for (const slot of slots) {
    grouped.set(slot.provider.display_name, (grouped.get(slot.provider.display_name) ?? 0) + 1);
  }
  return Array.from(grouped.entries()).map(([provider, count]) => ({ provider, count }));
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
  return Array.from(grouped.entries()).map(([reason, count]) => ({ reason, count }));
}

function groupCallsByDay(callAttempts: OpenSlotDbState["call_attempts"]) {
  const grouped = new Map<string, number>();
  for (const attempt of callAttempts) {
    const day = dayLabel(attempt.started_at ?? attempt.created_at);
    grouped.set(day, (grouped.get(day) ?? 0) + 1);
  }
  return Array.from(grouped.entries()).map(([day, calls]) => ({ day, calls }));
}

function groupEscalations(slots: SlotView[]) {
  const grouped = new Map<string, number>();
  for (const slot of slots.filter((item) => item.status === "ESCALATED")) {
    const reason = slot.lastEvent || "Escalated";
    grouped.set(reason, (grouped.get(reason) ?? 0) + 1);
  }
  return Array.from(grouped.entries()).map(([reason, count]) => ({ reason, count }));
}

function buildInsights(slots: SlotView[]) {
  const offering = slots.filter((slot) => slot.status === "OFFERING").length;
  const open = slots.filter((slot) => slot.status === "OPEN").length;
  const escalated = slots.filter((slot) => slot.status === "ESCALATED").length;
  const booked = slots.filter((slot) => slot.status === "BOOKED").length;

  return [
    `${offering} slots currently have active outreach waves.`,
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


function dayLabel(timestamp: string) {
  const date = new Date(timestamp);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  const day = date.getDate();
  return `${weekday} ${day}`;
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
            highlight
              ? "bg-blue-200 dark:bg-blue-700"
              : "bg-slate-100 dark:bg-slate-700"
          }`}
        >
          <Icon className={`w-5 h-5 ${highlight ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-300"}`} />
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold mb-2 ${highlight ? "text-blue-700 dark:text-blue-300" : "text-slate-900 dark:text-white"}`}>
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
