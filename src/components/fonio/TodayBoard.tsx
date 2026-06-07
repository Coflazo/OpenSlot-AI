import { AlertCircle, Clock, User } from "lucide-react";
import { useFonio } from "@/lib/fonio/store";
import { formatRunway, statusStyles } from "@/lib/fonio/ui";

const urgencyRank = (s: ReturnType<typeof useFonio>["slots"][number]) => {
  if (s.status === "ESCALATED") return 0;
  if (s.status === "OFFERING" && s.startsInMin < 30) return 1;
  if (s.status === "OFFERING") return 2;
  if (s.status === "OPEN") return 3;
  if (s.status === "PAUSED_NEW_WAVES") return 4;
  if (s.status === "BOOKED") return 5;
  return 6;
};

export function TodayBoard() {
  const { slots, selectedSlotId, selectSlot, simulationMode } = useFonio();
  const sorted = [...slots].sort((a, b) => urgencyRank(a) - urgencyRank(b));

  return (
    <div className="flex min-w-0 flex-col bg-card 2xl:h-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">
            {simulationMode ? "4-week simulation board" : "Today board"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {simulationMode ? "Date, day, and time across the simulated run" : "Sorted by urgency"}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">{slots.length} slots</div>
      </div>
      <div className="hidden grid-cols-[156px_minmax(136px,1fr)_minmax(116px,0.9fr)_128px_minmax(158px,1.05fr)_minmax(160px,1.2fr)] gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:grid">
        <div>Date / time</div>
        <div>Provider</div>
        <div>Service</div>
        <div>Status</div>
        <div>Outreach</div>
        <div>Last event</div>
      </div>
      <div className="2xl:flex-1 2xl:overflow-y-auto">
        {sorted.map((s) => {
          const sel = s.id === selectedSlotId;
          const st = statusStyles[s.status];
          return (
            <button
              key={s.id}
              onClick={() => selectSlot(s.id)}
              className={`w-full border-b border-border px-4 py-3 text-left text-sm transition-colors hover:bg-accent/60 lg:grid lg:grid-cols-[156px_minmax(136px,1fr)_minmax(116px,0.9fr)_128px_minmax(158px,1.05fr)_minmax(160px,1.2fr)] lg:items-center lg:gap-3 ${
                sel ? "bg-accent" : "bg-card"
              }`}
            >
              <div className="flex min-w-0 flex-col gap-3 lg:hidden">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {s.needsAttention && (
                      <AlertCircle
                        className="h-3.5 w-3.5 shrink-0 text-danger"
                        aria-label="Needs attention"
                      />
                    )}
                    <SlotDateTime slot={s} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{s.provider.display_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.service.name}</div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-xs ${st.cls}`}
                  >
                    {st.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="text-muted-foreground">Outreach</div>
                    <OutreachSummary slot={s} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-muted-foreground">Last event</div>
                    <LastEvent slot={s} />
                  </div>
                </div>
              </div>

              <div className="hidden min-w-0 items-center gap-1.5 lg:flex">
                {s.needsAttention && (
                  <AlertCircle
                    className="h-3.5 w-3.5 shrink-0 text-danger"
                    aria-label="Needs attention"
                  />
                )}
                <SlotDateTime slot={s} compact />
              </div>
              <div className="hidden min-w-0 truncate lg:block">{s.provider.display_name}</div>
              <div className="hidden min-w-0 truncate text-muted-foreground lg:block">
                {s.service.name}
              </div>
              <div className="hidden min-w-0 lg:block">
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${st.cls}`}
                >
                  {st.label}
                </span>
              </div>
              <div className="hidden min-w-0 text-xs lg:block">
                <OutreachSummary slot={s} />
              </div>
              <div className="hidden min-w-0 text-xs text-muted-foreground lg:block">
                <LastEvent slot={s} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlotDateTime({
  slot,
  compact = false,
}: {
  slot: ReturnType<typeof useFonio>["slots"][number];
  compact?: boolean;
}) {
  const date = new Date(slot.row.starts_at);
  const day = new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  const monthDay = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);

  if (compact) {
    return (
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-xs text-muted-foreground">
          {day}, {monthDay}
        </span>
        <span className="font-mono font-medium tabular-nums">{slot.timeLabel}</span>
      </span>
    );
  }

  return (
    <span className="flex shrink-0 flex-col leading-tight">
      <span className="text-xs text-muted-foreground">
        {day}, {monthDay}
      </span>
      <span className="font-mono font-medium tabular-nums">{slot.timeLabel}</span>
    </span>
  );
}

function OutreachSummary({ slot }: { slot: ReturnType<typeof useFonio>["slots"][number] }) {
  if (slot.status === "BOOKED") {
    return (
      <span className="flex min-w-0 items-center gap-1 text-success-soft-foreground">
        <User className="h-3 w-3 shrink-0" />
        <span className="truncate">{slot.bookedCustomer?.full_name}</span>
      </span>
    );
  }

  if (slot.status === "ESCALATED") {
    return <span className="text-danger-soft-foreground">No eligible candidates</span>;
  }

  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">
        wave size {slot.waveSize} · {slot.attempts}/{slot.attemptsTotal} attempts
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" />
        <span className="truncate">{formatRunway(slot.startsInMin)}</span>
      </span>
    </span>
  );
}

function LastEvent({ slot }: { slot: ReturnType<typeof useFonio>["slots"][number] }) {
  return (
    <span className="block truncate text-muted-foreground">
      {slot.status === "BOOKED" && slot.recoveredMinBeforeStart
        ? `Recovered ${slot.recoveredMinBeforeStart} min before start`
        : slot.lastEvent}
    </span>
  );
}
