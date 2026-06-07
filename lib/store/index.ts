"use client";

import { create } from "zustand";
import type {
  AuditEntry,
  CallSession,
  CascadeChain,
  Customer,
  RuleWeights,
  ScoredCandidate,
  Slot
} from "../types";
import { customers as seedCustomers } from "../mock/customers";
import { HERO_SLOT_ID, slots as seedSlots } from "../mock/slots";
import { seedAuditLog } from "../mock/auditLog";
import { defaultRules } from "./defaultRules";
import { seedCascadeDemo } from "../mock/cascadeDemo";
import {
  TWO_PERSON_CAGAN_SLOT_ID,
  TWO_PERSON_CUSTOMERS,
  TWO_PERSON_SLOTS
} from "../mock/twoPersonDemo";

export interface AppState {
  // Data
  customers: Customer[];
  slots: Slot[];
  calls: CallSession[];
  cascadeChains: CascadeChain[];
  audit: AuditEntry[];
  rules: RuleWeights;

  // Recovery KPIs
  recoveredRevenue: number;
  slotsSaved: number;
  scannerMinutesRecovered: number;
  averageTimeToFillSec: number;

  // UI
  activeSlotId: string | null;
  isSimulating: boolean;
  datasetMode: "realistic" | "two_person";
  demoStep:
    | "idle"
    | "cancelled"
    | "alex_calling"
    | "alex_accepted"
    | "sara_calling"
    | "sara_declined"
    | "mia_calling"
    | "mia_accepted"
    | "cagan_calling"
    | "cagan_accepted"
    | "ash_calling"
    | "ash_accepted"
    | "completed";

  // Actions
  setActiveSlot(id: string | null): void;
  setDatasetMode(mode: "realistic" | "two_person"): void;
  resetDemo(): void;
  cancelSlot(slotId: string): void;
  runDemoCascade(): Promise<void>;
  runTwoPersonDemo(): Promise<void>;
  pauseSlot(slotId: string): void;
  resumeSlot(slotId: string): void;
  closeSlot(slotId: string, reason: string): void;
  manuallyFillSlot(slotId: string, customerId: string): void;
  updateRules(patch: Partial<RuleWeights>): void;
  updateUpgradeWeight(key: keyof RuleWeights["upgrade"], value: number): void;
  updateWaitlistWeight(key: keyof RuleWeights["waitlist"], value: number): void;
  optOutCustomer(customerId: string): void;
  addCustomer(c: Customer): void;
  appendAudit(entry: Omit<AuditEntry, "id" | "at">): void;
  appendCall(call: CallSession): void;
  updateCall(callId: string, patch: Partial<CallSession>): void;
  markCallReviewed(callId: string): void;

  // Queries
  getSlot(id: string): Slot | undefined;
  getCustomer(id: string): Customer | undefined;
  getCallsForSlot(slotId: string): CallSession[];
  rankCandidatesForSlot(slotId: string): {
    upgrade: ScoredCandidate[];
    waitlist: ScoredCandidate[];
  };
}

let auditCounter = 0;
let callCounter = 0;
const REAL_DEMO_CALL_TIMEOUT_MS = 5 * 60_000;
const FINAL_DEMO_STATUSES = new Set<CallSession["status"]>([
  "accepted",
  "declined",
  "no_answer",
  "voicemail",
  "failed"
]);

type DemoCallStartParams = {
  customerId: string;
  slotId: string;
  type: CallSession["type"];
  slotTime: string;
  arrivalTime: string;
  offerIntroLine: string;
  currentSlotTime?: string;
  newSlotTime?: string;
  serviceName?: string;
  location?: string;
};

type DemoCallStartResponse = {
  ok?: boolean;
  offerId?: string;
  providerCallId?: string;
  reason?: string;
  hint?: string;
  error?: string;
};

