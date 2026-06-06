import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FonioProvider, useFonio } from "@/lib/fonio/store";
import { TopBar } from "@/components/fonio/TopBar";
import { AttentionRail } from "@/components/fonio/AttentionRail";
import { TodayBoard } from "@/components/fonio/TodayBoard";
import { SlotDetailPanel } from "@/components/fonio/SlotDetailPanel";
import { WaitlistTab } from "@/components/fonio/WaitlistTab";
import { AnalyticsTab } from "@/components/fonio/AnalyticsTab";
import { SettingsTab } from "@/components/fonio/SettingsTab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fonio — Waitlist appointment recovery" },
      {
        name: "description",
        content:
          "Operational console for receptionists to recover open appointment slots from the waitlist.",
      },
      { property: "og:title", content: "Fonio — Waitlist appointment recovery" },
      {
        property: "og:description",
        content:
          "Operational console for receptionists to recover open appointment slots from the waitlist.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <FonioProvider>
      <FonioApp />
      <Toaster position="top-right" richColors closeButton />
    </FonioProvider>
  );
}

function FonioApp() {
  const [tab, setTab] = useState("today");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const { selectSlot } = useFonio();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 top-14 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`fixed left-0 top-14 z-50 h-[calc(100vh-56px)] w-64 bg-card transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex flex-col gap-1 border-b border-border p-4">
          {[
            ["today", "📅 Today"],
            ["waitlist", "⏳ Waitlist"],
            ["analytics", "📊 Analytics"],
            ["settings", "⚙️ Settings"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => {
                setTab(v);
                setSidebarOpen(false);
              }}
              className={`rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${
                tab === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </nav>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border bg-card px-4">
          <TabsList className="h-10 bg-transparent p-0">
            {[
              ["today", "Today"],
              ["waitlist", "Waitlist"],
              ["analytics", "Analytics"],
              ["settings", "Settings"],
            ].map(([v, l]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {l}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent
          value="today"
          className="m-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
        >
          <div className="relative flex h-full flex-col">
            {/* Toggle Buttons */}
            <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
              <button
                onClick={() => setShowRightPanel(!showRightPanel)}
                className="rounded px-2 py-1 text-sm font-medium transition-colors hover:bg-muted"
                title={showRightPanel ? "Hide alerts" : "Show alerts"}
              >
                {showRightPanel ? "✓ Alerts" : "✕ Alerts"}
              </button>
            </div>

            {/* Content Grid */}
            <div
              className="flex flex-1 overflow-hidden 2xl:grid 2xl:grid-rows-[minmax(0,1fr)] 2xl:overflow-hidden 2xl:divide-x 2xl:divide-border"
              style={{
                gridTemplateColumns: `minmax(760px,1fr) minmax(420px,0.8fr) ${showRightPanel ? "340px" : "0"}`,
              }}
            >
              <TodayBoard />
              <SlotDetailPanel />
              {showRightPanel && (
                <div className="overflow-hidden">
                    <AttentionRail
                      onOpenSlot={(id) => {
                        selectSlot(id);
                        setTab("today");
                        window.requestAnimationFrame(() => {
                          document
                            .getElementById("slot-detail-panel")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                      }}
                    />
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent
          value="waitlist"
          className="m-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
        >
          <WaitlistTab />
        </TabsContent>
        <TabsContent
          value="analytics"
          className="m-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
        >
          <AnalyticsTab />
        </TabsContent>
        <TabsContent
          value="settings"
          className="m-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
        >
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
