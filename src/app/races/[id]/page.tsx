import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PredictionForm } from "./PredictionForm";
import Link from "next/link";
import { BiathlonTargets } from "@/components/BiathlonTargets";
import { LocalTime } from "@/components/LocalTime";
import { calculatePredictionResults } from "@/lib/scoring";
import type { Prediction, PredictionTarget, Athlete, RaceResult } from "@/lib/types";

interface PredictionWithDetails extends Omit<Prediction, 'score' | 'targets'> {
  targets: (PredictionTarget & { athlete?: Athlete })[];
  score: { hits: number; total_score: number } | { hits: number; total_score: number }[] | null;
}

function formatOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function RaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch race
  const { data: race } = await supabase
    .from("races")
    .select("*")
    .eq("id", id)
    .single();

  if (!race) {
    notFound();
  }

  // Fetch existing prediction with targets and athlete details
  const { data: prediction } = await supabase
    .from("predictions")
    .select(`
      *,
      targets:prediction_targets(
        *,
        athlete:athletes(*)
      ),
      score:prediction_scores!fk_prediction_scores_prediction!left(*)
    `)
    .eq("race_id", id)
    .eq("user_id", user.id)
    .single() as { data: PredictionWithDetails | null };

  // Fetch race results (for displaying hit/miss info)
  const { data: raceResults } = await supabase
    .from("race_results")
    .select("*")
    .eq("race_id", id);

  const raceDate = new Date(race.start_time);
  const allowPastPredictions = process.env.NEXT_PUBLIC_ALLOW_PAST_PREDICTIONS === 'true';
  const isPast = raceDate < new Date() && !allowPastPredictions;

  // Parse gender from short_description (starts with "Men" or "Women")
  const raceGender = race.short_description?.startsWith("Men")
    ? "M"
    : race.short_description?.startsWith("Women")
      ? "W"
      : null;

  // Check if this is a relay race
  const isRelay = race.short_description?.includes("Relay") ?? false;

  // Sort targets by target_number for display
  const sortedTargets = prediction?.targets
    ?.sort((a: PredictionTarget, b: PredictionTarget) => a.target_number - b.target_number) || [];

  // Calculate per-target results if we have race results
  const hasResults = raceResults && raceResults.length > 0;
  const targetResults = hasResults && sortedTargets.length > 0
    ? calculatePredictionResults(sortedTargets, raceResults as RaceResult[], isRelay)
    : null;

  return (
    <main className="max-w-2xl mx-auto p-8">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Back to dashboard
      </Link>

      {allowPastPredictions && raceDate < new Date() && (
        <div className="mt-4 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
          <span className="font-semibold">Test Mode:</span> Past predictions allowed
        </div>
      )}

      <div className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {race.short_description}
        </h1>
        <p className="mt-1 text-zinc-500">{race.location}</p>
        <LocalTime
          timestamp={race.start_time}
          format="long"
          className="mt-1 text-sm text-zinc-400 block"
        />
      </div>

      {/* Your Results section - only show if there's a score */}
      {prediction?.score && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Your Results</h2>
          <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900">
            {(() => {
              // Handle score as either array or object (Supabase one-to-one returns object)
              const rawScore = prediction.score;
              let score: { hits: number; total_score: number } | null = null;
              
              if (rawScore !== null && rawScore !== undefined) {
                if (Array.isArray(rawScore)) {
                  score = rawScore[0] || null;
                } else if (typeof rawScore === 'object' && rawScore !== null && 'hits' in rawScore && 'total_score' in rawScore) {
                  score = rawScore as { hits: number; total_score: number };
                }
              }

              if (!score) return null;

              return (
                <div className="flex items-center justify-center">
                  <BiathlonTargets hits={score.hits} totalScore={score.total_score} className="items-center" />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Your Prediction</h2>

        {isPast ? (
          <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900">
            <p className="text-zinc-500 mb-4">
              This race has already started. Predictions are locked.
            </p>
            {sortedTargets.length > 0 ? (
              <div className="space-y-3">
                {targetResults ? (
                  // Show results with hit/miss info
                  targetResults.map((result) => {
                    const bgClass = result.is_precise
                      ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                      : result.is_hit
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700";

                    return (
                      <div
                        key={result.target_number}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${bgClass}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-bold">
                          {result.target_number}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{result.athlete_name || "Unknown"}</div>
                          <div className="text-sm text-zinc-500">
                            Predicted: {formatOrdinal(result.predicted_position)}
                            {result.extra_rounds > 0 && (
                              <span className="ml-1">
                                (range {formatOrdinal(result.hit_range_min)}-{formatOrdinal(result.hit_range_max)})
                              </span>
                            )}
                          </div>
                          {result.actual_position !== null && (
                            <div className="text-sm mt-1">
                              Actual: {formatOrdinal(result.actual_position)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {result.is_precise ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                              ✓ PRECISE
                            </span>
                          ) : result.is_hit ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200">
                              ✓ HIT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                              ✗ MISS
                            </span>
                          )}
                          {result.points_earned > 0 && (
                            <div className="text-sm font-semibold mt-1 text-green-700 dark:text-green-400">
                              +{result.points_earned} pts
                              {result.has_multiplier && <span className="text-xs ml-1">(1.5×)</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // No results yet - show predictions only
                  sortedTargets.map((target: PredictionTarget & { athlete?: Athlete }) => {
                    const athleteName = isRelay
                      ? target.country_code
                      : target.athlete
                        ? `${target.athlete.given_name} ${target.athlete.family_name}`
                        : "Unknown";

                    return (
                      <div
                        key={target.target_number}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-950 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-sm font-bold">
                          {target.target_number}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{athleteName}</div>
                          <div className="text-sm text-zinc-500">
                            {formatOrdinal(target.predicted_position)} place
                            {target.extra_rounds > 0 && (
                              <span className="ml-2">
                                (+{target.extra_rounds} extra rounds)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-zinc-400">
                          Results pending
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Score display if available */}
                {prediction?.score && Array.isArray(prediction.score) && prediction.score.length > 0 && (
                  <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {prediction.score[0].hits}/5
                      </div>
                      <div className="text-sm text-zinc-500">Hits</div>
                      <div className="mt-2 text-2xl font-semibold">
                        {prediction.score[0].total_score} pts
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-zinc-400">No prediction was made for this race.</p>
            )}
          </div>
        ) : (
          <PredictionForm
            raceId={id}
            existingPrediction={prediction}
            gender={raceGender}
            isRelay={isRelay}
          />
        )}
      </div>
    </main>
  );
}
