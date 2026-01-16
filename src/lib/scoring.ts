import type { PredictionTarget, RaceResult, TargetResult } from "./types";

export const TOTAL_TARGETS = 5;
export const TOTAL_EXTRA_ROUNDS = 10;
export const MAX_POSITION = 120;
export const PRECISE_HIT_POINTS = 100;
export const RANGE_HIT_POINTS = 50;
export const MULTIPLIER_THRESHOLD = 20;
export const MULTIPLIER = 1.5;

/**
 * Calculate the hit range for a target based on predicted position and extra rounds
 */
export function calculateHitRange(
  predictedPosition: number,
  extraRounds: number
): { min: number; max: number } {
  const min = Math.max(1, predictedPosition - extraRounds);
  const max = predictedPosition + extraRounds;
  return { min, max };
}

/**
 * Check if a target is hit based on actual position and hit range
 */
export function isTargetHit(
  actualPosition: number | null,
  hitRangeMin: number,
  hitRangeMax: number
): boolean {
  if (actualPosition === null) return false;
  return actualPosition >= hitRangeMin && actualPosition <= hitRangeMax;
}

/**
 * Check if a hit is precise (exact position match)
 */
export function isPreciseHit(
  actualPosition: number | null,
  predictedPosition: number
): boolean {
  return actualPosition === predictedPosition;
}

/**
 * Calculate points for a single target
 */
export function calculateTargetPoints(
  predictedPosition: number,
  actualPosition: number | null,
  extraRounds: number
): { points: number; isPrecise: boolean; isHit: boolean; hasMultiplier: boolean } {
  const { min, max } = calculateHitRange(predictedPosition, extraRounds);
  const hasMultiplier = predictedPosition > MULTIPLIER_THRESHOLD;

  if (actualPosition === null) {
    return { points: 0, isPrecise: false, isHit: false, hasMultiplier };
  }

  const precise = isPreciseHit(actualPosition, predictedPosition);
  const hit = isTargetHit(actualPosition, min, max);

  if (!hit) {
    return { points: 0, isPrecise: false, isHit: false, hasMultiplier };
  }

  let points = precise ? PRECISE_HIT_POINTS : RANGE_HIT_POINTS;
  if (hasMultiplier) {
    points = Math.floor(points * MULTIPLIER);
  }

  return { points, isPrecise: precise, isHit: true, hasMultiplier };
}

/**
 * Calculate full results for all targets in a prediction
 */
export function calculatePredictionResults(
  targets: PredictionTarget[],
  results: RaceResult[],
  isRelay: boolean
): TargetResult[] {
  return targets.map((target) => {
    // Find the actual result for this target's athlete/country
    const result = isRelay
      ? results.find((r) => r.country_code === target.country_code)
      : results.find((r) => r.athlete_id === target.athlete_id);

    const actualPosition = result?.finish_position ?? null;
    const { min, max } = calculateHitRange(
      target.predicted_position,
      target.extra_rounds
    );

    const { points, isPrecise, isHit, hasMultiplier } = calculateTargetPoints(
      target.predicted_position,
      actualPosition,
      target.extra_rounds
    );

    // Build athlete name for display
    let athleteName = "";
    if (isRelay) {
      athleteName = target.country_code || "";
    } else if (target.athlete) {
      athleteName = `${target.athlete.given_name} ${target.athlete.family_name}`;
    }

    return {
      target_number: target.target_number,
      athlete_id: target.athlete_id,
      country_code: target.country_code,
      athlete_name: athleteName,
      predicted_position: target.predicted_position,
      actual_position: actualPosition,
      extra_rounds: target.extra_rounds,
      hit_range_min: min,
      hit_range_max: max,
      is_hit: isHit,
      is_precise: isPrecise,
      points_earned: points,
      has_multiplier: hasMultiplier,
    };
  });
}

/**
 * Calculate total score from target results
 */
export function calculateTotalScore(targetResults: TargetResult[]): {
  hits: number;
  preciseHits: number;
  rangeHits: number;
  totalScore: number;
} {
  const hits = targetResults.filter((t) => t.is_hit).length;
  const preciseHits = targetResults.filter((t) => t.is_precise).length;
  const rangeHits = hits - preciseHits;
  const totalScore = targetResults.reduce((sum, t) => sum + t.points_earned, 0);

  return { hits, preciseHits, rangeHits, totalScore };
}

/**
 * Validate prediction targets before saving
 */
export function validatePredictionTargets(
  targets: Array<{
    target_number: number;
    athlete_id?: string | null;
    country_code?: string | null;
    predicted_position: number;
    extra_rounds: number;
  }>,
  isRelay: boolean
): { valid: boolean; error?: string } {
  // Must have exactly 5 targets
  if (targets.length !== TOTAL_TARGETS) {
    return { valid: false, error: `Must have exactly ${TOTAL_TARGETS} targets` };
  }

  // Check target numbers are 1-5
  const targetNumbers = targets.map((t) => t.target_number).sort();
  if (JSON.stringify(targetNumbers) !== JSON.stringify([1, 2, 3, 4, 5])) {
    return { valid: false, error: "Target numbers must be 1, 2, 3, 4, 5" };
  }

  // Sum of extra rounds must equal 10
  const totalRounds = targets.reduce((sum, t) => sum + t.extra_rounds, 0);
  if (totalRounds !== TOTAL_EXTRA_ROUNDS) {
    return {
      valid: false,
      error: `Total extra rounds must equal ${TOTAL_EXTRA_ROUNDS}, got ${totalRounds}`,
    };
  }

  // Validate each target
  for (const target of targets) {
    // Position must be 1-30
    if (target.predicted_position < 1 || target.predicted_position > MAX_POSITION) {
      return {
        valid: false,
        error: `Position must be between 1 and ${MAX_POSITION}`,
      };
    }

    // Extra rounds must be 0-10
    if (target.extra_rounds < 0 || target.extra_rounds > TOTAL_EXTRA_ROUNDS) {
      return {
        valid: false,
        error: `Extra rounds must be between 0 and ${TOTAL_EXTRA_ROUNDS}`,
      };
    }

    // Must have athlete_id or country_code
    if (isRelay) {
      if (!target.country_code) {
        return { valid: false, error: "Each target must have a country" };
      }
    } else {
      if (!target.athlete_id) {
        return { valid: false, error: "Each target must have an athlete" };
      }
    }
  }

  // Check for duplicate athletes/countries
  if (isRelay) {
    const countries = targets.map((t) => t.country_code);
    if (new Set(countries).size !== countries.length) {
      return { valid: false, error: "Cannot select the same country twice" };
    }
  } else {
    const athletes = targets.map((t) => t.athlete_id);
    if (new Set(athletes).size !== athletes.length) {
      return { valid: false, error: "Cannot select the same athlete twice" };
    }
  }

  return { valid: true };
}
