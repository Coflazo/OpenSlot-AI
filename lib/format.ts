import { differenceInMinutes, format, formatDistanceToNowStrict, isToday, isTomorrow } from "date-fns";

const eur = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

export const money = (value: number) => eur.format(value);

export const moneyDecimal = (value: number) =>
  new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2
  }).format(value);

export const pct = (value: number, digits = 0) =>
  `${(value * 100).toFixed(digits)}%`;

export function timeOfDay(iso: string) {
  return format(new Date(iso), "HH:mm");
}

export function shortDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return `Today, ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "HH:mm")}`;
  return format(d, "MMM d, HH:mm");
}

export function longDate(iso: string) {
  return format(new Date(iso), "EEE, MMM d · HH:mm");
}

export function duration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function timeLeft(iso: string, now: Date = new Date()) {
  const m = differenceInMinutes(new Date(iso), now);
  if (m <= 0) return { label: "Expired", minutes: 0 };
  if (m < 60) return { label: `${m}m left`, minutes: m };
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return { label: rem ? `${h}h ${rem}m left` : `${h}h left`, minutes: m };
}

export function relative(iso: string) {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function secondsToClock(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}
