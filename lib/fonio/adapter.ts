import type { FonioAdapter } from "./types";
import { mockAdapter } from "./mockAdapter";
import { realFonioAdapter } from "./realAdapter";

const useMock =
  process.env.USE_MOCK_FONIO === "true" ||
  !process.env.FONIO_API_KEY ||
  !process.env.FONIO_ASSISTANT_ID;

let active: FonioAdapter = useMock ? mockAdapter : realFonioAdapter;

export function getFonio(): FonioAdapter {
  return active;
}

export function setFonio(adapter: FonioAdapter) {
  active = adapter;
}

export function isMockActive(): boolean {
  return active === mockAdapter;
}

export type { FonioAdapter, CallEvent, StartCallRequest } from "./types";
