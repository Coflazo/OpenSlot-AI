import { useState } from "react";
import {
  PhoneCall,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  XCircle,
  Info,
  Radio,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFonio } from "@/lib/fonio/store";
import { outcomeStyles, statusStyles, formatRunway } from "@/lib/fonio/ui";
import { toast } from "sonner";
import type { SlotView } from "@/lib/fonio/types";

export function SlotDetailPanel() {
  const {
    slots,
    selectedSlotId,
    setSlotPaused,
    callNextCandidate,
    manualBook,
    escalate,
    cancelAndReopen,
  } = useFonio();
  const slot = slots.find((s) => s.id === selectedSlotId);

  if (!slot) {
    return (
      <div
        id="slot-detail-panel"
        tabIndex={-1}
        className="flex min-h-[calc(100vh-6rem)] scroll-mt-3 items-center justify-center p-8 text-sm text-muted-foreground 2xl:h-full 2xl:min-h-0"
      >
        Select a slot to see operational detail.
      </div>
    );
  }

  const st = statusStyles[slot.status];
  const paused = slot.newWavesPaused === true || slot.status === "PAUSED_NEW_WAVES";

  const onManualBook = async (name: string) => {
    try {
      const r = await manualBook(slot.id, name);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Manual booking failed.");
    }
  };

  return (
    <div
      id="slot-detail-panel"
      tabIndex={-1}
      className="flex min-h-[calc(100vh-6rem)] scroll-mt-3 flex-col bg-card 2xl:h-full 2xl:min-h-0 2xl:overflow-y-auto"
    >
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-semibold">{slot.timeLabel}</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm font-medium">{slot.provider.display_name}</span>
              <span className="text-sm text-muted-foreground">· {slot.service.name}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${st.cls}`}
              >
                {st.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRunway(slot.startsInMin)}
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Fill mode: {slot.fillMode}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <ReasoningCard slot={slot} />
        {slot.activeWave && <ActiveWavePanel slot={slot} />}
        {slot.runnerUp && <RunnerUpPanel slot={slot} />}
        <ActionsBar
          slot={slot}
          paused={paused}
          onPause={async () => {
            const response = await setSlotPaused(slot.id, !paused);
            if (response.ok) toast.success(response.message);
            else toast.error(response.message);
          }}
          onCallNext={async () => {
            const response = await callNextCandidate(slot.id);
            if (response.ok) toast.success(response.message);
            else toast.error(response.message);
          }}
          onManualBook={onManualBook}
          onEscalate={async () => {
            const response = await escalate(slot.id);
            if (response.ok) toast.message(response.message);
            else toast.error(response.message);
          }}
          onCancelReopen={async () => {
            const response = await cancelAndReopen(slot.id);
            if (response.ok) toast.message(response.message);
            else toast.error(response.message);
          }}
        />
        <Timeline slot={slot} />
        <CandidatesTable slot={slot} onManualBook={onManualBook} />
      </div>
    </div>
  );
}

function ReasoningCard({ slot }: { slot: SlotView }) {
  return (
    <section className="rounded-md border border-border bg-background p-4">
      <div className="mb-2 flex items-center gap-2">
        <Info className="h-4 w-4 text-info" />
        <h3 className="text-sm font-semibold">Why the system is doing this</h3>
      </div>
      <p className="text-sm leading-relaxed">{slot.reasoning}</p>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          Recent response rate:{" "}
          <span className="text-foreground">{slot.qualitative.responseRate}</span>
        </span>
        <span>
          Fill confidence:{" "}
          <span className="text-foreground">{slot.qualitative.fillConfidence}</span>
        </span>
      </div>
    </section>
  );
}

function ActiveWavePanel({ slot }: { slot: SlotView }) {
  const w = slot.activeWave!;
  return (
    <section className="rounded-md border border-warning/30 bg-warning-soft/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-warning-soft-foreground" />
          <h3 className="text-sm font-semibold">
            Active wave #{w.number} · size {w.size}
          </h3>
        </div>
        <span className="font-mono text-xs text-warning-soft-foreground">
          times out in {w.timeoutSec}s
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {w.candidates.map((c, i) => {
          const o = outcomeStyles[c.state];
          return (
            <div key={i} className="rounded border border-border bg-card px-3 py-2">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-xs ${o.cls}`}>
                {o.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RunnerUpPanel({ slot }: { slot: SlotView }) {
  const r = slot.runnerUp!;
  return (
    <section className="rounded-md border border-info/30 bg-info-soft/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-info-soft-foreground" />
        <h3 className="text-sm font-semibold">Runner-up resolution</h3>
      </div>
      <p className="text-sm leading-relaxed">{r.note}</p>
      <div className="mt-3 space-y-1.5 text-xs">
        <div>
          <span className="text-muted-foreground">Winner:</span>{" "}
          <span className="font-medium">{r.winner?.full_name ?? "Unknown winner"}</span>
        </div>
        {r.runnerUps.map((u) => (
          <div
            key={u.patient.id}
            className="flex items-center justify-between rounded border border-border bg-card px-2 py-1.5"
          >
            <span className="font-medium">{u.patient.full_name}</span>
            <span className="text-muted-foreground">{u.messageStatus}</span>
            <span className="rounded bg-info-soft px-1.5 py-0.5 text-info-soft-foreground">
              {u.priorityActive ? "Priority active" : "Priority expired"}
            </span>
          </div>
        ))}
        <p className="pt-1 text-muted-foreground">
          Priority is for the next eligible matching slot — not a guarantee.
        </p>
      </div>
    </section>
  );
}

function ActionsBar({
  slot,
  paused,
  onPause,
  onCallNext,
  onManualBook,
  onEscalate,
  onCancelReopen,
}: {
  slot: SlotView;
  paused: boolean;
  onPause: () => Promise<void>;
  onCallNext: () => Promise<void>;
  onManualBook: (name: string) => Promise<void>;
  onEscalate: () => Promise<void>;
  onCancelReopen: () => Promise<void>;
}) {
  const [bookOpen, setBookOpen] = useState(false);
  const [manualName, setManualName] = useState("");

  return (
    <section className="rounded-md border border-border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold">Manual actions</h3>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onPause}>
          {paused ? (
            <>
              <PlayCircle className="h-4 w-4" /> Resume new waves
            </>
          ) : (
            <>
              <PauseCircle className="h-4 w-4" /> Pause new waves
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCallNext}
          disabled={slot.status === "BOOKED" || slot.status === "EXPIRED"}
        >
          <PhoneCall className="h-4 w-4" /> Call next candidate
        </Button>

        <AlertDialog open={bookOpen} onOpenChange={setBookOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              Book manually
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Attempt manual booking</AlertDialogTitle>
              <AlertDialogDescription>
                This attempts to book the slot. If the automation already booked it, the attempt
                will fail with a conflict.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Customer name"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (manualName.trim()) void onManualBook(manualName.trim());
                  setManualName("");
                }}
              >
                Attempt booking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button size="sm" variant="outline" onClick={onEscalate}>
          <ShieldAlert className="h-4 w-4" /> Escalate to receptionist
        </Button>

        {slot.status === "BOOKED" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <XCircle className="h-4 w-4" /> Cancel booking and reopen slot
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel booking and reopen slot?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will cancel the current booking, notify the booked customer, and reopen the
                  slot for outreach.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep booking</AlertDialogCancel>
                <AlertDialogAction onClick={() => void onCancelReopen()}>
                  Cancel and reopen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Pausing stops future call waves. Calls already ringing or in progress may still complete.
      </p>
    </section>
  );
}

function Timeline({ slot }: { slot: Slot }) {
  return (
    <section className="rounded-md border border-border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
      <ol className="space-y-2">
        {slot.timeline.map((e) => (
          <li key={e.id} className="flex gap-3 text-xs">
            <span className="w-12 shrink-0 font-mono text-muted-foreground">{e.at}</span>
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
            <span className="leading-relaxed">{e.message}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CandidatesTable({
  slot,
  onManualBook,
}: {
  slot: SlotView;
  onManualBook: (name: string) => Promise<void>;
}) {
  return (
    <section className="rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Candidate ranking</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">Candidate</th>
              <th className="px-3 py-2 text-left font-medium">Match reason</th>
              <th className="px-3 py-2 text-left font-medium">Wait</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Last contact</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {slot.candidates.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No candidates ranked for this slot.
                </td>
              </tr>
            )}
            {slot.candidates.map((c) => {
              const o = outcomeStyles[c.contactStatus];
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{c.rank}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{c.patient.full_name}</span>
                      {c.runnerUpBoost && (
                        <span className="text-xs text-info-soft-foreground">
                          Runner-up priority active
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.matchReason}</td>
                  <td className="px-3 py-2 text-xs">{c.waitDays}d</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs ${o.cls}`}>
                      {o.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.lastContacted ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      disabled={!c.eligible || slot.status === "BOOKED"}
                      onClick={() => void onManualBook(c.patient.full_name)}
                    >
                      Book
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Separator />
      <p className="px-4 py-2 text-xs text-muted-foreground">
        Skip reasons are honest: quiet hours, contact limits, not eligible, consent missing.
      </p>
    </section>
  );
}
