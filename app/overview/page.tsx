"use client";

import { TrendingUp } from "lucide-react";

const cards = [
  {
    title: "Recovered Revenue",
    value: "€12,450",
    change: "+€2,100 today",
  },
  {
    title: "Slots Saved",
    value: "47",
    change: "+12 this week",
  },
  {
    title: "Total Calls",
    value: "142",
    change: "62% success rate",
  },
  {
    title: "Fill Rate",
    value: "78%",
    change: "+5% from last week",
  },
];

export default function Overview() {
  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <div className="mb-12">
        <h1
          className="text-5xl font-bold mb-3"
          style={{ color: "var(--foreground)" }}
        >
          Overview
        </h1>
        <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
          Your appointment recovery dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, i) => (
          <div
            key={i}
            className="rounded-lg border p-6 cursor-pointer transition-all duration-200"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div />
              <TrendingUp className="h-5 w-5" style={{ color: "var(--accent)" }} />
            </div>

            <p
              className="text-sm font-medium mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              {card.title}
            </p>

            <p
              className="text-3xl font-bold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {card.value}
            </p>

            <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              {card.change}
            </p>
          </div>
        ))}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
        {/* Recent Activity - 70% */}
        <div
          className="rounded-lg border p-6"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-bold mb-6" style={{ color: "var(--foreground)" }}>
            Recent Activity
          </h2>
          <div className="space-y-0">
            {[
              {
                title: "Appointment Confirmed",
                desc: "Patient accepted available slot",
                time: "2m ago",
                status: "success",
              },
              {
                title: "Slot Filled",
                desc: "MRI Knee examination",
                time: "15m ago",
                status: "success",
              },
              {
                title: "Outreach Campaign",
                desc: "3 patients contacted",
                time: "32m ago",
                status: "pending",
              },
              {
                title: "New Opening",
                desc: "Diagnostic availability updated",
                time: "1h ago",
                status: "info",
              },
            ].map((activity, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-4 border-b last:border-b-0 px-3 rounded transition-colors cursor-pointer"
                style={{ borderColor: "var(--border)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "oklch(98.14% 0.034 99.83 / 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      activity.status === "success"
                        ? "var(--primary)"
                        : activity.status === "pending"
                          ? "var(--accent)"
                          : "var(--muted)",
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {activity.title}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                    {activity.desc}
                  </p>
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* This Week - 30% */}
        <div
          className="rounded-lg border p-6"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-bold mb-6" style={{ color: "var(--foreground)" }}>
            This Week
          </h2>
          <div className="space-y-5">
            {[
              { label: "Success Rate", value: "62%", width: "62" },
              { label: "Booking Rate", value: "48%", width: "48" },
              { label: "Response Time", value: "1.2s", width: "85" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {stat.label}
                  </span>
                  <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                    {stat.value}
                  </span>
                </div>
                <div
                  className="w-full h-2.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--muted)" }}
                >
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${stat.width}%`,
                      background:
                        i === 1 ? "var(--accent)" : "var(--primary)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
