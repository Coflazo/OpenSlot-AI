import type { CallOutcome, FillMode } from "./types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  const data = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }
  return data;
}

export const fonioApi = {
  health: () => api("/api/health"),
  listSlots: () => api("/api/slots"),
  getSlot: (slotId: string) => api(`/api/slots/${encodeURIComponent(slotId)}`),
  listWaitlist: () => api("/api/waitlist"),

  slotOpened: (data: {
    id: string;
    timeLabel: string;
    startsInMin: number;
    provider: string;
    service: string;
    fillMode?: FillMode;
  }) =>
    api("/api/slots/opened", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  rankSlot: (slotId: string) =>
    api("/api/algorithm/rank", {
      method: "POST",
      body: JSON.stringify({ slotId }),
    }),

  calculateWaveSize: (data: {
    p: number;
    usableTimeMin: number;
    fillMode?: FillMode;
    targetFill?: number;
    callTimeoutMin?: number;
    bufferMin?: number;
  }) =>
    api("/api/algorithm/wave-size", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  dispatchWave: (data: { slotId: string; requestedWaveSize?: number }) =>
    api("/api/waves/dispatch", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  recordCallOutcome: (data: {
    slotId: string;
    candidateId: string;
    outcome: CallOutcome;
    providerEventId?: string;
    waveId?: string;
  }) =>
    api("/api/calls/outcome", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  attemptBooking: (data: {
    slotId: string;
    candidateId?: string;
    candidateName?: string;
    waveId?: string;
    source: "call_webhook" | "manual" | "seed";
  }) =>
    api("/api/bookings/attempt", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  pauseNewWaves: (slotId: string, paused: boolean) =>
    api("/api/slots/pause-new-waves", {
      method: "POST",
      body: JSON.stringify({ slotId, paused }),
    }),

  escalate: (slotId: string, reason?: string) =>
    api("/api/slots/escalate", {
      method: "POST",
      body: JSON.stringify({ slotId, reason }),
    }),

  cancelAndReopen: (slotId: string) =>
    api("/api/slots/cancel-and-reopen", {
      method: "POST",
      body: JSON.stringify({ slotId }),
    }),
};
