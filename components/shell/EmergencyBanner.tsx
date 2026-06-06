"use client";

import Link from "next/link";
import { WarningOctagonIcon, PauseIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { timeLeft, timeOfDay } from "@/lib/format";

export function EmergencyBanner() {
  const slots = useStore((s) => s.slots);
  const urgent = slots
    .filter((s) => s.status === "open" || s.status === "calling")
    .map((s) => ({ s, tl: timeLeft(s.startTime) }))
    .filter(({ tl }) => tl.minutes > 0 && tl.minutes < 90)
    .sort((a, b) => a.tl.minutes - b.tl.minutes)[0];

  return (
    <AnimatePresence>
      {urgent && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="bg-sienna text-white"
        >
          <div className="px-6 h-10 flex items-center gap-3 text-[13px]">
            <WarningOctagonIcon size={16} weight="fill" className="shrink-0 animate-urgent" />
            <div className="font-[600]">
              Urgent open slot:{" "}
              <span className="font-[700]">{urgent.s.service}</span> at{" "}
              {timeOfDay(urgent.s.startTime)}.{" "}
              <span className="opacity-90">{urgent.tl.label} to fill.</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href={`/open-slots?id=${urgent.s.id}`}
                className="px-2.5 py-1 rounded-btn bg-white/15 hover:bg-white/25 text-[12px] font-[600]"
              >
                View slot
              </Link>
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn bg-white text-sienna text-[12px] font-[700]">
                <PauseIcon size={12} weight="fill" />
                Pause calls
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
