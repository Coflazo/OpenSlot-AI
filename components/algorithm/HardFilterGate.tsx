"use client";

import { motion } from "framer-motion";
import { CheckIcon, ShieldCheckIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import type { AlgorithmExplanation } from "@/lib/algo/types";
import { cn } from "@/lib/cn";

const GATES = [
  { key: "Consent", match: ["No call consent", "Customer opted out"] },
  { key: "Service", match: ["Wrong service type", "Requested different service"] },
  { key: "Safety form", match: ["Safety form incomplete"] },
  { key: "Referral", match: ["Referral missing"] },
  { key: "Payment", match: ["Payment not ready"] },
  { key: "Authorization", match: ["Authorization not approved"] },
  { key: "Contrast", match: ["Contrast status pending"] },
  { key: "Travel", match: ["Travel blocked"] },
  { key: "Cooldown", match: ["Contacted too recently"] }
];

export function HardFilterGate({ candidates }: { candidates: AlgorithmExplanation[] }) {
  return (
    <div className="rounded-card bg-white shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheckIcon size={16} weight="duotone" className="text-peacock" />
        <h3 className="text-section">Hard filter gate</h3>
        <span className="ml-auto text-meta text-ink-400">
          {candidates.filter((c) => c.blocks.length === 0).length}/{candidates.length} pass
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-wider text-ink-400 font-[700]">
              <th className="pb-2 pr-3">Customer</th>
              {GATES.map((g) => (
                <th key={g.key} className="pb-2 px-1.5 text-center">{g.key}</th>
              ))}
              <th className="pb-2 pl-3 text-right">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const allPass = c.blocks.length === 0;
              return (
                <tr key={c.customerId} className="border-t border-stone/60">
                  <td className="py-2 pr-3 truncate max-w-[180px]">
                    <span className="font-[650]">{c.customerName}</span>
                  </td>
                  {GATES.map((g) => {
                    const blocked = c.blocks.some((b) => g.match.some((m) => b.includes(m)));
                    return (
                      <td key={g.key} className="py-2 px-1.5 text-center">
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={cn(
                            "inline-flex h-5 w-5 rounded-full items-center justify-center",
                            blocked ? "bg-sienna-100 text-sienna-700" : "bg-vert-100 text-vert-700"
                          )}
                        >
                          {blocked ? <XIcon size={10} weight="bold" /> : <CheckIcon size={10} weight="bold" />}
                        </motion.span>
                      </td>
                    );
                  })}
                  <td className="py-2 pl-3 text-right">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-chip text-[10.5px] font-[700] uppercase tracking-wider",
                        allPass ? "bg-vert-100 text-vert-700" : "bg-sienna-100 text-sienna-700"
                      )}
                    >
                      {allPass ? "Pass" : "Blocked"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
