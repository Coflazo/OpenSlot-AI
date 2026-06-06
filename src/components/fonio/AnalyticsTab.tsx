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
    <div className="h-full overflow-y-auto bg-background p-5">
      <div className="grid grid-cols-4 gap-3">
        {analyticsData.metrics.map((m) => (
          <div key={m.label} className="rounded-md border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{m.value}</p>
            <p className="mt-1 text-xs text-success-soft-foreground">{m.delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ChartCard title="Fill rate over time">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analyticsData.fillRateOverTime}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} unit="%" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Slots recovered by provider">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analyticsData.recoveredByProvider}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="provider" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--info)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Decline reasons">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analyticsData.declineReasons} layout="vertical">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis
                type="category"
                dataKey="reason"
                stroke="var(--muted-foreground)"
                fontSize={12}
                width={140}
              />
              <Tooltip />
              <Bar dataKey="count" fill="var(--warning)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Contact volume by day">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analyticsData.contactVolumeByDay}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="calls" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ChartCard title="Escalations by reason">
          <ul className="divide-y divide-border">
            {analyticsData.escalationsByReason.map((r) => (
              <li key={r.reason} className="flex items-center justify-between py-2 text-sm">
                <span>{r.reason}</span>
                <span className="font-mono text-muted-foreground">{r.count}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
        <ChartCard title="What we're seeing">
          <ul className="space-y-2 text-sm">
            {analyticsData.insights.map((i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                {i}
              </li>
            ))}
          </ul>
        </ChartCard>
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
  const runnerUpBumps = db.priority_bumps.filter((bump) => bump.reason === "runner_up");
  const revenueCents = bookedSlots.reduce(
    (total, slot) => total + (slot.service.value_cents ?? 0),
    0,
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
        label: "Revenue protected (est.)",
        value: formatCurrency(revenueCents),
        delta: "From booked service value",
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
        label: "Avg contacts per recovered slot",
        value: bookedSlots.length ? (callAttempts.length / bookedSlots.length).toFixed(1) : "-",
        delta: "Fonio attempts / bookings",
      },
      {
        label: "Runner-up priority active",
        value: String(runnerUpBumps.filter((bump) => bump.active).length),
        delta: `${runnerUpBumps.length} runner-up events`,
      },
    ],
    fillRateOverTime: groupFillRateByDay(slots),
    recoveredByProvider: groupBookedByProvider(bookedSlots),
    declineReasons: groupOutcomes(callAttempts),
    contactVolumeByDay: groupCallsByDay(callAttempts),
    escalationsByReason: groupEscalations(slots),
    insights: buildInsights(slots, db),
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

function buildInsights(slots: SlotView[], db: OpenSlotDbState) {
  const offering = slots.filter((slot) => slot.status === "OFFERING").length;
  const open = slots.filter((slot) => slot.status === "OPEN").length;
  const runnerUps = db.priority_bumps.filter(
    (bump) => bump.reason === "runner_up" && bump.active,
  ).length;

  return [
    `${offering} slots currently have active outreach waves.`,
    `${open} slots are open and available for backend ranking.`,
    runnerUps
      ? `${runnerUps} runner-up priority boosts are active for future eligible openings.`
      : "No runner-up priority boosts are currently active.",
  ];
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function dayLabel(timestamp: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(timestamp));
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
