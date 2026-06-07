"use client";

import { motion } from "framer-motion";
import { GaugeIcon } from "@phosphor-icons/react/dist/ssr";
import { palette } from "@/lib/design/tokens";

interface Props {
  minutesLeft: number;
  rules: { aggressiveMinutes: number; emergencyMinutes: number; focusedHours: number };
}

export function AggressionDial({ minutesLeft, rules }: Props) {
  let level: "calm" | "focused" | "aggressive" | "emergency" = "calm";
  let concurrent = 1;
  if (minutesLeft <= rules.emergencyMinutes) {
    level = "emergency";
    concurrent = 10;
  } else if (minutesLeft <= rules.aggressiveMinutes) {
    level = "aggressive";
    concurrent = 5;
  } else if (minutesLeft <= rules.focusedHours * 60) {
    level = "focused";
    concurrent = 2;
  }
  // Convert minutes to angle 0..180° (left calm, right emergency)
  const maxScale = rules.focusedHours * 60 * 2;
  const t = Math.max(0, Math.min(1, 1 - minutesLeft / maxScale));
  const angle = -90 + t * 180;

  const ZONES = [
    { label: "Calm", color: palette.violet, range: [0, 45] },
    { label: "Focused", color: palette.peacock, range: [45, 90] },
    { label: "Aggressive", color: palette.saffron, range: [90, 145] },
    { label: "Emergency", color: palette.sienna, range: [145, 180] }
  ];
  const activeColor = ZONES.find((z) => z.label.toLowerCase() === level)?.color ?? palette.peacock;

  return (
    <div className="rounded-card bg-white shadow-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <GaugeIcon size={16} weight="duotone" className="text-peacock" />
        <h3 className="text-section">Aggression engine</h3>
        <span className="ml-auto text-meta text-ink-400">
          {minutesLeft}m left → {concurrent} concurrent
        </span>
      </div>
      <svg viewBox="0 0 220 130" className="w-full h-auto">
        {/* arcs */}
        {ZONES.map((z) => {
          const a1 = ((z.range[0] - 90) * Math.PI) / 180;
          const a2 = ((z.range[1] - 90) * Math.PI) / 180;
          const r = 90;
          const cx = 110;
          const cy = 115;
          const x1 = cx + r * Math.cos(a1);
          const y1 = cy + r * Math.sin(a1);
          const x2 = cx + r * Math.cos(a2);
          const y2 = cy + r * Math.sin(a2);
          const large = z.range[1] - z.range[0] > 180 ? 1 : 0;
          return (
            <path
              key={z.label}
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
              fill="none"
              stroke={z.color}
              strokeWidth={12}
              strokeLinecap="round"
              opacity={z.label.toLowerCase() === level ? 1 : 0.28}
            />
          );
        })}
        {/* needle */}
        <motion.line
          x1={110}
          y1={115}
          x2={110}
          y2={35}
          stroke={activeColor}
          strokeWidth={3}
          strokeLinecap="round"
          style={{ originX: "110px", originY: "115px" }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        />
        <circle cx={110} cy={115} r={6} fill={activeColor} />
        <text x={110} y={75} textAnchor="middle" fontSize={11} fontWeight={700} fill={palette.ink}>
          {level.toUpperCase()}
        </text>
      </svg>
      <div className="text-meta text-ink-500 text-center mt-1">
        {level === "emergency"
          ? "Under 30 min. Call up to 10 candidates with slot locking."
          : level === "aggressive"
            ? "30 min to 2h. Call 3 to 5 candidates quickly."
            : level === "focused"
              ? "2 to 6h. Call 2 candidates in sequence."
              : "More than 6h. Call 1 candidate at a time."}
      </div>
    </div>
  );
}
