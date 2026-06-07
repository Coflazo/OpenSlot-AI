// Deterministic mock timeseries for the Analytics page

export const revenueRecovered = [
  { day: "Mon", value: 1820 },
  { day: "Tue", value: 2240 },
  { day: "Wed", value: 1640 },
  { day: "Thu", value: 2980 },
  { day: "Fri", value: 2410 },
  { day: "Sat", value: 1180 },
  { day: "Sun", value: 980 }
];

export const slotsByService = [
  { service: "MRI Knee", saved: 14, expired: 2 },
  { service: "MRI Brain", saved: 9, expired: 1 },
  { service: "MRI Spine", saved: 6, expired: 1 },
  { service: "CT Chest", saved: 5, expired: 0 },
  { service: "CT Abdomen", saved: 4, expired: 1 },
  { service: "Ultrasound", saved: 7, expired: 0 },
  { service: "X-ray", saved: 3, expired: 0 }
];

export const cancellationsByWeekday = [
  { day: "Mon", value: 11 },
  { day: "Tue", value: 9 },
  { day: "Wed", value: 14 },
  { day: "Thu", value: 18 },
  { day: "Fri", value: 21 },
  { day: "Sat", value: 7 },
  { day: "Sun", value: 4 }
];

export const acceptanceByTimeLeft = [
  { bucket: "0-30m", value: 0.62 },
  { bucket: "30m-2h", value: 0.71 },
  { bucket: "2-6h", value: 0.58 },
  { bucket: "6-24h", value: 0.41 },
  { bucket: "1-3d", value: 0.29 },
  { bucket: "3d+", value: 0.18 }
];

export const pickupBySegment = [
  { segment: "Same-day opted in", value: 0.83 },
  { segment: "Standard waitlist", value: 0.61 },
  { segment: "Upgrade candidates", value: 0.72 },
  { segment: "Cold list", value: 0.34 }
];

export const expiredReasons = [
  { reason: "No answer chain", value: 5 },
  { reason: "All declined", value: 3 },
  { reason: "Eligibility blocked", value: 4 },
  { reason: "Time ran out", value: 2 }
];
