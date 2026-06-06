"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LightningIcon, ArrowCounterClockwiseIcon, CaretRightIcon, XIcon, FlaskIcon } from "@phosphor-icons/react/dist/ssr";
import { useStore } from "@/lib/store";
import { Button } from "../primitives/button";
import { HERO_SLOT_ID } from "@/lib/mock/slots";

export function SimulationControls() {
  const [open, setOpen] = useState(true);
  const isSimulating = useStore((s) => s.isSimulating);
  const demoStep = useStore((s) => s.demoStep);
  const runDemoCascade = useStore((s) => s.runDemoCascade);
  const resetDemo = useStore((s) => s.resetDemo);
  const heroSlot = useStore((s) => s.slots.find((sl) => sl.id === HERO_SLOT_ID));
  const isCancelled = heroSlot?.status !== "booked";

  return (
    <div className="fixed bottom-5 right-5 z-40">
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
              <p className="text-[12.5px] leading-[18px] text-white/70">
                Run the scripted cascade: a 16:30 MRI Knee cancellation, Alex upgrade,
                Sara declines, Mia accepts from waitlist.
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
              <Button
                variant="ghost"
                className="w-full text-white/80 hover:text-white hover:bg-white/10"
                onClick={resetDemo}
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
