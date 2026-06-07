"use client";

import { useState } from "react";
import {
  CalendarBlankIcon,
  PuzzlePieceIcon,
  TableIcon,
  WebhooksLogoIcon,
  ChatTeardropTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  UsersThreeIcon,
  AddressBookIcon,
  CopySimpleIcon,
  CheckIcon
} from "@phosphor-icons/react/dist/ssr";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { Input, Label } from "@/components/primitives/input";
import { ConnectDialog } from "@/components/integrations/ConnectDialog";
import { FonioCard } from "@/components/integrations/FonioCard";

const WEBHOOK_URL = "https://api.openslot.ai/v1/hooks/c_4f87aa";

const examplePayload = `{
  "event": "slot.cancelled",
  "slot_id": "slot_123",
  "service": "MRI Knee",
  "start_time": "2026-06-06T16:30:00+02:00",
  "value": 420
}`;

export default function IntegrationsPage() {
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    navigator.clipboard.writeText(WEBHOOK_URL).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-xl tracking-tight">Integrations</h1>
        <p className="mt-2 text-body text-ink-500 max-w-2xl">
          Connect calendars, booking systems, customer records, and communication channels.
          Voice calling is powered by <span className="font-[700] text-ink">Fonio</span>.
        </p>
      </div>

      <FonioCard />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <IntegrationCard
          icon={<CalendarBlankIcon size={20} weight="duotone" className="text-violet" />}
          title="Calendar"
          body="Sync appointments and detect cancellations automatically."
          status="Connected"
          actionLabel="Manage"
        />
        <IntegrationCard
          icon={<UsersThreeIcon size={20} weight="duotone" className="text-peacock" />}
          title="Booking system"
          body="Read open slots and write confirmed bookings."
          status="Connected"
          actionLabel="Manage"
        />
        <IntegrationCard
          icon={<AddressBookIcon size={20} weight="duotone" className="text-violet" />}
          title="CRM"
          body="Sync customer profiles, consent, and tags."
          actionLabel="Connect CRM"
        />
        <IntegrationCard
          icon={<TableIcon size={20} weight="duotone" className="text-vert-600" />}
          title="Google Sheets"
          body="Use a spreadsheet as a lightweight waitlist or appointment source."
          actionLabel="Connect sheet"
        />
        <IntegrationCard
          icon={<PuzzlePieceIcon size={20} weight="duotone" className="text-saffron-600" />}
          title="Airtable"
          body="Bidirectional sync with a base. Read waitlist, write bookings."
          actionLabel="Connect base"
        />
        <IntegrationCard
          icon={<ChatTeardropTextIcon size={20} weight="duotone" className="text-violet" />}
          title="SMS"
          body="Send appointment confirmations and reminders."
          actionLabel="Connect SMS"
        />
        <IntegrationCard
          icon={<EnvelopeIcon size={20} weight="duotone" className="text-peacock" />}
          title="Email"
          body="Branded confirmations through your domain."
          actionLabel="Connect email"
        />
        <IntegrationCard
          icon={<PhoneIcon size={20} weight="duotone" className="text-saffron-700" />}
          title="Phone · Fonio"
          body="Outbound AI voice agent. Already wired to the dashboard."
          status="Connected"
          actionLabel="Manage Fonio"
          accent
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <WebhooksLogoIcon size={18} weight="duotone" className="text-violet" />
                Webhook endpoint
              </span>
            </CardTitle>
            <CardDescription>
              Send cancellation events here when an appointment is cancelled in your source system.
            </CardDescription>
          </div>
          <Badge tone="vert">Live</Badge>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Cancellation webhook URL</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input value={WEBHOOK_URL} readOnly className="font-mono text-[12.5px]" />
              <Button variant="secondary" size="sm" onClick={copyUrl}>
                {copied ? <CheckIcon size={12} /> : <CopySimpleIcon size={12} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-meta text-ink-400 mt-2">
              Authenticate with your <code className="font-mono text-ink-600">FONIO_WEBHOOK_SECRET</code> in
              the <code className="font-mono text-ink-600">X-Signature</code> header.
            </p>
          </div>
          <div>
            <Label>Example payload</Label>
            <pre className="mt-1.5 rounded-card bg-ink text-porcelain p-4 text-[12px] font-mono leading-relaxed overflow-x-auto">
              {examplePayload}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}

function IntegrationCard({
  icon,
  title,
  body,
  status,
  actionLabel,
  accent
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  status?: string;
  actionLabel: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-card bg-white shadow-card p-5 flex flex-col " +
        (accent ? "ring-2 ring-saffron-200" : "")
      }
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-[12px] bg-porcelain2 flex items-center justify-center">
          {icon}
        </div>
        {status ? <Badge tone="vert">{status}</Badge> : <Badge tone="neutral">Available</Badge>}
      </div>
      <div className="text-section">{title}</div>
      <div className="text-meta text-ink-500 mt-1 mb-4 flex-1">{body}</div>
      <ConnectDialog
        service={title}
        description={body}
        trigger={
          <Button variant={accent ? "primary" : "secondary"} size="sm" className="self-start">
            {actionLabel}
          </Button>
        }
      />
    </div>
  );
}
