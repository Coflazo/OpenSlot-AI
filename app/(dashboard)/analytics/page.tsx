"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { ArrowUpRightIcon, LightbulbIcon, SparkleIcon } from "@phosphor-icons/react/dist/ssr";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/primitives/button";
import { KPICard } from "@/components/kpi/KPICard";
import { CountUp } from "@/components/kpi/CountUp";

import {
  revenueRecovered,
  slotsByService,
  cancellationsByWeekday,
  acceptanceByTimeLeft,
  pickupBySegment,
  expiredReasons
} from "@/lib/mock/analyticsTimeseries";
import { palette } from "@/lib/design/tokens";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight">Analytics</h1>
          <p className="mt-2 text-body text-ink-500">
            Measure recovered revenue, fill speed, and operational performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Revenue recovered (mo)"
          value={
            <>
              <span className="text-saffron-600 text-[22px] mr-0.5">€</span>
              <CountUp value={12_840} format={(n) => Math.round(n).toLocaleString("de-AT")} />
            </>
          }
          delta="+18% MoM"
          tone="saffron"
        />
        <KPICard label="Fill rate" value={<><CountUp value={68} format={(n) => `${Math.round(n)}%`} /></>} tone="vert" delta="+4.1pp" />
        <KPICard label="Avg time to fill" value="7m 42s" tone="peacock" delta="−21%" />
        <KPICard label="Acceptance rate" value={<><CountUp value={47} format={(n) => `${Math.round(n)}%`} /></>} tone="violet" delta="+3.2pp" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recovered revenue over time</CardTitle>
              <CardDescription>Daily, this week.</CardDescription>
            </div>
            <Badge tone="saffron">€13.2k this week</Badge>
          </CardHeader>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={revenueRecovered} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#E7E1D6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} />
                <YAxis tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: "#00939B", strokeWidth: 1, strokeDasharray: "3 3" }}
                  contentStyle={{ borderRadius: 10, border: "1px solid #E7E1D6", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={palette.peacock}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: palette.peacock, stroke: "white", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recommended action</CardTitle>
              <CardDescription>From the engine's last 30-day learnings.</CardDescription>
            </div>
            <SparkleIcon size={16} className="text-saffron-600" />
          </CardHeader>
          <ul className="space-y-3">
            <Insight body="Your highest fill rate is between 09:00 and 12:00." />
            <Insight body="Increase same-day call aggression for MRI Knee slots." />
            <Insight body="Customers with complete safety forms accept 2.4x faster." />
          </ul>
          <div className="mt-4">
            <Button variant="secondary" size="sm">
              <ArrowUpRightIcon size={12} weight="bold" />
              Apply recommendation
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Slots saved by service</CardTitle>
              <CardDescription>This month.</CardDescription>
            </div>
          </CardHeader>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={slotsByService}>
                <CartesianGrid stroke="#E7E1D6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="service" tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E7E1D6", fontSize: 12 }} />
                <Bar dataKey="saved" fill={palette.vert} radius={[6, 6, 0, 0]} />
                <Bar dataKey="expired" fill={palette.sienna} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cancellations by weekday</CardTitle>
              <CardDescription>Where the demand spikes.</CardDescription>
            </div>
          </CardHeader>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={cancellationsByWeekday}>
                <CartesianGrid stroke="#E7E1D6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} />
                <YAxis tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E7E1D6", fontSize: 12 }} />
                <Bar dataKey="value" fill={palette.violet} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Acceptance by time-left</CardTitle>
              <CardDescription>Hotter slots accept faster.</CardDescription>
            </div>
          </CardHeader>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <LineChart data={acceptanceByTimeLeft}>
                <CartesianGrid stroke="#E7E1D6" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} />
                <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} contentStyle={{ borderRadius: 10, border: "1px solid #E7E1D6", fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke={palette.saffron} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pickup by segment</CardTitle>
              <CardDescription>Who's most likely to answer.</CardDescription>
            </div>
          </CardHeader>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={pickupBySegment} layout="vertical">
                <CartesianGrid stroke="#E7E1D6" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} />
                <YAxis type="category" dataKey="segment" width={150} tick={{ fill: "#6E6E73", fontSize: 11 }} axisLine={{ stroke: "#E7E1D6" }} tickLine={false} />
                <Tooltip formatter={(v: number) => `${(v * 100).toFixed(0)}%`} contentStyle={{ borderRadius: 10, border: "1px solid #E7E1D6", fontSize: 12 }} />
                <Bar dataKey="value" fill={palette.peacock} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Expired slots by reason</CardTitle>
              <CardDescription>Where revenue still leaks.</CardDescription>
            </div>
          </CardHeader>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <PieChart>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E7E1D6", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie data={expiredReasons} dataKey="value" nameKey="reason" innerRadius={50} outerRadius={88} paddingAngle={3}>
                  {expiredReasons.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        [palette.sienna, palette.saffron, palette.violet, palette.peacock][i % 4]
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Insight({ body }: { body: string }) {
  return (
    <li className="flex gap-2.5 text-[13.5px]">
      <LightbulbIcon size={14} weight="duotone" className="text-saffron-600 mt-0.5 shrink-0" />
      <span>{body}</span>
    </li>
  );
}
