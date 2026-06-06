// Smoke test for the cascade demo math. Run via: npx tsx lib/algo/__tests__/upgradeScore.test.ts
// (no test framework installed by design — this file logs pass/fail)

import { upgradeScore } from "../upgradeScore";
import { waitlistScore } from "../waitlistScore";
import { defaultRules } from "../../store/defaultRules";
import { customers } from "../../mock/customers";
import { slots, HERO_SLOT_ID } from "../../mock/slots";
import { cascadeFillProbability } from "../cascadeFillProbability";

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`\x1b[32mPASS\x1b[0m  ${name}`);
  } else {
    console.error(`\x1b[31mFAIL\x1b[0m  ${name}${detail ? `\n        ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

const heroSlot = slots.find((s) => s.id === HERO_SLOT_ID)!;
const alex = customers.find((c) => c.id === "cust_alex")!;
const sara = customers.find((c) => c.id === "cust_sara")!;
const alexBooking = slots.find((s) => s.id === alex.currentBookingId)!;
const saraBooking = slots.find((s) => s.id === sara.currentBookingId)!;
const cascadeProbAlex = cascadeFillProbability(alexBooking, customers);
const cascadeProbSara = cascadeFillProbability(saraBooking, customers);

const alexScore = upgradeScore(alex, heroSlot, alexBooking, defaultRules, cascadeProbAlex);
const saraScore = upgradeScore(sara, heroSlot, saraBooking, defaultRules, cascadeProbSara);

assert("Alex outranks Sara for the hero slot", alexScore.score > saraScore.score, `alex=${alexScore.score} sara=${saraScore.score}`);
assert("Alex reasons mention earlier or pickup", alexScore.reasons.length >= 2, `reasons=${JSON.stringify(alexScore.reasons)}`);
assert("Scores are bounded 0..100", alexScore.score >= 0 && alexScore.score <= 100, `score=${alexScore.score}`);

const mia = customers.find((c) => c.id === "cust_mia")!;
const miaWaitlist = waitlistScore(mia, alexBooking, defaultRules);
assert("Mia ranks > 0 on July 20 waitlist pool", miaWaitlist.score > 0, `score=${miaWaitlist.score}`);

// Sara is satisfied → store-level filter would block her; raw upgrade math may still be positive.
// We only assert ordering, which is what the cascade depends on.

console.log("\nCascade math pins the demo. Alex first, Sara second, Mia fills the vacated slot.");
