import { useState } from "react";
import {
  Activity,
  Database,
  FlaskConical,
  PauseCircle,
  PlayCircle,
  Radio,
  Menu,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useFonio } from "@/lib/fonio/store";
import { workspaceName } from "@/lib/fonio/mock-data";

export function TopBar({
  sidebarOpen,
  setSidebarOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) {
  const {
    pausedNewWaves,
    simulationMode,
    simulationRunning,
    simulationDay,
    simulationTotalDays,
    togglePausedNewWaves,
    resetDemoState,
    runFourWeekSimulation,
    pauseSimulation,
    syncLiveState,
  } = useFonio();
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="h-8 w-8 p-0 lg:hidden"
        title="Toggle menu"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Radio className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Fonio</span>
      </div>
      <div className="h-6 w-px bg-border" />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{workspaceName}</span>
        <span className="text-xs text-muted-foreground">{today}</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Button
          size="sm"
          variant={simulationMode ? "default" : "outline"}
          onClick={() => {
            const response = runFourWeekSimulation();
            if (response.ok) toast.success(response.message);
            else toast.error(response.message);
          }}
          title="Load a local four-week simulation without placing Fonio calls"
        >
          <FlaskConical className="h-4 w-4" />
          <span className="hidden xl:inline">4-week sim</span>
        </Button>
        {simulationMode && (
          <Button
            size="sm"
            variant="outline"
            onClick={pauseSimulation}
            title="Pause or resume the four-week simulation playback"
          >
            {simulationRunning ? (
              <>
                <PauseCircle className="h-4 w-4" />
                <span className="hidden xl:inline">Pause sim</span>
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                <span className="hidden xl:inline">Resume sim</span>
              </>
            )}
          </Button>
        )}
        {simulationMode && (
          <Button
            size="sm"
            variant="outline"
            disabled={isSyncingLive}
            onClick={async () => {
              setIsSyncingLive(true);
              try {
                const response = await syncLiveState();
                if (response.ok) toast.success(response.message);
                else toast.error(response.message);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not sync live state.");
              } finally {
                setIsSyncingLive(false);
              }
            }}
            title="Return to live Supabase/Fonio dashboard state"
          >
            <Database className={`h-4 w-4 ${isSyncingLive ? "animate-pulse" : ""}`} />
            <span className="hidden xl:inline">Live data</span>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={isResetting}
          onClick={async () => {
            if (
              !window.confirm(
                "Reset demo state? This clears bookings and call attempts, reactivates the waitlist, and opens all offerable slots.",
              )
            ) {
              return;
            }

            setIsResetting(true);
            try {
              const response = await resetDemoState();
              if (response.ok) toast.success(response.message);
              else toast.error(response.message);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not reset demo state.");
            } finally {
              setIsResetting(false);
            }
          }}
          title="Clear demo call and booking state, then reopen slots for offering"
        >
          <RefreshCw className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
          <span className="hidden xl:inline">Reset demo</span>
        </Button>
        <div
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
            simulationMode
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
              : pausedNewWaves
                ? "border-warning/40 bg-warning-soft text-warning-soft-foreground"
                : "border-success/40 bg-success-soft text-success-soft-foreground"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          {simulationMode
            ? "Simulation mode"
            : pausedNewWaves
              ? "New waves paused"
              : "Automation running"}
        </div>
        {simulationMode && (
          <div className="hidden min-w-[112px] flex-col gap-1 xl:flex">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Replay</span>
              <span>
                {simulationDay}/{simulationTotalDays}d
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((simulationDay / simulationTotalDays) * 100)}%` }}
              />
            </div>
          </div>
        )}
        <Button
          size="sm"
          variant={pausedNewWaves ? "default" : "outline"}
          onClick={async () => {
            try {
              const response = await togglePausedNewWaves();
              if (response.ok) toast.success(response.message);
              else toast.error(response.message);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update wave pause.");
            }
          }}
          title={
            pausedNewWaves
              ? "Resume dispatching new call waves"
              : "Stops future call waves. Calls already ringing or in progress may still finish."
          }
        >
          {pausedNewWaves ? (
            <>
              <PlayCircle className="h-4 w-4" /> Resume new waves
            </>
          ) : (
            <>
              <PauseCircle className="h-4 w-4" /> Pause new waves
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
