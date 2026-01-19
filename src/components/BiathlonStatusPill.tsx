type BiathlonStatus = "precise" | "hit" | "miss" | "pending";

interface BiathlonStatusPillProps {
  status: BiathlonStatus;
  className?: string;
}

/**
 * Displays a compact PRECISE / HIT / MISS / PENDING pill.
 * @param status - Status value to render
 * @param className - Optional additional CSS classes
 * @returns JSX element representing a status pill
 */
export function BiathlonStatusPill({ status, className = "" }: BiathlonStatusPillProps) {
  const config: Record<
    BiathlonStatus,
    { label: string; classes: string }
  > = {
    precise: {
      label: "✓ PRECISE",
      classes:
        "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200",
    },
    hit: {
      label: "✓ HIT",
      classes:
        "bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200",
    },
    miss: {
      label: "✗ MISS",
      classes:
        "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200",
    },
    pending: {
      label: "… PENDING",
      classes:
        "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300",
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${c.classes} ${className}`}
    >
      <span>{c.label}</span>
    </span>
  );
}

