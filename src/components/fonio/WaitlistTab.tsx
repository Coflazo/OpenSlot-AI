import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFonio } from "@/lib/fonio/store";
import type { WaitlistEntry } from "@/lib/fonio/types";

export function WaitlistTab() {
  const { waitlist } = useFonio();
  const [query, setQuery] = useState("");
  const [service, setService] = useState<string>("all");
  const [consent, setConsent] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(waitlist[0]?.id ?? null);

  const services = useMemo(
    () => Array.from(new Set(waitlist.flatMap((w) => w.serviceTypes))),
    [waitlist],
  );

  const filtered = waitlist.filter((w) => {
    if (query && !w.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (service !== "all" && !w.serviceTypes.includes(service)) return false;
    if (consent !== "all" && w.consent !== consent) return false;
    if (priority === "boosted" && !w.priorityBoost) return false;
    return true;
  });

  const selected = waitlist.find((w) => w.id === selectedId) ?? null;

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col border-r border-border">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search waitlist…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <FilterSelect
            value={service}
            onChange={setService}
            label="Service"
            options={[{ v: "all", l: "All services" }, ...services.map((s) => ({ v: s, l: s }))]}
          />
          <FilterSelect
            value={consent}
            onChange={setConsent}
            label="Consent"
            options={[
              { v: "all", l: "Any consent" },
              { v: "granted", l: "Granted" },
              { v: "pending", l: "Pending" },
              { v: "revoked", l: "Revoked" },
            ]}
          />
          <FilterSelect
            value={priority}
            onChange={setPriority}
            label="Priority"
            options={[
              { v: "all", l: "Any priority" },
              { v: "boosted", l: "Has priority boost" },
            ]}
          />
        </div>
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <div className="col-span-3">Candidate</div>
          <div className="col-span-2">Preferred times</div>
          <div className="col-span-2">Services</div>
          <div className="col-span-1">Wait</div>
          <div className="col-span-1">Contacts</div>
          <div className="col-span-2">Priority / eligibility</div>
          <div className="col-span-1">Status</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelectedId(w.id)}
              className={`grid w-full grid-cols-12 items-center gap-2 border-b border-border px-4 py-3 text-left text-sm transition-colors hover:bg-accent/60 ${
                selectedId === w.id ? "bg-accent" : "bg-card"
              }`}
            >
              <div className="col-span-3">
                <div className="font-medium">{w.name}</div>
                <div className="text-xs text-muted-foreground">
                  Last contact: {w.lastContacted ?? "never"}
                </div>
              </div>
              <div className="col-span-2 text-xs">{w.preferredTimes}</div>
              <div className="col-span-2 text-xs text-muted-foreground">
                {w.serviceTypes.join(", ")}
              </div>
              <div className="col-span-1 text-xs">{w.waitDays}d</div>
              <div className="col-span-1 text-xs">
                {w.contactsThisWeek}/{w.contactLimitPerWeek}
              </div>
              <div className="col-span-2 text-xs">
                {w.priorityBoost ? (
                  <Badge className="bg-info-soft text-info-soft-foreground hover:bg-info-soft">
                    {w.priorityBoost.startsWith("VIP") ? "VIP" : "Runner-up"}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">{w.eligibilityNotes}</span>
                )}
              </div>
              <div className="col-span-1">
                <Badge
                  variant="outline"
                  className={
                    w.status === "active"
                      ? "border-success/40 text-success-soft-foreground"
                      : w.status === "paused"
                        ? "border-warning/40 text-warning-soft-foreground"
                        : "border-border text-muted-foreground"
                  }
                >
                  {w.status}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      <CandidateDetail entry={selected} />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { v: string; l: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px] text-sm">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.v} value={o.v}>
            {o.l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CandidateDetail({ entry }: { entry: WaitlistEntry | null }) {
  if (!entry)
    return (
      <aside className="flex w-[360px] items-center justify-center bg-card text-sm text-muted-foreground">
        Select a candidate.
      </aside>
    );
  return (
    <aside className="flex w-[360px] flex-col overflow-y-auto bg-card">
      <div className="border-b border-border px-4 py-4">
        <div className="text-base font-semibold">{entry.name}</div>
        <div className="text-xs text-muted-foreground">
          {entry.serviceTypes.join(", ")} · waited {entry.waitDays}d
        </div>
      </div>
      <div className="space-y-4 p-4 text-sm">
        <Section label="Phone number">
          <div className="font-mono text-base font-semibold">{entry.phone}</div>
        </Section>
        <Section label="Contact preferences">
          <p>Preferred times: {entry.preferredTimes}</p>
          <p>Consent: {entry.consent}</p>
          <p>
            Limit: {entry.contactsThisWeek}/{entry.contactLimitPerWeek} this week
          </p>
        </Section>
        {entry.priorityBoost && (
          <Section label="Priority boost">
            <Badge className="bg-info-soft text-info-soft-foreground hover:bg-info-soft">
              {entry.priorityBoost}
            </Badge>
          </Section>
        )}
        <Section label="Recent contact history">
          {entry.recentContacts?.length ? (
            <ul className="space-y-1.5">
              {entry.recentContacts.map((c, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span>{c.slot}</span>
                  <span className="text-muted-foreground">{c.at}</span>
                  <Badge variant="outline" className="text-xs">
                    {c.outcome.replace("_", " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No recent contacts.</p>
          )}
        </Section>
        <Section label="Runner-up history">
          {entry.runnerUpHistory?.length ? (
            <ul className="space-y-1.5 text-xs">
              {entry.runnerUpHistory.map((r, i) => (
                <li key={i}>
                  <div className="font-medium">{r.slot}</div>
                  <div className="text-muted-foreground">
                    {r.at} — {r.reason}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No runner-up events.</p>
          )}
        </Section>
        <Section label="Upcoming matching opportunities">
          {entry.upcomingMatches?.length ? (
            <ul className="space-y-1 text-xs">
              {entry.upcomingMatches.map((m, i) => (
                <li key={i}>· {m}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No upcoming matches in the next 7 days.</p>
          )}
        </Section>
        <Section label="Eligibility notes">
          <p className="text-xs text-muted-foreground">{entry.eligibilityNotes}</p>
        </Section>
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            Edit preferences
          </Button>
          <Button size="sm" variant="ghost" className="flex-1">
            Pause outreach
          </Button>
        </div>
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </section>
  );
}
