import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OpenSlot AI · Close the loop on every cancellation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#FAF8F1",
          fontFamily: "system-ui"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#40456A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                background: "#FCB315",
                borderRadius: 999
              }}
            />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#111314" }}>
            OpenSlot AI
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "#111314"
            }}
          >
            Close the loop on every cancellation.
          </div>
          <div style={{ fontSize: 28, color: "#40456A", maxWidth: 900 }}>
            Detect cancelled appointments, rank your waitlist, call eligible customers, and fill the slot before it expires.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              background: "#00939B",
              color: "white",
              fontSize: 20,
              fontWeight: 700
            }}
          >
            Recovered €12,840 this month
          </div>
          <div style={{ fontSize: 20, color: "#6E6E73" }}>
            · 38 slots saved · 100% consent-safe
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
