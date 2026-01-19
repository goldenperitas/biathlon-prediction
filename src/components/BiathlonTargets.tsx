interface BiathlonTargetsProps {
  hits: number;
  totalScore?: number;
  className?: string;
}

/**
 * Displays biathlon targets as circles (white for hits, black with thick red border for misses)
 * @param hits - Number of hits (0-5)
 * @param totalScore - Optional total score to display below targets
 * @param className - Optional additional CSS classes
 * @returns JSX element with 5 target circles and optional score display
 */
export function BiathlonTargets({ hits, totalScore, className = "" }: BiathlonTargetsProps) {
  const baseClasses = "inline-flex flex-col gap-1.5";
  const alignmentClass = className.includes("items-") ? "" : "items-end";
  
  return (
    <div className={`${baseClasses} ${alignmentClass} ${className}`}>
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const isHit = i < hits;
          return (
            <div
              key={i}
              className={`w-5 h-5 rounded-full ${
                isHit
                  ? "bg-white"
                  : "bg-zinc-900 border-4 border-red-950"
              }`}
              title={isHit ? "Hit" : "Missed"}
            />
          );
        })}
      </div>
      {totalScore !== undefined && (
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {totalScore} pts
        </div>
      )}
    </div>
  );
}
