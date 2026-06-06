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
  const { slots, selectedSlotId, selectSlot } = useFonio();
  const sorted = [...slots].sort((a, b) => urgencyRank(a) - urgencyRank(b));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Today board</h2>
          <p className="text-xs text-muted-foreground">Sorted by urgency</p>
        </div>
        <div className="text-xs text-muted-foreground">{slots.length} slots</div>
      </div>
      <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <div className="col-span-1">Time</div>
        <div className="col-span-2">Provider</div>
        <div className="col-span-2">Service</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Outreach</div>
        <div className="col-span-3">Last event</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((s) => {
          const sel = s.id === selectedSlotId;
          const st = statusStyles[s.status];
          return (
            <button
              key={s.id}
              onClick={() => selectSlot(s.id)}
              className={`grid w-full grid-cols-12 items-center gap-2 border-b border-border px-4 py-3 text-left text-sm transition-colors hover:bg-accent/60 ${
                sel ? "bg-accent" : "bg-card"
              }`}
            >
              <div className="col-span-1 flex items-center gap-1.5">
                {s.needsAttention && (
                  <AlertCircle className="h-3.5 w-3.5 text-danger" aria-label="Needs attention" />
                )}
                <span className="font-mono font-medium">{s.timeLabel}</span>
              </div>
              <div className="col-span-2 truncate">{s.provider}</div>
              <div className="col-span-2 truncate text-muted-foreground">{s.service}</div>
              <div className="col-span-2">
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${st.cls}`}
                >
                  {st.label}
                </span>
              </div>
              <div className="col-span-2 flex flex-col text-xs">
                {s.status === "BOOKED" ? (
                  <span className="flex items-center gap-1 text-success-soft-foreground">
                    <User className="h-3 w-3" />
                    {s.bookedCustomer}
                  </span>
                ) : s.status === "ESCALATED" ? (
                  <span className="text-danger-soft-foreground">No eligible candidates</span>
                ) : (
                  <>
                    <span>
                      wave size {s.waveSize} · {s.attempts}/{s.attemptsTotal} attempts
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatRunway(s.startsInMin)}
                    </span>
                  </>
                )}
              </div>
              <div className="col-span-3 truncate text-xs text-muted-foreground">
                {s.status === "BOOKED" && s.recoveredMinBeforeStart
                  ? `Recovered ${s.recoveredMinBeforeStart} min before start`
                  : s.lastEvent}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
