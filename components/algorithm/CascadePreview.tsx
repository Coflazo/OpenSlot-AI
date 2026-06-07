"use client";

import { motion } from "framer-motion";
import { GraphIcon } from "@phosphor-icons/react/dist/ssr";
import type { AlgorithmExplanation } from "@/lib/algo/types";
import { useStore } from "@/lib/store";
import { money, shortDate } from "@/lib/format";

export function CascadePreview({ topCandidate }: { topCandidate?: AlgorithmExplanation }) {
  const slots = useStore((s) => s.slots);

  if (!topCandidate || topCandidate.source !== "upgrade") {
    return (
      <div className="rounded-card bg-white shadow-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <GraphIcon size={16} weight="duotone" className="text-violet" />
          <h3 className="text-section">Cascade preview</h3>
        </div>
        <p className="text-meta text-ink-500">
          {topCandidate
            ? "Top candidate is from the waitlist. No cascade. The chain ends here."
            : "No top candidate yet."}
        </p>
      </div>
    );
  }

  const oldSlot = slots.find((s) => s.id === topCandidate.customer.currentBookingId);

  return (
    <div className="rounded-card bg-white shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <GraphIcon size={16} weight="duotone" className="text-violet" />
        <h3 className="text-section">Cascade preview</h3>
      </div>
      <ol className="space-y-2">
        <Step
          index={1}
          title={`Move ${topCandidate.customerName} into ${topCandidate.slot.service}`}
          body={`Today, ${new Date(topCandidate.slot.startTime).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} · ${money(topCandidate.slot.estimatedValue)}`}
          tone="violet"
        />
        {oldSlot && (
          <>
            <Step
              index={2}
              title={`Release ${topCandidate.customerName}'s ${oldSlot.service}`}
              body={`${shortDate(oldSlot.startTime)} · ${money(oldSlot.estimatedValue)} becomes the next open slot`}
              tone="saffron"
            />
            <Step
              index={3}
              title="Run the algorithm again for the vacated slot"
              body="Pure waitlist or upgrade pool. Same hard filters, same route check, same scoring."
              tone="peacock"
            />
          </>
        )}
      </ol>
    </div>
  );
}

function Step({
  index,
  title,
  body,
  tone
}: {
  index: number;
  title: string;
  body: string;
  tone: "violet" | "saffron" | "peacock";
}) {
  const toneRing: Record<string, string> = {
    violet: "bg-violet text-white",
    saffron: "bg-saffron text-ink",
    peacock: "bg-peacock text-white"
  };
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3"
    >
      <span
        className={
          "h-6 w-6 rounded-full inline-flex items-center justify-center text-[11px] font-[700] " +
          toneRing[tone]
        }
      >
        {index}
      </span>
      <div className="pb-2">
        <div className="text-[13.5px] font-[650]">{title}</div>
        <div className="text-meta text-ink-500">{body}</div>
      </div>
    </motion.li>
  );
}
