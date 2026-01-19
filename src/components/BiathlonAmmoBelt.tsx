interface BiathlonAmmoBeltProps {
  count: number;
  className?: string;
}

/**
 * Renders extra rounds as a horizontal, scrollable "ammo belt".
 * @param count - Number of bullets to render (>= 0)
 * @param className - Optional additional CSS classes
 * @returns JSX element representing an ammo belt
 */
export function BiathlonAmmoBelt({ count, className = "" }: BiathlonAmmoBeltProps) {
  const bullets = Math.max(0, Math.floor(count));

  if (bullets === 0) {
    return (
      <div className={`text-xs text-zinc-400 ${className}`}>
        <span>No extra rounds</span>
      </div>
    );
  }

  return (
    <div
      className={`overflow-x-auto max-w-full ${className}`}
      aria-label={`${bullets} extra rounds`}
    >
      <div className="flex items-end gap-1.5 w-max pr-1">
        {Array.from({ length: bullets }, (_, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            title="Extra round"
          >
            <div className="w-2.5 h-6 rounded-full bg-amber-500/90 border border-amber-700 shadow-sm" />
            <div className="w-3 h-1.5 -mt-0.5 rounded-sm bg-zinc-900/90 border border-zinc-950 shadow-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

