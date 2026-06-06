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
  const { selectSlot } = useFonio();

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar />
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
          <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_340px] divide-x divide-border">
            <TodayBoard />
            <SlotDetailPanel />
            <AttentionRail
              onOpenSlot={(id) => {
                selectSlot(id);
                setTab("today");
              }}
            />
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
