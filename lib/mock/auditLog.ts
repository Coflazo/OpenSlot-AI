import type { AuditEntry } from "../types";

const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();

export const seedAuditLog: AuditEntry[] = [
  {
    id: "a_seed_1",
    at: ago(60 * 24),
    actor: "user",
    action: "rules.update",
    object: "ranking.weights.upgrade.earlierGain",
    result: "success",
    details: "Increased from 0.18 to 0.20"
  },
  {
    id: "a_seed_2",
    at: ago(60 * 20),
    actor: "system",
    action: "consent.refresh",
    object: "12 customers",
    result: "info"
  },
  {
    id: "a_seed_3",
    at: ago(60 * 6),
    actor: "user",
    action: "slot.import",
    object: "Calendar sync",
    result: "success",
    details: "32 appointments imported"
  }
];
