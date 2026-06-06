"use client";

import { useStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/primitives/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/primitives/tabs";
import { Switch } from "@/components/primitives/switch";
import { Slider } from "@/components/primitives/slider";
import { Textarea, Label } from "@/components/primitives/input";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { defaultRules } from "@/lib/store/defaultRules";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import type { RuleWeights } from "@/lib/types";

export default function RulesPage() {
  const rules = useStore((s) => s.rules);
  const updateRules = useStore((s) => s.updateRules);
  const updateUpgrade = useStore((s) => s.updateUpgradeWeight);
  const updateWaitlist = useStore((s) => s.updateWaitlistWeight);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-xl tracking-tight">Rules</h1>
        <p className="mt-2 text-body text-ink-500 max-w-2xl">
          Control who gets called, when calls start, and how aggressively open slots are filled.
          Changes apply live to ranking and the cascade engine.
        </p>
      </div>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="aggression">Aggression</TabsTrigger>
          <TabsTrigger value="cascade">Cascade</TabsTrigger>
          <TabsTrigger value="cooldowns">Cooldowns</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="fallbacks">Fallbacks</TabsTrigger>
        </TabsList>

        {/* Eligibility */}
        <TabsContent value="eligibility">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Hard filters</CardTitle>
                  <CardDescription>
                    Hard filters remove customers before scoring. They protect the business from unsafe or invalid bookings.
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="divide-y divide-stone/60">
                <ToggleRow
                  label="Require call consent"
                  value={rules.requireCallConsent}
                  onChange={(v) => updateRules({ requireCallConsent: v })}
                />
                <ToggleRow
                  label="Require complete safety form"
                  value={rules.requireSafetyForm}
                  onChange={(v) => updateRules({ requireSafetyForm: v })}
                />
                <ToggleRow
                  label="Require referral received"
                  value={rules.requireReferral}
                  onChange={(v) => updateRules({ requireReferral: v })}
                />
                <ToggleRow
                  label="Require payment ready"
                  value={rules.requirePaymentReady}
                  onChange={(v) => updateRules({ requirePaymentReady: v })}
                />
                <ToggleRow
                  label="Require authorization approved"
                  value={rules.requireAuthorization}
                  onChange={(v) => updateRules({ requireAuthorization: v })}
                />
                <ToggleRow
                  label="Require matching service type"
                  value={rules.requireServiceMatch}
                  onChange={(v) => updateRules({ requireServiceMatch: v })}
                />
                <ToggleRow
                  label="Require matching location"
                  value={rules.requireLocationMatch}
                  onChange={(v) => updateRules({ requireLocationMatch: v })}
                />
                <ToggleRow
                  label="Require arrival feasibility"
                  value={rules.requireArrivalFeasibility}
                  onChange={(v) => updateRules({ requireArrivalFeasibility: v })}
                />
                <ToggleRow
                  label="Skip recently declined customers"
                  value={rules.skipRecentlyDeclined}
                  onChange={(v) => updateRules({ skipRecentlyDeclined: v })}
                />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    This rule set prioritizes safe, ready, high-intent customers.
                  </CardDescription>
                </div>
              </CardHeader>
              <ul className="text-[13.5px] space-y-2">
                <PreviewItem on={rules.requireCallConsent} text="Customers without call consent are removed before scoring" />
                <PreviewItem on={rules.requireSafetyForm} text="Safety-form-incomplete customers cannot receive MRI offers" />
                <PreviewItem on={rules.requireReferral} text="Referral-missing customers cannot be contacted" />
                <PreviewItem on={rules.requirePaymentReady} text="Payment-not-ready customers cannot be confirmed" />
                <PreviewItem on={rules.requireServiceMatch} text="Offers stay strictly within the requested modality" />
              </ul>
            </Card>
          </div>
        </TabsContent>

        {/* Ranking */}
        <TabsContent value="ranking">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Upgrade candidate ranking</CardTitle>
                  <CardDescription>
                    Booked customers who want earlier slots.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => Object.entries(defaultRules.upgrade).forEach(([k, v]) => updateUpgrade(k as keyof RuleWeights["upgrade"], v))}
                  className="text-ink-500"
                >
                  <ArrowCounterClockwiseIcon size={13} />
                  Reset
                </Button>
              </CardHeader>
              <div className="space-y-4">
                {Object.entries(rules.upgrade).map(([key, value]) => (
                  <WeightSlider
                    key={key}
                    label={titleCase(key)}
                    value={value}
                    onChange={(v) => updateUpgrade(key as keyof RuleWeights["upgrade"], v)}
                    negative={key === "cooldownPenalty"}
                  />
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Pure waitlist ranking</CardTitle>
                  <CardDescription>
                    Customers without a current booking.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => Object.entries(defaultRules.waitlist).forEach(([k, v]) => updateWaitlist(k as keyof RuleWeights["waitlist"], v))}
                  className="text-ink-500"
                >
                  <ArrowCounterClockwiseIcon size={13} />
                  Reset
                </Button>
              </CardHeader>
              <div className="space-y-4">
                {Object.entries(rules.waitlist).map(([key, value]) => (
                  <WeightSlider
                    key={key}
                    label={titleCase(key)}
                    value={value}
                    onChange={(v) => updateWaitlist(key as keyof RuleWeights["waitlist"], v)}
                    negative={key === "cooldownPenalty"}
                  />
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Aggression */}
        <TabsContent value="aggression">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Call aggression</CardTitle>
                <CardDescription>
                  How quickly OpenSlot AI moves through the waitlist as the appointment time gets closer.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AggressionBand title="Calm" body="More than 6 hours left: call 1 candidate at a time." tone="violet" />
              <AggressionBand title="Focused" body="2–6 hours left: call 2 candidates in sequence." tone="peacock" />
              <AggressionBand title="Aggressive" body="30 min–2 hours left: call 3–5 candidates quickly." tone="saffron" />
              <AggressionBand title="Emergency" body="Under 30 minutes left: call up to 10 with slot locking." tone="sienna" />
            </div>
            <div className="mt-4 p-3 rounded-card bg-saffron-50 border border-saffron-200 text-[12.5px] text-saffron-700">
              OpenSlot AI never confirms more than one customer for the same slot.
            </div>
          </Card>
        </TabsContent>

        {/* Cascade */}
        <TabsContent value="cascade">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Cascade behavior</CardTitle>
                  <CardDescription>
                    Controls how booked customers get moved earlier when slots open.
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="divide-y divide-stone/60">
                <ToggleRow
                  label="Call booked customers before pure waitlist"
                  value={rules.cascade.bookedFirst}
                  onChange={(v) =>
                    updateRules({ cascade: { ...rules.cascade, bookedFirst: v } })
                  }
                />
                <ToggleRow
                  label="Skip satisfied customers"
                  value={rules.cascade.skipSatisfied}
                  onChange={(v) =>
                    updateRules({ cascade: { ...rules.cascade, skipSatisfied: v } })
                  }
                />
                <ToggleRow
                  label="Require earlier-notification opt-in"
                  value={rules.cascade.requireOptIn}
                  onChange={(v) =>
                    updateRules({ cascade: { ...rules.cascade, requireOptIn: v } })
                  }
                />
                <ToggleRow
                  label="Ask preference after every successful booking"
                  value={rules.cascade.askPreferenceAfterBooking}
                  onChange={(v) =>
                    updateRules({ cascade: { ...rules.cascade, askPreferenceAfterBooking: v } })
                  }
                />
              </div>
            </Card>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Cascade limits</CardTitle>
                  <CardDescription>Prevent runaway chains.</CardDescription>
                </div>
              </CardHeader>
              <div className="space-y-5">
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <Label>Maximum cascade depth</Label>
                    <span className="font-mono tabular-nums text-[13px] font-[700]">
                      {rules.cascade.maxDepth}
                    </span>
                  </div>
                  <Slider
                    value={[rules.cascade.maxDepth]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={([v]) =>
                      updateRules({ cascade: { ...rules.cascade, maxDepth: v } })
                    }
                  />
                  <p className="text-meta text-ink-400 mt-1">
                    After {rules.cascade.maxDepth} hops, the engine falls back to pure waitlist.
                  </p>
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <Label>Minimum earlier gain (days)</Label>
                    <span className="font-mono tabular-nums text-[13px] font-[700]">
                      {rules.cascade.minEarlierGainDays}
                    </span>
                  </div>
                  <Slider
                    value={[rules.cascade.minEarlierGainDays]}
                    min={0}
                    max={30}
                    step={1}
                    onValueChange={([v]) =>
                      updateRules({ cascade: { ...rules.cascade, minEarlierGainDays: v } })
                    }
                  />
                  <p className="text-meta text-ink-400 mt-1">
                    Skip offering a customer a slot less than {rules.cascade.minEarlierGainDays} day(s) earlier than their current booking.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Cooldowns */}
        <TabsContent value="cooldowns">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Contact cooldowns</CardTitle>
                <CardDescription>
                  Avoid annoying customers with repeated outreach.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CooldownBand label="Same hour" value="100% penalty" />
              <CooldownBand label="Within 6 hours" value="70% penalty" />
              <CooldownBand label="Same day" value="40% penalty" />
              <CooldownBand label="3 days" value="15% penalty" />
              <CooldownBand label="7+ days" value="0% penalty" />
              <CooldownBand label="After decline" value="48h block" />
            </div>
          </Card>
        </TabsContent>

        {/* Scripts */}
        <TabsContent value="scripts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScriptCard
              label="Waitlist opening"
              value={rules.scripts.waitlistOpening}
              onChange={(v) => updateRules({ scripts: { ...rules.scripts, waitlistOpening: v } })}
            />
            <ScriptCard
              label="Upgrade opening"
              value={rules.scripts.upgradeOpening}
              onChange={(v) => updateRules({ scripts: { ...rules.scripts, upgradeOpening: v } })}
            />
            <ScriptCard
              label="Confirmation"
              value={rules.scripts.confirmation}
              onChange={(v) => updateRules({ scripts: { ...rules.scripts, confirmation: v } })}
            />
            <ScriptCard
              label="Voicemail"
              value={rules.scripts.voicemail}
              onChange={(v) => updateRules({ scripts: { ...rules.scripts, voicemail: v } })}
            />
            <ScriptCard
              label="Wrong person"
              value={rules.scripts.wrongPerson}
              onChange={(v) => updateRules({ scripts: { ...rules.scripts, wrongPerson: v } })}
            />
            <ScriptCard
              label="Preference question"
              value={rules.scripts.preferenceQuestion}
              onChange={(v) => updateRules({ scripts: { ...rules.scripts, preferenceQuestion: v } })}
            />
          </div>
        </TabsContent>

        {/* Fallbacks */}
        <TabsContent value="fallbacks">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Fallback policy</CardTitle>
                <CardDescription>What to do when the cascade does not produce a fill.</CardDescription>
              </div>
            </CardHeader>
            <ul className="space-y-2 text-[13.5px]">
              <li className="flex items-start gap-2"><span className="font-mono text-[12px] text-violet">01</span><span>Notify the on-call receptionist via SMS.</span></li>
              <li className="flex items-start gap-2"><span className="font-mono text-[12px] text-violet">02</span><span>Push the slot back into the public waitlist with a deeper expiry buffer.</span></li>
              <li className="flex items-start gap-2"><span className="font-mono text-[12px] text-violet">03</span><span>Hold the slot for 10 minutes for manual re-assignment.</span></li>
              <li className="flex items-start gap-2"><span className="font-mono text-[12px] text-violet">04</span><span>Mark expired if no resolution; log to audit and dashboards.</span></li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13.5px]">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function PreviewItem({ on, text }: { on: boolean; text: string }) {
  return (
    <li className={"flex gap-2 " + (on ? "text-ink" : "text-ink-300 line-through")}>
      <span className={"h-1.5 w-1.5 rounded-full mt-2 " + (on ? "bg-peacock" : "bg-stone2")} />
      <span>{text}</span>
    </li>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
  negative
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  negative?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <Label className={negative ? "text-sienna-700" : undefined}>{label}</Label>
        <span className="font-mono tabular-nums text-[12.5px] font-[700] text-ink">
          {negative ? "−" : ""}
          {Math.round(value * 100)}%
        </span>
      </div>
      <Slider
        value={[value * 100]}
        min={0}
        max={50}
        step={1}
        onValueChange={([v]) => onChange(v / 100)}
      />
    </div>
  );
}

function AggressionBand({ title, body, tone }: { title: string; body: string; tone: "peacock" | "violet" | "saffron" | "sienna" }) {
  const toneRing: Record<string, string> = {
    peacock: "ring-peacock-200 bg-peacock-50",
    violet: "ring-violet-100 bg-violet-50",
    saffron: "ring-saffron-200 bg-saffron-50",
    sienna: "ring-sienna-200 bg-sienna-50"
  };
  return (
    <div className={"rounded-card p-4 ring-1 " + toneRing[tone]}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[13px] font-[700]">{title}</span>
        <Badge tone={tone}>{tone}</Badge>
      </div>
      <div className="text-meta text-ink-500">{body}</div>
    </div>
  );
}

function CooldownBand({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-stone p-3 flex items-baseline justify-between">
      <span className="text-[13px]">{label}</span>
      <span className="font-mono tabular-nums text-[12.5px] font-[700] text-sienna-700">{value}</span>
    </div>
  );
}

const SCRIPT_VARS = [
  "customer_name",
  "business_name",
  "service_name",
  "slot_time",
  "current_slot_time",
  "new_slot_time",
  "arrival_time"
];

function ScriptCard({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  function insert(v: string) {
    onChange(`${value}{{${v}}}`);
  }
  return (
    <div className="rounded-card bg-white shadow-card p-4">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 min-h-[100px] font-mono text-[12.5px] leading-[18px]"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700] mr-1">
          Insert
        </span>
        {SCRIPT_VARS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insert(v)}
            className="px-2 py-0.5 rounded-chip bg-violet-50 text-violet-700 text-[11px] font-mono font-[600] hover:bg-violet-100 transition"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function titleCase(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (m) => m.toUpperCase());
}
