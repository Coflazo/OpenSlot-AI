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
import { analyticsData } from "@/lib/fonio/mock-data";

export function AnalyticsTab() {
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