type DemoCallPollResponse = {
  ok?: boolean;
  reason?: string;
  call?: {
    status: CallSession["status"];
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    extraction?: {
      identityConfirmed?: boolean;
      slotAccepted?: boolean;
      askedMedicalQuestion?: boolean;
      wantsCallback?: boolean;
      voicemail?: boolean;
    };
    recordingUrl?: string;
    error?: string;
  };
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

seedCascadeDemo();

import { hardFilters } from "../algo/hardFilters";
import { upgradeScore } from "../algo/upgradeScore";
import { waitlistScore } from "../algo/waitlistScore";
import { cascadeFillProbability } from "../algo/cascadeFillProbability";

export const useStore = create<AppState>((set, get) => ({
  customers: seedCustomers,
  slots: seedSlots,
  calls: [],
  cascadeChains: [],
  audit: seedAuditLog,
  rules: defaultRules,

  recoveredRevenue: 12_840,
  slotsSaved: 38,
  scannerMinutesRecovered: 28 * 60 + 15,
  averageTimeToFillSec: 462, // 7m 42s

  activeSlotId: null,
  isSimulating: false,
  datasetMode: "realistic",
  demoStep: "idle",

  setActiveSlot(id) {
    set({ activeSlotId: id });
  },

  setDatasetMode(mode) {
    if (get().datasetMode === mode) return;
    if (mode === "two_person") {
      set({
        customers: TWO_PERSON_CUSTOMERS.map((c) => ({ ...c })),
        slots: TWO_PERSON_SLOTS.map((s) => ({ ...s })),
        calls: [],
        cascadeChains: [],
        audit: [],
        recoveredRevenue: 0,
        slotsSaved: 0,
        scannerMinutesRecovered: 0,
        activeSlotId: TWO_PERSON_CAGAN_SLOT_ID,
        demoStep: "idle",
        isSimulating: false,
        datasetMode: "two_person"
      });
    } else {
      set({
        customers: seedCustomers,
        slots: seedSlots.map((s) => ({ ...s })),
        calls: [],
        cascadeChains: [],
        audit: seedAuditLog,
        recoveredRevenue: 12_840,
        slotsSaved: 38,
        scannerMinutesRecovered: 28 * 60 + 15,
        activeSlotId: null,
        demoStep: "idle",
        isSimulating: false,
        datasetMode: "realistic"
      });
    }
  },

  resetDemo() {
    const mode = get().datasetMode;
    if (mode === "two_person") {
      set({
        customers: TWO_PERSON_CUSTOMERS.map((c) => ({ ...c })),
        slots: TWO_PERSON_SLOTS.map((s) => ({ ...s })),
        calls: [],
        cascadeChains: [],
        audit: [],
        recoveredRevenue: 0,
        slotsSaved: 0,
        scannerMinutesRecovered: 0,
        activeSlotId: TWO_PERSON_CAGAN_SLOT_ID,
        demoStep: "idle",
        isSimulating: false
      });
    } else {
      set({
        customers: seedCustomers,
        slots: seedSlots.map((s) => ({ ...s })),
        calls: [],
        cascadeChains: [],
        audit: seedAuditLog,
        recoveredRevenue: 12_840,
        slotsSaved: 38,
        scannerMinutesRecovered: 28 * 60 + 15,
        activeSlotId: null,
        demoStep: "idle",
        isSimulating: false
      });
    }
  },

  getSlot(id) {
    return get().slots.find((s) => s.id === id);
  },

  getCustomer(id) {
    return get().customers.find((c) => c.id === id);
  },

  getCallsForSlot(slotId) {
    return get().calls.filter((c) => c.slotId === slotId);
  },

  rankCandidatesForSlot(slotId) {
    const slot = get().getSlot(slotId);
    if (!slot) return { upgrade: [], waitlist: [] };
    const { customers, rules, slots } = get();
    const upgrade: ScoredCandidate[] = [];
    const waitlist: ScoredCandidate[] = [];

    for (const customer of customers) {
      const filter = hardFilters(customer, slot, rules);
      const baseBlocks = filter.blocks;

      if (customer.currentBookingId) {
        const current = slots.find((s) => s.id === customer.currentBookingId);
        if (!current) continue;
        if (new Date(current.startTime) <= new Date(slot.startTime)) continue;
        if (
          rules.cascade.requireOptIn &&
          customer.earlierOpportunityPreference === "none"
        ) {
          upgrade.push({
            customerId: customer.id,
            score: 0,
            reasons: [],
            blocks: [...baseBlocks, "Not opted into earlier-slot notifications"],
            source: "upgrade"
          });
          continue;
        }
        if (rules.cascade.skipSatisfied && customer.bookingSatisfaction === "satisfied") {
          upgrade.push({
            customerId: customer.id,
            score: 0,
            reasons: [],
            blocks: [...baseBlocks, "Customer satisfied with current booking"],
            source: "upgrade"
          });
          continue;
        }
        if (customer.cascadeParticipation === "do_not_move") {
          upgrade.push({
            customerId: customer.id,
            score: 0,
            reasons: [],
            blocks: [...baseBlocks, "Cascade participation disabled"],
            source: "upgrade"
          });
          continue;
        }
        if (!filter.pass) {
          upgrade.push({
            customerId: customer.id,
            score: 0,
            reasons: [],
            blocks: baseBlocks,
            source: "upgrade"
          });
          continue;
        }
        const fillProb = cascadeFillProbability(current, customers);
        const scored = upgradeScore(customer, slot, current, rules, fillProb);
        upgrade.push(scored);
      } else {
        if (!filter.pass) {
          waitlist.push({
            customerId: customer.id,
            score: 0,
            reasons: [],
            blocks: baseBlocks,
            source: "waitlist"
          });
          continue;
        }
        if (customer.requestedService && customer.requestedService !== slot.service) {
          waitlist.push({
            customerId: customer.id,
            score: 0,
            reasons: [],
            blocks: [...baseBlocks, "Requested different service"],
            source: "waitlist"
          });
          continue;
        }
        const scored = waitlistScore(customer, slot, rules);
        waitlist.push(scored);
      }
    }

    upgrade.sort((a, b) => b.score - a.score);
    waitlist.sort((a, b) => b.score - a.score);

    return { upgrade, waitlist };
  },

  cancelSlot(slotId) {
    const now = new Date().toISOString();
    set((state) => ({
      slots: state.slots.map((s) =>
        s.id === slotId
          ? {
              ...s,
              status: "open",
              cancelledAt: now,
              origin: s.origin === "manual_opening" ? "patient_cancellation" : s.origin
            }
          : s
      ),
      activeSlotId: slotId,
      audit: [
        {
          id: `a_${++auditCounter}_${Date.now()}`,
          at: now,
          actor: "system",
          action: "slot.cancelled",
          object: slotId,
          result: "info",
          details: "Cancellation detected from calendar"
        },
        ...state.audit
      ]
    }));
  },

  appendAudit(entry) {
    set((state) => ({
      audit: [
        {
          id: `a_${++auditCounter}_${Date.now()}`,
          at: new Date().toISOString(),
          ...entry
        },
        ...state.audit
      ]
    }));
  },

  appendCall(call) {
    set((state) => ({ calls: [call, ...state.calls] }));
  },

  updateCall(callId, patch) {
    set((state) => ({
      calls: state.calls.map((c) => (c.id === callId ? { ...c, ...patch } : c))
    }));
  },

  markCallReviewed(callId) {
    set((state) => ({
      calls: state.calls.map((c) =>
        c.id === callId ? { ...c, needsReview: false } : c
      )
    }));
  },

  pauseSlot(slotId) {
    set((state) => ({
      slots: state.slots.map((s) => (s.id === slotId ? { ...s, status: "paused" } : s))
    }));
    get().appendAudit({
      actor: "user",
      action: "slot.pause",
      object: slotId,
      result: "info"
    });
  },

  resumeSlot(slotId) {
    set((state) => ({
      slots: state.slots.map((s) => (s.id === slotId ? { ...s, status: "open" } : s))
    }));
    get().appendAudit({
      actor: "user",
      action: "slot.resume",
      object: slotId,
      result: "info"
    });
  },

  closeSlot(slotId, reason) {
    set((state) => ({
      slots: state.slots.map((s) => (s.id === slotId ? { ...s, status: "expired" } : s))
    }));
    get().appendAudit({
      actor: "user",
      action: "slot.close",
      object: slotId,
      result: "info",
      details: reason
    });
  },

  manuallyFillSlot(slotId, customerId) {
    const now = new Date().toISOString();
    set((state) => ({
      slots: state.slots.map((s) =>
        s.id === slotId
          ? { ...s, status: "filled", filledAt: now, customerId }
          : s
      )
    }));
    get().appendAudit({
      actor: "user",
      action: "slot.manual_fill",
      object: slotId,
      result: "success",
      details: `Filled by ${customerId}`
    });
  },

  updateRules(patch) {
    set((state) => ({ rules: { ...state.rules, ...patch } as RuleWeights }));
  },

  updateUpgradeWeight(key, value) {
    set((state) => ({
      rules: { ...state.rules, upgrade: { ...state.rules.upgrade, [key]: value } }
    }));
  },

  updateWaitlistWeight(key, value) {
    set((state) => ({
      rules: { ...state.rules, waitlist: { ...state.rules.waitlist, [key]: value } }
    }));
  },

  optOutCustomer(customerId) {
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId ? { ...c, optedOut: true } : c
      )
    }));
    get().appendAudit({
      actor: "user",
      action: "customer.opt_out",
      object: customerId,
      result: "info"
    });
  },

  addCustomer(c) {
    set((state) => ({ customers: [c, ...state.customers] }));
    get().appendAudit({
      actor: "user",
      action: "customer.create",
      object: c.id,
      result: "success"
    });
  },

  async runDemoCascade() {
    const state = get();
    if (state.isSimulating) return;
    set({ isSimulating: true });

    const heroSlotId = HERO_SLOT_ID;

    // 1) Cancel the hero slot
    state.cancelSlot(heroSlotId);
    state.appendAudit({
      actor: "system",
      action: "waitlist.rank",
      object: heroSlotId,
      result: "info",
      details: "Ranked upgrade candidates"
    });
    set({ demoStep: "cancelled" });

    await sleep(700);

    // 2) Begin call to Alex (upgrade offer)
    const alexCallId = `call_${++callCounter}_${Date.now().toString(36)}`;
    const alexCall: CallSession = {
      id: alexCallId,
      offerId: newId("offer"),
      slotId: heroSlotId,
      customerId: "cust_alex",
      type: "upgrade_offer",
      status: "ringing",
      startedAt: new Date().toISOString(),
      transcript: []
    };
    state.appendCall(alexCall);
    set({ demoStep: "alex_calling" });
    state.appendAudit({
      actor: "system",
      action: "call.start",
      object: "cust_alex",
      result: "info",
      details: "Upgrade offer for today 16:30"
    });

    await sleep(900);
    get().updateCall(alexCallId, { status: "in_progress" });

    const alexTurns = [
      { speaker: "agent" as const, text: "Hi Alex, this is Lina from Vienna Private Imaging. You currently have an MRI Knee booked for July 20. You asked us to notify you if an earlier slot opened. A slot opened today at 16:30. Would you like me to move your appointment earlier?" },
      { speaker: "customer" as const, text: "Yes, I have been hoping for something earlier. Today works." },
      { speaker: "agent" as const, text: "Great. I'll check that the 16:30 slot is still available and move you over." },
      { speaker: "customer" as const, text: "Perfect. Thank you." },
      { speaker: "agent" as const, text: "You're booked for 16:30. Please arrive by 16:15. Your July 20 appointment is released. I'll send a confirmation now." }
    ];

    for (let i = 0; i < alexTurns.length; i++) {
      await sleep(700);
      const t = {
        id: `t_alex_${i}`,
        speaker: alexTurns[i].speaker,
        text: alexTurns[i].text,
        at: new Date().toISOString()
      };
      get().updateCall(alexCallId, {
        transcript: [...(get().calls.find((c) => c.id === alexCallId)?.transcript ?? []), t]
      });
    }

    // 3) Alex accepts → fill today 16:30, vacate July 20
    await sleep(500);
    const heroSlot = get().getSlot(heroSlotId)!;
    const alexBookingId = get().getCustomer("cust_alex")?.currentBookingId;
    const filledAt = new Date().toISOString();

    set((s) => ({
      slots: s.slots.map((sl) => {
        if (sl.id === heroSlotId)
          return { ...sl, status: "filled", customerId: "cust_alex", filledAt };
        if (sl.id === alexBookingId)
          return {
            ...sl,
            status: "open",
            customerId: undefined,
            origin: "upgrade_cascade",
            parentSlotId: heroSlotId,
            cascadeDepth: 1,
            cancelledAt: filledAt
          };
        return sl;
      }),
      customers: s.customers.map((c) =>
        c.id === "cust_alex" ? { ...c, currentBookingId: heroSlotId } : c
      ),
      calls: s.calls.map((c) =>
        c.id === alexCallId
          ? {
              ...c,
              status: "accepted",
              endedAt: filledAt,
              durationSeconds: 78,
              extraction: {
                identityConfirmed: true,
                slotAccepted: true,
                askedMedicalQuestion: false,
                needsCallback: false,
                voicemail: false
              }
            }
          : c
      ),
      recoveredRevenue: s.recoveredRevenue + heroSlot.estimatedValue,
      slotsSaved: s.slotsSaved + 1,
      scannerMinutesRecovered: s.scannerMinutesRecovered + heroSlot.durationMinutes,
      cascadeChains: [
        {
          id: "chain_demo",
          rootSlotId: heroSlotId,
          steps: [
            {
              slotId: heroSlotId,
              filledByCustomerId: "cust_alex",
              vacatedSlotId: alexBookingId,
              type: "upgrade",
              at: filledAt
            }
          ],
          depth: 1,
          status: "in_progress",
          startedAt: filledAt
        },
        ...s.cascadeChains
      ],
      demoStep: "alex_accepted"
    }));
    state.appendAudit({
      actor: "system",
      action: "slot.filled",
      object: heroSlotId,
      result: "success",
      details: "Filled by Alex Berger via upgrade cascade"
    });
    state.appendAudit({
      actor: "system",
      action: "slot.cascade_open",
      object: alexBookingId ?? "",
      result: "info",
      details: "Vacated by Alex Berger upgrade"
    });
    state.appendAudit({
      actor: "system",
      action: "confirmation.send",
      object: "cust_alex",
      result: "success"
    });

    // 4) Try Sara on the new open slot. Declines.
    if (!alexBookingId) {
      set({ isSimulating: false, demoStep: "completed" });
      return;
    }
    await sleep(700);
    set({ activeSlotId: alexBookingId });

    const saraCallId = `call_${++callCounter}_${Date.now().toString(36)}`;
    state.appendCall({
      id: saraCallId,
      offerId: newId("offer"),
      slotId: alexBookingId,
      customerId: "cust_sara",
      type: "upgrade_offer",
      status: "ringing",
      startedAt: new Date().toISOString(),
      transcript: []
    });
    set({ demoStep: "sara_calling" });
    state.appendAudit({
      actor: "system",
      action: "call.start",
      object: "cust_sara",
      result: "info",
      details: "Upgrade offer for July 20"
    });

    await sleep(900);
    get().updateCall(saraCallId, { status: "in_progress" });

    const saraTurns = [
      { speaker: "agent" as const, text: "Hi Sara, this is Lina from Vienna Private Imaging. You currently have an MRI Knee booked for July 25. A slot opened on July 20. Would you like me to move your appointment earlier?" },
      { speaker: "customer" as const, text: "Actually I'd rather keep my July 25 slot, thanks." },
      { speaker: "agent" as const, text: "Understood. We'll keep your current booking unchanged." }
    ];
    for (let i = 0; i < saraTurns.length; i++) {
      await sleep(650);
      const t = {
        id: `t_sara_${i}`,
        speaker: saraTurns[i].speaker,
        text: saraTurns[i].text,
        at: new Date().toISOString()
      };
      const existing = get().calls.find((c) => c.id === saraCallId)?.transcript ?? [];
      get().updateCall(saraCallId, { transcript: [...existing, t] });
    }
    await sleep(500);
    get().updateCall(saraCallId, {
      status: "declined",
      endedAt: new Date().toISOString(),
      durationSeconds: 31,
      extraction: {
        identityConfirmed: true,
        slotAccepted: false,
        askedMedicalQuestion: false,
        needsCallback: false,
        voicemail: false
      }
    });
    state.appendAudit({
      actor: "system",
      action: "call.declined",
      object: "cust_sara",
      result: "info"
    });
    set({ demoStep: "sara_declined" });

    // 5) Mia waitlist offer. Accepts.
    await sleep(800);
    const miaCallId = `call_${++callCounter}_${Date.now().toString(36)}`;
    state.appendCall({
      id: miaCallId,
      offerId: newId("offer"),
      slotId: alexBookingId,
      customerId: "cust_mia",
      type: "waitlist_offer",
      status: "ringing",
      startedAt: new Date().toISOString(),
      transcript: []
    });
    set({ demoStep: "mia_calling" });
    state.appendAudit({
      actor: "system",
      action: "call.start",
      object: "cust_mia",
      result: "info",
      details: "Waitlist offer for July 20"
    });
    await sleep(900);
    get().updateCall(miaCallId, { status: "in_progress" });

    const miaTurns = [
      { speaker: "agent" as const, text: "Hi Mia, this is Lina from Vienna Private Imaging. You are on the waitlist for an MRI Knee appointment. A slot opened on July 20. Would you like me to reserve it for you?" },
      { speaker: "customer" as const, text: "Yes please, that would be excellent." },
      { speaker: "agent" as const, text: "Booking you for July 20. I'll send the confirmation now. If a still earlier slot opens, would you like us to notify you?" },
      { speaker: "customer" as const, text: "Absolutely, yes." },
      { speaker: "agent" as const, text: "Noted. We'll be in touch." }
    ];
    for (let i = 0; i < miaTurns.length; i++) {
      await sleep(650);
      const t = {
        id: `t_mia_${i}`,
        speaker: miaTurns[i].speaker,
        text: miaTurns[i].text,
        at: new Date().toISOString()
      };
      const existing = get().calls.find((c) => c.id === miaCallId)?.transcript ?? [];
      get().updateCall(miaCallId, { transcript: [...existing, t] });
    }

    await sleep(500);
    const filledAt2 = new Date().toISOString();
    const vacated = get().getSlot(alexBookingId)!;
    set((s) => ({
      slots: s.slots.map((sl) =>
        sl.id === alexBookingId
          ? { ...sl, status: "filled", customerId: "cust_mia", filledAt: filledAt2 }
          : sl
      ),
      customers: s.customers.map((c) =>
        c.id === "cust_mia" ? { ...c, currentBookingId: alexBookingId, waitingSince: undefined } : c
      ),
      calls: s.calls.map((c) =>
        c.id === miaCallId
          ? {
              ...c,
              status: "accepted",
              endedAt: filledAt2,
              durationSeconds: 64,
              extraction: {
                identityConfirmed: true,
                slotAccepted: true,
                askedMedicalQuestion: false,
                needsCallback: false,
                voicemail: false
              }
            }
          : c
      ),
      recoveredRevenue: s.recoveredRevenue + vacated.estimatedValue,
      slotsSaved: s.slotsSaved + 1,
      scannerMinutesRecovered: s.scannerMinutesRecovered + vacated.durationMinutes,
      cascadeChains: s.cascadeChains.map((ch) =>
        ch.id === "chain_demo"
          ? {
              ...ch,
              status: "completed",
              completedAt: filledAt2,
              depth: 2,
              steps: [
                ...ch.steps,
                {
                  slotId: alexBookingId,
                  filledByCustomerId: "cust_mia",
                  type: "waitlist",
                  at: filledAt2
                }
              ]
            }
          : ch
      ),
      demoStep: "completed",
      isSimulating: false
    }));
    state.appendAudit({
      actor: "system",
      action: "slot.filled",
      object: alexBookingId,
      result: "success",
      details: "Filled by Mia Novak from waitlist"
    });
    state.appendAudit({
      actor: "system",
      action: "cascade.completed",
      object: "chain_demo",
      result: "success",
      details: "2 slots filled, 1 customer upgraded"
    });
  },

  async runTwoPersonDemo() {
    const state = get();
    if (state.isSimulating) return;

    if (state.datasetMode !== "two_person") {
      state.setDatasetMode("two_person");
    }

    set({ isSimulating: true });

    const caganSlotId = TWO_PERSON_CAGAN_SLOT_ID;
    const openedAt = new Date().toISOString();

    set((s) => ({
      slots: s.slots.map((sl) =>
        sl.id === caganSlotId
          ? {
              ...sl,
              status: "open",
              customerId: undefined,
              origin: "manual_opening",
              cancelledAt: openedAt
            }
          : sl
      ),
      customers: s.customers.map((c) =>
        c.id === "cust_cagan" ? { ...c, currentBookingId: undefined } : c
      ),
      activeSlotId: caganSlotId,
      demoStep: "cancelled"
    }));
    get().appendAudit({
      actor: "system",
      action: "booking.removed",
      object: "cust_cagan",
      result: "info",
      details: "OpenSlot manually removed Çağan Oflazoğlu's tomorrow 14:00 booking"
    });
    get().appendAudit({
      actor: "system",
      action: "slot.opened",
      object: caganSlotId,
      result: "info",
      details: "Tomorrow 14:00 MRI Knee slot opened for waitlist outreach"
    });
    get().appendAudit({
      actor: "system",
      action: "waitlist.rank",
      object: caganSlotId,
      result: "info",
      details: "Ash is the top eligible waitlist candidate"
    });

    try {
      await sleep(700);

      set({ demoStep: "ash_calling" });
      get().appendAudit({
        actor: "system",
        action: "call.start",
        object: "cust_ash",
        result: "info",
        details: "Fonio waitlist call requested for tomorrow 14:00"
      });
      const ashStart = await startRealDemoCall({
        customerId: "cust_ash",
        slotId: caganSlotId,
        type: "waitlist_offer",
        serviceName: "MRI Knee",
        slotTime: "tomorrow at 14:00",
        newSlotTime: "tomorrow at 14:00",
        arrivalTime: "13:45",
        location: "Vienna Private Imaging, Innere Stadt",
        offerIntroLine:
          "You are on the waitlist for an MRI Knee appointment. A slot opened tomorrow at 14:00."
      });
      get().appendCall({
        id: ashStart.offerId,
        offerId: ashStart.offerId,
        slotId: caganSlotId,
        customerId: "cust_ash",
        type: "waitlist_offer",
        status: "queued",
        startedAt: new Date().toISOString(),
        transcript: []
      });

      const ashCall = await pollRealDemoCall(ashStart.offerId, (call) => {
        get().updateCall(ashStart.offerId, callPatchFromDemo(call));
      });

      if (!ashCall || ashCall.status !== "accepted") {
        get().appendAudit({
          actor: "system",
          action: "cascade.stopped",
          object: caganSlotId,
          result: ashCall ? "blocked" : "error",
          details: ashCall
            ? `Ash call ended with ${ashCall.status}; vacated slot remains open.`
            : "Timed out waiting for Fonio post-call webhook for Ash."
        });
        set({ demoStep: "completed", isSimulating: false });
        return;
      }

      const filledAt2 = ashCall.endedAt ?? new Date().toISOString();
      const vacated = get().getSlot(caganSlotId)!;
      set((s) => ({
        slots: s.slots.map((sl) =>
          sl.id === caganSlotId
            ? { ...sl, status: "filled", customerId: "cust_ash", filledAt: filledAt2 }
            : sl
        ),
        customers: s.customers.map((c) =>
          c.id === "cust_ash"
            ? { ...c, currentBookingId: caganSlotId, waitingSince: undefined }
            : c
        ),
        recoveredRevenue: s.recoveredRevenue + vacated.estimatedValue,
        slotsSaved: s.slotsSaved + 1,
        scannerMinutesRecovered: s.scannerMinutesRecovered + vacated.durationMinutes,
        cascadeChains: [
          {
            id: "chain_one_person",
            rootSlotId: caganSlotId,
            steps: [
              {
                slotId: caganSlotId,
                filledByCustomerId: "cust_ash",
                type: "waitlist",
                at: filledAt2
              }
            ],
            depth: 1,
            status: "completed",
            startedAt: openedAt,
            completedAt: filledAt2
          },
          ...s.cascadeChains
        ],
        demoStep: "completed",
        isSimulating: false
      }));
      get().appendAudit({
        actor: "system",
        action: "slot.filled",
        object: caganSlotId,
        result: "success",
        details: "Filled by Ash after Fonio accepted extraction"
      });
      get().appendAudit({
        actor: "system",
        action: "confirmation.email_requested",
        object: "cust_ash",
        result: "info",
        details: "Fonio Send Email handles Ash's confirmation when configured"
      });
      get().appendAudit({
        actor: "system",
        action: "demo.completed",
        object: "chain_one_person",
        result: "success",
        details: "1 slot filled after one outbound call to Ash"
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      get().appendAudit({
        actor: "system",
        action: "call.error",
        object: "fonio",
        result: "error",
        details: message
      });
      set({ demoStep: "completed", isSimulating: false });
    }
  }
}));

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startRealDemoCall(params: DemoCallStartParams) {
  const response = await fetch("/api/fonio/demo-call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  const data = (await response.json().catch(() => ({}))) as DemoCallStartResponse;
  if (!response.ok || !data.ok || !data.offerId) {
    throw new Error(
      data.hint ?? data.error ?? data.reason ?? `Fonio demo call failed with HTTP ${response.status}`
    );
  }
  return { offerId: data.offerId, providerCallId: data.providerCallId };
}

async function pollRealDemoCall(
  offerId: string,
  onUpdate: (call: NonNullable<DemoCallPollResponse["call"]>) => void
) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < REAL_DEMO_CALL_TIMEOUT_MS) {
    await sleep(1500);
    const response = await fetch(`/api/fonio/demo-call/${offerId}`, { cache: "no-store" });
    const data = (await response.json().catch(() => ({}))) as DemoCallPollResponse;

    if (response.ok && data.ok && data.call) {
      onUpdate(data.call);
      if (FINAL_DEMO_STATUSES.has(data.call.status)) {
        return data.call;
      }
    } else if (response.status !== 404) {
      throw new Error(data.reason ?? `Demo call polling failed with HTTP ${response.status}`);
    }
  }
  return null;
}

function callPatchFromDemo(call: NonNullable<DemoCallPollResponse["call"]>): Partial<CallSession> {
  return {
    status: call.status,
    endedAt: call.endedAt,
    durationSeconds: call.durationSeconds,
    recordingUrl: call.recordingUrl,
    extraction: call.extraction
      ? {
          identityConfirmed: Boolean(call.extraction.identityConfirmed),
          slotAccepted: Boolean(call.extraction.slotAccepted),
          askedMedicalQuestion: Boolean(call.extraction.askedMedicalQuestion),
          needsCallback: Boolean(call.extraction.wantsCallback),
          voicemail: Boolean(call.extraction.voicemail)
        }
      : undefined,
    needsReview:
      call.status === "failed" ||
      call.extraction?.askedMedicalQuestion === true ||
      call.extraction?.wantsCallback === true ||
      undefined,
    reviewReason: call.error
  };
}
