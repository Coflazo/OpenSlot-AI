import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fonioApi } from "./api-client";
import { buildAttentionAlerts } from "./attention";
import { buildSlotViews, buildWaitlistViews, createOpenSlotDbFromLegacy } from "./db-state";
import { initialSlots, initialWaitlist } from "./mock-data";
import type { Alert, OpenSlotDbState, Slot, SlotView, WaitlistEntry, WaitlistView } from "./types";

interface FonioContextValue {
  db: OpenSlotDbState;
  slots: SlotView[];
  alerts: Alert[];
  waitlist: WaitlistView[];
  selectedSlotId: string | null;
  selectSlot: (id: string | null) => void;
  pausedNewWaves: boolean;
  togglePausedNewWaves: () => Promise<{ ok: boolean; message: string }>;
  setSlotPaused: (id: string, paused: boolean) => Promise<{ ok: boolean; message: string }>;
  callNextCandidate: (id: string) => Promise<{ ok: boolean; message: string }>;
  manualBook: (slotId: string, candidateName: string) => Promise<{ ok: boolean; message: string }>;
  escalate: (slotId: string) => Promise<{ ok: boolean; message: string }>;
  cancelAndReopen: (slotId: string) => Promise<{ ok: boolean; message: string }>;
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

  const slots = useMemo(() => buildSlotViews(db), [db]);
  const waitlist = useMemo(() => buildWaitlistViews(db), [db]);

  const hydrateBackendState = useCallback(async () => {
    const [slotsResponse, waitlistResponse] = (await Promise.all([
      fonioApi.listSlots(),
      fonioApi.listWaitlist(),
    ])) as [{ slots: Slot[] }, { waitlist: WaitlistEntry[] }];
    const nextDb = createOpenSlotDbFromLegacy(slotsResponse.slots, waitlistResponse.waitlist);

    setDb(nextDb);
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
    [hydrateBackendState],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromApi() {
      try {
        const [slotsResponse, waitlistResponse] = (await Promise.all([
          fonioApi.listSlots(),
          fonioApi.listWaitlist(),
        ])) as [{ slots: Slot[] }, { waitlist: WaitlistEntry[] }];
        if (!cancelled) {
          setDb(createOpenSlotDbFromLegacy(slotsResponse.slots, waitlistResponse.waitlist));
          setSelectedSlotId((current) =>
            current && slotsResponse.slots.some((slot) => slot.id === current)
              ? current
              : (slotsResponse.slots[0]?.id ?? null),
          );
        }
      } catch {
        // Keep the static mock state if the local API is not available yet.
      }
    }

    void hydrateFromApi();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const value = useMemo<FonioContextValue>(
    () => ({
      db,
      slots,
      alerts,
      waitlist,
      selectedSlotId,
      selectSlot: setSelectedSlotId,
      pausedNewWaves,
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
        const response = (await fonioApi.dispatchWave({ slotId: id })) as {
          ok: boolean;
          reason?: string;
          slot: Slot;
        };
        await hydrateBackendState();
        return {
          ok: response.ok,
          message: response.ok
            ? "Next backend-selected wave dispatched."
            : (response.reason ?? "Could not dispatch next wave."),
        };
      },
      manualBook: async (slotId, candidateName) => {
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
      pauseSlotViaApi,
      hydrateBackendState,
    ],
  );

  return <FonioContext.Provider value={value}>{children}</FonioContext.Provider>;
}

export function useFonio() {
  const v = useContext(FonioContext);
  if (!v) throw new Error("useFonio must be used within FonioProvider");
  return v;
}
