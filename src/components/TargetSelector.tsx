"use client";

import { AthleteSelect } from "./AthleteSelect";
import { CountrySelect } from "./CountrySelect";
import { calculateHitRange } from "@/lib/scoring";
import type { Athlete } from "@/lib/types";

interface TargetSelectorProps {
  targetNumber: 1 | 2 | 3 | 4 | 5;
  isRelay: boolean;
  gender?: "M" | "W";
  athlete: Athlete | null;
  countryCode: string | null;
  predictedPosition: number;
  extraRounds: number;
  onAthleteChange: (athlete: Athlete | null) => void;
  onCountryChange: (code: string | null) => void;
  onPositionChange: (position: number) => void;
  disabled?: boolean;
}

export function TargetSelector({
  targetNumber,
  isRelay,
  gender,
  athlete,
  countryCode,
  predictedPosition,
  extraRounds,
  onAthleteChange,
  onCountryChange,
  onPositionChange,
  disabled = false,
}: TargetSelectorProps) {
  const { min, max } = calculateHitRange(predictedPosition, extraRounds);
  const hasSelection = isRelay ? countryCode !== null : athlete !== null;

  const formatOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        hasSelection
          ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Target header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              hasSelection
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
            }`}
          >
            {targetNumber}
          </div>
          <span className="font-medium">Target {targetNumber}</span>
        </div>

        {/* Hit range indicator */}
        {hasSelection && (
          <div className="text-sm text-zinc-500">
            Hits: {formatOrdinal(min)} - {formatOrdinal(max)}
          </div>
        )}
      </div>

      {/* Athlete/Country selector */}
      <div className="mb-3">
        {isRelay ? (
          <CountrySelect
            label=""
            value={countryCode}
            onChange={onCountryChange}
          />
        ) : (
          <AthleteSelect
            label=""
            value={athlete}
            onChange={onAthleteChange}
            gender={gender}
          />
        )}
      </div>

      {/* Position selector */}
      {hasSelection && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Predicted finish:
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPositionChange(Math.max(1, predictedPosition - 1))}
              className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 flex items-center justify-center font-bold"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={120}
              value={predictedPosition}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= 120) {
                  onPositionChange(val);
                }
              }}
              className="w-16 h-8 text-center border border-zinc-300 dark:border-zinc-700 rounded-lg bg-transparent"
            />
            <button
              type="button"
              onClick={() => onPositionChange(Math.min(120, predictedPosition + 1))}
              className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>
          <span className="text-sm text-zinc-500">{formatOrdinal(predictedPosition)}</span>
        </div>
      )}

      {/* Extra rounds indicator */}
      {hasSelection && extraRounds > 0 && (
        <div className="mt-2 text-sm text-zinc-500">
          +{extraRounds} extra round{extraRounds !== 1 ? "s" : ""} assigned
        </div>
      )}
    </div>
  );
}
