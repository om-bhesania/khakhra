import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

function toDateFromUnknown(value: unknown): Date | null {
  if (!value) return null;
  // Firestore Timestamp with toDate()
  // @ts-expect-error duck typing
  if (typeof value?.toDate === "function") {
    // @ts-expect-error runtime guard
    return value.toDate();
  }
  // Firestore Timestamp-like { seconds, nanoseconds }
  // @ts-expect-error duck typing
  if (typeof value?.seconds === "number") {
    const ms =
      // @ts-expect-error duck typing
      value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1_000_000);
    return new Date(ms);
  }
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    // treat as ms since epoch unless it looks like seconds
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatTimestampString(value: unknown) {
  const date = toDateFromUnknown(value);
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleString("en-IN");
  }
}

export const genCsvFileName = (baseName: string) => {
  const currentTime = new Date().toLocaleString().replace(/[:\/\\, ]+/g, "_");
  const csvFileName = `${baseName}_${currentTime}.csv`;
  return csvFileName;
};
