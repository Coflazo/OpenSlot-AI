import { AlertTriangle, ArrowUpRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFonio } from "@/lib/fonio/store";
import type { Alert } from "@/lib/fonio/types";
import { severityCls } from "@/lib/fonio/ui";

export function AttentionRail({
  onOpenSlot,
}: {
  onOpenSlot: (slotId: string, actionKind: Alert["actionKind"]) => void;
}) {
  const { alerts, dismissAlert, simulationMode, simulationLogs } = useFonio();

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-border bg-card 2xl:h-full 2xl:w-[340px] 2xl:border-l 2xl:border-t-0">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Attention rail</h2>
        <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {alerts.length}
        </span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {simulationMode && (
          <div className="rounded-md border border-border bg-background">
            <div className="border-b border-border px-3 py-2">
              <p className="text-xs font-semibold">Simulation log</p>
              <p className="text-[11px] text-muted-foreground">
                Fast replay of ranking, calls, and bookings
              </p>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto p-3">
              {simulationLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-primary/50 pl-2">
                  <div className="text-[11px] font-medium text-muted-foreground">{log.at}</div>
                  <div className="text-xs leading-snug">{log.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {alerts.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            No urgent items. Automation is handling the queue.
          </p>
        )}
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`rounded-md border border-border border-l-4 p-3 ${severityCls(a.severity)}`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight">{a.title}</p>
                <p className="mt-1 text-xs leading-snug opacity-90">{a.reason}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => dismissAlert(a.id)}
              >
                Dismiss
              </Button>
              {a.slotId && (
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onOpenSlot(a.slotId!, a.actionKind)}
                >
                  {a.primaryAction}
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
