import type { RuleWeights } from "../types";

export const defaultRules: RuleWeights = {
  requireCallConsent: true,
  requireSafetyForm: true,
  requireReferral: true,
  requirePaymentReady: true,
  requireAuthorization: true,
  requireServiceMatch: true,
  requireLocationMatch: false,
  requireArrivalFeasibility: true,
  skipRecentlyDeclined: true,

  upgrade: {
    earlierGain: 0.20,
    dissatisfaction: 0.20,
    urgency: 0.15,
    pickup: 0.15,
    eligibility: 0.10,
    cascadeFillProbability: 0.10,
    preferenceMatch: 0.05,
    businessPriority: 0.05,
    cooldownPenalty: 0.20
  },

  waitlist: {
    eligibility: 0.30,
    waitTime: 0.20,
    urgency: 0.15,
    pickup: 0.15,
    preferenceMatch: 0.10,
    businessPriority: 0.10,
    cooldownPenalty: 0.20
  },

  travelFeasibilityWeight: 0.25,
  minimumArrivalBufferMinutes: 15,

  aggression: {
    calmHours: 6,
    focusedHours: 6,
    aggressiveMinutes: 120,
    emergencyMinutes: 30
  },

  cascade: {
    bookedFirst: true,
    maxDepth: 5,
    minEarlierGainDays: 1,
    skipSatisfied: true,
    requireOptIn: true,
    askPreferenceAfterBooking: true
  },

  scripts: {
    waitlistOpening:
      "Hi {{customer_name}}, this is Lina from {{business_name}}. You are on the waitlist for a {{service_name}} appointment. A slot opened {{slot_time}}. Would you like me to reserve it for you?",
    upgradeOpening:
      "Hi {{customer_name}}, this is Lina from {{business_name}}. You currently have a {{service_name}} appointment booked for {{current_slot_time}}. You asked us to notify you if an earlier slot became available. A slot opened {{new_slot_time}}. Would you like me to move your appointment earlier?",
    acceptance: "Great. I will check whether the slot is still available.",
    confirmation:
      "Perfect. You are booked for {{slot_time}}. Please arrive at {{arrival_time}}. I will send a confirmation now.",
    decline: "No problem. I will keep you on the waitlist for the next suitable opening.",
    voicemail:
      "This is {{business_name}} calling about an earlier appointment opportunity. Please call us back if you are still interested.",
    wrongPerson:
      "Thank you. I can only share appointment details with the customer. We will try again later.",
    medicalQuestion:
      "I can only help with scheduling. For medical questions, please contact your doctor or the clinic team.",
    preferenceQuestion:
      "If a still earlier appointment becomes available, would you like us to notify you?"
  }
};
