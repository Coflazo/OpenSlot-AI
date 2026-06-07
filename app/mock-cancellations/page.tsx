"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service_name?: string;
  patient_name?: string | null;
}

export default function MockCancellations() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const response = await fetch("/api/slots");
        if (response.ok) {
          const data = await response.json();
          // Filter only BOOKED slots and sort by date
          const bookedSlots = (data || [])
            .filter((slot: Slot) => slot.status === "BOOKED")
            .sort((a: Slot, b: Slot) => {
              const dateA = new Date(a.starts_at).getTime();
              const dateB = new Date(b.starts_at).getTime();
              return dateA - dateB;
            });
          setSlots(bookedSlots);
        }
      } catch (error) {
        console.error("Error fetching slots:", error);
      }
    };

    // Initial fetch
    fetchSlots().then(() => setLoading(false));

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchSlots, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Adjust for timezone
    date.setHours(date.getHours() - 2);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    // Adjust for timezone
    date.setHours(date.getHours() - 2);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleCancel = async (slotId: string) => {
    try {
      const response = await fetch("/api/slots/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });

      if (response.ok) {
        // Remove from list
        setSlots(slots.filter((s) => s.id !== slotId));
        alert("Slot cancelled successfully");
      } else {
        alert("Error cancelling slot");
      }
    } catch (error) {
      console.error("Error cancelling slot:", error);
      alert("Error cancelling slot");
    }
  };

  // Get unique services for filter
  const services = Array.from(new Set(slots.map((s) => s.service_name))).sort();

  // Filter slots by service
  const filteredSlots = selectedService
    ? slots.filter((s) => s.service_name === selectedService)
    : slots;

  // Group slots by date
  const groupedByDate = filteredSlots.reduce(
    (acc, slot) => {
      const date = formatDate(slot.starts_at);
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(slot);
      return acc;
    },
    {} as Record<string, Slot[]>
  );

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
          Mock Cancellations
        </h1>
        <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
          Manage booked appointments
        </p>
      </div>

      {/* Filter */}
      {!loading && slots.length > 0 && (
        <div className="mb-8">
          <label
            className="block text-sm font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Filter by Service
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedService(null)}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                backgroundColor:
                  selectedService === null ? "var(--primary)" : "var(--card)",
                borderColor: "var(--border)",
                color:
                  selectedService === null
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
                border: "1px solid",
              }}
              onMouseEnter={(e) => {
                if (selectedService !== null) {
                  e.currentTarget.style.backgroundColor = "oklch(98.14% 0.034 99.83 / 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedService !== null) {
                  e.currentTarget.style.backgroundColor = "var(--card)";
                }
              }}
            >
              All ({slots.length})
            </button>
            {services.map((service) => {
              const count = slots.filter((s) => s.service_name === service).length;
              return (
                <button
                  key={service}
                  onClick={() => setSelectedService(service ?? null)}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                  style={{
                    backgroundColor:
                      selectedService === service
                        ? "var(--primary)"
                        : "var(--card)",
                    borderColor: "var(--border)",
                    color:
                      selectedService === service
                        ? "var(--primary-foreground)"
                        : "var(--foreground)",
                    border: "1px solid",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedService !== service) {
                      e.currentTarget.style.backgroundColor =
                        "oklch(98.14% 0.034 99.83 / 0.5)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedService !== service) {
                      e.currentTarget.style.backgroundColor = "var(--card)";
                    }
                  }}
                >
                  {service} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Slots List */}
      {loading ? (
        <p style={{ color: "var(--muted-foreground)" }}>Loading slots...</p>
      ) : filteredSlots.length === 0 ? (
        <p style={{ color: "var(--muted-foreground)" }}>No booked slots found.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dateSlots]) => (
            <div key={date}>
              {/* Day Divider */}
              <div className="mb-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--foreground)" }}
                >
                  {date}
                </h2>
              </div>

              {/* Slots for this day */}
              <div className="space-y-3">
                {dateSlots.map((slot) => (
            <div
              key={slot.id}
              className="rounded-lg border p-4 transition-all duration-200 flex items-center justify-between gap-4"
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {/* Slot Info - Single Line */}
              <div className="flex items-center gap-6 text-sm flex-1">
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                  {slot.service_name}
                </span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  {formatDate(slot.starts_at)}
                </span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  {formatTime(slot.starts_at)} - {formatTime(slot.ends_at)}
                </span>
                {slot.patient_name && (
                  <span style={{ color: "var(--foreground)" }}>
                    {slot.patient_name}
                  </span>
                )}
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => handleCancel(slot.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap"
                style={{
                  backgroundColor: "oklch(55% 0.20 20)",
                  color: "white",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <Trash2 className="h-4 w-4" />
                CANCEL
              </button>
            </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && slots.length > 0 && (
        <div
          className="mt-8 rounded-lg border p-6"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Showing <span style={{ color: "var(--foreground)" }} className="font-bold">{filteredSlots.length}</span> of <span style={{ color: "var(--foreground)" }} className="font-bold">{slots.length}</span> booked appointments
          </p>
        </div>
      )}
    </div>
  );
}
