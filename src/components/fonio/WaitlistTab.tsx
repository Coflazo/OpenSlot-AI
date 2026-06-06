import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight, X, Phone, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
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
import type { WaitlistView } from "@/lib/fonio/types";

export function WaitlistTab() {
  const { waitlist } = useFonio();
  const [query, setQuery] = useState("");
  const [service, setService] = useState<string>("all");
  const [consent, setConsent] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(waitlist[0]?.id ?? null);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    if (!waitlist.length) {
      setSelectedId(null);
      return;
    }

    setSelectedId((current) =>
      current && waitlist.some((entry) => entry.id === current) ? current : waitlist[0].id,
    );
  }, [waitlist]);

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
    <div className="flex h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 relative">
      {/* Main List */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Waitlist</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="h-10 pl-10 text-sm border-slate-200 dark:border-slate-600"
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
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 sticky top-0">
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Services</div>
          <div className="col-span-1 text-center">Wait</div>
          <div className="col-span-2 text-center">Contacts</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2 text-center">Status</div>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              No candidates found
            </div>
          ) : (
            filtered.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedId(w.id)}
                className={`grid grid-cols-12 gap-4 w-full items-center text-left transition-colors border-b border-slate-200 dark:border-slate-700 px-6 py-3 ${
                  selectedId === w.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                    : "bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="col-span-3">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">
                    {w.name}
                  </div>
                </div>
                <div className="col-span-2 text-xs text-slate-600 dark:text-slate-400">
                  {w.serviceTypes.join(", ")}
                </div>
                <div className="col-span-1 text-xs text-center font-semibold text-slate-700 dark:text-slate-300">
                  {w.waitDays}d
                </div>
                <div className="col-span-2 text-xs text-center text-slate-600 dark:text-slate-400">
                  {w.contactsThisWeek}/{w.contactLimitPerWeek}
                </div>
                <div className="col-span-2">
                  {w.priorityBoost ? (
                    <Badge className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                      {w.priorityBoost}
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">Standard</span>
                  )}
                </div>
                <div className="col-span-2 text-center">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      w.status === "active"
                        ? "border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                        : w.status === "paused"
                          ? "border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
                          : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {w.status}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Side Panel - Collapsible */}
      <CandidateDetail entry={selected} isOpen={panelOpen} onToggle={() => setPanelOpen(!panelOpen)} />
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

function CandidateDetail({
  entry,
  isOpen,
  onToggle,
}: {
  entry: WaitlistView | null;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Collapsed Panel Tab */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-l-lg px-2 py-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Open patient details"
        >
          <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      )}

      {/* Side Panel */}
      <aside
        className={`flex flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all duration-300 overflow-hidden ${
          isOpen ? "w-[420px]" : "w-0"
        }`}
      >
      {/* Toggle Button */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {entry ? "Patient Details" : "Select a patient"}
        </h3>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400 rotate-180" />
        </button>
      </div>

      {/* Content */}
      {!entry ? (
        <div className="flex items-center justify-center flex-1 text-slate-500 dark:text-slate-400">
          <p className="text-sm">Select a patient to view details</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            {/* Header */}
            <div>
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <span className="text-blue-700 dark:text-blue-300 font-semibold text-sm">
                    {entry.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg text-slate-900 dark:text-white">{entry.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Waiting {entry.waitDays} days
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <Section label="Contact Information" icon={Phone}>
              <div className="font-mono text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {entry.phone}
              </div>
              {entry.email && (
                <div className="text-sm text-slate-600 dark:text-slate-400">{entry.email}</div>
              )}
            </Section>

            {/* Services */}
            <Section label="Services" icon={Calendar}>
              <div className="flex flex-wrap gap-2">
                {entry.serviceTypes.map((service) => (
                  <Badge key={service} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                    {service}
                  </Badge>
                ))}
              </div>
            </Section>

            {/* Status */}
            <Section label="Consent & Eligibility">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Voice Consent:</span>
                  <Badge
                    className={`text-xs ${
                      entry.consent === "granted"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                    }`}
                  >
                    {entry.consent}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">This Week:</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {entry.contactsThisWeek}/{entry.contactLimitPerWeek} contacts
                  </span>
                </div>
              </div>
            </Section>

            {/* Priority */}
            {entry.priorityBoost && (
              <Section label="Priority Status">
                <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                  {entry.priorityBoost}
                </Badge>
              </Section>
            )}

            {/* Recent Contacts */}
            {entry.recentContacts?.length ? (
              <Section label="Recent Calls">
                <div className="space-y-2">
                  {entry.recentContacts.slice(0, 3).map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded text-xs"
                    >
                      <div className="flex-1">
                        <div className="text-slate-900 dark:text-white font-medium">{c.at}</div>
                        <div className="text-slate-500 dark:text-slate-400">{c.slot}</div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          c.outcome === "accepted"
                            ? "border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                            : c.outcome === "declined"
                              ? "border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                              : "border-slate-200 dark:border-slate-600"
                        }`}
                      >
                        {c.outcome.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        </div>
      )}
    </aside>
    </>
  );
}

function Section({
  label,
  children,
  icon: Icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </div>
      {children}
    </section>
  );
}
