import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { fonioApi } from "./api-client";
import { buildAttentionAlerts } from "./attention";
import { buildSlotViews, buildWaitlistViews, createOpenSlotDbFromLegacy } from "./db-state";
import { initialSlots, initialWaitlist } from "./mock-data";
import { buildFourWeekSimulationState } from "./simulation";
import type { Alert, OpenSlotDbState, Slot, SlotView, WaitlistEntry, WaitlistView } from "./types";

const LIVE_REFRESH_MS = 3_000;

interface FonioContextValue {
  db: OpenSlotDbState;
  slots: SlotView[];
  alerts: Alert[];
  waitlist: WaitlistView[];
  selectedSlotId: string | null;
  selectSlot: (id: string | null) => void;
  pausedNewWaves: boolean;
  simulationMode: boolean;
  simulationRunning: boolean;
  simulationDay: number;
  simulationTotalDays: number;
  simulationLogs: { id: string; at: string; message: string }[];
  runFourWeekSimulation: () => { ok: boolean; message: string };
  pauseSimulation: () => void;
  syncLiveState: () => Promise<{ ok: boolean; message: string }>;
  togglePausedNewWaves: () => Promise<{ ok: boolean; message: string }>;
  setSlotPaused: (id: string, paused: boolean) => Promise<{ ok: boolean; message: string }>;
  callNextCandidate: (id: string) => Promise<{ ok: boolean; message: string }>;
  manualBook: (slotId: string, candidateName: string) => Promise<{ ok: boolean; message: string }>;
  escalate: (slotId: string) => Promise<{ ok: boolean; message: string }>;
  cancelAndReopen: (slotId: string) => Promise<{ ok: boolean; message: string }>;
  resetDemoState: () => Promise<{ ok: boolean; message: string }>;
  dismissAlert: (id: string) => void;
}

const FonioContext = createContext<FonioContextValue | null>(null);

