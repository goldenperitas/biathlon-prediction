"use client";

import { useSyncExternalStore } from "react";

type TimeFormat = "short" | "short-date" | "long";

interface LocalTimeProps {
  timestamp: string;
  format?: TimeFormat;
  className?: string;
}

const formatOptions: Record<TimeFormat, Intl.DateTimeFormatOptions> = {
  short: {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  "short-date": {
    weekday: "short",
    month: "short",
    day: "numeric",
  },
  long: {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
};

const emptySubscribe = () => () => {};

/**
 * Displays a timestamp in the user's local timezone.
 * Uses useSyncExternalStore for SSR-safe client detection.
 */
export function LocalTime({
  timestamp,
  format = "short",
  className,
}: LocalTimeProps) {
  const formatted = useSyncExternalStore(
    emptySubscribe,
    () => {
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-US", formatOptions[format]);
    },
    () => null
  );

  if (!formatted) {
    return <span className={className}>...</span>;
  }

  return <span className={className}>{formatted}</span>;
}
