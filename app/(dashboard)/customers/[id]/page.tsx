"use client";

import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  EnvelopeSimpleIcon,
  PhoneIcon,
  TranslateIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSimpleIcon
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/primitives/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/primitives/dialog";
import { useStore } from "@/lib/store";
import { initials, shortDate } from "@/lib/format";

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const customer = useStore((s) => s.customers.find((c) => c.id === params.id));
  const optOut = useStore((s) => s.optOutCustomer);
  const [open, setOpen] = useState(false);
  if (!customer) return notFound();

  return (
    <div className="space-y-6">
      <Link href="/customers" className="inline-flex items-center gap-1 text-meta text-ink-500 hover:text-ink">
        <ArrowLeftIcon size={12} /> Back to customers
      </Link>

      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="h-14 w-14 rounded-full bg-gradient-to-br from-violet to-peacock text-white flex items-center justify-center font-[700] text-[16px]">
            {initials(customer.name)}
          </span>
          <div>
            <h1 className="text-title-xl">{customer.name}</h1>
            <div className="text-meta text-ink-500 mt-1 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <PhoneIcon size={12} /> {customer.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <EnvelopeSimpleIcon size={12} /> {customer.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TranslateIcon size={12} /> {customer.language.toUpperCase()}
              </span>
              {customer.currentBookingId ? (
                <Badge tone="violet">Currently booked</Badge>
              ) : (
                <Badge tone="vert">Active waitlist customer</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <PencilSimpleIcon size={13} />
            Edit profile
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="danger">Opt out</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Opt customer out?</DialogTitle>
                <DialogDescription>
                  OpenSlot AI will stop calling or messaging this customer about open slots.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <Button
                  variant="danger"
                  onClick={() => {
                    optOut(customer.id);
                    setOpen(false);
                  }}
                >
                  Opt out customer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Consent</CardTitle>
              <CardDescription>What OpenSlot AI is authorized to do.</CardDescription>
            </div>
          </CardHeader>
          <ul className="divide-y divide-stone/60">
            <ConsentRow label="Call consent" on={customer.consent.call} />
            <ConsentRow label="SMS consent" on={customer.consent.sms} />
            <ConsentRow label="Voicemail consent" on={customer.consent.voicemail} />
            <ConsentRow label="Recording consent" on={customer.consent.recording} />
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Eligibility</CardTitle>
              <CardDescription>Operational readiness for the requested service.</CardDescription>
            </div>
          </CardHeader>
          <ul className="divide-y divide-stone/60">
            <ConsentRow label="Safety form" on={customer.eligibility.safetyForm} />
            <ConsentRow label="Referral received" on={customer.eligibility.referral} />
            <ConsentRow label="Payment ready" on={customer.eligibility.paymentReady} />
            <ConsentRow label="Authorization approved" on={customer.eligibility.authorization} />
            <li className="flex items-center justify-between py-2.5 text-[13.5px]">
              <span>Contrast status</span>
              <Badge tone={customer.eligibility.contrastStatus === "pending" ? "saffron" : "neutral"}>
                {customer.eligibility.contrastStatus.replace("_", " ")}
              </Badge>
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>What the customer is open to receiving.</CardDescription>
            </div>
          </CardHeader>
          <ul className="space-y-2 text-[13.5px]">
            <KV k="Same-day cancellations" v={customer.preferences.sameDay ? "Yes" : "No"} />
            <KV k="Preferred window" v={customer.preferences.preferredWindow} />
            <KV k="Max travel" v={`${customer.preferences.maxTravelMinutes} min`} />
            <KV k="Earlier opportunity preference" v={customer.earlierOpportunityPreference.replace("_", " ")} />
            <KV k="Cascade participation" v={customer.cascadeParticipation.replace("_", " ")} />
            <KV k="Booking satisfaction" v={customer.bookingSatisfaction.replace("_", " ")} />
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>History</CardTitle>
              <CardDescription>Latest events for this customer.</CardDescription>
            </div>
          </CardHeader>
          <ol className="relative border-l border-stone/80 pl-5 space-y-3">
            <Event label="Joined waitlist" date={customer.waitingSince ?? new Date().toISOString()} />
            {customer.lastContactedAt && <Event label="Contacted" date={customer.lastContactedAt} />}
            {customer.currentBookingId && <Event label="Currently booked" date={new Date().toISOString()} />}
          </ol>
        </Card>
      </div>
    </div>
  );
}

function ConsentRow({ label, on }: { label: string; on: boolean }) {
  return (
    <li className="flex items-center justify-between py-2.5 text-[13.5px]">
      <span>{label}</span>
      {on ? (
        <span className="inline-flex items-center gap-1 text-vert-700 text-[12.5px] font-[600]">
          <CheckCircleIcon size={13} weight="fill" /> Active
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-sienna-700 text-[12.5px] font-[600]">
          <XCircleIcon size={13} weight="fill" /> Missing
        </span>
      )}
    </li>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-2">
      <span className="text-ink-500">{k}</span>
      <span className="text-ink font-[600] capitalize">{v}</span>
    </li>
  );
}

function Event({ label, date }: { label: string; date: string }) {
  return (
    <li className="relative">
      <span className="absolute -left-[26px] top-1.5 h-2 w-2 rounded-full bg-peacock ring-4 ring-porcelain" />
      <div className="text-[13px]">
        <span className="font-[600]">{label}</span>{" "}
        <span className="text-ink-400 text-meta ml-1">{shortDate(date)}</span>
      </div>
    </li>
  );
}
