import { describe, expect, it } from "vitest";

import { buildAttentionAlerts } from "../attention";
import { buildSlotViews, createOpenSlotDbFromLegacy } from "../db-state";
import { initialSlots } from "../mock-data";

describe("buildAttentionAlerts", () => {
  it("derives urgent offering, escalation, and runner-up alerts from slot state", () => {
    const alerts = buildAttentionAlerts(buildSlotViews(createOpenSlotDbFromLegacy(cloneSlots())));
    const ids = alerts.map((alert) => alert.id);

    expect(ids).toContain("s-1030:urgent-offering");
    expect(ids).toContain("s-1100:escalated");
    expect(ids).toContain("s-1130:runner-up");
  });

  it("drops runner-up alerts once the slot is no longer booked", () => {
    const slots = cloneSlots().map((slot) =>
      slot.id === "s-1130" ? { ...slot, status: "OPEN" as const } : slot,
    );

    expect(
      buildAttentionAlerts(buildSlotViews(createOpenSlotDbFromLegacy(slots))).map(
        (alert) => alert.id,
      ),
    ).not.toContain("s-1130:runner-up");
  });

  it("surfaces paused active slots without marking them as expired or escalated", () => {
    const slots = cloneSlots().map((slot) =>
      slot.id === "s-1200" ? { ...slot, newWavesPaused: true } : slot,
    );

    const alerts = buildAttentionAlerts(
      buildSlotViews(createOpenSlotDbFromLegacy(slots)).filter((slot) => slot.id === "s-1200"),
    );

    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe("s-1200:paused");
    expect(alerts[0].severity).toBe("info");
  });
});

function cloneSlots() {
  return JSON.parse(JSON.stringify(initialSlots)) as typeof initialSlots;
}
