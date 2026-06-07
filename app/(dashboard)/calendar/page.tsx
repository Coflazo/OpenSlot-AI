"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowsClockwiseIcon,
  CalendarPlusIcon,
  CaretLeftIcon,
  CaretRightIcon,
  GoogleLogoIcon,
  InfoIcon
} from "@phosphor-icons/react/dist/ssr";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { useStore } from "@/lib/store";
import { money, timeOfDay, duration, shortDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ImportCalendarDialog } from "@/components/slot/ImportCalendarDialog";
import { CreateOpenSlotDialog } from "@/components/slot/CreateOpenSlotDialog";
import { SlotDrawer } from "@/components/slot/SlotDrawer";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00–19:00

export default function CalendarPage() {
  const slots = useStore((s) => s.slots);
  const customers = useStore((s) => s.customers);
  const hydrateFromApi = useStore((s) => s.hydrateFromApi);
  const [anchor, setAnchor] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    void hydrateFromApi();
  }, [hydrateFromApi]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight">Calendar</h1>
          <p className="mt-2 text-body text-ink-500">
            All bookings, cancellations, and recovered slots in one view.
            {" "}Connect Google Calendar for two-way sync, or use this as your standalone schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week" | "month")}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <CreateOpenSlotDialog />
          <ImportCalendarDialog
            trigger={
              <Button variant="secondary">
                <GoogleLogoIcon size={14} weight="bold" />
                Sync calendar
              </Button>
            }
          />
        </div>
      </div>

      {/* Optional Google banner */}
      <GoogleSyncBanner />

      {/* Slot drawer for detail view */}
      <Suspense fallback={null}>
        <SlotDrawer />
      </Suspense>

      {/* Calendar views */}
      {view === "day" && (
        <DayView slots={slots} customers={customers} anchor={anchor} setAnchor={setAnchor} />
      )}
      {view === "week" && (
        <WeekView slots={slots} customers={customers} anchor={anchor} setAnchor={setAnchor} />
      )}
      {view === "month" && (
        <MonthView
          slots={slots}
          anchor={anchor}
          setAnchor={setAnchor}
          onDayClick={(d) => { setAnchor(d); setView("day"); }}
        />
      )}
    </div>
  );
}

/* ---------- Google Calendar optional banner ---------- */

function GoogleSyncBanner() {
  const [dismissed, setDismissed] = useState(false);
  const connected = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CONNECTED); // always false for now

  if (dismissed || connected) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 rounded-card border border-violet-100 bg-violet-50/50 px-4 py-3"
    >
      <GoogleLogoIcon size={20} weight="duotone" className="text-violet shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-[650] text-ink">Google Calendar sync available</div>
        <div className="text-meta text-ink-500">
          Connect to auto-detect cancellations and sync bookings. The built-in calendar works independently. Syncing is optional.
        </div>
      </div>
      <ImportCalendarDialog
        trigger={
          <Button variant="secondary" size="sm">
            <ArrowsClockwiseIcon size={12} />
            Connect
          </Button>
        }
      />
      <button
        onClick={() => setDismissed(true)}
        className="text-ink-400 hover:text-ink text-[11px] font-[600] uppercase tracking-wider shrink-0"
      >
        Dismiss
      </button>
    </motion.div>
  );
}

/* ---------- Slot chip (shared) ---------- */

function toneForStatus(status: string) {
  if (status === "open" || status === "calling") return "peacock";
  if (status === "filled") return "vert";
  if (status === "expired") return "sienna";
  if (status === "held") return "saffron";
  if (status === "paused") return "neutral";
  return "violet"; // booked
}

