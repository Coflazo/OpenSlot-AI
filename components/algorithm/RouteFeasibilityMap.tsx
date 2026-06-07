"use client";

import { motion } from "framer-motion";
import { CarIcon, MapPinIcon, WarningOctagonIcon } from "@phosphor-icons/react/dist/ssr";
import { routeGraph } from "@/lib/algo/routePlanner";
import type { AlgorithmExplanation } from "@/lib/algo/types";
import { palette } from "@/lib/design/tokens";

const VIEW = { w: 520, h: 280 };

// Project lat/lng → svg coords. Pick a bounding box covering the demo graph.
const BBOX = { minLat: 47.78, maxLat: 48.27, minLng: 16.22, maxLng: 16.47 };
function project(lat: number, lng: number) {
  const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * (VIEW.w - 40) + 20;
  const y = VIEW.h - (((lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat)) * (VIEW.h - 40) + 20);
  return { x, y };
}

export function RouteFeasibilityMap({ candidate }: { candidate: AlgorithmExplanation }) {
  const nodes = Object.values(routeGraph);
  const edges: { a: string; b: string; minutes: number }[] = [];
  for (const n of nodes) {
    for (const e of n.neighbors) {
      const key = [n.id, e.nodeId].sort().join("|");
      if (edges.find((edge) => [edge.a, edge.b].sort().join("|") === key)) continue;
      edges.push({ a: n.id, b: e.nodeId, minutes: e.minutes });
    }
  }
  const pathSet = new Set<string>();
  for (let i = 0; i < candidate.route.path.length - 1; i++) {
    pathSet.add([candidate.route.path[i], candidate.route.path[i + 1]].sort().join("|"));
  }

  return (
    <div className="rounded-card bg-white shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <CarIcon size={16} weight="duotone" className="text-peacock" />
        <h3 className="text-section">Route feasibility</h3>
        <span className="ml-auto inline-flex items-center gap-2 text-meta text-ink-400">
          via A* (haversine heuristic, 45 km/h)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        <div className="md:col-span-3 rounded-card bg-porcelain/70 ring-1 ring-stone/70 overflow-hidden">
          <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="w-full h-auto">
            {/* edges */}
            {edges.map((e) => {
              const a = routeGraph[e.a];
              const b = routeGraph[e.b];
              const pa = project(a.lat, a.lng);
              const pb = project(b.lat, b.lng);
              const onPath = pathSet.has([e.a, e.b].sort().join("|"));
              return (
                <line
                  key={`${e.a}-${e.b}`}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={onPath ? palette.peacock : "#D6CEC0"}
                  strokeWidth={onPath ? 3 : 1}
                  strokeLinecap="round"
                />
              );
            })}
            {/* nodes */}
            {nodes.map((n) => {
              const p = project(n.lat, n.lng);
              const isClinic = n.id.startsWith("clinic");
              const isHome = n.id === candidate.route.fromNodeId;
              const isGoal = n.id === candidate.route.toNodeId;
              return (
                <g key={n.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isClinic ? 7 : isHome ? 6 : 3.5}
                    fill={
                      isClinic ? palette.violet : isHome ? palette.saffron : "#FFFFFF"
                    }
                    stroke={isClinic ? palette.violet : isHome ? palette.saffron : "#B7AC97"}
                    strokeWidth={isClinic || isHome ? 2 : 1.2}
                  />
                  {(isClinic || isHome || isGoal) && (
                    <text
                      x={p.x + 10}
                      y={p.y - 6}
                      fontSize={10}
                      fill={isClinic ? palette.violet : palette.ink}
                      fontWeight={700}
                    >
                      {isHome ? candidate.customerName.split(" ")[0] : isClinic ? "Clinic" : ""}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="md:col-span-2 space-y-3">
          <MetricRow label="Travel time" value={`${candidate.route.travelMinutes}m`} />
          <MetricRow label="Distance" value={`${candidate.route.distanceKm.toFixed(1)} km`} />
          <MetricRow label="Arrival buffer" value={`${candidate.route.arrivalBufferMinutes}m`} />
          <MetricRow label="Time left" value={`${candidate.route.timeLeftMinutes}m`} />

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={
              "rounded-card p-3 text-[12.5px] font-[600] " +
              (candidate.route.feasible
                ? "bg-vert-100 text-vert-700"
                : "bg-sienna-100 text-sienna-700")
            }
          >
            {candidate.route.feasible ? (
              <>Customer can arrive before check-in. Slack: {Math.max(0, candidate.route.timeLeftMinutes - candidate.route.arrivalBufferMinutes - candidate.route.travelMinutes)}m.</>
            ) : (
              <span className="inline-flex items-start gap-2">
                <WarningOctagonIcon size={14} weight="fill" className="mt-0.5 shrink-0" />
                Travel blocked. {candidate.route.travelMinutes}m drive + {candidate.route.arrivalBufferMinutes}m buffer exceeds {candidate.route.timeLeftMinutes}m left.
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-meta uppercase tracking-wider text-ink-400 font-[700]">{label}</span>
      <span className="font-mono tabular-nums text-[15px] font-[700]">{value}</span>
    </div>
  );
}
