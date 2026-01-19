"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BiathlonPredictionRow } from "@/components/BiathlonPredictionRow";
import { TOTAL_EXTRA_ROUNDS, TOTAL_TARGETS } from "@/lib/scoring";
import type { Athlete, PredictionTarget } from "@/lib/types";

interface TargetState {
  targetNumber: 1 | 2 | 3 | 4 | 5;
  athlete: Athlete | null;
  countryCode: string | null;
  predictedPosition: number;
  extraRounds: number;
}

const createInitialTargets = (): TargetState[] => [
  { targetNumber: 1, athlete: null, countryCode: null, predictedPosition: 1, extraRounds: 3 },
  { targetNumber: 2, athlete: null, countryCode: null, predictedPosition: 2, extraRounds: 3 },
  { targetNumber: 3, athlete: null, countryCode: null, predictedPosition: 3, extraRounds: 3 },
  { targetNumber: 4, athlete: null, countryCode: null, predictedPosition: 4, extraRounds: 3 },
  { targetNumber: 5, athlete: null, countryCode: null, predictedPosition: 5, extraRounds: 3 },
];

interface PredictionFormProps {
  raceId: string;
  existingPrediction: {
    targets: (PredictionTarget & { athlete?: Athlete })[];
  } | null;
  gender?: "M" | "W" | null;
  isRelay?: boolean;
}

export function PredictionForm({
  raceId,
  existingPrediction,
  gender,
  isRelay = false,
}: PredictionFormProps) {
  const router = useRouter();

  // Initialize targets from existing prediction or create new ones
  const [targets, setTargets] = useState<TargetState[]>(() => {
    if (existingPrediction?.targets?.length === TOTAL_TARGETS) {
      return existingPrediction.targets
        .sort((a, b) => a.target_number - b.target_number)
        .map((t) => ({
          targetNumber: t.target_number,
          athlete: t.athlete || null,
          countryCode: t.country_code,
          predictedPosition: t.predicted_position,
          extraRounds: t.extra_rounds,
        }));
    }
    return createInitialTargets();
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Calculate validation state
  const allTargetsSelected = targets.every((t) =>
    isRelay ? t.countryCode !== null : t.athlete !== null
  );
  const totalExtraRounds = targets.reduce((sum, t) => sum + t.extraRounds, 0);
  const remainingExtraRounds = TOTAL_EXTRA_ROUNDS - totalExtraRounds;
  const isValid = allTargetsSelected && totalExtraRounds === TOTAL_EXTRA_ROUNDS;

  // Update a single target
  const updateTarget = (
    targetNumber: 1 | 2 | 3 | 4 | 5,
    updates: Partial<TargetState>
  ) => {
    setTargets((prev) =>
      prev.map((t) =>
        t.targetNumber === targetNumber ? { ...t, ...updates } : t
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const body = {
        race_id: raceId,
        targets: targets.map((t) => ({
          target_number: t.targetNumber,
          athlete_id: isRelay ? null : t.athlete?.id,
          country_code: isRelay ? t.countryCode : null,
          predicted_position: t.predictedPosition,
          extra_rounds: t.extraRounds,
        })),
      };

      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save prediction");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Lock on your targets</h3>
            <span className="text-sm text-zinc-500 block">
              Pick 5 targets, set their finish positions, and load exactly {TOTAL_EXTRA_ROUNDS} rounds.
            </span>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-xs text-zinc-500 block">Ammo remaining</span>
            <span
              className={`text-2xl font-bold tabular-nums ${
                remainingExtraRounds === 0
                  ? "text-green-700 dark:text-green-400"
                  : remainingExtraRounds < 0
                    ? "text-red-700 dark:text-red-400"
                    : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {remainingExtraRounds}
            </span>
            <span className="text-xs text-zinc-500">
              / {TOTAL_EXTRA_ROUNDS}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {targets.map((target) => (
            <BiathlonPredictionRow
              key={target.targetNumber}
              mode="edit"
              targetNumber={target.targetNumber}
              isRelay={isRelay}
              gender={gender ?? undefined}
              athlete={target.athlete}
              countryCode={target.countryCode}
              predictedPosition={target.predictedPosition}
              extraRounds={target.extraRounds}
              remainingExtraRounds={remainingExtraRounds}
              disabled={loading}
              onAthleteChange={(athlete) =>
                updateTarget(target.targetNumber, { athlete })
              }
              onCountryChange={(countryCode) =>
                updateTarget(target.targetNumber, { countryCode })
              }
              onPositionChange={(predictedPosition) =>
                updateTarget(target.targetNumber, { predictedPosition })
              }
              onExtraRoundsChange={(extraRounds) =>
                updateTarget(target.targetNumber, { extraRounds })
              }
            />
          ))}
        </div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <span className="text-sm text-red-600 dark:text-red-400 block">{error}</span>
      )}

      {success && (
        <span className="text-sm text-green-600 dark:text-green-400 block">
          Prediction saved!
        </span>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading || !isValid}
        className="w-full py-3 px-4 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading
          ? "Saving..."
          : existingPrediction
            ? "Update Prediction"
            : "Lock In Prediction"}
      </button>

      {/* Validation hint */}
      {!isValid && (
        <span className="text-sm text-zinc-500 text-center block">
          {!allTargetsSelected
            ? "Select all 5 targets to continue"
            : `Distribute all ${TOTAL_EXTRA_ROUNDS} extra rounds to continue`}
        </span>
      )}
    </form>
  );
}
