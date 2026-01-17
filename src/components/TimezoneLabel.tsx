"use client";

import { useSyncExternalStore } from "react";

interface TimezoneLabelProps {
  className?: string;
}

const emptySubscribe = () => () => {};

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "your local time";
  }
}

/**
 * Displays "All times are in {timezone}" using the user's local timezone.
 * Uses useSyncExternalStore for SSR-safe client detection.
 */
export function TimezoneLabel({ className }: TimezoneLabelProps) {
  const timezone = useSyncExternalStore(
    emptySubscribe,
    getTimezone,
    () => null
  );

  if (!timezone) {
    return null;
  }

  return (
    <p className={className ?? "text-xs text-zinc-500 dark:text-zinc-400 mb-3"}>
      All times are in {timezone}
    </p>
  );
}
