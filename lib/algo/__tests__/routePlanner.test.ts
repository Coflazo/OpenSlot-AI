// npx tsx lib/algo/__tests__/routePlanner.test.ts

import { estimateRouteMinutes, travelFeasibility } from "../routePlanner";

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`\x1b[32mPASS\x1b[0m  ${name}`);
  } else {
    console.error(`\x1b[31mFAIL\x1b[0m  ${name}${detail ? `\n        ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

const knee = estimateRouteMinutes({ fromNodeId: "vienna_1060", toNodeId: "clinic_innere_stadt" });
assert("Mariahilf → clinic_innere_stadt = 12 minutes", knee.minutes === 12, `got ${knee.minutes}`);
assert("Mariahilf → clinic path is direct", knee.path.length === 2);

const farAway = estimateRouteMinutes({ fromNodeId: "wr_neustadt", toNodeId: "clinic_innere_stadt" });
assert("Wr. Neustadt → clinic >= 100 minutes", farAway.minutes >= 100, `got ${farAway.minutes}`);

const samePlace = estimateRouteMinutes({ fromNodeId: "vienna_1010", toNodeId: "vienna_1010" });
assert("Same node → 0 minutes", samePlace.minutes === 0);

const unknown = estimateRouteMinutes({ fromNodeId: "nowhere", toNodeId: "clinic_innere_stadt" });
assert("Unknown node falls back to feasible zero", unknown.minutes === 0 && unknown.found === false);

const feasibleNear = travelFeasibility({ travelMinutes: 12, arrivalBufferMinutes: 15, timeLeftMinutes: 60 });
assert(
  "60m left, 12m drive, 15m buffer → feasible",
  feasibleNear.feasible && feasibleNear.score > 0,
  JSON.stringify(feasibleNear)
);

const feasibleFar = travelFeasibility({ travelMinutes: 125, arrivalBufferMinutes: 15, timeLeftMinutes: 60 });
assert(
  "60m left, 125m drive → travel blocked, score 0",
  !feasibleFar.feasible && feasibleFar.score === 0
);

const justInTime = travelFeasibility({ travelMinutes: 30, arrivalBufferMinutes: 15, timeLeftMinutes: 45 });
assert(
  "45m left, 30m drive, 15m buffer → barely feasible with 0 score",
  justInTime.feasible && justInTime.score === 0
);

console.log("\nRoute planner pinned. Wr. Neustadt path is the canonical TRAVEL_BLOCKED case in the demo.");
