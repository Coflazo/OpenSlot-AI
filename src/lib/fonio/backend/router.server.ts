import { z } from "zod";

import { calculateWaveSize } from "./algorithm";
import { orchestrateCallWave } from "./call-orchestrator.server";
import { supabaseAuthMode } from "../../supabase.server";
import {
  attemptBooking,
  cancelAndReopen,
  dispatchNextWave,
  escalateSlot,
  getBackendState,
  getRankedSlot,
  getSlot,
  openSlot,
  recordCallOutcome,
  setSlotPaused,
} from "./supabase-store.server";

const waveSizeSchema = z.object({
  p: z.number().min(0).max(1).default(0.3),
  usableTimeMin: z.number().min(0),
  fillMode: z.enum(["Patient", "Balanced", "Aggressive"]).optional(),
  targetFill: z.number().min(0.01).max(0.99).optional(),
  callTimeoutMin: z.number().min(1).optional(),
  bufferMin: z.number().min(0).optional(),
});

const slotOpenedSchema = z.object({
  id: z.string().min(1),
  timeLabel: z.string().min(1),
  startsInMin: z.number(),
  provider: z.string().min(1),
  service: z.string().min(1),
  fillMode: z.enum(["Patient", "Balanced", "Aggressive"]).optional(),
});

const dispatchWaveSchema = z.object({
  slotId: z.string().min(1),
  requestedWaveSize: z.number().int().min(1).optional(),
});

const callOutcomeSchema = z.object({
  slotId: z.string().min(1),
  candidateId: z.string().min(1),
  outcome: z.enum([
    "not_contacted",
    "ringing",
    "no_answer",
    "declined",
    "accepted",
    "runner_up",
    "booked",
    "skipped",
  ]),
  providerEventId: z.string().optional(),
  waveId: z.string().optional(),
});

const attemptBookingSchema = z.object({
  slotId: z.string().min(1),
  candidateId: z.string().optional(),
  candidateName: z.string().optional(),
  waveId: z.string().optional(),
  source: z.enum(["call_webhook", "manual", "seed"]).default("manual"),
});

const slotActionSchema = z.object({
  slotId: z.string().min(1),
});

const pauseSchema = slotActionSchema.extend({
  paused: z.boolean(),
});

const escalateSchema = slotActionSchema.extend({
  reason: z.string().optional(),
});

const callWaveSchema = z.object({
  slotId: z.string().min(1),
  waveSize: z.number().int().min(1).optional(),
});

export async function handleFonioApiRequest(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return undefined;

  if (request.method === "OPTIONS") {
    return json({ ok: true });
  }

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "openslot-ai",
        mode: "supabase-db",
        supabaseAuthMode,
      });
    }

    if (request.method === "GET" && url.pathname === "/api/slots") {
      return json({ slots: (await getBackendState()).slots });
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/slots/")) {
      const slotId = decodeURIComponent(url.pathname.replace("/api/slots/", ""));
      return json({ slot: await getSlot(slotId) });
    }

    if (request.method === "GET" && url.pathname === "/api/waitlist") {
      return json({ waitlist: (await getBackendState()).waitlist });
    }

    if (request.method === "POST" && url.pathname === "/api/slots/opened") {
      return json({ slot: await openSlot(slotOpenedSchema.parse(await readJson(request))) }, 201);
    }

    if (request.method === "POST" && url.pathname === "/api/algorithm/wave-size") {
      return json({
        recommendation: calculateWaveSize(waveSizeSchema.parse(await readJson(request))),
      });
    }

    if (request.method === "POST" && url.pathname === "/api/algorithm/rank") {
      const { slotId } = slotActionSchema.parse(await readJson(request));
      return json(await getRankedSlot(slotId));
    }

    if (request.method === "POST" && url.pathname === "/api/waves/dispatch") {
      return json(
        await dispatchNextWave(
          ...toDispatchArgs(dispatchWaveSchema.parse(await readJson(request))),
        ),
      );
    }

    if (request.method === "POST" && url.pathname === "/api/calls/outcome") {
      return json(await recordCallOutcome(callOutcomeSchema.parse(await readJson(request))));
    }

    if (request.method === "POST" && url.pathname === "/api/bookings/attempt") {
      return json(await attemptBooking(attemptBookingSchema.parse(await readJson(request))));
    }

    if (request.method === "POST" && url.pathname === "/api/slots/pause-new-waves") {
      const data = pauseSchema.parse(await readJson(request));
      return json(await setSlotPaused(data.slotId, data.paused));
    }

    if (request.method === "POST" && url.pathname === "/api/slots/escalate") {
      const data = escalateSchema.parse(await readJson(request));
      return json(await escalateSlot(data.slotId, data.reason));
    }

    if (request.method === "POST" && url.pathname === "/api/slots/cancel-and-reopen") {
      const { slotId } = slotActionSchema.parse(await readJson(request));
      return json(await cancelAndReopen(slotId));
    }

    if (request.method === "POST" && url.pathname === "/api/calls/orchestrate") {
      const data = callWaveSchema.parse(await readJson(request));
      const result = await orchestrateCallWave(data);
      return json(result);
    }

    return json({ ok: false, error: "Endpoint not found." }, 404);
  } catch (error) {
    const status = error != null && typeof error === "object" && "statusCode" in error ? 404 : 400;
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Request failed.",
      },
      status,
    );
  }
}

function toDispatchArgs(input: z.infer<typeof dispatchWaveSchema>): [string, number | undefined] {
  return [input.slotId, input.requestedWaveSize];
}

async function readJson(request: Request) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text) as unknown;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    },
  });
}
