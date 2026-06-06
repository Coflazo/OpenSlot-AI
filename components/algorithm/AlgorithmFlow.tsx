"use client";

import { motion } from "framer-motion";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr";

const STEPS = [
  { title: "1 · Open slot detected", body: "A booked appointment was cancelled or manually opened." },
  { title: "2 · Hard filter gate", body: "Consent, eligibility, service match, contrast, cooldown." },
  { title: "3 · Route feasibility", body: "A* drive-time check. If unreachable in time, candidate is travel-blocked." },
  { title: "4 · Weighted score", body: "Eligibility, urgency, wait, pickup, business, preference, travel − cooldown." },
  { title: "5 · Aggression engine", body: "Time-left decides how many candidates to call in parallel." },
  { title: "6 · Outbound calls", body: "Fonio dials feasible consented candidates with idempotent offer IDs." },
  { title: "7 · Transactional lock", body: "First acceptance wins via Supabase claim_open_slot RPC." },
  { title: "8 · Cascade", body: "If the accepter had a future booking, their old slot opens next." }
];

export function AlgorithmFlow() {
  return (
    <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {STEPS.map((s, i) => (
        <motion.li
          key={s.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 220, damping: 24 }}
          className="rounded-card bg-white shadow-card p-4"
        >
          <div className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700]">Step</div>
          <div className="text-[14px] font-[700] mt-0.5">{s.title}</div>
          <div className="text-meta text-ink-500 mt-1.5 leading-snug">{s.body}</div>
        </motion.li>
      ))}
    </ol>
  );
}
