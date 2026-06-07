"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownIcon, UsersThreeIcon, UserCircleIcon, GraphIcon } from "@phosphor-icons/react/dist/ssr";
import { useStore } from "@/lib/store";
import { money, shortDate } from "@/lib/format";

export function CascadeChainView({ chainId }: { chainId: string }) {
  const chain = useStore((s) => s.cascadeChains.find((c) => c.id === chainId));
  const customers = useStore((s) => s.customers);
  const slots = useStore((s) => s.slots);

  if (!chain) return null;

  return (
    <div className="rounded-card border border-stone bg-porcelain p-4">
      <div className="flex items-center gap-2 mb-3">
        <GraphIcon size={14} className="text-violet" />
        <div className="text-[12.5px] font-[700] uppercase tracking-wider text-ink-500">
          Cascade chain
        </div>
        <span className="ml-auto text-[11px] uppercase tracking-wider text-ink-400 font-[600]">
          {chain.status.replace("_", " ")}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {chain.steps.map((step, idx) => {
          const slot = slots.find((s) => s.id === step.slotId);
          const customer = customers.find((c) => c.id === step.filledByCustomerId);
          if (!slot) return null;
          return (
            <motion.div
              key={`${chainId}_${idx}`}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="relative"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-0.5">
                  <span
                    className={
                      step.type === "upgrade"
                        ? "h-5 w-5 inline-flex items-center justify-center rounded-full bg-violet text-white text-[10px] font-[700]"
                        : "h-5 w-5 inline-flex items-center justify-center rounded-full bg-vert text-white text-[10px] font-[700]"
                    }
                  >
                    {idx + 1}
                  </span>
                  {idx < chain.steps.length - 1 && <span className="w-px flex-1 bg-stone2 my-1" />}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-[700]">{slot.service}</span>
                    <span className="text-meta text-ink-400">{shortDate(slot.startTime)}</span>
                    <span className="text-[11px] uppercase tracking-wider font-[600] text-saffron-700 bg-saffron-100 px-1.5 py-0.5 rounded-chip">
                      {money(slot.estimatedValue)}
                    </span>
                  </div>
                  <div className="mt-1 text-meta text-ink-500 flex items-center gap-1.5">
                    {step.type === "upgrade" ? (
                      <>
                        <UsersThreeIcon size={12} className="text-violet" />
                        <span className="text-violet font-[600]">Upgrade</span>
                        <ArrowDownIcon size={10} className="text-ink-300" />
                      </>
                    ) : (
                      <>
                        <UserCircleIcon size={12} className="text-vert-600" />
                        <span className="text-vert-700 font-[600]">Waitlist fill</span>
                      </>
                    )}
                    <span>{customer ? `Filled by ${customer.name}` : "Pending"}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
