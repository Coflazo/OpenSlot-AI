"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { EmergencyBanner } from "./EmergencyBanner";
import { SimulationControls } from "../debug/SimulationControls";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <EmergencyBanner />
        <Topbar />
        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10 max-w-[1480px] w-full mx-auto">
          {children}
        </main>
      </div>
      <SimulationControls />
    </div>
  );
}
