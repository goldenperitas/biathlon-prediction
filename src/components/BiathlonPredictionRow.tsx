"use client";

import { AthleteSelect } from "@/components/AthleteSelect";
import { CountrySelect } from "@/components/CountrySelect";
import { BiathlonAmmoBelt } from "@/components/BiathlonAmmoBelt";
import { BiathlonStatusPill } from "@/components/BiathlonStatusPill";
import { calculateHitRange } from "@/lib/scoring";
import type { Athlete, TargetResult } from "@/lib/types";

type RowMode = "edit" | "results";

interface BiathlonPredictionRowProps {
  mode: RowMode;
  targetNumber: 1 | 2 | 3 | 4 | 5;
  isRelay: boolean;
  gender?: "M" | "W";
  athlete: Athlete | null;
  countryCode: string | null;
  predictedPosition: number;
  extraRounds: number;
  disabled?: boolean;

  // Edit-mode callbacks
  onAthleteChange?: (athlete: Athlete | null) => void;
  onCountryChange?: (code: string | null) => void;
  onPositionChange?: (position: number) => void;
  onExtraRoundsChange?: (rounds: number) => void;
  remainingExtraRounds?: number;

  // Results-mode payload
  result?: TargetResult;
  pendingLabel?: string;
}

/**
 * Renders one target row in a biathlon “game” layout.
 * @param props - See `BiathlonPredictionRowProps`
 * @returns A 2-column row: visualization (left) + inputs/details (right)
 */
export function BiathlonPredictionRow(props: BiathlonPredictionRowProps) {
  const {
    mode,
    targetNumber,
    isRelay,
    gender,
    athlete,
    countryCode,
    predictedPosition,
    extraRounds,
    disabled = false,
    onAthleteChange,
    onCountryChange,
    onPositionChange,
    onExtraRoundsChange,
    remainingExtraRounds,
    result,
    pendingLabel,
  } = props;

  const hasSelection = isRelay ? countryCode !== null : athlete !== null;
  const { min, max } = calculateHitRange(predictedPosition, extraRounds);

  const formatOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const resultsStatus: "precise" | "hit" | "miss" | "pending" =
    mode === "results"
      ? result
        ? result.is_precise
          ? "precise"
          : result.is_hit
            ? "hit"
            : "miss"
        : "pending"
      : "pending";

  const rowAccent =
    mode === "results"
      ? resultsStatus === "precise"
        ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
        : resultsStatus === "hit"
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10"
          : resultsStatus === "miss"
            ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40"
            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
      : hasSelection
        ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900"
        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950";

  const displayName = (() => {
    if (mode === "results" && result?.athlete_name) return result.athlete_name;
    if (pendingLabel) return pendingLabel;
    if (isRelay) return countryCode || "—";
    if (athlete) return `${athlete.given_name} ${athlete.family_name}`;
    return "(Athlete not selected)";
  })();

  const canEdit = mode === "edit" && !disabled;
  const canIncrementExtraRounds =
    canEdit && (remainingExtraRounds === undefined || remainingExtraRounds > 0);

  return (
    <div
      className={`border-2 rounded-xl p-4 transition-all ${rowAccent} ${
        disabled ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-start">
        {/* Left column: visualization */}
        <div className="flex flex-col items-center sm:items-start">
          <div className="w-full text-center sm:text-left">
            <span className="text-sm font-semibold text-zinc-500">
              Target {targetNumber} of 5
            </span>
          </div>

          <div className="relative w-20 h-20 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-sm border border-zinc-200 mt-2">
            <span className="text-2xl font-bold tabular-nums">
              {predictedPosition}
            </span>
          </div>

          <div className="mt-3 w-full">
            <BiathlonAmmoBelt count={extraRounds} />
          </div>

          <div className="mt-3 w-full text-center sm:text-left">
            <div className="text-xs text-zinc-500">Hit Range</div>
            <div className="text-base font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
              {formatOrdinal(min)} – {formatOrdinal(max)}
            </div>
          </div>
        </div>

        {/* Right column: controls / details */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">
                <span>{displayName}</span>
              </div>
              {mode === "results" && result?.actual_position !== null && (
                <div className="text-sm text-zinc-500 mt-0.5">
                  <span>
                    Actual: {formatOrdinal(result.actual_position)}
                  </span>
                </div>
              )}
            </div>

            {mode === "results" && (
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <BiathlonStatusPill status={resultsStatus} />
                {result && (
                  <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                    <span>
                      {result.points_earned > 0 ? `+${result.points_earned} pts` : "0 pts"}
                    </span>
                    {result.has_multiplier && (
                      <span className="text-xs ml-1 text-zinc-500">(1.5×)</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {mode === "edit" ? (
            <div className="mt-3 space-y-3">
              <div>
                {isRelay ? (
                  <CountrySelect
                    label=""
                    value={countryCode}
                    onChange={(code) => onCountryChange?.(code)}
                  />
                ) : (
                  <AthleteSelect
                    label=""
                    value={athlete}
                    onChange={(a) => onAthleteChange?.(a)}
                    gender={gender}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Predicted position */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Predicted finish
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onPositionChange?.(Math.max(1, predictedPosition - 1))
                      }
                      disabled={!canEdit}
                      className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                    >
                      <span>-</span>
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={predictedPosition}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isFinite(val)) return;
                        if (val >= 1 && val <= 120) onPositionChange?.(val);
                      }}
                      className="w-16 h-8 text-center border border-zinc-300 dark:border-zinc-700 rounded-lg bg-transparent disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onPositionChange?.(Math.min(120, predictedPosition + 1))
                      }
                      disabled={!canEdit}
                      className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                    >
                      <span>+</span>
                    </button>
                  </div>
                </div>

                {/* Extra rounds */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Extra rounds
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onExtraRoundsChange?.(Math.max(0, extraRounds - 1))
                      }
                      disabled={!canEdit || extraRounds <= 0}
                      className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                    >
                      <span>-</span>
                    </button>
                    <span className="w-10 text-center font-bold tabular-nums">
                      {extraRounds}
                    </span>
                    <button
                      type="button"
                      onClick={() => onExtraRoundsChange?.(extraRounds + 1)}
                      disabled={!canIncrementExtraRounds}
                      className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold"
                    >
                      <span>+</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-zinc-500">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Predicted: <span className="font-medium">{formatOrdinal(predictedPosition)}</span>
                </span>
                <span>
                  Extra rounds: <span className="font-medium tabular-nums">{extraRounds}</span>
                </span>
                {!result && (
                  <span className="text-zinc-400">
                    <span>Results pending</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

