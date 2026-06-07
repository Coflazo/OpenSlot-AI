// In-memory store of demo calls so the frontend can poll without Supabase.
// Lives only for the process lifetime; fine for local demos.

import type { Extraction } from "./variableExtraction";

export interface DemoCall {
  offerId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startedAt: string;
  status:
    | "queued"
    | "ringing"
    | "in_progress"
    | "accepted"
    | "declined"
    | "no_answer"
    | "voicemail"
    | "failed";
  durationSeconds?: number;
  transcript?: string;
  extraction?: Extraction;
  recordingUrl?: string;
  endedAt?: string;
  providerCallId?: string;
  error?: string;
}

type DemoCallGlobalStore = {
  store: Map<string, DemoCall>;
  recentOrder: string[];
};

declare global {
  // eslint-disable-next-line no-var
  var __openslotDemoCallStore: DemoCallGlobalStore | undefined;
}

const globalStore =
  globalThis.__openslotDemoCallStore ??
  (globalThis.__openslotDemoCallStore = {
    store: new Map<string, DemoCall>(),
    recentOrder: []
  });

const { store, recentOrder } = globalStore;

export function recordDemoCall(call: DemoCall) {
  store.set(call.offerId, call);
  if (!recentOrder.includes(call.offerId)) {
    recentOrder.unshift(call.offerId);
  }
  while (recentOrder.length > 20) {
    const removed = recentOrder.pop();
    if (removed) store.delete(removed);
  }
}

export function updateDemoCall(offerId: string, patch: Partial<DemoCall>) {
  const existing = store.get(offerId);
  if (!existing) return false;
  store.set(offerId, { ...existing, ...patch });
  return true;
}

export function getDemoCall(offerId: string): DemoCall | undefined {
  return store.get(offerId);
}

export function listDemoCalls(): DemoCall[] {
  return recentOrder.map((id) => store.get(id)).filter((c): c is DemoCall => Boolean(c));
}
