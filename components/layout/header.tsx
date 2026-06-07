"use client";

import { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";

const clinics = [
  { id: 1, name: "Business 1" },
  { id: 2, name: "Business 2" },
  { id: 3, name: "Business 3" },
];

export function Header() {
  const [selectedClinic, setSelectedClinic] = useState(1);
  const [showClinicMenu, setShowClinicMenu] = useState(false);

  const activeClinic = clinics.find((c) => c.id === selectedClinic);

  return (
    <header
      className="h-16 border-b flex items-center justify-end px-8 shadow-lg gap-6"
      style={{
        backgroundColor: 'var(--primary)',
        borderColor: 'oklch(31.18% 0.053 129.56 / 0.5)'
      }}
    >
      {/* Business Selector */}
      <div className="relative">
        <button
          onClick={() => setShowClinicMenu(!showClinicMenu)}
          className="flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer border"
          style={{
            backgroundColor: 'oklch(31.18% 0.053 129.56 / 0.5)',
            borderColor: 'oklch(31.18% 0.053 129.56 / 0.7)',
            color: 'var(--primary-foreground)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'oklch(31.18% 0.053 129.56 / 0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'oklch(31.18% 0.053 129.56 / 0.5)';
          }}
        >
          <div className="text-left">
            <div
              className="text-sm font-semibold"
              style={{ color: 'var(--primary-foreground)' }}
            >
              {activeClinic?.name}
            </div>
            <div
              className="text-xs"
              style={{ color: 'oklch(1 0 0 / 0.7)' }}
            >
              Active
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${showClinicMenu ? "rotate-180" : ""}`}
            style={{ color: 'oklch(1 0 0 / 0.7)' }}
          />
        </button>

        {/* Business dropdown */}
        {showClinicMenu && (
          <div
            className="absolute top-full left-0 mt-2 w-64 rounded-lg shadow-lg border z-50 overflow-hidden"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            {clinics.map((clinic) => (
              <button
                key={clinic.id}
                onClick={() => {
                  setSelectedClinic(clinic.id);
                  setShowClinicMenu(false);
                }}
                className="w-full px-4 py-3 text-left transition-colors cursor-pointer border-l-4 text-sm"
                style={{
                  borderColor:
                    selectedClinic === clinic.id
                      ? 'var(--primary)'
                      : 'transparent',
                  backgroundColor:
                    selectedClinic === clinic.id
                      ? 'oklch(31.18% 0.053 129.56 / 0.05)'
                      : 'transparent',
                  color: 'var(--foreground)',
                }}
                onMouseEnter={(e) => {
                  if (selectedClinic !== clinic.id) {
                    e.currentTarget.style.backgroundColor = 'oklch(98.14% 0.034 99.83 / 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedClinic !== clinic.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="font-semibold">{clinic.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notification Bell - Simple */}
      <button
        className="relative p-2 rounded-lg transition-colors cursor-pointer"
        style={{ color: 'oklch(1 0 0 / 0.8)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'oklch(31.18% 0.053 129.56 / 0.3)';
          e.currentTarget.style.color = 'var(--primary-foreground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'oklch(1 0 0 / 0.8)';
        }}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span
          className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      </button>
    </header>
  );
}
