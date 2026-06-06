"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  CaretRightIcon,
  ShieldCheckIcon,
  ShieldSlashIcon
} from "@phosphor-icons/react/dist/ssr";

import { Card } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { Badge } from "@/components/primitives/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { AddCustomerDialog } from "@/components/waitlist/AddCustomerDialog";
import { useStore } from "@/lib/store";
import { initials, shortDate } from "@/lib/format";

const FILTERS = ["all", "booked", "waitlist", "needs_review", "opted_out"] as const;
type Filter = (typeof FILTERS)[number];

export default function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const byQuery = customers.filter((c) =>
      q ? `${c.name} ${c.email ?? ""} ${c.phone}`.toLowerCase().includes(q.toLowerCase()) : true
    );
    switch (filter) {
      case "booked":
        return byQuery.filter((c) => c.currentBookingId && !c.optedOut);
      case "waitlist":
        return byQuery.filter((c) => !c.currentBookingId && !c.optedOut);
      case "needs_review":
        return byQuery.filter(
          (c) =>
            !c.optedOut &&
            (!c.eligibility.safetyForm ||
              !c.eligibility.referral ||
              !c.eligibility.paymentReady ||
              !c.eligibility.authorization)
        );
      case "opted_out":
        return byQuery.filter((c) => c.optedOut);
      default:
        return byQuery;
    }
  }, [customers, q, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div className="max-w-2xl">
          <h1 className="text-title-xl tracking-tight">Customers</h1>
          <p className="mt-2 text-body text-ink-500">
            Manage customer profiles, consent, eligibility, and contact history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customers…"
              className="pl-9 w-[260px]"
            />
          </div>
          <AddCustomerDialog />
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All ({customers.length})</TabsTrigger>
          <TabsTrigger value="booked">
            Booked ({customers.filter((c) => c.currentBookingId && !c.optedOut).length})
          </TabsTrigger>
          <TabsTrigger value="waitlist">
            Waitlist ({customers.filter((c) => !c.currentBookingId && !c.optedOut).length})
          </TabsTrigger>
          <TabsTrigger value="needs_review">Needs review</TabsTrigger>
          <TabsTrigger value="opted_out">
            Opted out ({customers.filter((c) => c.optedOut).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead className="bg-porcelain/70 border-b border-stone/80">
            <tr className="text-left text-meta text-ink-500 [&>th]:py-2.5 [&>th]:px-4 [&>th]:font-[600] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-[11px]">
              <th>Customer</th>
              <th>Requested</th>
              <th>Consent</th>
              <th>Eligibility</th>
              <th>Booking</th>
              <th>Waiting since</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-meta text-ink-400">
                  No customers match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const consentOk = c.consent.call && c.consent.recording;
                return (
                  <tr key={c.id} className="border-b border-stone/60 hover:bg-porcelain2/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 rounded-full bg-gradient-to-br from-violet to-peacock text-white flex items-center justify-center font-[700] text-[11px]">
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-[650] truncate flex items-center gap-2">
                            {c.name}
                            {c.optedOut && <Badge tone="sienna">Opted out</Badge>}
                          </div>
                          <div className="text-meta text-ink-400 truncate">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.requestedService ?? "—"}</td>
                    <td className="px-4 py-3">
                      {consentOk ? (
                        <span className="inline-flex items-center gap-1 text-vert-700 text-[12.5px] font-[600]">
                          <ShieldCheckIcon size={13} weight="fill" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sienna-700 text-[12.5px] font-[600]">
                          <ShieldSlashIcon size={13} weight="fill" /> Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono tabular-nums text-[12.5px] font-[600]">
                        {[c.eligibility.safetyForm, c.eligibility.referral, c.eligibility.paymentReady, c.eligibility.authorization].filter(Boolean).length}
                        /4
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.currentBookingId ? (
                        <Badge tone="violet">Booked</Badge>
                      ) : (
                        <Badge tone="neutral">Waitlist</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {c.waitingSince ? shortDate(c.waitingSince) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="inline-flex items-center gap-1 text-peacock text-[12.5px] font-[650]"
                      >
                        Open
                        <CaretRightIcon size={11} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
