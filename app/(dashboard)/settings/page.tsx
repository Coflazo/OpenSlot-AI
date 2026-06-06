"use client";

import { useState } from "react";
import { BellRingingIcon, BuildingsIcon, CreditCardIcon, LockKeyIcon, StethoscopeIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/primitives/tabs";
import { Button } from "@/components/primitives/button";
import { Input, Label, Textarea } from "@/components/primitives/input";
import { Switch } from "@/components/primitives/switch";
import { Badge } from "@/components/primitives/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/primitives/select";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-xl tracking-tight">Settings</h1>
        <p className="mt-2 text-body text-ink-500 max-w-2xl">
          Business defaults, locations, services, and security.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><UserIcon size={13} className="mr-1.5" />Business profile</TabsTrigger>
          <TabsTrigger value="locations"><BuildingsIcon size={13} className="mr-1.5" />Locations</TabsTrigger>
          <TabsTrigger value="services"><StethoscopeIcon size={13} className="mr-1.5" />Services</TabsTrigger>
          <TabsTrigger value="notifications"><BellRingingIcon size={13} className="mr-1.5" />Notifications</TabsTrigger>
          <TabsTrigger value="billing"><CreditCardIcon size={13} className="mr-1.5" />Billing</TabsTrigger>
          <TabsTrigger value="security"><LockKeyIcon size={13} className="mr-1.5" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Business profile</CardTitle>
                <CardDescription>Used in customer-facing scripts and confirmations.</CardDescription>
              </div>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Business name" defaultValue="Vienna Private Imaging" />
              <Field label="Legal name" defaultValue="Vienna Private Imaging GmbH" />
              <Field label="Website" defaultValue="viennaprivate.at" />
              <Field label="Support email" defaultValue="hello@viennaprivate.at" />
              <Field label="Support phone" defaultValue="+43 1 411 88 02" />
              <div className="space-y-1">
                <Label>Default language</Label>
                <Select defaultValue="de">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de">German (de-AT)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="tr">Turkish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Timezone</Label>
                <Select defaultValue="Europe/Vienna">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Vienna">Europe/Vienna</SelectItem>
                    <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                    <SelectItem value="Europe/Istanbul">Europe/Istanbul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1400); }}>
                Save changes
              </Button>
              {saved && <Badge tone="vert">Saved</Badge>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LocationCard name="Innere Stadt" address="Kärntner Straße 18, 1010 Wien" phone="+43 1 411 88 02" />
            <LocationCard name="Mariahilf" address="Mariahilfer Straße 88, 1070 Wien" phone="+43 1 411 88 03" />
          </div>
        </TabsContent>

        <TabsContent value="services">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead className="bg-porcelain/70 border-b border-stone/80">
                <tr className="text-left text-meta text-ink-500 [&>th]:py-2.5 [&>th]:px-4 [&>th]:font-[600] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-[11px]">
                  <th>Service</th>
                  <th>Duration</th>
                  <th>Value</th>
                  <th>Contrast</th>
                  <th>Forms</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["MRI Knee", 45, 420, false, "Safety form, referral"],
                  ["MRI Brain", 45, 520, false, "Safety form, referral"],
                  ["MRI Spine", 60, 640, false, "Safety form, referral"],
                  ["CT Chest", 30, 380, true, "Contrast clearance"],
                  ["CT Abdomen", 30, 410, true, "Contrast clearance"],
                  ["Ultrasound", 25, 180, false, "—"],
                  ["X-ray", 15, 120, false, "Referral"]
                ].map(([n, d, v, c, f]) => (
                  <tr key={String(n)} className="border-b border-stone/60">
                    <td className="px-4 py-3 font-[650]">{n}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{d}m</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-saffron-700 font-[700]">€{v}</td>
                    <td className="px-4 py-3">
                      <Badge tone={c ? "saffron" : "neutral"}>{c ? "Required" : "Not required"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Owner alerts</CardTitle>
                <CardDescription>How OpenSlot AI should reach you.</CardDescription>
              </div>
            </CardHeader>
            <ul className="divide-y divide-stone/60">
              <Notif label="Slot filled" />
              <Notif label="Slot expired" />
              <Notif label="High-value slot open" />
              <Notif label="Workflow paused" />
              <Notif label="Manual review needed" />
              <Notif label="Integration failed" />
            </ul>
            <div className="mt-4 flex items-center gap-2">
              <Button>Save changes</Button>
              <Button variant="ghost">Send test alert</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Billing</CardTitle>
                <CardDescription>Plan, usage, invoices.</CardDescription>
              </div>
              <Badge tone="vert">Growth plan</Badge>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Tile k="Monthly base" v="€420" />
              <Tile k="Successful fills this month" v="38" />
              <Tile k="Outbound minutes used" v="4,170" />
              <Tile k="Next invoice" v="July 5" />
              <Tile k="Payment method" v="VISA · 4242" />
              <Tile k="Tax ID" v="ATU 88 102 419" />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Sign-in policies and session management.</CardDescription>
              </div>
            </CardHeader>
            <ul className="divide-y divide-stone/60">
              <Notif label="Require two-factor authentication" />
              <Notif label="Single sign-on (SAML)" />
              <Notif label="Auto sign-out after 30 minutes" />
              <Notif label="IP allow-list" />
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} />
    </div>
  );
}

function LocationCard({ name, address, phone }: { name: string; address: string; phone: string }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{name}</CardTitle>
          <CardDescription>{address}</CardDescription>
        </div>
      </CardHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Phone" defaultValue={phone} />
        <Field label="Opening hours" defaultValue="Mon–Fri 07:30–20:00" />
        <Field label="Arrival buffer (min)" defaultValue="15" />
        <Field label="Parking" defaultValue="Underground garage P3" />
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm">Save</Button>
        <Button size="sm" variant="ghost">Delete location</Button>
      </div>
    </Card>
  );
}

function Notif({ label }: { label: string }) {
  return (
    <li className="flex items-center justify-between py-2.5 text-[13.5px]">
      <span>{label}</span>
      <Switch defaultChecked />
    </li>
  );
}

function Tile({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-card border border-stone/80 p-3 bg-porcelain">
      <div className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700]">{k}</div>
      <div className="text-[16px] font-[700] mt-0.5 font-mono tabular-nums">{v}</div>
    </div>
  );
}
