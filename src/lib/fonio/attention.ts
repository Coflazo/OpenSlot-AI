import type { Alert, SlotView } from "./types";

const severityOrder: Record<Alert["severity"], number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

export function buildAttentionAlerts(slots: SlotView[]): Alert[] {
  return slots
    .flatMap((slot) => {
      const alerts: Alert[] = [];

      if (slot.status === "EXPIRED") {
        alerts.push({
          id: `${slot.id}:expired`,
          severity: "danger",
          slotId: slot.id,
          title: `${slot.timeLabel} ${slot.service.name} expired`,
          reason: "Slot start time passed before it was recovered.",
          primaryAction: "Review",
          actionKind: "review",
        });
      }

      if (slot.status === "ESCALATED") {
        alerts.push({
          id: `${slot.id}:escalated`,
          severity: "danger",
          slotId: slot.id,
          title: `${slot.timeLabel} ${slot.service.name} needs receptionist`,
          reason: slot.lastEvent || "Automatic filling stopped.",
          primaryAction: "Open slot",
          actionKind: "open",
        });
      }

      if (slot.status === "OFFERING" && slot.startsInMin <= 30) {
        alerts.push({
          id: `${slot.id}:urgent-offering`,
          severity: "danger",
          slotId: slot.id,
          title: `${slot.timeLabel} ${slot.service.name} expires in ${slot.startsInMin} min`,
          reason:
            slot.waveSize > 1
              ? `Wave widened to ${slot.waveSize}. No acceptance yet.`
              : "One active call wave is still waiting for an answer.",
          primaryAction: "Review",
          actionKind: "review",
        });
      }

      if (slot.status === "BOOKED" && slot.runnerUp?.runnerUps.length) {
        const latestRunnerUp = slot.runnerUp.runnerUps.at(-1);
        alerts.push({
          id: `${slot.id}:runner-up`,
          severity: "warning",
          slotId: slot.id,
          title: `Double accept on ${slot.timeLabel} ${slot.service.name}`,
          reason: `${slot.bookedCustomer?.full_name ?? slot.runnerUp.winner?.full_name ?? "Winner"} booked, ${latestRunnerUp?.patient.full_name ?? "another candidate"} became runner-up.`,
          primaryAction: "Review",
          actionKind: "review",
        });
      }

      if (
        slot.newWavesPaused &&
        slot.status !== "BOOKED" &&
        slot.status !== "EXPIRED" &&
        slot.status !== "ESCALATED"
      ) {
        alerts.push({
          id: `${slot.id}:paused`,
          severity: "info",
          slotId: slot.id,
          title: `${slot.timeLabel} ${slot.service.name} has new waves paused`,
          reason: "Calls already in progress may still complete.",
          primaryAction: "Review",
          actionKind: "review",
        });
      }

      if (slot.status === "OPEN" && slot.startsInMin <= 15) {
        alerts.push({
          id: `${slot.id}:open-soon`,
          severity: "warning",
          slotId: slot.id,
          title: `${slot.timeLabel} ${slot.service.name} starts soon`,
          reason: "Slot is still open with very little runway.",
          primaryAction: "Open slot",
          actionKind: "open",
        });
      }

      return alerts;
    })
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
