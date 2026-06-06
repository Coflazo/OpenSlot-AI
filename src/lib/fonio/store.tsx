import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { initialAlerts, initialSlots, initialWaitlist } from "./mock-data";
import type { Alert, Slot, WaitlistEntry } from "./types";

interface FonioContextValue {
  slots: Slot[];
  alerts: Alert[];
  waitlist: WaitlistEntry[];
  selectedSlotId: string | null;
  selectSlot: (id: string | null) => void;
  pausedNewWaves: boolean;
  togglePausedNewWaves: () => void;
  setSlotPaused: (id: string, paused: boolean) => void;
  callNextCandidate: (id: string) => void;
  manualBook: (slotId: string, candidateName: string) => { ok: boolean; message: string };
  escalate: (slotId: string) => void;
  cancelAndReopen: (slotId: string) => void;
  dismissAlert: (id: string) => void;
}

const FonioContext = createContext<FonioContextValue | null>(null);

export function FonioProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [waitlist] = useState<WaitlistEntry[]>(initialWaitlist);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>("s-1030");
  const [pausedNewWaves, setPausedNewWaves] = useState(false);

  const value = useMemo<FonioContextValue>(
    () => ({
      slots,
      alerts,
      waitlist,
      selectedSlotId,
      selectSlot: setSelectedSlotId,
      pausedNewWaves,
      togglePausedNewWaves: () => setPausedNewWaves((p) => !p),
      setSlotPaused: (id, paused) =>
        setSlots((s) =>
          s.map((slot) =>
            slot.id === id
              ? {
                  ...slot,
                  status: paused
                    ? "PAUSED_NEW_WAVES"
                    : slot.status === "PAUSED_NEW_WAVES"
                      ? "OFFERING"
                      : slot.status,
                  lastEvent: paused ? "New waves paused" : "Resumed new waves",
                }
              : slot,
          ),
        ),
      callNextCandidate: (id) =>
        setSlots((s) =>
          s.map((slot) => {
            if (slot.id !== id) return slot;
            if (slot.status === "BOOKED" || slot.status === "EXPIRED") return slot;
            const next = slot.candidates.find(
              (c) => c.contactStatus === "not_contacted" && c.eligible,
            );
            if (!next) return slot;
            return {
              ...slot,
              attempts: slot.attempts + 1,
              lastEvent: `Dispatched ${next.name}`,
              candidates: slot.candidates.map((c) =>
                c.id === next.id ? { ...c, contactStatus: "ringing", lastContacted: "now" } : c,
              ),
              timeline: [
                ...slot.timeline,
                {
                  id: `e-${Date.now()}`,
                  at: "now",
                  kind: "wave_dispatched",
                  message: `Manual dispatch: ${next.name}`,
                },
              ],
            };
          }),
        ),
      manualBook: (slotId, candidateName) => {
        const slot = slots.find((s) => s.id === slotId);
        if (!slot) return { ok: false, message: "Slot not found." };
        if (slot.status === "BOOKED") {
          return {
            ok: false,
            message: `Could not book. Slot already booked by ${slot.bookedCustomer}.`,
          };
        }
        setSlots((s) =>
          s.map((sl) =>
            sl.id === slotId
              ? {
                  ...sl,
                  status: "BOOKED",
                  bookedCustomer: candidateName,
                  lastEvent: `Manually booked ${candidateName}`,
                  recoveredMinBeforeStart: sl.startsInMin,
                  timeline: [
                    ...sl.timeline,
                    {
                      id: `e-${Date.now()}`,
                      at: "now",
                      kind: "booked",
                      message: `Manual booking: ${candidateName}`,
                    },
                  ],
                }
              : sl,
          ),
        );
        return { ok: true, message: `Booked ${candidateName}.` };
      },
      escalate: (slotId) =>
        setSlots((s) =>
          s.map((sl) =>
            sl.id === slotId
              ? {
                  ...sl,
                  status: "ESCALATED",
                  lastEvent: "Escalated to receptionist",
                  needsAttention: true,
                  timeline: [
                    ...sl.timeline,
                    {
                      id: `e-${Date.now()}`,
                      at: "now",
                      kind: "escalated",
                      message: "Manually escalated to receptionist",
                    },
                  ],
                }
              : sl,
          ),
        ),
      cancelAndReopen: (slotId) =>
        setSlots((s) =>
          s.map((sl) =>
            sl.id === slotId
              ? {
                  ...sl,
                  status: "OPEN",
                  bookedCustomer: undefined,
                  recoveredMinBeforeStart: undefined,
                  lastEvent: "Booking cancelled, slot reopened",
                  timeline: [
                    ...sl.timeline,
                    {
                      id: `e-${Date.now()}`,
                      at: "now",
                      kind: "slot_opened",
                      message: "Booking cancelled. Customer notified. Slot reopened for outreach.",
                    },
                  ],
                }
              : sl,
          ),
        ),
      dismissAlert: (id) => setAlerts((a) => a.filter((x) => x.id !== id)),
    }),
    [slots, alerts, waitlist, selectedSlotId, pausedNewWaves],
  );

  return <FonioContext.Provider value={value}>{children}</FonioContext.Provider>;
}

export function useFonio() {
  const v = useContext(FonioContext);
  if (!v) throw new Error("useFonio must be used within FonioProvider");
  return v;
}
