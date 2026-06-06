"use client";

import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { motion } from "framer-motion";
import { ArrowsClockwiseIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { useStore } from "@/lib/store";
import { money, timeOfDay } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ImportCalendarDialog } from "@/components/slot/ImportCalendarDialog";

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export default function CalendarPage() {
  const slots = useStore((s) => s.slots);
  const customers = useStore((s) => s.customers);
  const [anchor, setAnchor] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight">Calendar</h1>
          <p className="mt-2 text-body text-ink-500">
            View appointment capacity, cancellations, and recovered slots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "week" | "month")}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <ImportCalendarDialog
            trigger={
              <Button variant="secondary">
                <ArrowsClockwiseIcon size={14} />
                Sync calendar
              </Button>
            }
          />
        </div>
      </div>

      {view === "week" ? (
        <WeekView slots={slots} customers={customers} anchor={anchor} setAnchor={setAnchor} />
      ) : (
        <MonthView slots={slots} anchor={anchor} setAnchor={setAnchor} />
      )}
    </div>
  );
}

function WeekView({
  slots,
  customers,
  anchor,
  setAnchor
}: {
  slots: ReturnType<typeof useStore.getState>["slots"];
  customers: ReturnType<typeof useStore.getState>["customers"];
  anchor: Date;
  setAnchor: (d: Date) => void;
}) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const byDayHour = useMemo(() => {
    const map = new Map<string, typeof slots>();
    for (const s of slots) {
      const d = new Date(s.startTime);
      const key = `${format(d, "yyyy-MM-dd")}_${d.getHours()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [slots]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Week of {format(weekStart, "MMM d")}</CardTitle>
          <CardDescription>Vienna Private Imaging · all locations</CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setAnchor(addDays(anchor, -7))}>
            <CaretLeftIcon size={14} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setAnchor(addDays(anchor, 7))}>
            <CaretRightIcon size={14} />
          </Button>
        </div>
      </CardHeader>

      <div className="flex items-center gap-3 flex-wrap mb-3">
        <Legend tone="violet" label="Booked" />
        <Legend tone="peacock" label="Open" />
        <Legend tone="vert" label="Filled" />
        <Legend tone="sienna" label="Expired" />
        <Legend tone="saffron" label="Held" />
      </div>

      <div className="overflow-x-auto">
        <div className="grid" style={{ gridTemplateColumns: "60px repeat(7, minmax(140px, 1fr))" }}>
          <div />
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={cn(
                "px-2 pb-2 text-meta border-b border-stone/70",
                isSameDay(d, new Date()) ? "text-peacock font-[700]" : "text-ink-500 font-[600]"
              )}
            >
              {format(d, "EEE")} <span className="font-mono tabular-nums">{format(d, "d")}</span>
            </div>
          ))}
          {HOURS.map((h) => (
            <div key={h} className="contents">
              <div className="text-meta text-ink-400 px-2 py-2 font-mono tabular-nums border-b border-stone/30">
                {h.toString().padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const key = `${format(d, "yyyy-MM-dd")}_${h}`;
                const cellSlots = byDayHour.get(key) ?? [];
                return (
                  <div key={key} className="border-b border-l border-stone/40 min-h-[56px] p-1.5 space-y-1">
                    {cellSlots.map((s) => {
                      const tone =
                        s.status === "open" || s.status === "calling"
                          ? "peacock"
                          : s.status === "filled"
                            ? "vert"
                            : s.status === "expired"
                              ? "sienna"
                              : s.status === "held"
                                ? "saffron"
                                : "violet";
                      const customer = customers.find((c) => c.id === s.customerId);
                      return (
                        <motion.div
                          key={s.id}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            "rounded-[8px] px-2 py-1.5 text-[11.5px] font-[600] leading-tight cursor-pointer transition",
                            "hover:translate-y-[-1px]",
                            tone === "peacock" && "bg-peacock-50 text-peacock-800 ring-1 ring-peacock-200",
                            tone === "vert" && "bg-vert-100 text-vert-800 ring-1 ring-vert-200",
                            tone === "sienna" && "bg-sienna-50 text-sienna-700 ring-1 ring-sienna-200",
                            tone === "saffron" && "bg-saffron-100 text-saffron-700 ring-1 ring-saffron-200",
                            tone === "violet" && "bg-violet-50 text-violet-700 ring-1 ring-violet-100"
                          )}
                        >
                          <div className="truncate">
                            {timeOfDay(s.startTime)} · {s.service}
                          </div>
                          <div className="text-[10.5px] opacity-80 truncate">
                            {customer?.name ?? "—"} · {money(s.estimatedValue)}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function MonthView({
  slots,
  anchor,
  setAnchor
}: {
  slots: ReturnType<typeof useStore.getState>["slots"];
  anchor: Date;
  setAnchor: (d: Date) => void;
}) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 41);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const byDay = useMemo(() => {
    const m = new Map<string, typeof slots>();
    for (const s of slots) {
      const k = format(new Date(s.startTime), "yyyy-MM-dd");
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [slots]);

  function setMonth(delta: number) {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() + delta);
    setAnchor(d);
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{format(monthStart, "MMMM yyyy")}</CardTitle>
          <CardDescription>Month overview of every slot.</CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setMonth(-1)}>
            <CaretLeftIcon size={14} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
            This month
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMonth(1)}>
            <CaretRightIcon size={14} />
          </Button>
        </div>
      </CardHeader>

      <div className="grid grid-cols-7 gap-px bg-stone/70 rounded-card overflow-hidden">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-porcelain text-meta text-ink-500 font-[600] uppercase tracking-wider text-[10.5px] py-1.5 text-center">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const k = format(d, "yyyy-MM-dd");
          const inMonth = isSameMonth(d, anchor);
          const items = byDay.get(k) ?? [];
          const fills = items.filter((s) => s.status === "filled").length;
          const opens = items.filter((s) => s.status === "open" || s.status === "calling").length;
          const expired = items.filter((s) => s.status === "expired").length;
          return (
            <div
              key={k}
              className={cn(
                "bg-white min-h-[88px] p-1.5",
                !inMonth && "bg-porcelain/40 text-ink-300",
                isSameDay(d, new Date()) && "ring-2 ring-peacock"
              )}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className={cn("text-[12px] font-mono tabular-nums", isSameDay(d, new Date()) ? "text-peacock font-[700]" : "text-ink-500")}>
                  {format(d, "d")}
                </span>
                <span className="text-[10.5px] text-ink-400 tabular-nums">{items.length || ""}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {opens > 0 && <span className="text-[10px] font-[700] bg-peacock-50 text-peacock-700 px-1.5 py-0.5 rounded-chip">{opens} open</span>}
                {fills > 0 && <span className="text-[10px] font-[700] bg-vert-100 text-vert-700 px-1.5 py-0.5 rounded-chip">{fills} filled</span>}
                {expired > 0 && <span className="text-[10px] font-[700] bg-sienna-50 text-sienna-700 px-1.5 py-0.5 rounded-chip">{expired} expired</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Legend({ tone, label }: { tone: "peacock" | "violet" | "sienna" | "vert" | "saffron"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-meta text-ink-500">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-[3px]",
          tone === "peacock" && "bg-peacock-200",
          tone === "violet" && "bg-violet-200",
          tone === "sienna" && "bg-sienna-300",
          tone === "vert" && "bg-vert-300",
          tone === "saffron" && "bg-saffron-200"
        )}
      />
      {label}
    </span>
  );
}
