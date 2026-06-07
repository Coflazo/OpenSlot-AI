"use client";

import { useState } from "react";
import { Bell, ChevronDown, X } from "lucide-react";

const clinics = [
  { id: 1, name: "Vienna Private Imaging", emoji: "🏥" },
  { id: 2, name: "Central Medical Clinic", emoji: "⚕️" },
  { id: 3, name: "East Side Surgery", emoji: "🩺" },
];

const notifications = [
  { id: 1, title: "Slot recovered", message: "MRI Knee slot filled by patient", time: "5m ago" },
  { id: 2, title: "New request", message: "3 patients added to waitlist", time: "12m ago" },
  { id: 3, title: "Call completed", message: "Appointment confirmed with Anna M.", time: "23m ago" },
];

export function Header() {
  const [selectedClinic, setSelectedClinic] = useState(1);
  const [showClinicMenu, setShowClinicMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<number[]>([]);

  const activeClinic = clinics.find((c) => c.id === selectedClinic);
  const visibleNotifications = notifications.filter(
    (n) => !dismissedNotifications.includes(n.id)
  );

  const dismissNotification = (id: number) => {
    setDismissedNotifications([...dismissedNotifications, id]);
  };

  return (
    <header className="h-16 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shadow-lg">
      {/* Left: Clinic Selector */}
      <div className="relative">
        <button
          onClick={() => setShowClinicMenu(!showClinicMenu)}
          className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="text-xl">{activeClinic?.emoji}</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-white truncate max-w-[200px]">
              {activeClinic?.name}
            </div>
            <div className="text-xs text-slate-400">Active clinic</div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${
              showClinicMenu ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Clinic dropdown */}
        {showClinicMenu && (
          <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
            {clinics.map((clinic) => (
              <button
                key={clinic.id}
                onClick={() => {
                  setSelectedClinic(clinic.id);
                  setShowClinicMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                  selectedClinic === clinic.id
                    ? "bg-blue-600/20 border-l-2 border-l-blue-500"
                    : "border-l-2 border-l-transparent hover:bg-slate-700/50"
                }`}
              >
                <span className="text-xl">{clinic.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{clinic.name}</div>
                  <div className="text-xs text-slate-400">
                    {selectedClinic === clinic.id && "Currently selected"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Notifications & Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-slate-400 hover:text-slate-300" />
            {visibleNotifications.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Notifications dropdown */}
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
              <div className="px-4 py-3 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {visibleNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400">
                    <p className="text-sm">No new notifications</p>
                  </div>
                ) : (
                  visibleNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="px-4 py-3 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/30 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">{notif.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{notif.message}</p>
                          <p className="text-xs text-slate-500 mt-2">{notif.time}</p>
                        </div>
                        <button
                          onClick={() => dismissNotification(notif.id)}
                          className="ml-2 p-1 rounded hover:bg-slate-700 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          aria-label="Dismiss notification"
                        >
                          <X className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm cursor-pointer">
          A
        </div>
      </div>
    </header>
  );
}
