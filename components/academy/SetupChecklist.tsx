"use client";

import { CheckCircleIcon, CircleIcon, ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useStore } from "@/lib/store";

export function SetupChecklist() {
  const customers = useStore((s) => s.customers);
  const calls = useStore((s) => s.calls);
  const cascadeChains = useStore((s) => s.cascadeChains);
  const slots = useStore((s) => s.slots);

  const items = [
    { key: "calendar", label: "Calendar connected", done: false, href: "/integrations" },
    { key: "waitlist", label: "Waitlist imported (≥ 5 entries)", done: customers.filter((c) => !c.currentBookingId).length >= 5, href: "/data" },
    { key: "consent", label: "Consent reviewed", done: customers.every((c) => c.consent.call || c.optedOut), href: "/compliance" },
    { key: "services", label: "Services configured", done: true, href: "/settings" },
    { key: "rules", label: "Rules reviewed", done: true, href: "/rules" },
    { key: "phone", label: "Phone calling tested", done: calls.length > 0, href: "/integrations" },
    { key: "simulated", label: "First cancellation simulated", done: cascadeChains.length > 0, href: "/overview" },
    { key: "audit", label: "Audit log reviewed", done: useStore.getState().audit.length > 3, href: "/compliance" },
    { key: "analytics", label: "Analytics understood", done: slots.some((s) => s.status === "filled"), href: "/analytics" }
  ];

  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="rounded-card bg-white shadow-card p-4 sticky top-20">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider text-ink-400 font-[700]">Setup progress</span>
        <span className="font-mono tabular-nums font-[700] text-[13px]">{done}/{items.length}</span>
      </div>
      <div className="h-2 bg-porcelain2 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-vert transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.key}>
            <Link
              href={it.href}
              className="group flex items-center gap-2 text-[13px] py-1 rounded-btn hover:bg-porcelain2 px-2"
            >
              {it.done ? (
                <CheckCircleIcon size={14} weight="fill" className="text-vert-600 shrink-0" />
              ) : (
                <CircleIcon size={14} className="text-ink-300 shrink-0" />
              )}
              <span className={it.done ? "text-ink-500 line-through" : "text-ink"}>{it.label}</span>
              <ArrowRightIcon size={11} className="ml-auto text-ink-300 opacity-0 group-hover:opacity-100 transition" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
