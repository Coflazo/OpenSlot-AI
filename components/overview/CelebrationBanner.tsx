"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ConfettiIcon, XIcon, CoinIcon } from "@phosphor-icons/react/dist/ssr";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";

export function CelebrationBanner() {
  const demoStep = useStore((s) => s.demoStep);
  const recoveredRevenue = useStore((s) => s.recoveredRevenue);
  const slotsSaved = useStore((s) => s.slotsSaved);
  const [show, setShow] = useState(false);
  const [snapshot, setSnapshot] = useState({ revenue: 0, saved: 0 });

  useEffect(() => {
    if (demoStep === "completed") {
      setSnapshot({ revenue: recoveredRevenue, saved: slotsSaved });
      setShow(true);
    }
  }, [demoStep, recoveredRevenue, slotsSaved]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="relative overflow-hidden rounded-card bg-gradient-to-r from-vert-600 to-peacock text-white p-5 shadow-cardHover"
        >
          <Particles />
          <div className="relative flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-card bg-white/15 flex items-center justify-center">
              <ConfettiIcon size={24} weight="fill" className="text-saffron" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-[0.14em] font-[700] opacity-80">
                Cascade completed
              </div>
              <div className="text-section text-white mt-0.5">Slot recovered. The chain held.</div>
              <div className="text-[13.5px] mt-1 opacity-90">
                The cancelled MRI Knee was filled, Alex moved earlier, and Mia took July 20 from the waitlist.
              </div>
              <div className="mt-3 flex items-center gap-4 text-[13.5px] font-[600]">
                <span className="inline-flex items-center gap-2 bg-white/15 rounded-chip px-3 py-1.5">
                  <CoinIcon size={13} weight="fill" className="text-saffron" />
                  <span className="font-mono tabular-nums">{money(snapshot.revenue)}</span>
                </span>
                <span className="opacity-90 font-mono tabular-nums">{snapshot.saved} slots saved</span>
                <span className="opacity-90 font-mono tabular-nums">0 double-bookings</span>
              </div>
            </div>
            <button
              onClick={() => setShow(false)}
              className="text-white/80 hover:text-white"
              aria-label="Dismiss"
            >
              <XIcon size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Particles() {
  const dots = Array.from({ length: 20 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((_, i) => {
        const top = (i * 73) % 100;
        const left = (i * 47) % 100;
        const dur = 1.6 + (i % 5) * 0.3;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: [0, 1, 0], y: [0, -18, -8] }}
            transition={{ duration: dur, repeat: Infinity, delay: i * 0.07, ease: "easeOut" }}
            className="absolute h-1 w-1 rounded-full bg-saffron"
            style={{ top: `${top}%`, left: `${left}%` }}
          />
        );
      })}
    </div>
  );
}