export function FonioProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<OpenSlotDbState>(() =>
    createOpenSlotDbFromLegacy(initialSlots, initialWaitlist),
  );
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => new Set());
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>("s-1030");
  const [pausedNewWaves, setPausedNewWaves] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationDay, setSimulationDay] = useState(0);
  const simulationSourceRef = useRef<OpenSlotDbState | null>(null);

  const slots = useMemo(() => buildSlotViews(db), [db]);
  const waitlist = useMemo(() => buildWaitlistViews(db), [db]);

  const hydrateBackendState = useCallback(async () => {
    const [slotsResponse, waitlistResponse] = (await Promise.all([
      fonioApi.listSlots(),
      fonioApi.listWaitlist(),
    ])) as [{ slots: Slot[] }, { waitlist: WaitlistEntry[] }];
    const nextDb = createOpenSlotDbFromLegacy(slotsResponse.slots, waitlistResponse.waitlist);

    setDb(nextDb);
    setSimulationMode(false);
    setSimulationRunning(false);
    setSimulationDay(0);
    simulationSourceRef.current = null;
    setSelectedSlotId((current) =>
      current && slotsResponse.slots.some((slot) => slot.id === current)
        ? current
        : (slotsResponse.slots[0]?.id ?? null),
    );

    return {
      slots: slotsResponse.slots,
      waitlist: waitlistResponse.waitlist,
    };
  }, []);

  const pauseSlotViaApi = useCallback(
    async (id: string, paused: boolean) => {
      if (simulationMode) {
        setDb((current) => ({
          ...current,
          slots: current.slots.map((slot) =>
            slot.id === id
              ? {
                  ...slot,
                  new_waves_paused: paused,
                  status:
                    slot.status === "OFFERING" ? slot.status : paused ? "PAUSED_NEW_WAVES" : "OPEN",
                  last_event: paused
                    ? "Simulation paused new waves for this slot"
                    : "Simulation resumed new waves for this slot",
                  updated_at: current.now,
                }
              : slot,
          ),
        }));
        return {
          ok: true,
          message: paused ? "Simulation slot paused." : "Simulation slot resumed.",
        };
      }

      const response = (await fonioApi.pauseNewWaves(id, paused)) as {
        ok: boolean;
        reason?: string;
        slot: Slot;
      };
      await hydrateBackendState();
      return {
        ok: response.ok,
        message: response.reason ?? (paused ? "New waves paused." : "New waves resumed."),
      };
    },
    [hydrateBackendState, simulationMode],
  );

  useEffect(() => {
    if (simulationMode) return;

    let cancelled = false;
    let inFlight = false;

    async function refreshFromApi() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        await hydrateBackendState();
      } catch {
        // Keep the current state if the local API is not available yet.
      } finally {
        inFlight = false;
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshFromApi();
    };

    void refreshFromApi();
    const intervalId = window.setInterval(refreshFromApi, LIVE_REFRESH_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [hydrateBackendState, simulationMode]);

  useEffect(() => {
    if (!simulationMode || !simulationRunning || !simulationSourceRef.current) return;

    const intervalId = window.setInterval(() => {
      setSimulationDay((currentDay) => {
        const nextDay = Math.min(currentDay + 1, SIMULATION_TOTAL_DAYS);
        const nextDb = sliceSimulationDb(simulationSourceRef.current!, nextDay);
        const nextSlots = buildSlotViews(nextDb);

        setDb(nextDb);
        setSelectedSlotId((current) =>
          current && nextSlots.some((slot) => slot.id === current)
            ? current
            : (nextSlots.find((slot) => slot.status === "OFFERING")?.id ??
              nextSlots[0]?.id ??
              null),
        );

        if (nextDay >= SIMULATION_TOTAL_DAYS) {
          setSimulationRunning(false);
        }

        return nextDay;
      });
    }, 650);

    return () => window.clearInterval(intervalId);
  }, [simulationMode, simulationRunning]);

  const derivedAlerts = useMemo(() => buildAttentionAlerts(slots), [slots]);

  useEffect(() => {
    setDismissedAlertIds((current) => {
      const activeAlertIds = new Set(derivedAlerts.map((alert) => alert.id));
      let changed = false;
      const next = new Set<string>();

      for (const id of current) {
        if (activeAlertIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [derivedAlerts]);

  const alerts = useMemo(
    () => derivedAlerts.filter((alert) => !dismissedAlertIds.has(alert.id)),
    [derivedAlerts, dismissedAlertIds],
  );
  const simulationLogs = useMemo(
    () =>
      db.slot_timeline_events
        .filter((event) => event.metadata?.simulation === true)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 12)
        .map((event) => ({
          id: event.id,
          at: formatLogTime(event.created_at),
          message: event.message,
        })),
    [db.slot_timeline_events],
  );

  const value = useMemo<FonioContextValue>(
    () => ({
      db,
      slots,
      alerts,
      waitlist,
      selectedSlotId,
      selectSlot: setSelectedSlotId,
      pausedNewWaves,
      simulationMode,
      simulationRunning,
      simulationDay,
      simulationTotalDays: SIMULATION_TOTAL_DAYS,
      simulationLogs,
      runFourWeekSimulation: () => {
        const sourceDb = buildFourWeekSimulationState();
        const nextDb = sliceSimulationDb(sourceDb, 1);
        const nextSlots = buildSlotViews(nextDb);
        simulationSourceRef.current = sourceDb;
        setDb(nextDb);
        setSimulationMode(true);
        setSimulationRunning(true);
        setSimulationDay(1);
        setPausedNewWaves(false);
        setDismissedAlertIds(new Set());
        setSelectedSlotId(
          nextSlots.find((slot) => slot.status === "OFFERING")?.id ?? nextSlots[0]?.id ?? null,
        );
        return {
          ok: true,
          message: "Playing a four-week simulated Fonio recovery run.",
        };
      },
      pauseSimulation: () => {
        setSimulationRunning((running) => !running);
      },
      syncLiveState: async () => {
        await hydrateBackendState();
        setPausedNewWaves(false);
        setSimulationRunning(false);
        setSimulationDay(0);
        simulationSourceRef.current = null;
        setDismissedAlertIds(new Set());
        return {
          ok: true,
          message: "Synced live dashboard state.",
        };
      },
      togglePausedNewWaves: async () => {
        const nextPaused = !pausedNewWaves;
        setPausedNewWaves(nextPaused);
        const targets = slots.filter((slot) =>
          ["OPEN", "OFFERING", "PAUSED_NEW_WAVES"].includes(slot.status),
        );
        const results = await Promise.allSettled(
          targets.map((slot) => pauseSlotViaApi(slot.id, nextPaused)),
        );
        const rejected = results.filter((result) => result.status === "rejected");
        if (rejected.length > 0) {
          return {
            ok: false,
            message: `Updated ${targets.length - rejected.length}/${targets.length} slots.`,
          };
        }

        return {
          ok: true,
          message: nextPaused ? "Paused new waves for active slots." : "Resumed active slots.",
        };
      },
      setSlotPaused: pauseSlotViaApi,
      callNextCandidate: async (id) => {
        if (simulationMode) {
          setDb((current) => ({
            ...current,
            slots: current.slots.map((slot) =>
              slot.id === id
                ? {
                    ...slot,
                    last_event: "Simulation advanced the active call wave",
                    updated_at: current.now,
                  }
                : slot,
            ),
          }));
          return {
            ok: true,
            message: "Simulation advanced without placing a real Fonio call.",
          };
        }

        const response = (await fonioApi.orchestrateCallWave(id)) as {
          success: boolean;
          slotId: string;
          candidatesCalled: string[];
          callResults: { candidateId: string; candidateName: string; outcome?: string }[];
          message: string;
        };
        await hydrateBackendState();
        return {
          ok: response.success,
          message: response.message,
        };
      },
      manualBook: async (slotId, candidateName) => {
        if (simulationMode) {
          setDb((current) => ({
            ...current,
            slots: current.slots.map((slot) =>
              slot.id === slotId
                ? {
                    ...slot,
                    status: "BOOKED",
                    last_event: `Simulation booked ${candidateName}`,
                    needs_attention: false,
                    recovered_min_before_start: Math.max(
                      Math.round((Date.parse(slot.starts_at) - Date.parse(current.now)) / 60000),
                      0,
                    ),
                    updated_at: current.now,
                  }
                : slot,
            ),
          }));
          return { ok: true, message: `Simulation booked ${candidateName}.` };
        }

        const response = (await fonioApi.attemptBooking({
          slotId,
          candidateName,
          source: "manual",
        })) as {
          ok: boolean;
          message: string;
          slot: Slot;
        };
        await hydrateBackendState();
        return { ok: response.ok, message: response.message };
      },
      escalate: async (slotId) => {
        if (simulationMode) {
          setDb((current) => ({
            ...current,
            slots: current.slots.map((slot) =>
              slot.id === slotId
                ? {
                    ...slot,
                    status: "ESCALATED",
                    needs_attention: true,
                    last_event: "Simulation escalated to receptionist",
                    updated_at: current.now,
                  }
                : slot,
            ),
          }));
          return { ok: true, message: "Simulation escalated to receptionist." };
        }

        const response = (await fonioApi.escalate(
          slotId,
          "Manually escalated to receptionist",
        )) as {
          ok: boolean;
          reason?: string;
          slot: Slot;
        };
        await hydrateBackendState();
        return {
          ok: response.ok,
          message: response.reason ?? "Escalated to receptionist.",
        };
      },
      cancelAndReopen: async (slotId) => {
        if (simulationMode) {
          setDb((current) => ({
            ...current,
            slots: current.slots.map((slot) =>
              slot.id === slotId
                ? {
                    ...slot,
                    status: "OPEN",
                    booked_booking_id: null,
                    needs_attention: false,
                    last_event: "Simulation reopened the slot",
                    updated_at: current.now,
                  }
                : slot,
            ),
            bookings: current.bookings.map((booking) =>
              booking.slot_id === slotId && booking.status === "ACTIVE"
                ? {
                    ...booking,
                    status: "CANCELLED",
                    cancelled_reason: "Simulation cancel and reopen",
                    cancelled_at: current.now,
                    updated_at: current.now,
                  }
                : booking,
            ),
          }));
          return { ok: true, message: "Simulation booking cancelled and slot reopened." };
        }

        const response = (await fonioApi.cancelAndReopen(slotId)) as {
          ok: boolean;
          reason?: string;
          slot: Slot;
        };
        await hydrateBackendState();
        return {
          ok: response.ok,
          message: response.reason ?? "Booking cancelled. Slot reopened.",
        };
      },
      resetDemoState: async () => {
        if (simulationMode) {
          const nextDb = buildFourWeekSimulationState();
          const firstDayDb = sliceSimulationDb(nextDb, 1);
          const nextSlots = buildSlotViews(firstDayDb);
          simulationSourceRef.current = nextDb;
          setDb(firstDayDb);
          setSimulationDay(1);
          setSimulationRunning(true);
          setPausedNewWaves(false);
          setDismissedAlertIds(new Set());
          setSelectedSlotId(
            nextSlots.find((slot) => slot.status === "OFFERING")?.id ?? nextSlots[0]?.id ?? null,
          );
          return {
            ok: true,
            message: "Simulation reset to the beginning of the four-week run.",
          };
        }

        const response = (await fonioApi.resetDemoState()) as {
          ok: boolean;
          message: string;
        };
        await hydrateBackendState();
        setPausedNewWaves(false);
        setDismissedAlertIds(new Set());
        return {
          ok: response.ok,
          message: response.message,
        };
      },
      dismissAlert: (id) =>
        setDismissedAlertIds((current) => {
          const next = new Set(current);
          next.add(id);
          return next;
        }),
    }),
    [
      db,
      slots,
      alerts,
      waitlist,
      selectedSlotId,
      pausedNewWaves,
      simulationMode,
      simulationRunning,
      simulationDay,
      simulationLogs,
      pauseSlotViaApi,
      hydrateBackendState,
    ],
  );

  return <FonioContext.Provider value={value}>{children}</FonioContext.Provider>;
}

const SIMULATION_TOTAL_DAYS = 28;

function sliceSimulationDb(db: OpenSlotDbState, daysVisible: number): OpenSlotDbState {
  const visibleUntil = new Date(
    Date.parse("2026-05-11T08:00:00+02:00") + daysVisible * 24 * 60 * 60000,
  );
  const visibleSlotIds = new Set(
    db.slots
      .filter((slot) => Date.parse(slot.starts_at) < visibleUntil.getTime())
      .map((slot) => slot.id),
  );
  const visibleOfferIds = new Set(
    db.slot_offers.filter((offer) => visibleSlotIds.has(offer.slot_id)).map((offer) => offer.id),
  );

  return {
    ...db,
    now: new Date(Math.min(visibleUntil.getTime(), Date.parse(db.now))).toISOString(),
    slots: db.slots.filter((slot) => visibleSlotIds.has(slot.id)),
    bookings: db.bookings.filter((booking) => visibleSlotIds.has(booking.slot_id)),
    slot_waves: db.slot_waves.filter((wave) => visibleSlotIds.has(wave.slot_id)),
    slot_offers: db.slot_offers.filter((offer) => visibleSlotIds.has(offer.slot_id)),
    call_attempts: db.call_attempts.filter((attempt) => visibleOfferIds.has(attempt.slot_offer_id)),
    slot_timeline_events: db.slot_timeline_events.filter(
      (event) =>
        visibleSlotIds.has(event.slot_id) && Date.parse(event.created_at) < visibleUntil.getTime(),
    ),
  };
}

function formatLogTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function useFonio() {
  const v = useContext(FonioContext);
  if (!v) throw new Error("useFonio must be used within FonioProvider");
  return v;
}
