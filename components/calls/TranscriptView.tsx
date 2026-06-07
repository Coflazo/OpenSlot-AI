"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr";
import type { CallSession } from "@/lib/types";
import { initials } from "@/lib/format";
import { useStore } from "@/lib/store";

export function TranscriptView({ call }: { call: CallSession }) {
  const customer = useStore((s) => s.customers.find((c) => c.id === call.customerId));
  const isLive = call.status === "in_progress" || call.status === "ringing";

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {call.transcript.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className={
              "flex gap-3 " + (t.speaker === "agent" ? "" : "flex-row-reverse")
            }
          >
            <div
              className={
                "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10.5px] font-[700] " +
                (t.speaker === "agent"
                  ? "bg-violet text-white"
                  : "bg-saffron-100 text-saffron-700 ring-2 ring-saffron-200")
              }
            >
              {t.speaker === "agent" ? "AI" : customer ? initials(customer.name) : "C"}
            </div>
            <div
              className={
                "max-w-[78%] rounded-card p-3 text-[13.5px] leading-[20px] " +
                (t.speaker === "agent"
                  ? "bg-porcelain border border-stone/80 text-ink"
                  : "bg-violet-50 text-violet-900")
              }
            >
              <div className="text-[10.5px] uppercase tracking-wider font-[700] text-ink-400 mb-1">
                {t.speaker === "agent" ? "Lina · AI agent" : customer?.name ?? "Customer"}
              </div>
              {t.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {isLive && (
        <div className="flex items-center gap-2 text-meta text-ink-400 pl-10">
          <CircleNotchIcon size={12} className="animate-spin" />
          Listening…
        </div>
      )}
    </div>
  );
}
