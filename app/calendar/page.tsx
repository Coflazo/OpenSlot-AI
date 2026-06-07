"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service_name?: string;
  patient_name?: string | null;
  patient_email?: string | null;
  patient_phone?: string | null;
  booked_patient_id?: string | null;
}

const HOUR_HEIGHT = 80; // px per hour
const START_HOUR = 7;
const END_HOUR = 17.5; // 17:30 (5:30 PM)

export default function Calendar() {
  // Hardcoded: Today is Monday, June 8, 2026
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 8));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [offeringPatients, setOfferingPatients] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentlyCallingIndex, setCurrentlyCallingIndex] = useState<number>(-1);
  const slotsAlreadyOffering = useRef<Set<string>>(new Set());
  const activeCallSlotId = useRef<string | null>(null); // Track which slot has an active call
  const lastFailedAttempt = useRef<number>(0); // Track last failed attempt time
  const [openSlotTimestamps] = useState<Map<string, number>>(new Map());

  // Fetch slots from API
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const response = await fetch("/api/slots");
        if (response.ok) {
          const data = await response.json();
          setSlots(data);

          // If we have a selected slot, update it with fresh data
          if (selectedSlot) {
            const updatedSlot = data.find((s: Slot) => s.id === selectedSlot.id);
            if (updatedSlot && updatedSlot.status !== selectedSlot.status) {
              console.log("[CALENDAR] Status changed detected, updating selected slot", {
                from: selectedSlot.status,
                to: updatedSlot.status,
              });
              setSelectedSlot(updatedSlot);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching slots:", error);
      }
    };

    // Initial fetch
    fetchSlots().finally(() => setLoading(false));

    // Poll more frequently when offering is active
    const pollInterval = selectedSlot?.status === "OFFERING" ? 1000 : 3000;
    const interval = setInterval(fetchSlots, pollInterval);

    return () => clearInterval(interval);
  }, [selectedSlot?.id]);

  // Get Monday of the current week
  const getMondayOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    let daysToSubtract = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - daysToSubtract);
    return d;
  };

  const monday = getMondayOfWeek(currentDate);

  // Generate week days (Monday to Friday)
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    return date;
  });

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[4];
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  // Get slots for a specific day
  const getSlotsForDay = (date: Date) => {
    return slots.filter((slot) => {
      const slotStart = new Date(slot.starts_at);
      return (
        slotStart.getFullYear() === date.getFullYear() &&
        slotStart.getMonth() === date.getMonth() &&
        slotStart.getDate() === date.getDate()
      );
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "BOOKED":
        return "oklch(60% 0.15 155)"; // green
      case "OPEN":
        return "oklch(55% 0.20 20)"; // red
      case "OFFERING":
        return "oklch(60.94% 0.130 57.35)"; // orange
      case "ESCALATED":
        return "oklch(55% 0.20 20)"; // red
      default:
        return "oklch(75.25% 0.110 67.83)"; // gray
    }
  };

  const getEventPosition = (slot: Slot) => {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);

    // Adjust for timezone offset (subtract 2 hours for CEST/UTC+2)
    start.setHours(start.getHours() - 2);
    end.setHours(end.getHours() - 2);

    const startHour = start.getHours();
    const startMinutes = start.getMinutes();
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    const topPx = (startHour - START_HOUR + startMinutes / 60) * HOUR_HEIGHT;
    const heightPx = durationHours * HOUR_HEIGHT;

    return { topPx, heightPx };
  };

  const formatEventTime = (slot: Slot) => {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);
    const startTime = start.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const endTime = end.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${slot.service_name || "Service"} | ${startTime}-${endTime}`;
  };

  // Load offering patients when modal opens with OFFERING status (display only, calling is automatic)
  useEffect(() => {
    if (!selectedSlot || selectedSlot.status !== "OFFERING") return;

    const loadOfferingPatients = async () => {
      try {
        const response = await fetch(`/api/offerings?slotId=${selectedSlot.id}`);
        if (response.ok) {
          const data = await response.json();
          setOfferingPatients(data);
          console.log("[CALENDAR] Offering patients loaded for display", {
            count: data.length,
          });
        }
      } catch (error) {
        console.error("Error loading offering patients:", error);
      }
    };

    loadOfferingPatients();
  }, [selectedSlot?.id, selectedSlot?.status]);

  // Track when slots become OPEN and auto-convert after 5 seconds
  useEffect(() => {
    slots.forEach((slot) => {
      if (slot.status === "OPEN" && !openSlotTimestamps.has(slot.id)) {
        openSlotTimestamps.set(slot.id, Date.now());
      }
    });

    // Check if any OPEN slot has been open for 5+ seconds and convert it
    slots.forEach((slot) => {
      if (slot.status === "OPEN") {
        const openedAt = openSlotTimestamps.get(slot.id);
        if (openedAt && Date.now() - openedAt >= 5000) {
          // Auto-convert OPEN to OFFERING
          const convertSlot = async () => {
            try {
              const response = await fetch("/api/slots/offer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slotId: slot.id }),
              });

              if (response.ok) {
                openSlotTimestamps.delete(slot.id);
              }
            } catch (error) {
              console.error("Error converting slot to OFFERING:", error);
            }
          };

          convertSlot();
        }
      }
    });
  }, [slots, openSlotTimestamps]);

  // Auto-transition OPEN to OFFERING after 5 seconds
  useEffect(() => {
    if (!selectedSlot || selectedSlot.status !== "OPEN") return;

    const slotId = selectedSlot.id;
    const openedAt = openSlotTimestamps.get(slotId);
    if (!openedAt) return;

    const elapsedTime = Date.now() - openedAt;
    const remainingTime = Math.max(0, 5000 - elapsedTime);

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch("/api/slots/offer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotId }),
        });

        if (response.ok) {
          const data = await response.json();
          setOfferingPatients(data.patients || []);
          // Update selectedSlot to OFFERING
          setSelectedSlot((prev) =>
            prev && prev.id === slotId ? { ...prev, status: "OFFERING" } : null
          );
          openSlotTimestamps.delete(slotId);
        }
      } catch (error) {
        console.error("Error creating offerings:", error);
      }
    }, remainingTime);

    return () => clearTimeout(timeout);
  }, [selectedSlot?.id, selectedSlot?.status, openSlotTimestamps]);

  // Auto-initiate calls for OFFERING slots (without needing to open the modal)
  useEffect(() => {
    const offeringSlots = slots.filter(
      (slot) => slot.status === "OFFERING" && !slotsAlreadyOffering.current.has(slot.id)
    );

    if (offeringSlots.length === 0) return;

    offeringSlots.forEach((slot) => {
      console.log("[CALENDAR] New OFFERING slot detected, initiating call...", {
        slotId: slot.id,
      });

      slotsAlreadyOffering.current.add(slot.id);

      const initiateCall = async () => {
        try {
          // Fetch patients for this slot
          const patientsResponse = await fetch(`/api/offerings?slotId=${slot.id}`);
          if (!patientsResponse.ok) {
            console.error("[CALENDAR] Failed to fetch patients");
            return;
          }

          const patients = await patientsResponse.json();
          console.log("[CALENDAR] Patients loaded", {
            count: patients.length,
            firstPatient: patients[0]?.name,
          });

          if (patients.length === 0) {
            console.warn("[CALENDAR] No patients available for slot");
            return;
          }

          const patient = patients[0];

          // Start the call immediately
          console.log("[CALENDAR] Initiating Fonio call for:", patient.name);
          const callResponse = await fetch("/api/slots/start-call", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slotId: slot.id,
              patientName: patient.name,
              patientPhone: patient.phone,
              slotTime: new Date(slot.starts_at).toLocaleTimeString(),
              serviceName: slot.service_name,
            }),
          });

          if (callResponse.ok) {
            console.log("[CALENDAR] ✅ Auto-call initiated successfully");
          } else {
            const error = await callResponse.json();
            console.error("[CALENDAR] ❌ Failed to initiate auto-call", error);
          }
        } catch (error) {
          console.error("[CALENDAR] ❌ Error in auto-call:", error);
        }
      };

      // Initiate call immediately (no delay)
      initiateCall();
    });
  }, [slots]);

  // Monitor offerings for ALL OFFERING slots (even when modal is closed)
  useEffect(() => {
    // Find all OFFERING slots ONLY
    const offeringSlots = slots.filter((slot) => slot.status === "OFFERING");

    if (offeringSlots.length === 0) {
      console.log("[CALENDAR] No OFFERING slots to monitor");
      return;
    }

    console.log("[CALENDAR] Monitoring offerings for", offeringSlots.length, "slot(s)");

    const checkForNextPatient = async () => {
      for (const slot of offeringSlots) {
        try {
          // Fetch latest offerings for this slot
          const response = await fetch(`/api/offerings?slotId=${slot.id}`);
          if (!response.ok) continue;

          const offerings = await response.json();
          console.log("[CALENDAR] Background offering check", {
            slotId: slot.id,
            offeringCount: offerings.length,
            slotStatus: slot.status,
          });

          // IMPORTANT: Only call if slot is still OFFERING
          // If slot changed to BOOKED, offerings should be empty anyway
          if (slot.status !== "OFFERING") {
            console.log("[CALENDAR] Slot is no longer OFFERING, skipping");
            continue;
          }

          // If there are offerings available and no active call, call the first one
          if (offerings.length > 0) {
            const now = Date.now();
            const failureCooldownMs = 8000; // 8 second cooldown after failure

            // Only allow ONE call at a time (Fonio can only handle one)
            // Also respect cooldown period after failures
            if (
              (activeCallSlotId.current === null || activeCallSlotId.current === slot.id) &&
              (now - lastFailedAttempt.current) > failureCooldownMs
            ) {
              console.log(
                "[CALENDAR] Available patient found, initiating call:",
                offerings[0].name
              );

              activeCallSlotId.current = slot.id;

              // Parse the slot time correctly (handling UTC offset for Austria/Vienna timezone)
              const slotDate = new Date(slot.starts_at);
              // Subtract 2 hours for UTC+2 offset (same as calendar)
              slotDate.setHours(slotDate.getHours() - 2);
              const formattedTime = slotDate.toLocaleTimeString("de-AT", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });

              const callResponse = await fetch("/api/slots/start-call", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  slotId: slot.id,
                  patientName: offerings[0].name,
                  patientPhone: offerings[0].phone,
                  slotTime: formattedTime,
                  serviceName: slot.service_name,
                }),
              });

              if (callResponse.ok) {
                console.log("[CALENDAR] ✅ Call initiated for slot:", slot.id);
                lastFailedAttempt.current = 0; // Reset on success
              } else {
                console.error("[CALENDAR] ❌ Failed to initiate call for slot:", slot.id);
                activeCallSlotId.current = null; // Clear on failure
                lastFailedAttempt.current = now; // Track failure time
              }
            } else {
              console.log("[CALENDAR] ⏳ Another call is active, waiting...", {
                activeSlot: activeCallSlotId.current,
                currentSlot: slot.id,
              });
            }
          } else {
            console.log("[CALENDAR] ⚠️ No more patients available for slot:", slot.id);
            // Clear active call when no more patients
            if (activeCallSlotId.current === slot.id) {
              activeCallSlotId.current = null;
            }
          }
        } catch (error) {
          console.error("[CALENDAR] Error checking offerings for slot:", error);
        }
      }
    };

    // Check every 1 second for changes in offerings
    const interval = setInterval(checkForNextPatient, 1000);
    return () => {
      console.log("[CALENDAR] Clearing offering monitor interval");
      clearInterval(interval);
    };
  }, [slots]);

  const handleStartFonioCall = async (patient: any, index: number = 0) => {
    if (!selectedSlot || !patient) return;

    setCurrentlyCallingIndex(index);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/slots/start-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          patientName: patient.name,
          patientPhone: patient.phone,
          slotTime: new Date(selectedSlot.starts_at).toLocaleTimeString(),
          serviceName: selectedSlot.service_name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Fonio call initiated:", data);
        // The webhook will update the status when Fonio gets the response
      } else {
        const error = await response.json();
        console.error(`Error starting call: ${error.error}`);
        setCurrentlyCallingIndex(-1);
      }
    } catch (error) {
      console.error("Error starting Fonio call:", error);
      setCurrentlyCallingIndex(-1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBookManually = async () => {
    if (!selectedPatient || !selectedSlot) return;

    try {
      const response = await fetch("/api/slots/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          patientId: selectedPatient,
        }),
      });

      if (response.ok) {
        setShowBookForm(false);
        setSelectedPatient("");
        setSelectedSlot(null);
        setOfferingPatients([]);
        alert("Patient booked successfully");
      } else {
        alert("Error booking patient");
      }
    } catch (error) {
      console.error("Error booking patient:", error);
      alert("Error booking patient");
    }
  };

  // Generate hour labels (8:00 to 18:30)
  const hours = Array.from({ length: Math.ceil((END_HOUR - START_HOUR) * 2) }, (_, i) => {
    const totalHours = START_HOUR + i / 2;
    const hour = Math.floor(totalHours);
    const minutes = (totalHours % 1) * 60;
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return {
      hour: totalHours,
      display: `${displayHour}:${minutes === 0 ? "00" : "30"} ${ampm}`,
    };
  });

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
            {formatWeekRange()}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              border: "1px solid",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "oklch(98.14% 0.034 99.83 / 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--card)";
            }}
          >
            <ChevronLeft className="h-5 w-5" style={{ color: "var(--foreground)" }} />
          </button>

          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              border: "1px solid var(--primary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Today
          </button>

          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              border: "1px solid",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "oklch(98.14% 0.034 99.83 / 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--card)";
            }}
          >
            <ChevronRight className="h-5 w-5" style={{ color: "var(--foreground)" }} />
          </button>
        </div>
      </div>

      {/* Calendar Container */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Day Headers */}
        <div className="grid" style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}>
          <div /> {/* Empty corner */}
          {weekDays.map((date, i) => {
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div
                key={i}
                className="p-4 text-center border-r last:border-r-0"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: isToday ? "oklch(31.18% 0.053 129.56 / 0.05)" : "transparent",
                  borderRight: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {dayNames[i]}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{
                    color: isToday ? "var(--primary)" : "var(--foreground)",
                  }}
                >
                  {date.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div className="grid" style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}>
          {/* Time column */}
          <div
            style={{
              backgroundColor: "oklch(98.14% 0.034 99.83 / 0.3)",
              borderRight: "1px solid var(--border)",
            }}
          >
            {hours.map((timeSlot, idx) => (
              <div
                key={idx}
                className="text-right text-xs font-medium p-2"
                style={{
                  height: `${HOUR_HEIGHT / 2}px`,
                  color: "var(--muted-foreground)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {timeSlot.display}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((date, dayIdx) => (
            <div
              key={dayIdx}
              className="relative border-r last:border-r-0"
              style={{
                borderColor: "var(--border)",
                borderRight: "1px solid var(--border)",
              }}
            >
              {/* Hour grid lines */}
              {hours.map((_, hourIdx) => (
                <div
                  key={hourIdx}
                  className="absolute w-full border-b"
                  style={{
                    height: `${HOUR_HEIGHT / 2}px`,
                    top: `${hourIdx * (HOUR_HEIGHT / 2)}px`,
                    borderColor: "var(--border)",
                  }}
                />
              ))}

              {/* Events */}
              <div style={{ position: "relative", height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px`, overflow: "hidden" }}>
                {getSlotsForDay(date).map((slot) => {
                  const { topPx, heightPx } = getEventPosition(slot);
                  const start = new Date(slot.starts_at);
                  const end = new Date(slot.ends_at);
                  // Adjust for timezone offset
                  start.setHours(start.getHours() - 2);
                  end.setHours(end.getHours() - 2);
                  const startTime = start.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });
                  const endTime = end.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });

                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className="absolute rounded px-2 py-1 text-xs font-medium overflow-hidden flex flex-col cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        top: `${topPx + 4}px`,
                        left: "4px",
                        right: "4px",
                        height: `${heightPx - 8}px`,
                        backgroundColor: getStatusColor(slot.status),
                        color: "white",
                      }}
                      title={formatEventTime(slot)}
                    >
                      <div className="font-bold">{slot.service_name}</div>
                      <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.3)", margin: "2px 0" }} />
                      <div className="font-semibold">{startTime}-{endTime}</div>
                      <div className="text-xs opacity-90">{slot.status}</div>
                      {slot.status === "BOOKED" && slot.patient_name && (
                        <div className="text-xs mt-0.5 truncate">Patient: {slot.patient_name}</div>
                      )}
                      {(slot.status === "OPEN" || slot.status === "ESCALATED") && (
                        <div className="text-xs mt-0.5 font-bold">URGENT!</div>
                      )}
                      {slot.status === "OFFERING" && (
                        <div className="text-xs mt-0.5 font-bold">Calling patients...</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <p className="mt-4 text-center" style={{ color: "var(--muted-foreground)" }}>
          Loading slots...
        </p>
      )}


      {/* Slot Detail Modal */}
      {selectedSlot && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setSelectedSlot(null)}
        >
          <div
            className="rounded-lg w-full max-w-2xl"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-8 border-b"
              style={{
                backgroundColor: getStatusColor(selectedSlot.status),
                color: "white",
                borderColor: "var(--border)",
              }}
            >
              <div>
                <h2 className="text-3xl font-bold">
                  {selectedSlot.service_name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-2 hover:opacity-80 transition-opacity"
              >
                <X className="h-8 w-8" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>
                    Time
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                    {new Date(selectedSlot.starts_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })} - {new Date(selectedSlot.ends_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>
                    Status
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                    {selectedSlot.status}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>
                    Date
                  </p>
                  <p className="text-xl" style={{ color: "var(--foreground)" }}>
                    {new Date(selectedSlot.starts_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Patient Information for BOOKED */}
              {selectedSlot.status === "BOOKED" && selectedSlot.patient_name && (
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: "oklch(60% 0.15 155 / 0.1)",
                    borderColor: "oklch(60% 0.15 155)",
                  }}
                >
                  <h3 className="text-lg font-bold mb-3" style={{ color: "var(--foreground)" }}>
                    Patient Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
                        Name
                      </p>
                      <p style={{ color: "var(--foreground)" }}>{selectedSlot.patient_name}</p>
                    </div>
                    {selectedSlot.patient_email && (
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
                          Email
                        </p>
                        <p style={{ color: "var(--foreground)" }}>{selectedSlot.patient_email}</p>
                      </div>
                    )}
                    {selectedSlot.patient_phone && (
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--muted-foreground)" }}>
                          Phone
                        </p>
                        <p style={{ color: "var(--foreground)" }}>{selectedSlot.patient_phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message for OPEN status */}
              {selectedSlot.status === "OPEN" && (
                <div
                  className="p-4 rounded-lg text-center"
                  style={{
                    backgroundColor: "oklch(60.94% 0.130 57.35 / 0.1)",
                  }}
                >
                  <p style={{ color: "var(--foreground)" }} className="font-semibold animate-pulse">
                    🔍 Searching for potential patients to cover the open slot...
                  </p>
                </div>
              )}

              {/* Manually Book Form for ESCALATED */}
              {selectedSlot.status === "ESCALATED" && !showBookForm && (
                <button
                  onClick={() => {
                    setShowBookForm(true);
                    // Load patients on demand
                    const loadPatients = async () => {
                      try {
                        const response = await fetch("/api/patients");
                        if (response.ok) {
                          const data = await response.json();
                          setPatients(data);
                        }
                      } catch (error) {
                        console.error("Error loading patients:", error);
                      }
                    };
                    loadPatients();
                  }}
                  className="w-full px-6 py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  Manually Book Patient
                </button>
              )}

              {/* Patients to be called for OFFERING */}
              {selectedSlot.status === "OFFERING" && (
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: "oklch(60.94% 0.130 57.35 / 0.1)",
                    borderColor: "oklch(60.94% 0.130 57.35)",
                  }}
                >
                  <h3 className="text-lg font-bold mb-4" style={{ color: "var(--foreground)" }}>
                    Calling...
                    {currentlyCallingIndex >= 0 && offeringPatients[currentlyCallingIndex] && (
                      <span style={{ color: "oklch(60.94% 0.130 57.35)" }} className="ml-2">
                        {offeringPatients[currentlyCallingIndex].name}
                      </span>
                    )}
                  </h3>
                  <div
                    className="space-y-2 overflow-y-auto mb-4"
                    style={{ maxHeight: "300px" }}
                  >
                    {offeringPatients.length > 0 ? (
                      offeringPatients.map((patient, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded transition-all"
                          style={{
                            backgroundColor: idx === currentlyCallingIndex
                              ? "oklch(60.94% 0.130 57.35 / 0.2)"
                              : "var(--card)",
                            borderLeft: idx === currentlyCallingIndex
                              ? "4px solid oklch(60.94% 0.130 57.35)"
                              : "4px solid transparent",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold" style={{ color: "var(--foreground)" }}>
                                {idx + 1}. {patient.name}
                                {idx === currentlyCallingIndex && (
                                  <span className="ml-2 animate-pulse">📞</span>
                                )}
                              </p>
                              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                {patient.email}
                              </p>
                              {patient.phone && (
                                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                                  {patient.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "var(--muted-foreground)" }} className="text-sm">
                        Loading patients...
                      </p>
                    )}
                  </div>

                </div>
              )}

              {/* Booking Form */}
              {(selectedSlot.status === "ESCALATED" || selectedSlot.status === "OPEN") && showBookForm && (
                <div
                  className="p-4 rounded-lg space-y-4"
                  style={{
                    backgroundColor: "oklch(55% 0.20 20 / 0.1)",
                    borderColor: "oklch(55% 0.20 20)",
                  }}
                >
                  <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                    Select Patient
                  </h3>
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  >
                    <option value="">Choose a patient...</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-3">
                    <button
                      onClick={handleBookManually}
                      disabled={!selectedPatient}
                      className="flex-1 px-4 py-2 rounded-lg font-bold text-white transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      Book
                    </button>
                    <button
                      onClick={() => {
                        setShowBookForm(false);
                        setSelectedPatient("");
                      }}
                      className="flex-1 px-4 py-2 rounded-lg font-bold transition-colors"
                      style={{
                        backgroundColor: "var(--card)",
                        color: "var(--foreground)",
                        borderColor: "var(--border)",
                        border: "1px solid",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
