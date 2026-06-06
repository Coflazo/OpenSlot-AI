"use client";

import { useState } from "react";
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  DownloadSimpleIcon,
  WaveformIcon,
  TrashIcon,
  FileTextIcon
} from "@phosphor-icons/react/dist/ssr";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/primitives/tabs";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { Switch } from "@/components/primitives/switch";
import { useStore } from "@/lib/store";
import { initials } from "@/lib/format";
import { DEFAULT_RETENTION } from "@/lib/gdpr/retention";

export default function CompliancePage() {
  const customers = useStore((s) => s.customers);
  const audit = useStore((s) => s.audit);
  const callConsent = customers.filter((c) => c.consent.call).length / customers.length;
  const smsConsent = customers.filter((c) => c.consent.sms).length / customers.length;
  const recConsent = customers.filter((c) => c.consent.recording).length / customers.length;
  const optOut = customers.filter((c) => c.optedOut).length / customers.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-xl tracking-tight">Compliance</h1>
        <p className="mt-2 text-body text-ink-500 max-w-2xl">
          Monitor consent, recording rules, audit logs, and data retention.
        </p>
      </div>

      <Tabs defaultValue="consent">
        <TabsList>
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
          <TabsTrigger value="retention">Data retention</TabsTrigger>
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="data-map">Data map</TabsTrigger>
          <TabsTrigger value="lawful-basis">Lawful basis</TabsTrigger>
          <TabsTrigger value="dsar">DSAR queue</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="consent">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <ConsentRing label="Call consent" value={callConsent} />
            <ConsentRing label="SMS consent" value={smsConsent} />
            <ConsentRing label="Recording consent" value={recConsent} />
            <ConsentRing label="Opt-out rate" value={optOut} inverse />
          </div>
          <Card className="mt-4 p-0 overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead className="bg-porcelain/70 border-b border-stone/80">
                <tr className="text-left text-meta text-ink-500 [&>th]:py-2.5 [&>th]:px-4 [&>th]:font-[600] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-[11px]">
                  <th>Customer</th>
                  <th>Call</th>
                  <th>SMS</th>
                  <th>Recording</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-stone/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-7 w-7 rounded-full bg-gradient-to-br from-violet to-peacock text-white flex items-center justify-center text-[10.5px] font-[700]">
                          {initials(c.name)}
                        </span>
                        <span className="font-[600]">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Yes on={c.consent.call} /></td>
                    <td className="px-4 py-3"><Yes on={c.consent.sms} /></td>
                    <td className="px-4 py-3"><Yes on={c.consent.recording} /></td>
                    <td className="px-4 py-3 text-ink-500">Online form</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead className="bg-porcelain/70 border-b border-stone/80">
                <tr className="text-left text-meta text-ink-500 [&>th]:py-2.5 [&>th]:px-4 [&>th]:font-[600] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-[11px]">
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Object</th>
                  <th>Result</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-b border-stone/60">
                    <td className="px-4 py-3 font-mono tabular-nums text-meta text-ink-500">
                      {new Date(a.at).toLocaleString("de-AT")}
                    </td>
                    <td className="px-4 py-3 capitalize">{a.actor}</td>
                    <td className="px-4 py-3 font-[600]">{a.action}</td>
                    <td className="px-4 py-3 font-mono text-ink-500 text-[12.5px]">{a.object}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          a.result === "success"
                            ? "vert"
                            : a.result === "blocked"
                              ? "sienna"
                              : a.result === "error"
                                ? "sienna"
                                : "neutral"
                        }
                      >
                        {a.result}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead className="bg-porcelain/70 border-b border-stone/80">
                <tr className="text-left text-meta text-ink-500 [&>th]:py-2.5 [&>th]:px-4 [&>th]:font-[600] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-[11px]">
                  <th>Category</th>
                  <th>Description</th>
                  <th>Default</th>
                  <th>Legal reference</th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_RETENTION.map((r) => (
                  <tr key={r.category} className="border-b border-stone/60">
                    <td className="px-4 py-3 font-[650]">{r.category}</td>
                    <td className="px-4 py-3 text-ink-500">{r.description}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">
                      {r.defaultDays === 0 ? "until disconnect" : `${r.defaultDays} days`}
                    </td>
                    <td className="px-4 py-3 text-meta text-ink-500">{r.legalReference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="data-map">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Data map</CardTitle>
                <CardDescription>What we store, where it lives, who can read it.</CardDescription>
              </div>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13.5px]">
              <DataItem
                category="Personal identifiers"
                fields="full_name, phone, email, language"
                table="customers"
                access="Members of the clinic only (RLS)"
              />
              <DataItem
                category="Location data"
                fields="home_postcode, home_lat, home_lng"
                table="customers"
                access="Used only by the A* route planner; never shown verbatim in the UI"
              />
              <DataItem
                category="Consent"
                fields="call/sms/voicemail/recording + source + timestamp + withdrawn_at"
                table="customer_consents"
                access="Members; trigger blocks calls if withdrawn"
              />
              <DataItem
                category="Eligibility"
                fields="safety_form, referral, payment, authorization, contrast"
                table="customer_eligibility"
                access="Members"
              />
              <DataItem
                category="Calls"
                fields="transcript, extraction (jsonb), recording_url"
                table="call_attempts"
                access="Members; recording auto-deleted at Fonio after 30 days"
              />
              <DataItem
                category="Audit log"
                fields="actor, action, object, result, lawful_basis_tag, metadata"
                table="audit_log"
                access="Members read-only; service role writes"
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="lawful-basis">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Lawful basis register</CardTitle>
                <CardDescription>
                  Article 6 + Article 9 mapping for each processing activity.
                </CardDescription>
              </div>
            </CardHeader>
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-meta text-ink-500 [&>th]:py-2 [&>th]:font-[600] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-[11px]">
                  <th>Processing activity</th>
                  <th>Basis (Art. 6)</th>
                  <th>Special category (Art. 9)</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:py-2 [&>tr>td]:pr-4">
                <tr className="border-t border-stone/60">
                  <td>Booking + cancellation orchestration</td>
                  <td>contract (Art. 6(1)(b))</td>
                  <td>n/a — no clinical data</td>
                </tr>
                <tr className="border-t border-stone/60">
                  <td>Outbound recovery call</td>
                  <td>consent (Art. 6(1)(a)) + customer_consents</td>
                  <td>n/a</td>
                </tr>
                <tr className="border-t border-stone/60">
                  <td>Audit logging</td>
                  <td>legitimate interest (Art. 6(1)(f))</td>
                  <td>n/a</td>
                </tr>
                <tr className="border-t border-stone/60">
                  <td>Erasure (DSAR)</td>
                  <td>legal obligation (Art. 6(1)(c) + Art. 17)</td>
                  <td>n/a</td>
                </tr>
                <tr className="border-t border-stone/60">
                  <td>Google Calendar sync</td>
                  <td>legitimate interest (Art. 6(1)(f))</td>
                  <td>n/a</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="dsar">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>DSAR queue</CardTitle>
                <CardDescription>
                  Article 15 access requests and Article 17 erasure requests. Export returns JSON of every
                  row touching the customer; delete anonymizes the audit trail.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="rounded-card border border-stone/80 p-4 text-meta text-ink-500">
              No open requests. Trigger one via{" "}
              <code className="font-mono text-ink-600">GET /api/dsar/&#123;customerId&#125;/export</code>
              {" "}or from a customer profile (Customers → Open → Opt out → "Erase me").
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="recording">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recording policy</CardTitle>
                <CardDescription>
                  When the AI agent records the call, who can access it, and how long it's stored.
                </CardDescription>
              </div>
              <WaveformIcon size={18} weight="duotone" className="text-saffron-600" />
            </CardHeader>
            <RadioOption label="Always ask before recording" defaultChecked />
            <RadioOption label="Record only if consent exists" />
            <RadioOption label="Never record calls" />
            <RadioOption label="Delete transcript if recording is declined" defaultChecked />
            <div className="mt-4 flex items-center gap-3 p-3 rounded-card bg-saffron-50 border border-saffron-200 text-[12.5px] text-saffron-700">
              <TrashIcon size={14} weight="fill" />
              Recordings auto-delete after 30 days unless flagged for review.
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="exports">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Exports</CardTitle>
                <CardDescription>Download structured logs for your compliance archive.</CardDescription>
              </div>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ExportRow label="Consent records (CSV)" />
              <ExportRow label="Audit log (JSON)" />
              <ExportRow label="Transcripts (ZIP)" />
              <ExportRow label="Recordings (ZIP)" />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConsentRing({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const pct = Math.round(value * 100);
  const color = inverse ? "stroke-sienna" : "stroke-peacock";
  const trackColor = "stroke-porcelain2";
  const radius = 32;
  const c = 2 * Math.PI * radius;
  const dash = (pct / 100) * c;
  return (
    <div className="rounded-card bg-white shadow-card p-5 flex items-center gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} className={trackColor} strokeWidth="8" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div>
        <div className="text-meta uppercase tracking-wider text-ink-400 font-[700]">{label}</div>
        <div className="text-kpi font-mono tabular-nums mt-1">{pct}%</div>
      </div>
    </div>
  );
}

function Yes({ on }: { on: boolean }) {
  return on ? (
    <CheckCircleIcon size={14} weight="fill" className="text-vert-600" />
  ) : (
    <XCircleIcon size={14} weight="fill" className="text-sienna-600" />
  );
}

function Retention({ label, days }: { label: string; days: number }) {
  return (
    <div className="rounded-card bg-white shadow-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700]">{label}</div>
      <div className="text-section mt-1 font-mono tabular-nums">{days} <span className="text-ink-400 text-[14px]">days</span></div>
    </div>
  );
}

function DataItem({
  category,
  fields,
  table,
  access
}: {
  category: string;
  fields: string;
  table: string;
  access: string;
}) {
  return (
    <div className="rounded-card border border-stone/80 p-4 bg-porcelain">
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700]">{category}</div>
      <div className="font-[650] mt-1">{fields}</div>
      <div className="text-meta text-ink-500 mt-2">
        <span className="font-mono text-ink-600">{table}</span> · {access}
      </div>
    </div>
  );
}

function RadioOption({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-stone/60 last:border-0">
      <span className="text-[13.5px]">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function ExportRow({ label }: { label: string }) {
  return (
    <div className="rounded-card border border-stone p-3 flex items-center justify-between">
      <span className="text-[13.5px] inline-flex items-center gap-2">
        <FileTextIcon size={14} className="text-ink-400" />
        {label}
      </span>
      <Button variant="ghost" size="sm">
        <DownloadSimpleIcon size={12} />
        Download
      </Button>
    </div>
  );
}
