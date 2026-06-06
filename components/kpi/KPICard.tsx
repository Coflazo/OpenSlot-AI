"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowUpRightIcon, InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/primitives/tooltip";
import { cn } from "@/lib/cn";

export interface KPICardProps {
  label: string;
  value: React.ReactNode;
  delta?: string;
  hint?: string;
  tone?: "neutral" | "peacock" | "saffron" | "violet" | "vert" | "sienna";
  icon?: React.ReactNode;
  align?: "left" | "right";
}

const toneRing: Record<NonNullable<KPICardProps["tone"]>, string> = {
  neutral: "from-stone/0 to-stone/0",
  peacock: "from-peacock-100/40 to-peacock-50/0",
  saffron: "from-saffron-100/70 to-saffron-50/0",
  violet: "from-violet-100/40 to-violet-50/0",
  vert: "from-vert-100/40 to-vert-50/0",
  sienna: "from-sienna-100/50 to-sienna-50/0"
};

export function KPICard({ label, value, delta, hint, tone = "neutral", icon, align = "left" }: KPICardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="relative overflow-hidden bg-white rounded-card shadow-card p-5"
    >
      <div className={cn("absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-radial pointer-events-none", `bg-gradient-to-br ${toneRing[tone]}`)} />
      <div className="relative">
        <div className="flex items-center gap-2 text-meta text-ink-400">
          {icon && <span className="text-ink-400">{icon}</span>}
          <span className="font-[600] uppercase tracking-wider text-[11px]">{label}</span>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-ink-300 hover:text-ink-500">
                  <InfoIcon size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn("mt-3 font-mono text-kpi tabular-nums text-ink", align === "right" && "text-right")}>
          {value}
        </div>
        {delta && (
          <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-[600] text-vert-600">
            <ArrowUpRightIcon size={12} weight="bold" />
            {delta}
          </div>
        )}
      </div>
    </motion.div>
  );
}
