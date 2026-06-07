"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  CompassIcon,
  ClockCountdownIcon,
  UsersThreeIcon,
  CalendarBlankIcon,
  PhoneCallIcon,
  AddressBookIcon,
  SlidersHorizontalIcon,
  ChartLineUpIcon,
  PuzzlePieceIcon,
  ShieldCheckIcon,
  UsersFourIcon,
  GearSixIcon,
  ArrowCounterClockwiseIcon
} from "@phosphor-icons/react/dist/ssr";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/primitives/dialog";
import { useStore } from "@/lib/store";

interface Item {
  label: string;
  hint?: string;
  group: "navigation" | "actions" | "customers" | "slots";
  icon?: React.ReactNode;
  onSelect: () => void;
  keywords?: string;
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const customers = useStore((s) => s.customers);
  const slots = useStore((s) => s.slots);
  const hydrateFromApi = useStore((s) => s.hydrateFromApi);

  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);

  const items: Item[] = useMemo(() => {
    const go = (href: string) => () => {
      router.push(href);
      onOpenChange(false);
    };
    const nav: Item[] = [
      { label: "Overview", group: "navigation", icon: <CompassIcon size={14} />, onSelect: go("/overview") },
      { label: "Open Slots", group: "navigation", icon: <ClockCountdownIcon size={14} />, onSelect: go("/open-slots") },
      { label: "Waitlist", group: "navigation", icon: <UsersThreeIcon size={14} />, onSelect: go("/waitlist") },
      { label: "Calendar", group: "navigation", icon: <CalendarBlankIcon size={14} />, onSelect: go("/calendar") },
      { label: "Calls", group: "navigation", icon: <PhoneCallIcon size={14} />, onSelect: go("/calls") },
      { label: "Customers", group: "navigation", icon: <AddressBookIcon size={14} />, onSelect: go("/customers") },
      { label: "Rules", group: "navigation", icon: <SlidersHorizontalIcon size={14} />, onSelect: go("/rules") },
      { label: "Analytics", group: "navigation", icon: <ChartLineUpIcon size={14} />, onSelect: go("/analytics") },
      { label: "Integrations", group: "navigation", icon: <PuzzlePieceIcon size={14} />, onSelect: go("/integrations") },
      { label: "Compliance", group: "navigation", icon: <ShieldCheckIcon size={14} />, onSelect: go("/compliance") },
      { label: "Team", group: "navigation", icon: <UsersFourIcon size={14} />, onSelect: go("/team") },
      { label: "Settings", group: "navigation", icon: <GearSixIcon size={14} />, onSelect: go("/settings") }
    ];
    const actions: Item[] = [
      {
        label: "Refresh live data",
        group: "actions",
        icon: <ArrowCounterClockwiseIcon size={14} />,
        onSelect: () => {
          void hydrateFromApi();
          onOpenChange(false);
        },
        keywords: "reload sync hydrate"
      }
    ];
    const cust: Item[] = customers.slice(0, 24).map((c) => ({
      label: c.name,
      hint: c.email,
      group: "customers",
      onSelect: go(`/customers/${c.id}`),
      keywords: `${c.phone} ${c.email}`
    }));
    const slotItems: Item[] = slots
      .filter((s) => s.status !== "booked")
      .slice(0, 12)
      .map((s) => ({
        label: `${s.service} · ${new Date(s.startTime).toLocaleString("de-AT")}`,
        hint: s.location,
        group: "slots",
        onSelect: () => {
          router.push(`/open-slots?id=${s.id}`);
          onOpenChange(false);
        }
      }));
    return [...nav, ...actions, ...cust, ...slotItems];
  }, [customers, slots, router, onOpenChange, hydrateFromApi]);

  const filtered = useMemo(() => {
    if (!q) return items;
    const needle = q.toLowerCase();
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(needle) ||
        (it.hint ?? "").toLowerCase().includes(needle) ||
        (it.keywords ?? "").toLowerCase().includes(needle)
    );
  }, [items, q]);

  useEffect(() => {
    setIndex(0);
  }, [q, open]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of filtered) {
      if (!map.has(it.group)) map.set(it.group, []);
      map.get(it.group)!.push(it);
    }
    return map;
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Quickly navigate or run actions.</DialogDescription>
        <div className="px-3 pt-3 pb-2 border-b border-stone/60">
          <div className="relative">
            <MagnifyingGlassIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search slots, customers, actions…"
              className="w-full h-10 pl-9 pr-3 rounded-btn bg-porcelain text-[14px] placeholder:text-ink-400 focus-visible:outline-none"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setIndex((i) => Math.min(i + 1, filtered.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setIndex((i) => Math.max(i - 1, 0));
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  filtered[index]?.onSelect();
                }
              }}
            />
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-meta text-ink-400">No matches.</div>
          )}
          {Array.from(grouped.entries()).map(([group, list]) => (
            <div key={group} className="py-1">
              <div className="px-3 py-1 text-[10.5px] uppercase tracking-wider text-ink-400 font-[700]">
                {group}
              </div>
              {list.map((it) => {
                const globalIndex = filtered.indexOf(it);
                const active = globalIndex === index;
                return (
                  <button
                    key={`${it.group}_${it.label}`}
                    onMouseEnter={() => setIndex(globalIndex)}
                    onClick={() => it.onSelect()}
                    className={
                      "w-full flex items-center gap-3 px-3 py-2 text-[13.5px] text-left " +
                      (active ? "bg-porcelain2" : "")
                    }
                  >
                    <span className="text-ink-400">{it.icon}</span>
                    <span className="flex-1 truncate">
                      <span className="text-ink font-[600]">{it.label}</span>
                      {it.hint && <span className="text-ink-400 ml-2 text-meta">{it.hint}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-stone/60 flex items-center gap-3 text-meta text-ink-400">
          <span className="inline-flex items-center gap-1"><span className="kbd">↑↓</span> navigate</span>
          <span className="inline-flex items-center gap-1"><span className="kbd">↵</span> select</span>
          <span className="ml-auto inline-flex items-center gap-1"><span className="kbd">esc</span> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
