import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFonio } from "@/lib/fonio/store";

export function SettingsTab() {
  const { db, pausedNewWaves, togglePausedNewWaves } = useFonio();
  const clinic = db.clinics[0];
  const [aggression, setAggression] = useState(clinic.fill_mode_default);
  const [approveFirst, setApproveFirst] = useState(false);
  const [consentRequired, setConsentRequired] = useState(true);

  useEffect(() => {
    setAggression(clinic.fill_mode_default);
  }, [clinic.fill_mode_default]);

  return (
    <div className="h-full overflow-y-auto bg-background p-5">
      <div className="mx-auto max-w-3xl space-y-5">
        <SettingsCard
          title="Priority rules"
          description="Who gets ranked higher before any slot-specific reasoning."
        >
          <Row label="VIP customers" hint="VIP-tagged customers ranked first when eligible.">
            <Switch defaultChecked />
          </Row>
          <Row
            label="High-value appointment types"
            hint="Prioritize MRI, CT, surgical consult over standard follow-ups."
          >
            <Switch defaultChecked />
          </Row>
          <Row
            label="Provider-specific priority groups"
            hint="Honor per-provider VIP lists set by reception."
          >
            <Switch />
          </Row>
          <Row
            label="Runner-up priority duration"
            hint="How long runner-up priority stays active after being granted."
          >
            <Input className="h-9 w-28" defaultValue="7 days" />
          </Row>
        </SettingsCard>

        <SettingsCard
          title="Contact guardrails"
          description="Hard limits on outreach behavior. Apply regardless of fill mode."
        >
          <Row label="Quiet hours" hint="No calls during these hours.">
            <div className="flex items-center gap-2">
              <Input className="h-9 w-24" defaultValue={clinic.quiet_hours_start ?? ""} />
              <span className="text-xs text-muted-foreground">to</span>
              <Input className="h-9 w-24" defaultValue={clinic.quiet_hours_end ?? ""} />
            </div>
          </Row>
          <Row label="Max contacts per person per week" hint="Across all channels.">
            <Input
              className="h-9 w-20"
              defaultValue={String(clinic.max_contacts_per_patient_per_week)}
            />
          </Row>
          <Row label="Consent required" hint="Skip candidates without explicit outreach consent.">
            <Switch checked={consentRequired} onCheckedChange={setConsentRequired} />
          </Row>
          <Row
            label="Recently-contacted cooldown"
            hint="Minimum hours between calls to the same person."
          >
            <Input className="h-9 w-20" defaultValue="24" />
          </Row>
        </SettingsCard>

        <SettingsCard
          title="Fill aggression"
          description="Sets the overall posture. The system still narrows or widens automatically based on time remaining."
        >
          <div className="grid grid-cols-3 gap-2">
            {(["Patient", "Balanced", "Aggressive"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAggression(m)}
                className={`rounded-md border px-3 py-3 text-left transition-colors ${
                  aggression === m
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-accent/60"
                }`}
              >
                <div className="text-sm font-semibold">{m}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {m === "Patient" && "Fewer simultaneous offers, lower contact pressure."}
                  {m === "Balanced" && "Default recovery mode."}
                  {m === "Aggressive" && "Wider waves near urgent slots."}
                </div>
              </button>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard title="Automation" description="System-wide outreach controls.">
          <Row label="Enable automated outreach" hint="Master switch for the engine.">
            <Switch
              checked={!pausedNewWaves}
              onCheckedChange={() => {
                void togglePausedNewWaves();
              }}
            />
          </Row>
          <Row
            label="Require receptionist approval for first wave"
            hint="Useful for clinics still validating the engine's choices."
          >
            <Switch checked={approveFirst} onCheckedChange={setApproveFirst} />
          </Row>
          <Row
            label="Escalate when less than X minutes remain"
            hint="Automation hands off to reception below this threshold."
          >
            <Input className="h-9 w-20" defaultValue="10" />
          </Row>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
