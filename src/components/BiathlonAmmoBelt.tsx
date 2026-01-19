interface BiathlonAmmoBeltProps {
  count: number;
  className?: string;
}

/**
 * Renders extra rounds as a vertical stack of 2D bullet silhouettes.
 * @param count - Number of bullets to render (>= 0)
 * @param className - Optional additional CSS classes
 * @returns JSX element representing an ammo belt
 */
export function BiathlonAmmoBelt({ count, className = "" }: BiathlonAmmoBeltProps) {
  const bullets = Math.max(0, Math.floor(count));

  /**
   * Renders a single bullet icon (pointy tip on the left, flat base on the right).
   * @param key - React list key
   * @returns JSX element representing one extra round
   */
  const renderBullet = (key: number) => (
    <div key={key} className="flex items-center" title="Extra round">
      <svg
        width="56"
        height="12"
        viewBox="0 0 72 14"
        className="block"
        aria-hidden="true"
        focusable="false"
      >
        <path
          // Left is triangular with a tiny flat/chamfered tip; right is flat.
          d="M22 1 H71 V13 H22 L1.5 7.8 V6.2 L22 1 Z"
          className="fill-white stroke-zinc-300 dark:stroke-zinc-600"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          shapeRendering="geometricPrecision"
        />
      </svg>
    </div>
  );

  if (bullets === 0) {
    return (
      <div className={`text-xs text-zinc-400 ${className}`}>
        <span>No extra rounds</span>
      </div>
    );
  }

  return (
    <div
      className={`max-w-full ${className}`}
      aria-label={`${bullets} extra rounds`}
    >
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: bullets }, (_, i) => renderBullet(i))}
      </div>
    </div>
  );
}

