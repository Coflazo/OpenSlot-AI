import type { SlotStatus, CallOutcome } from "./types";

export const statusStyles: Record<SlotStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-info-soft text-info-soft-foreground border-info/30" },
  OFFERING: {
    label: "Offering",
    cls: "bg-warning-soft text-warning-soft-foreground border-warning/40",
  },
  BOOKED: {
    label: "Booked",
    cls: "bg-success-soft text-success-soft-foreground border-success/40",
  },
  ESCALATED: {
    label: "Escalated",
    cls: "bg-danger-soft text-danger-soft-foreground border-danger/40",
  },
  EXPIRED: {
    label: "Expired",
    cls: "bg-neutral-soft text-neutral-soft-foreground border-border",
  },
  PAUSED_NEW_WAVES: {
    label: "Paused",
    cls: "bg-neutral-soft text-neutral-soft-foreground border-border",
  },
};

export const outcomeStyles: Record<CallOutcome, { label: string; cls: string }> = {
  not_contacted: { label: "Not contacted", cls: "bg-muted text-muted-foreground" },
  ringing: { label: "Ringing", cls: "bg-warning-soft text-warning-soft-foreground" },
  no_answer: { label: "No answer", cls: "bg-neutral-soft text-neutral-soft-foreground" },
  declined: { label: "Declined", cls: "bg-danger-soft text-danger-soft-foreground" },
  accepted: { label: "Accepted", cls: "bg-success-soft text-success-soft-foreground" },
  runner_up: { label: "Runner-up", cls: "bg-info-soft text-info-soft-foreground" },
  booked: { label: "Booked", cls: "bg-success text-success-foreground" },
  skipped: { label: "Skipped", cls: "bg-muted text-muted-foreground" },
};

export function formatRunway(min: number) {
  if (min < 0) return "expired";
  if (min < 60) return `${min} min left`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m left`;
}

export function severityCls(sev: "danger" | "warning" | "info") {
  if (sev === "danger") return "border-l-danger bg-danger-soft/40 text-danger-soft-foreground";
  if (sev === "warning") return "border-l-warning bg-warning-soft/40 text-warning-soft-foreground";
  return "border-l-info bg-info-soft/40 text-info-soft-foreground";
}
