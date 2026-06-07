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
import { defaultRules } from "./defaultRules";

import { hardFilters } from "../algo/hardFilters";
import { upgradeScore } from "../algo/upgradeScore";
import { waitlistScore } from "../algo/waitlistScore";
import { cascadeFillProbability } from "../algo/cascadeFillProbability";

// Local UI store. Hydrated from the API on page mount via `hydrateFromApi`.
// The four-week scripted cascade demo has been removed; every data field
// starts empty and is filled by real Supabase queries.

export interface AppState {
  // Data (hydrated)
  customers: Customer[];
  slots: Slot[];
  calls: CallSession[];
  cascadeChains: CascadeChain[];
  audit: AuditEntry[];
  rules: RuleWeights;

  // Recovery KPIs (computed/aggregated)
  recoveredRevenue: number;
  slotsSaved: number;
  scannerMinutesRecovered: number;
  averageTimeToFillSec: number;

  // UI
  activeSlotId: string | null;
  isHydrating: boolean;
  lastHydratedAt: string | null;

  // Hydration
  hydrateFromApi(): Promise<void>;

  // Actions
  setActiveSlot(id: string | null): void;
  cancelSlot(slotId: string): void;
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

function mapApiSlotToInternal(api: any): Slot {
  const status = (api.status ?? "open") as Slot["status"];
  return {
    id: api.id,
    service: api.service_name ?? "MRI Knee",
    location: api.location_name ?? "",
    startTime: api.start_time,
    durationMinutes: api.duration_minutes ?? 30,
    estimatedValue: Number(api.estimated_value_eur ?? 0),
    status,
    requirements: {
      safetyForm: false,
      referral: false,
      paymentReady: false,
      contrast: false
    },
    customerId: api.current_customer_id ?? undefined,
    origin: (api.origin ?? "scheduled") as Slot["origin"],
    cascadeDepth: 0
  };
}

function mapApiCustomerToInternal(api: any): Customer {
  return {
    id: api.id,
    name: api.full_name,
    phone: api.phone ?? "",
    email: api.email ?? "",
    language: (api.language ?? "en") as Customer["language"],
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: {
      sameDay: true,
      preferredWindow: "any",
      maxTravelMinutes: 60
    },
    bookingSatisfaction: (api.booking_satisfaction ?? "neutral") as Customer["bookingSatisfaction"],
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.5
  } as Customer;
}

export const useStore = create<AppState>((set, get) => ({
  customers: [],
  slots: [],
  calls: [],
  cascadeChains: [],
  audit: [],
  rules: defaultRules,

  recoveredRevenue: 0,
  slotsSaved: 0,
  scannerMinutesRecovered: 0,
  averageTimeToFillSec: 0,

  activeSlotId: null,
  isHydrating: false,
  lastHydratedAt: null,

  async hydrateFromApi() {
    if (typeof window === "undefined") return;
    if (get().isHydrating) return;
    set({ isHydrating: true });
    try {
      const [slotsRes, customersRes] = await Promise.all([
        fetch("/api/slots", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/customers", { cache: "no-store" }).then((r) => r.json())
      ]);
      const slots: Slot[] = (slotsRes?.slots ?? []).map(mapApiSlotToInternal);
      const customers: Customer[] = (customersRes?.customers ?? []).map(mapApiCustomerToInternal);
      set({
        slots,
        customers,
        isHydrating: false,
        lastHydratedAt: new Date().toISOString()
      });
    } catch (err) {
      set({ isHydrating: false });
      get().appendAudit({
        actor: "system",
        action: "store.hydrate.error",
        object: "store",
        result: "error",
        details: err instanceof Error ? err.message : String(err)
      });
    }
  },

  setActiveSlot(id) {
    set({ activeSlotId: id });
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
        if (rules.cascade.requireOptIn && customer.earlierOpportunityPreference === "none") {
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
  }
}));
