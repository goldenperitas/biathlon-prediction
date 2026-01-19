import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PredictionForm } from "./PredictionForm";
import Link from "next/link";
import { BiathlonTargets } from "@/components/BiathlonTargets";
import { BiathlonPredictionRow } from "../../../components/BiathlonPredictionRow";
import { LocalTime } from "@/components/LocalTime";
import { calculatePredictionResults } from "@/lib/scoring";
import type { Prediction, PredictionTarget, Athlete, RaceResult, TargetResult } from "@/lib/types";

interface PredictionWithDetails extends Omit<Prediction, 'score' | 'targets'> {
  targets: (PredictionTarget & { athlete?: Athlete })[];
  score: { hits: number; total_score: number } | { hits: number; total_score: number }[] | null;
}

function formatOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Normalizes Supabase 1:1 join output for prediction scores.
 * @param rawScore - Supabase joined score value (object, array, or null)
 * @returns Normalized score object or null
 */
function normalizeScore(
  rawScore: PredictionWithDetails["score"]
): { hits: number; total_score: number } | null {
  if (rawScore === null || rawScore === undefined) return null;
  if (Array.isArray(rawScore)) return rawScore[0] || null;
  if (
    typeof rawScore === "object" &&
    rawScore !== null &&
    "hits" in rawScore &&
    "total_score" in rawScore
  ) {
    return rawScore as { hits: number; total_score: number };
  }
  return null;
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
    .select("*, athlete:athletes(*)")
    .eq("race_id", id)
    .order("finish_position", { ascending: true }) as {
    data: (RaceResult & { athlete?: Athlete })[] | null;
  };

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
    <main className="max-w-4xl mx-auto p-8">
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
        <span className="mt-1 text-zinc-500 block">{race.location}</span>
        <LocalTime
          timestamp={race.start_time}
          format="long"
          className="mt-1 text-sm text-zinc-400 block"
        />
      </div>

      {hasResults ? (
        <div className="mt-8 space-y-8">
          {/* Section 1: Your Results */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Your Results</h2>

            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900">
              {(() => {
                const score = normalizeScore(prediction?.score ?? null);
                if (!score) {
                  return (
                    <div className="text-center text-zinc-500">
                      <span className="block">Scores haven’t been calculated yet.</span>
                      <span className="block text-sm text-zinc-400">
                        Results are available, but your score is still pending.
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="flex items-center justify-center">
                    <BiathlonTargets
                      hits={score.hits}
                      totalScore={score.total_score}
                      className="items-center"
                    />
                  </div>
                );
              })()}
            </div>

            <div className="mt-4">
              {sortedTargets.length > 0 ? (
                <div className="space-y-3">
                  {(targetResults as TargetResult[] | null)?.map((result) => (
                    <BiathlonPredictionRow
                      key={result.target_number}
                      mode="results"
                      targetNumber={result.target_number}
                      isRelay={isRelay}
                      gender={raceGender ?? undefined}
                      athlete={null}
                      countryCode={result.country_code}
                      predictedPosition={result.predicted_position}
                      extraRounds={result.extra_rounds}
                      disabled
                      result={result}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500">
                  <span>No prediction was made for this race.</span>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Full Race Results */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Full Race Results</h2>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
              {raceResults && raceResults.length > 0 ? (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {raceResults.map((r) => {
                    const displayName = isRelay
                      ? r.country_code || "—"
                      : r.athlete
                        ? `${r.athlete.given_name} ${r.athlete.family_name}`
                        : "Unknown";

                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="w-10 text-center font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatOrdinal(r.finish_position)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{displayName}</div>
                          {!isRelay && r.athlete?.nationality && (
                            <div className="text-sm text-zinc-500 truncate">
                              <span>{r.athlete.nationality}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm text-zinc-500">
                          <div>{r.total_time ?? ""}</div>
                          <div className="text-zinc-400">{r.behind ?? ""}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-zinc-500">
                  <span>Race results aren’t available yet.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-8">
          {isPast ? (
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900">
              <span className="text-zinc-500 block mb-4">
                This race has already started. Predictions are locked.
              </span>

              {sortedTargets.length > 0 ? (
                <div className="space-y-3">
                  {sortedTargets.map((target: PredictionTarget & { athlete?: Athlete }) => {
                    const athleteName = isRelay
                      ? target.country_code || "Unknown"
                      : target.athlete
                        ? `${target.athlete.given_name} ${target.athlete.family_name}`
                        : "Unknown";

                    return (
                      <BiathlonPredictionRow
                        key={target.target_number}
                        mode="results"
                        targetNumber={target.target_number}
                        isRelay={isRelay}
                        gender={raceGender ?? undefined}
                        athlete={null}
                        countryCode={isRelay ? target.country_code : null}
                        predictedPosition={target.predicted_position}
                        extraRounds={target.extra_rounds}
                        disabled
                        pendingLabel={athleteName}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-zinc-500">
                  <span>No prediction was made for this race.</span>
                </div>
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
      )}
    </main>
  );
}