function SlotChip({
  slot,
  customerName,
  compact = false
}: {
  slot: { id: string; startTime: string; service: string; status: string; estimatedValue: number; durationMinutes: number };
  customerName?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const tone = toneForStatus(slot.status);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => router.push(`/calendar?id=${slot.id}`)}
      className={cn(
        "w-full text-left rounded-[8px] px-2 py-1.5 text-[11.5px] font-[600] leading-tight cursor-pointer transition",
        "hover:translate-y-[-1px] hover:shadow-sm",
        tone === "peacock" && "bg-peacock-50 text-peacock-800 ring-1 ring-peacock-200",
        tone === "vert" && "bg-vert-100 text-vert-800 ring-1 ring-vert-200",
        tone === "sienna" && "bg-sienna-50 text-sienna-700 ring-1 ring-sienna-200",
        tone === "saffron" && "bg-saffron-100 text-saffron-700 ring-1 ring-saffron-200",
        tone === "violet" && "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
        tone === "neutral" && "bg-porcelain2 text-ink-500 ring-1 ring-stone"
      )}
    >
      <div className="truncate">
        {timeOfDay(slot.startTime)} · {slot.service}
      </div>
      {!compact && (
        <div className="text-[10.5px] opacity-80 truncate">
          {customerName ?? "-"} · {money(slot.estimatedValue)}
        </div>
      )}
    </motion.button>
  );
}

/* ---------- Day view ---------- */

