import { Activity, PauseCircle, PlayCircle, Radio, Menu, X } from "lucide-react";
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
  const { pausedNewWaves, togglePausedNewWaves } = useFonio();
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
        <div
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
            pausedNewWaves
              ? "border-warning/40 bg-warning-soft text-warning-soft-foreground"
              : "border-success/40 bg-success-soft text-success-soft-foreground"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          {pausedNewWaves ? "New waves paused" : "Automation running"}
        </div>
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
