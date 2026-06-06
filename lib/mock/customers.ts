import type { Customer } from "../types";

const today = new Date();
const days = (d: number) => new Date(today.getTime() - d * 86400000).toISOString();

export const customers: Customer[] = [
  {
    id: "cust_alex",
    name: "Alex Berger",
    phone: "+43 1 478 21 04",
    email: "alex.berger@protonmail.com",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: true, preferredWindow: "afternoon", maxTravelMinutes: 35 },
    requestedService: "MRI Knee",
    requestedBodyPart: "Right knee",
    currentBookingId: "slot_alex_jul20",
    bookingSatisfaction: "urgently_wants_earlier",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.7,
    waitingSince: days(18),
    lastContactedAt: days(8)
  },
  {
    id: "cust_sara",
    name: "Sara Klein",
    phone: "+43 1 366 88 17",
    email: "sara.klein@gmail.com",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "cleared"
    },
    preferences: { sameDay: false, preferredWindow: "morning", maxTravelMinutes: 20 },
    requestedService: "MRI Knee",
    requestedBodyPart: "Left knee",
    currentBookingId: "slot_sara_jul25",
    bookingSatisfaction: "satisfied",
    earlierOpportunityPreference: "seven_days_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.5,
    waitingSince: days(11)
  },
  {
    id: "cust_jonas",
    name: "Jonas Weber",
    phone: "+43 660 412 09 88",
    email: "jonas.weber@outlook.com",
    language: "de",
    consent: { call: true, sms: true, voicemail: false, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "evening", maxTravelMinutes: 60 },
    requestedService: "MRI Knee",
    currentBookingId: "slot_jonas_aug2",
    bookingSatisfaction: "satisfied",
    earlierOpportunityPreference: "none",
    cascadeParticipation: "do_not_move",
    businessPriority: 0.4,
    waitingSince: days(22)
  },
  {
    id: "cust_mia",
    name: "Mia Novak",
    phone: "+43 676 224 18 53",
    email: "mia.novak@kabsi.at",
    language: "en",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: true, preferredWindow: "any", maxTravelMinutes: 45 },
    requestedService: "MRI Knee",
    requestedBodyPart: "Left knee",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.6,
    waitingSince: days(14)
  },
  {
    id: "cust_omar",
    name: "Omar Demir",
    phone: "+43 660 933 41 27",
    email: "omar.demir@gmx.at",
    language: "tr",
    consent: { call: true, sms: false, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: false,
      contrastStatus: "pending"
    },
    preferences: { sameDay: false, preferredWindow: "afternoon", maxTravelMinutes: 30 },
    requestedService: "MRI Knee",
    bookingSatisfaction: "dissatisfied",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.55,
    waitingSince: days(9)
  },
  {
    id: "cust_lena",
    name: "Lena Brunner",
    phone: "+43 1 712 04 92",
    email: "lena.brunner@inode.at",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "afternoon", maxTravelMinutes: 30 },
    requestedService: "MRI Knee",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "none",
    cascadeParticipation: "manual_approval",
    businessPriority: 0.4
  },
  {
    id: "cust_helena",
    name: "Helena Vogel",
    phone: "+43 699 184 22 31",
    email: "helena.vogel@a1.net",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: true, preferredWindow: "morning", maxTravelMinutes: 25 },
    requestedService: "MRI Brain",
    bookingSatisfaction: "dissatisfied",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.65,
    waitingSince: days(21)
  },
  {
    id: "cust_kerem",
    name: "Kerem Yıldız",
    phone: "+43 660 728 03 14",
    email: "kerem.yildiz@yandex.com",
    language: "tr",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: false,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "evening", maxTravelMinutes: 40 },
    requestedService: "CT Chest",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "seven_days_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.5,
    waitingSince: days(7)
  },
  {
    id: "cust_isabella",
    name: "Isabella Moretti",
    phone: "+43 676 411 87 02",
    email: "isabella.moretti@chello.at",
    language: "en",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: false,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "morning", maxTravelMinutes: 35 },
    requestedService: "MRI Spine",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.6,
    waitingSince: days(16)
  },
  {
    id: "cust_lukas",
    name: "Lukas Hofer",
    phone: "+43 660 184 33 09",
    email: "lukas.hofer@protonmail.com",
    language: "de",
    consent: { call: false, sms: true, voicemail: false, recording: false },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "afternoon", maxTravelMinutes: 30 },
    requestedService: "MRI Knee",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.5,
    waitingSince: days(13)
  },
  {
    id: "cust_clara",
    name: "Clara Pichler",
    phone: "+43 699 902 16 41",
    email: "clara.pichler@gmail.com",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "cleared"
    },
    preferences: { sameDay: true, preferredWindow: "any", maxTravelMinutes: 50 },
    requestedService: "CT Abdomen",
    bookingSatisfaction: "urgently_wants_earlier",
    earlierOpportunityPreference: "same_day",
    cascadeParticipation: "can_move",
    businessPriority: 0.72,
    waitingSince: days(5)
  },
  {
    id: "cust_paul",
    name: "Paul Kovač",
    phone: "+43 660 552 18 77",
    email: "paul.kovac@aon.at",
    language: "en",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "morning", maxTravelMinutes: 30 },
    requestedService: "MRI Spine",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "seven_days_earlier",
    cascadeParticipation: "move_once",
    businessPriority: 0.55,
    waitingSince: days(19)
  },
  {
    id: "cust_emma",
    name: "Emma Schreiner",
    phone: "+43 676 901 23 42",
    email: "emma.schreiner@gmx.at",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "morning", maxTravelMinutes: 25 },
    requestedService: "Ultrasound",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.45,
    waitingSince: days(4)
  },
  {
    id: "cust_finn",
    name: "Finn Rauch",
    phone: "+43 660 220 41 88",
    email: "finn.rauch@chello.at",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: false,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: true, preferredWindow: "afternoon", maxTravelMinutes: 40 },
    requestedService: "MRI Brain",
    bookingSatisfaction: "dissatisfied",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.6,
    waitingSince: days(8)
  },
  {
    id: "cust_zeynep",
    name: "Zeynep Aslan",
    phone: "+43 676 802 14 27",
    email: "zeynep.aslan@gmail.com",
    language: "tr",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: true, preferredWindow: "any", maxTravelMinutes: 35 },
    requestedService: "MRI Knee",
    bookingSatisfaction: "urgently_wants_earlier",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.68,
    waitingSince: days(2)
  },
  {
    id: "cust_david",
    name: "David Marković",
    phone: "+43 660 733 92 41",
    email: "david.markovic@protonmail.com",
    language: "en",
    consent: { call: true, sms: true, voicemail: false, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "morning", maxTravelMinutes: 30 },
    requestedService: "X-ray",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "none",
    cascadeParticipation: "can_move",
    businessPriority: 0.4
  },
  {
    id: "cust_anna",
    name: "Anna Greiner",
    phone: "+43 699 411 23 80",
    email: "anna.greiner@a1.net",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "afternoon", maxTravelMinutes: 60 },
    requestedService: "MRI Brain",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "seven_days_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.5,
    waitingSince: days(12)
  },
  {
    id: "cust_tobias",
    name: "Tobias Ehrlich",
    phone: "+43 660 411 92 33",
    email: "tobias.ehrlich@gmx.at",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: true, preferredWindow: "any", maxTravelMinutes: 30 },
    requestedService: "CT Chest",
    bookingSatisfaction: "urgently_wants_earlier",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.75,
    waitingSince: days(3)
  },
  {
    id: "cust_julia",
    name: "Julia Steiner",
    phone: "+43 676 188 02 17",
    email: "julia.steiner@chello.at",
    language: "de",
    consent: { call: true, sms: true, voicemail: true, recording: true },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "afternoon", maxTravelMinutes: 25 },
    requestedService: "Ultrasound",
    bookingSatisfaction: "satisfied",
    earlierOpportunityPreference: "none",
    cascadeParticipation: "do_not_move",
    businessPriority: 0.4
  },
  {
    id: "cust_yusuf",
    name: "Yusuf Kaplan",
    phone: "+43 660 711 02 36",
    email: "yusuf.kaplan@yandex.com",
    language: "tr",
    consent: { call: true, sms: true, voicemail: true, recording: false },
    eligibility: {
      safetyForm: true,
      referral: true,
      paymentReady: true,
      authorization: true,
      contrastStatus: "not_required"
    },
    preferences: { sameDay: false, preferredWindow: "morning", maxTravelMinutes: 40 },
    requestedService: "MRI Spine",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "any_earlier",
    cascadeParticipation: "can_move",
    businessPriority: 0.5,
    waitingSince: days(17)
  },
  {
    id: "cust_lara",
    name: "Lara Bauer",
    phone: "+43 699 222 41 70",
    email: "lara.bauer@gmail.com",
    language: "de",
    consent: { call: false, sms: false, voicemail: false, recording: false },
    eligibility: {
      safetyForm: false,
      referral: false,
      paymentReady: false,
      authorization: false,
      contrastStatus: "pending"
    },
    preferences: { sameDay: false, preferredWindow: "morning", maxTravelMinutes: 20 },
    requestedService: "MRI Knee",
    bookingSatisfaction: "neutral",
    earlierOpportunityPreference: "none",
    cascadeParticipation: "do_not_move",
    businessPriority: 0.3,
    optedOut: true
  }
];

export function getCustomer(id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}
