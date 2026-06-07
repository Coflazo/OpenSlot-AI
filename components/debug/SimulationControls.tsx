"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LightningIcon,
  ArrowCounterClockwiseIcon,
  CaretRightIcon,
  XIcon,
  FlaskIcon,
  PlayIcon
} from "@phosphor-icons/react/dist/ssr";
import { useStore } from "@/lib/store";
import { Button } from "../primitives/button";
import { HERO_SLOT_ID } from "@/lib/mock/slots";
import { LiveCallPanel } from "./LiveCallPanel";

export function SimulationControls() {
  const [open, setOpen] = useState(true);
  const [dismissedOfferIds, setDismissedOfferIds] = useState<Set<string>>(() => new Set());
  const isSimulating = useStore((s) => s.isSimulating);
  const demoStep = useStore((s) => s.demoStep);
  const datasetMode = useStore((s) => s.datasetMode);
  const setDatasetMode = useStore((s) => s.setDatasetMode);
  const runDemoCascade = useStore((s) => s.runDemoCascade);
  const runTwoPersonDemo = useStore((s) => s.runTwoPersonDemo);
  const resetDemo = useStore((s) => s.resetDemo);
  const calls = useStore((s) => s.calls);
  const heroSlot = useStore((s) => s.slots.find((sl) => sl.id === HERO_SLOT_ID));
  const isCancelled = heroSlot?.status !== "booked";
  const demoOfferIds = calls
    .map((call) => call.offerId)
    .filter((offerId, index, all) => offerId.startsWith("demo_") && all.indexOf(offerId) === index);
  const visibleOfferIds = demoOfferIds.filter((offerId) => !dismissedOfferIds.has(offerId)).slice(0, 2);

  const handleTwoPersonDemo = () => {
    setDismissedOfferIds(new Set());
    void runTwoPersonDemo();
  };

  const handleReset = () => {
    setDismissedOfferIds(new Set());
    resetDemo();
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {visibleOfferIds.length > 0 && (
        <div className="w-[324px] space-y-2">
          <AnimatePresence>
            {visibleOfferIds.map((offerId) => (
              <LiveCallPanel
                key={offerId}
                offerId={offerId}
                onClose={() =>
                  setDismissedOfferIds((current) => {
                    const next = new Set(current);
                    next.add(offerId);
                    return next;
                  })
                }
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-[324px] rounded-card bg-ink text-white shadow-cardHover overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
              <FlaskIcon size={14} weight="fill" className="text-saffron" />
              <div className="text-[12px] font-[700] uppercase tracking-wider text-white/80">
                Simulation
              </div>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-white/40">
                {demoStep.replace("_", " ")}
              </span>
              <button
                className="text-white/60 hover:text-white"
                onClick={() => setOpen(false)}
                aria-label="Collapse"
              >
                <XIcon size={14} />
              </button>
            </div>
            <div className="px-4 pb-4 space-y-3">
              {/* DATASET TOGGLE */}
              <div>
                <div className="text-[11px] uppercase tracking-wider text-white/60 font-[700] mb-1.5">
                  Dataset
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-chip bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setDatasetMode("realistic")}
                    disabled={isSimulating}
                    className={`text-[11.5px] font-[600] py-1.5 rounded-chip transition-colors ${
                      datasetMode === "realistic"
                        ? "bg-white text-ink"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    Realistic
                  </button>
                  <button
                    type="button"
                    onClick={() => setDatasetMode("two_person")}
                    disabled={isSimulating}
                    className={`text-[11.5px] font-[600] py-1.5 rounded-chip transition-colors ${
                      datasetMode === "two_person"
                        ? "bg-white text-ink"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    Demo (1 call)
                  </button>
                </div>
                <p className="text-[11.5px] leading-[16px] text-white/55 mt-1.5">
                  {datasetMode === "two_person"
                    ? "OpenSlot removes Çağan's tomorrow 14:00 booking, then calls Ash."
                    : "Full clinic dataset with the seeded waitlist and calendar."}
                </p>
              </div>

              <div className="h-px bg-white/10" />

              {/* PRIMARY ACTION */}
              {datasetMode === "two_person" ? (
                <>
                  <p className="text-[12.5px] leading-[18px] text-white/70">
                    One-call demo. OpenSlot manually opens Çağan's booking, then calls Ash at +49 15510 847258.
                  </p>
                  <Button
                    variant="primary"
                    className="w-full bg-saffron text-ink hover:bg-saffron-400"
                    onClick={handleTwoPersonDemo}
                    disabled={isSimulating}
                  >
                    <PlayIcon size={14} weight="fill" />
                    {isSimulating ? "Demo running…" : "Start demo"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-[12.5px] leading-[18px] text-white/70">
                    Scripted cascade: 16:30 MRI Knee cancellation, Alex upgrade, Sara declines, Mia accepts from waitlist.
                  </p>
                  <Button
                    variant="primary"
                    className="w-full bg-saffron text-ink hover:bg-saffron-400"
                    onClick={runDemoCascade}
                    disabled={isSimulating || isCancelled}
                  >
                    <LightningIcon size={14} weight="fill" />
                    {isSimulating ? "Cascade running…" : "Cancel today 16:30"}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                className="w-full text-white/80 hover:text-white hover:bg-white/10"
                onClick={handleReset}
                disabled={isSimulating}
              >
                <ArrowCounterClockwiseIcon size={14} />
                Reset demo
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-chip bg-ink text-white shadow-cardHover hover:scale-[1.02] transition-transform"
          >
            <FlaskIcon size={14} weight="fill" className="text-saffron" />
            <span className="text-[12px] font-[700] uppercase tracking-wider">
              Simulation
            </span>
            <CaretRightIcon size={12} className="-mr-1 rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