function DayView({
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
  const daySlots = useMemo(
    () => slots.filter((s) => isSameDay(new Date(s.startTime), anchor)),
    [slots, anchor]
  );

  const byHour = useMemo(() => {
    const m = new Map<number, typeof slots>();
    for (const s of daySlots) {
      const h = new Date(s.startTime).getHours();
      if (!m.has(h)) m.set(h, []);
      m.get(h)!.push(s);
    }
    return m;
  }, [daySlots]);

  const stats = useMemo(() => {
    const booked = daySlots.filter((s) => s.status === "booked").length;
    const open = daySlots.filter((s) => ["open", "calling"].includes(s.status)).length;
    const filled = daySlots.filter((s) => s.status === "filled").length;
    const revenue = daySlots.reduce((sum, s) => sum + s.estimatedValue, 0);
    return { total: daySlots.length, booked, open, filled, revenue };
  }, [daySlots]);

  const isToday = isSameDay(anchor, new Date());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {isToday ? "Today" : format(anchor, "EEEE")}, {format(anchor, "MMMM d")}
            </CardTitle>
            <CardDescription>{daySlots.length} appointments scheduled</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setAnchor(addDays(anchor, -1))}>
              <CaretLeftIcon size={14} />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setAnchor(addDays(anchor, 1))}>
              <CaretRightIcon size={14} />
            </Button>
          </div>
        </CardHeader>

        <div className="relative">
          {/* Current time indicator */}
          {isToday && <NowLine />}

          {HOURS.map((h) => {
            const hourSlots = byHour.get(h) ?? [];
            return (
              <div key={h} className="grid grid-cols-[60px_1fr] border-b border-stone/30 min-h-[64px]">
                <div className="text-meta text-ink-400 px-3 py-2 font-mono tabular-nums border-r border-stone/30">
                  {h.toString().padStart(2, "0")}:00
                </div>
                <div className="p-1.5 space-y-1">
                  {hourSlots.map((s) => {
                    const cust = customers.find((c) => c.id === s.customerId);
                    return <SlotChip key={s.id} slot={s} customerName={cust?.name} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Right sidebar: day summary */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Day summary</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <SumRow label="Total appointments" value={stats.total} />
            <SumRow label="Booked" value={stats.booked} tone="violet" />
            <SumRow label="Open / calling" value={stats.open} tone="peacock" />
            <SumRow label="Filled (recovered)" value={stats.filled} tone="vert" />
            <div className="pt-2 border-t border-stone/70">
              <SumRow label="Day revenue" value={money(stats.revenue)} tone="saffron" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {daySlots
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((s) => {
                const cust = customers.find((c) => c.id === s.customerId);
                return <SlotChip key={s.id} slot={s} customerName={cust?.name} />;
              })}
            {daySlots.length === 0 && (
              <div className="text-meta text-ink-400 text-center py-6">
                No appointments this day.
              </div>
            )}
          </div>
        </Card>

        <Legend />
      </div>
    </div>
  );
}

/* ---------- Week view ---------- */

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
          <CardDescription>All locations</CardDescription>
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

      <Legend />

      <div className="overflow-x-auto mt-3">
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
                  <div key={key} className="border-b border-l border-stone/40 min-h-[56px] p-1 space-y-1">
                    {cellSlots.map((s) => {
                      const customer = customers.find((c) => c.id === s.customerId);
                      return <SlotChip key={s.id} slot={s} customerName={customer?.name} compact />;
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

/* ---------- Month view ---------- */

function MonthView({
  slots,
  anchor,
  setAnchor,
  onDayClick
}: {
  slots: ReturnType<typeof useStore.getState>["slots"];
  anchor: Date;
  setAnchor: (d: Date) => void;
  onDayClick: (d: Date) => void;
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
          <CardDescription>Click any day to see full schedule.</CardDescription>
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
          const booked = items.filter((s) => s.status === "booked").length;
          const expired = items.filter((s) => s.status === "expired").length;
          return (
            <button
              key={k}
              onClick={() => onDayClick(d)}
              className={cn(
                "bg-white min-h-[88px] p-1.5 text-left transition hover:bg-porcelain/60",
                !inMonth && "bg-porcelain/40 text-ink-300",
                isSameDay(d, new Date()) && "ring-2 ring-inset ring-peacock"
              )}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className={cn("text-[12px] font-mono tabular-nums", isSameDay(d, new Date()) ? "text-peacock font-[700]" : "text-ink-500")}>
                  {format(d, "d")}
                </span>
                <span className="text-[10.5px] text-ink-400 tabular-nums">{items.length || ""}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {booked > 0 && <span className="text-[10px] font-[700] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-chip">{booked} booked</span>}
                {opens > 0 && <span className="text-[10px] font-[700] bg-peacock-50 text-peacock-700 px-1.5 py-0.5 rounded-chip">{opens} open</span>}
                {fills > 0 && <span className="text-[10px] font-[700] bg-vert-100 text-vert-700 px-1.5 py-0.5 rounded-chip">{fills} filled</span>}
                {expired > 0 && <span className="text-[10px] font-[700] bg-sienna-50 text-sienna-700 px-1.5 py-0.5 rounded-chip">{expired} exp</span>}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Helpers ---------- */

function NowLine() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < 7 || h > 19) return null;
  const top = (h - 7) * 64 + (m / 60) * 64;
  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top }}>
      <div className="flex items-center gap-1">
        <div className="h-2.5 w-2.5 rounded-full bg-sienna-500 -ml-1" />
        <div className="flex-1 h-px bg-sienna-400" />
      </div>
    </div>
  );
}

function SumRow({
  label,
  value,
  tone
}: {
  label: string;
  value: React.ReactNode;
  tone?: "violet" | "peacock" | "vert" | "saffron";
}) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-ink-500">{label}</span>
      <span className={cn(
        "font-mono tabular-nums font-[700]",
        tone === "violet" && "text-violet",
        tone === "peacock" && "text-peacock",
        tone === "vert" && "text-vert-700",
        tone === "saffron" && "text-saffron-700",
        !tone && "text-ink"
      )}>
        {value}
      </span>
    </div>
  );
}

function Legend() {
  const items = [
    { tone: "violet", label: "Booked" },
    { tone: "peacock", label: "Open" },
    { tone: "vert", label: "Filled" },
    { tone: "sienna", label: "Expired" },
    { tone: "saffron", label: "Held" }
  ] as const;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map(({ tone, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5 text-meta text-ink-500">
          <span className={cn(
            "h-2.5 w-2.5 rounded-[3px]",
            tone === "peacock" && "bg-peacock-200",
            tone === "violet" && "bg-violet-200",
            tone === "sienna" && "bg-sienna-300",
            tone === "vert" && "bg-vert-300",
            tone === "saffron" && "bg-saffron-200"
          )} />
          {label}
        </span>
      ))}
    </div>
  );
}
