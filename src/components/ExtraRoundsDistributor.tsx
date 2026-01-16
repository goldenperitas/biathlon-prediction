"use client";

import { TOTAL_EXTRA_ROUNDS, calculateHitRange } from "@/lib/scoring";

interface TargetRounds {
  targetNumber: 1 | 2 | 3 | 4 | 5;
  extraRounds: number;
  predictedPosition: number;
  hasSelection: boolean;
  label: string; // Athlete name or country code
}

interface ExtraRoundsDistributorProps {
  targets: TargetRounds[];
  onDistribute: (targetNumber: 1 | 2 | 3 | 4 | 5, rounds: number) => void;
  disabled?: boolean;
}

export function ExtraRoundsDistributor({
  targets,
  onDistribute,
  disabled = false,
}: ExtraRoundsDistributorProps) {
  const totalAllocated = targets.reduce((sum, t) => sum + t.extraRounds, 0);
  const remaining = TOTAL_EXTRA_ROUNDS - totalAllocated;
  const allTargetsSelected = targets.every((t) => t.hasSelection);

  const formatOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  if (!allTargetsSelected) {
    return (
      <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-center text-zinc-500">
        Select all 5 targets to distribute extra rounds
      </div>
    );
  }

  return (
    <div
      className={`p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Extra Rounds</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Remaining:</span>
          <span
            className={`font-bold ${
              remaining === 0
                ? "text-green-600"
                : remaining < 0
                  ? "text-red-600"
                  : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {remaining}
          </span>
          <span className="text-sm text-zinc-500">/ {TOTAL_EXTRA_ROUNDS}</span>
        </div>
      </div>

      {/* Target allocation rows */}
      <div className="space-y-3">
        {targets.map((target) => {
          const { min, max } = calculateHitRange(
            target.predictedPosition,
            target.extraRounds
          );

          return (
            <div
              key={target.targetNumber}
              className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-zinc-950 rounded-lg"
            >
              {/* Target info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {target.targetNumber}
                </div>
                <div className="truncate">
                  <span className="font-medium">{target.label}</span>
                  <span className="text-zinc-500 ml-2">
                    → {formatOrdinal(target.predictedPosition)}
                  </span>
                </div>
              </div>

              {/* Hit range preview */}
              <div className="text-sm text-zinc-500 hidden sm:block">
                {formatOrdinal(min)} - {formatOrdinal(max)}
              </div>

              {/* Round controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onDistribute(
                      target.targetNumber,
                      Math.max(0, target.extraRounds - 1)
                    )
                  }
                  disabled={target.extraRounds <= 0}
                  className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold">
                  {target.extraRounds}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onDistribute(target.targetNumber, target.extraRounds + 1)
                  }
                  disabled={remaining <= 0}
                  className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation message */}
      {remaining !== 0 && (
        <div
          className={`mt-4 text-sm text-center ${
            remaining < 0 ? "text-red-600" : "text-amber-600"
          }`}
        >
          {remaining < 0
            ? `Too many rounds allocated! Remove ${Math.abs(remaining)}.`
            : `Distribute ${remaining} more round${remaining !== 1 ? "s" : ""} to continue.`}
        </div>
      )}
    </div>
  );
}
