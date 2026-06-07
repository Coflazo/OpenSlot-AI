"use client";

import { useState, useEffect } from "react";

interface WaitlistEntry {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  service_name: string;
  status: string;
  joined_at: string;
  priority_score_override: number | null;
  notes: string | null;
  paused_until: string | null;
}

export default function Waitlist() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    const fetchWaitlist = async () => {
      try {
        const response = await fetch("/api/waitlist");
        if (response.ok) {
          const data = await response.json();
          setEntries(data);
        }
      } catch (error) {
        console.error("Error fetching waitlist:", error);
      }
    };

    // Initial fetch
    fetchWaitlist().finally(() => setLoading(false));

    // Poll for updates every 3 seconds
    const interval = setInterval(fetchWaitlist, 3000);

    return () => clearInterval(interval);
  }, []);

  // Get unique services for filter
  const services = Array.from(new Set(entries.map((e) => e.service_name))).sort();

  // Filter entries by search and service
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = selectedService ? entry.service_name === selectedService : true;
    return matchesSearch && matchesService;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    date.setHours(date.getHours() - 2); // Adjust for timezone
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "oklch(60% 0.15 155)"; // green
      case "paused":
        return "oklch(60.94% 0.130 57.35)"; // orange
      case "fulfilled":
        return "oklch(31.18% 0.053 129.56)"; // teal
      case "expired":
        return "oklch(55% 0.20 20)"; // red
      default:
        return "oklch(75.25% 0.110 67.83)"; // gray
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold mb-3" style={{ color: "var(--foreground)" }}>
          Waitlist
        </h1>
        <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
          Manage patient waiting list
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search by patient name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border text-sm mb-6"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        />

        {/* Service Filter */}
        {!loading && entries.length > 0 && (
          <div>
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
                All ({entries.length})
              </button>
              {services.map((service) => {
                const count = entries.filter((e) => e.service_name === service).length;
                return (
                  <button
                    key={service}
                    onClick={() => setSelectedService(service)}
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
      </div>

      {/* Entries List */}
      {loading ? (
        <p style={{ color: "var(--muted-foreground)" }}>Loading waitlist...</p>
      ) : filteredEntries.length === 0 ? (
        <p style={{ color: "var(--muted-foreground)" }}>
          {searchTerm ? "No patients found." : "No waitlist entries found."}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border p-6 transition-all duration-200"
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
              {/* Header Row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                    {entry.full_name}
                  </h3>
                  <p style={{ color: "var(--muted-foreground)" }}>
                    {entry.email}
                  </p>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold"
                  style={{
                    backgroundColor: getStatusColor(entry.status) + "30",
                    color: getStatusColor(entry.status),
                  }}
                >
                  {entry.status}
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                    Service
                  </p>
                  <p style={{ color: "var(--foreground)" }}>
                    {entry.service_name}
                  </p>
                </div>

                <div>
                  <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                    Phone
                  </p>
                  <p style={{ color: "var(--foreground)" }}>
                    {entry.phone}
                  </p>
                </div>

                <div>
                  <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                    Joined
                  </p>
                  <p style={{ color: "var(--foreground)" }}>
                    {formatDate(entry.joined_at)}
                  </p>
                </div>

                {entry.paused_until && (
                  <div>
                    <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                      Paused Until
                    </p>
                    <p style={{ color: "var(--foreground)" }}>
                      {formatDate(entry.paused_until)}
                    </p>
                  </div>
                )}

                {entry.priority_score_override !== null && (
                  <div>
                    <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                      Priority
                    </p>
                    <p style={{ color: "var(--foreground)" }}>
                      {entry.priority_score_override}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {entry.notes && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
                    Notes
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--foreground)" }}>
                    {entry.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && entries.length > 0 && (
        <div
          className="mt-8 rounded-lg border p-6"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Showing <span style={{ color: "var(--foreground)" }} className="font-bold">
              {filteredEntries.length}
            </span> of <span style={{ color: "var(--foreground)" }} className="font-bold">
              {entries.length}
            </span> waitlist {selectedService ? `entries for ${selectedService}` : "entries"}
          </p>
        </div>
      )}
    </div>
  );
}
