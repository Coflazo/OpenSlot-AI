import { beforeEach, describe, expect, it } from "vitest";

import { handleFonioApiRequest } from "../router.server";
import { resetBackendState } from "../store.server";

describe("backend endpoint contract smoke tests", () => {
  beforeEach(() => {
    resetBackendState();
  });

  it("responds to health checks", async () => {
    const response = await request("GET", "/api/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.service).toBe("openslot-ai");
  });

  it("keeps the wave-size endpoint stable", async () => {
    const response = await request("POST", "/api/algorithm/wave-size", {
      p: 0.3,
      usableTimeMin: 10,
      fillMode: "Balanced",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.recommendation.waveSize).toBeGreaterThan(1);
    expect(body.recommendation.targetFill).toBe(0.8);
  });

  it("supports the calendar-opened to manual-booking flow", async () => {
    const opened = await request("POST", "/api/slots/opened", {
      id: "contract-slot",
      timeLabel: "16:30",
      startsInMin: 100,
      provider: "Dr. Contract",
      service: "Consultation",
      fillMode: "Balanced",
    });
    expect(opened.status).toBe(201);

    const booked = await request("POST", "/api/bookings/attempt", {
      slotId: "contract-slot",
      candidateName: "Contract Patient",
      source: "manual",
    });
    const body = await booked.json();

    expect(booked.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.code).toBe("BOOKED");
    expect(body.slot.bookedCustomer).toBe("Contract Patient");
  });

  it("returns undefined for frontend routes so TanStack can handle them", async () => {
    const response = await handleFonioApiRequest(new Request("http://localhost/"));

    expect(response).toBeUndefined();
  });
});

async function request(method: string, path: string, body?: unknown) {
  const response = await handleFonioApiRequest(
    new Request(`http://localhost${path}`, {
      method,
      headers: body == null ? undefined : { "content-type": "application/json" },
      body: body == null ? undefined : JSON.stringify(body),
    }),
  );

  if (!response) throw new Error(`No response for ${method} ${path}`);
  return response;
}
